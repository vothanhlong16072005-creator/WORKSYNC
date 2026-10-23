# 05 — Feature M1: Xác Thực & Phân Quyền RBAC

> **Module:** `backend/src/auth/` (9 file) + `backend/src/users/` (5 file)
> **Frontend:** `frontend/src/features/auth/pages/` + `frontend/src/stores/auth.store.ts`
> **Đây là nền tảng bảo mật của toàn hệ thống.**

---

## 1. Bối Cảnh Nghiệp Vụ

Doanh nghiệp cần:
1. Nhân viên đăng nhập bằng email/mật khẩu, hoặc Google 1-click
2. Không bao giờ phiên làm việc bị mất giữa chừng (token hết hạn → refresh ngầm)
3. Mỗi vai trò thấy/không thấy/không làm được những chức năng khác nhau
4. Bảo mật ở **tầng server** — không phụ thuộc frontend

---

## 2. Luồng Đăng Ký — 5 Bước

```
[1] POST /api/auth/register { email, password, name, departmentId? }
     ↓
[2] AuthService.register()
    a) Kiểm tra email đã tồn tại?  → ConflictException (409)
    b) bcrypt.genSalt(10) + bcrypt.hash()  ← cost factor 10
    c) usersService.createWithPersonalProject({...})
         └─ ★ TRANSACTION: tạo User + Project(PERSONAL) + ProjectMember
    d) generateToken(user) → JWT
     ↓
[3] Response { accessToken, token, user }
     ↓
[4] Frontend: authStore.setAuth(user, accessToken) → persist vào localStorage
     ↓
[5] Axios interceptor tự gắn Authorization header cho mọi request sau
```

### 2.1 Code thật (`auth/auth.service.ts`)

```typescript
async register(data: RegisterDto) {
  const existingUser = await this.usersService.findByEmail(data.email);
  if (existingUser) {
    throw new ConflictException('Email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  const user = await this.usersService.createWithPersonalProject({
    email: data.email,
    name: data.name,
    passwordHash,
  });

  return this.generateToken(user);
}
```

### 2.2 Tại sao `createWithPersonalProject` phải là Transaction?

```typescript
// users/users.service.ts (rút gọn)
// await this.prisma.$transaction([
//   this.prisma.user.create({ ... }),
//   this.prisma.project.create({ kind: 'PERSONAL', personalOwnerId: userId }),
//   this.prisma.projectMember.create({ ... }),
// ]);
```

**Lý do:** nếu tạo User thành công nhưng tạo Project cá nhân thất bại → user có tài khoản nhưng **không có bảng cá nhân** → vào `/tasks` thấy trống, tạo task lỗi. Transaction đảm bảo **all-or-nothing**.

> Đây là nguyên tắc **Idempotent Provisioning** được nhấn mạnh trong `docs/00-PRD.md` §2.

---

## 3. Luồng Đăng Nhập

```typescript
async login(data: LoginDto) {
  const user = await this.usersService.findByEmail(data.email);
  if (!user || !user.passwordHash) {
    throw new UnauthorizedException('Invalid credentials');   // ← message chung
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    throw new UnauthorizedException('Invalid credentials');   // ← message chung
  }

  return this.generateToken(user);
}
```

### 3.1 Chi tiết bảo mật quan trọng

**① Message lỗi PHẢI giống nhau**

```typescript
if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
if (!isMatch)               throw new UnauthorizedException('Invalid credentials');
```

Nếu viết khác nhau:
- "Email không tồn tại" → kẻ tấn công biết email nào đã đăng ký
- "Mật khẩu sai" → biết email tồn tại, chỉ cần đoán mật khẩu

→ **Luôn trả message chung** để không rò rỉ thông tin.

**② `bcrypt.compare` chứ không so sánh chuỗi**

bcrypt mã hóa có **salt ngẫu nhiên** → 2 user cùng mật khẩu cho hash khác nhau. Phải dùng `bcrypt.compare` (tự lấy salt từ hash để tái tạo).

**③ `bcrypt.genSalt(10)` — cost factor**

Cost factor = số lần lặp 2^n. Cost 10 → 1024 vòng lặp. Đây là con số khuyến nghị cho FPT theo `docs/00-PRD.md` §4.1. Tăng lên 12-13 sẽ chậm hơn (tốt cho bảo mật, xấu cho UX login).

---

## 4. JWT — Cấu trúc Token

### 4.1 Payload (`auth/auth.service.ts`)

```typescript
private generateToken(user: import('@prisma/client').User) {
  const payload = {
    sub: user.id,           // ← subject: user id (chuẩn JWT)
    email: user.email,
    name: user.name,
    role: user.role,                    // ← ROLE NẰM TRONG TOKEN
    departmentId: user.departmentId ?? null,
  };
  const accessToken = this.jwtService.sign(payload);
  return {
    accessToken,
    token: accessToken,        // ← alias (backward compatible)
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, departmentId: user.departmentId ?? null, avatar: user.avatar,
    },
  };
}
```

### 4.2 Token gồm 3 phần

```
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiJ1c3IxIiwi... . SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
└────────┬───────┘   └────────────┬──────────────┘   └──────────────┬──────────────────┘
      Header                    Payload                        Signature
   { alg, typ }        { sub, email, name, role,           HMAC-SHA256(header+payload,
                       departmentId, iat, exp }            secret)
```

**Signature = HMAC-SHA256(header + payload, JWT_SECRET)**

→ Server verify được payload **chưa bị sửa**. Client tự ý đổi `role: 'EMPLOYEE'` → `role: 'ADMIN'` → signature không khớp → 401.

### 4.3 `sub` = subject

Chuẩn JWT quy định `sub` là định danh chủ thể. Dự án dùng `sub` = user id → `JwtStrategy.validate()` map `payload.sub` → `id`.

---

## 5. Google OAuth 2.0

### 5.1 Luồng

```
[1] User bấm "Đăng nhập bằng Google"  → GET /api/auth/google
     ↓
[2] AuthGuard('google') redirect tới accounts.google.com/o/oauth2/v2/auth
     + client_id, redirect_uri, scope=email profile, state=...
     ↓
[3] Google xác thực → redirect về GET /api/auth/google/callback?code=...
     ↓
[4] GoogleStrategy.validate() đổi code → token → lấy profile
     ↓
[5] authService.validateOAuthLogin(email, name, avatar)
     ↓
[6] Redirect về frontend kèm token trong query string
```

### 5.2 Code thật (`auth/auth.controller.ts`)

```typescript
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthRedirect(@Req() req: any, @Res() res: any) {
  const data = req.user;
  // Hỗ trợ cả Vercel lẫn localhost
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(
    `${frontendUrl.replace(/\/$/, '')}/login?token=${data.accessToken}&user=${encodeURIComponent(JSON.stringify(data.user))}`
  );
}
```

### 5.3 Đăng nhập OAuth idempotent (`auth.service.ts`)

```typescript
async validateOAuthLogin(email: string, name: string, avatar: string) {
  let user = await this.usersService.findByEmail(email);

  if (!user) {
    // User mới — tạo account + personal project
    user = await this.usersService.createWithPersonalProject({
      email, name, avatar,
      passwordHash: '',        // ← OAuth không cần mật khẩu
    });
  } else {
    // User đã tồn tại — sync name/avatar từ Google (idempotent)
    if (user.name !== name || user.avatar !== avatar) {
      user = await this.usersService.updateProfile(user.id, { name, avatar });
    }
  }
  return this.generateToken(user);
}
```

**Idempotent** = gọi nhiều lần cho cùng email chỉ tạo 1 account, và mỗi lần login đều đồng bộ tên/avatar mới nhất từ Google.

### 5.4 ⚠️ Điểm cần nhận biết (trả lời khi giáo viên hỏi)

**Token trong query string** (`?token=...`) là **rủi ro XSS/Referer leak**:
- Token nằm trong URL → có thể lọt vào `Referer` header khi click link ngoài
- Lưu vào `history` → hiện trong autocomplete

**Cách làm đúng hơn (production):**
```
Google → callback (backend) → set HttpOnly cookie refresh token
                              → redirect về /login (không có token trong URL)
                              → frontend gọi POST /auth/refresh → nhận access token
```

> `docs/00-PRD.md` §2 mô tả mô hình Refresh Token HttpOnly cookie, nhưng **code hiện tại chưa triển khai refresh token đầy đủ** (`auth.service.ts` chỉ trả `accessToken`). Đây là hạng mục đang phát triển — nên nói "đang triển khai, plan có sẵn" thay vì khẳng định đã xong.

---

## 6. Phân Quyền — 3 Tầng Bảo Mật

### Tầng 1: JWT Guard — "Bạn là ai?"

```typescript
// auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('You must be logged in');
    }
    return user;
  }
}
```

### Tầng 2: Roles Guard — "Bạn được làm gì?"

```typescript
// common/guards/roles.guard.ts
const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
  context.getHandler(), context.getClass(),
]);
if (!requiredRoles || requiredRoles.length === 0) return true;

const { user } = context.switchToHttp().getRequest();
if (!user || !user.role) throw new ForbiddenException('User role not found');
if (!requiredRoles.includes(user.role)) {
  throw new ForbiddenException(`Requires one of roles: [${requiredRoles.join(', ')}]`);
}
return true;
```

### Tầng 3: Service-level ownership check — "Cụ thể cái này?"

```typescript
// tasks/tasks.service.ts
const isProjectPM = project.pmId === userId || project.members[0]?.projectRole === 'PM';
const isDeptHead = actor.role === Role.DEPARTMENT_HEAD && (...);
const isAdmin = actor.role === Role.ADMIN;

if (!isAdmin && !isDeptHead && !isProjectPM) {
  throw new ForbiddenException('Chỉ Quản trị viên, Trưởng phòng hoặc Quản lý dự án (PM) mới có quyền...');
}
```

### 6.1 Tại sao cần cả 3 tầng?

| Tầng | Chặn cái gì | Ví dụ |
|------|-------------|-------|
| 1 — JWT | Request không có token hợp lệ | Trang `/admin` gọi API không có token → 401 |
| 2 — Roles | Role không đủ cho endpoint | `EMPLOYEE` gọi `PATCH /users/:id/role` → 403 |
| 3 — Ownership | Đúng role nhưng không phải của bạn | `PM` dự án A sửa task dự án B → 403 |

**Tầng 3 là chống IDOR** — không thể bỏ, vì "PM" là role rộng, cần kiểm tra thêm phạm vi dữ liệu.

---

## 7. Frontend — Quản Lý Phiên Đăng Nhập

### 7.1 Zustand persist (`stores/auth.store.ts`)

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      logout: () => {
        set({ user: null, accessToken: null });
        localStorage.removeItem('worksync-auth');
      },
      hasRole: (role) => get().user?.role === role,
      hasAnyRole: (roles) => {
        const current = get().user?.role;
        return current ? roles.includes(current as UserRole) : false;
      },
    }),
    { name: 'worksync-auth' }
  )
);
```

### 7.2 Token tự động gắn vào mọi request

```typescript
// lib/api-client.ts
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Component KHÔNG cần tự gọi `setHeaders`** — đây là lợi ích của interceptor.

### 7.3 Điều hướng sau login

```tsx
// features/auth/pages/LoginPage.tsx (rút gọn)
const { setAuth } = useAuthStore();
const navigate = useNavigate();

const handleLogin = async (email: string, password: string) => {
  const res = await apiClient.post('/auth/login', { email, password });
  setAuth(res.data.user, res.data.accessToken);   // ← lưu vào store (tự persist)
  navigate('/dashboard');
};
```

---

## 8. Quản Lý Người Dùng & Phân Quyền (Module `users/`)

### 8.1 Endpoint quan trọng

| Endpoint | Method | Role | Mô tả |
|----------|--------|------|-------|
| `/api/users` | GET | ADMIN, HR, DEPT_HEAD | Danh sách (search, phân trang, filter phòng ban) |
| `/api/users` | POST | ADMIN | Tạo tài khoản nhân sự |
| `/api/users/:id` | GET | ALL | Chi tiết hồ sơ |
| `/api/users/:id` | PATCH | ADMIN, HR | Cập nhật thông tin |
| `/api/users/:id/role` | PATCH | ADMIN | **Cấp/đổi role** |
| `/api/users/:id/status` | PATCH | ADMIN, HR | Kích hoạt / khóa |
| `/api/users/:id` | DELETE | ADMIN | **Xóa mềm** (`deletedAt`) |
| `/api/users/profile` | GET/PATCH | ALL | Hồ sơ của chính mình |
| `/api/users/profile/language` | PATCH | ALL | Đổi ngôn ngữ VI/EN |
| `/api/users/assignable` | GET | ALL | Danh sách user có thể giao việc |
| `/api/departments` | CRUD | ADMIN | Quản lý phòng ban |

### 8.2 Xóa mềm

```prisma
model User {
  // ...
  deletedAt DateTime?   // ← không xóa vật lý
}
```

```typescript
// DELETE /api/users/:id
await this.prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

**Lý do:** giữ lịch sử chấm công, task đã giao, comment, báo cáo. Nếu xóa vật lý → mất dữ liệu lịch sử của toàn hệ thống.

**Query phải filter:** mọi query cần `where: { deletedAt: null }`.

---

## 9. 5 Vai Trò — Chi Tiết Quyền Hạn

### 9.1 `ADMIN` — Quản trị viên

| Quyền | Chi tiết |
|-------|----------|
| Toàn quyền hệ thống | Mọi module |
| Quản lý user | Tạo, sửa, xóa, **cấp role** |
| Quản lý phòng ban | CRUD |
| Cấu hình văn phòng | GPS, IP, bán kính (qua `SystemConfig`) |
| Admin Control Center | `/admin` — trang quản trị toàn năng (M12) |
| Xem lịch toàn công ty | `scope=company` trong calendar |

### 9.2 `HR` — Quản lý nhân sự

| Quyền | Chi tiết |
|-------|----------|
| Xem chấm công toàn công ty | Bảng chấm công + heatmap |
| Duyệt nghỉ phép / WFH / OT | Toàn công ty |
| Xuất báo cáo Excel/PDF | Chấm công tháng |
| Sửa chấm công tay | `editedBy` + `editedAt` được ghi lại |
| Không can thiệp dự án | Không tạo/sửa task dự án nhóm |

### 9.3 `DEPARTMENT_HEAD` — Trưởng phòng

| Quyền | Chi tiết |
|-------|----------|
| Tạo dự án nhóm | **Chỉ DEPT_HEAD + ADMIN** |
| Hoán đổi PM | `PATCH /projects/:id/swap-pm` — transaction atomic |
| Giao việc nhanh ⚡ | `QuickTask` cho nhân viên trong phòng |
| Tạo task + gán Assignee | Trong dự án thuộc phòng |
| Duyệt đơn của phòng | WFH/OT/nghỉ phép |
| Dashboard riêng | `DepartmentHeadDashboardLayout` + drill-down |

### 9.4 `PM` — Quản lý dự án

| Quyền | Chi tiết |
|-------|----------|
| Lập kế hoạch Sprint | Tạo/start/complete, gán Story Points |
| Quản lý Backlog & Epic | Kéo task vào Sprint |
| Tạo task + gán Assignee | Trong dự án mình là PM |
| Tạo cuộc họp dự án | `scopeType=PROJECT` |
| Duyệt WFH/OT của team | Theo dự án |
| **KHÔNG** tạo dự án mới | Chỉ DEPT_HEAD + ADMIN |

### 9.5 `EMPLOYEE` — Nhân viên

| Quyền | Chi tiết |
|-------|----------|
| Kanban cá nhân 100% | Tự do tạo/sửa/xóa task của mình |
| Chỉ tạo task cá nhân | Không tạo task trong dự án nhóm |
| Check-in/out | Tự chấm công |
| Gửi đơn từ | WFH/nghỉ phép/về sớm/OT |
| Báo cáo cuối ngày | AI điền sẵn, mình review |
| Tham gia họp | Không tạo họp, không xem AI summary |

---

## 10. Bảo Mật Đã Áp Dụng — Checklist

| Biện pháp | Hiện thực | File |
|-----------|-----------|------|
| Hash mật khẩu bcrypt cost 10 | ✅ | `auth.service.ts` |
| JWT ký HMAC-SHA256 | ✅ | `auth.service.ts` |
| Role trong token (không đọc từ request) | ✅ | `jwt.strategy.ts` |
| `whitelist: true` chặn mass assignment | ✅ | `main.ts` |
| Luôn lấy user từ `@CurrentUser()` | ✅ | `common/decorators/` |
| Xóa mềm, không xóa vật lý | ✅ | `schema.prisma` |
| IDOR check ở Service layer | ✅ | `tasks.service.ts`, `projects/` |
| Message lỗi đăng nhập chung | ✅ | `auth.service.ts` |
| CORS configurable | ✅ | `main.ts` |
| Rate limiting login | ❌ | **Nên bổ sung** |
| Refresh token HttpOnly cookie | ⏳ | **Đang phát triển** |
| `tokenVersion` để revoke token ngay | ❌ | **Nên bổ sung** |
| Helmet (security headers) | ❌ | **Nên bổ sung** |
| 2FA | ❌ | Ngoài scope |

> **Cách trả lời khi giáo viên hỏi về bảo mật:** Liệt kê cái **đã làm** chi tiết (như bảng trên), rồi nói thẳng cái **chưa làm** + kế hoạch. Thành thật về hạn chế kỹ thuật là điểm cộng lớn trong phần trình bày đồ án.

---

## 11. Câu Hỏi Thường Gặp

**Q: JWT hay session cookie — dùng cái nào?**
> Dự án dùng **JWT trong localStorage** (stateless, dễ scale, không cần session store). Đổi đổi lại: JWT khó revoke (thêm `tokenVersion` vào DB là cách khắc phục), session dễ revoke nhưng cần Redis + sticky session. Với app nội bộ + token 15 phút, JWT là lựa chọn hợp lý.

**Q: Vì sao không query DB trong `JwtStrategy.validate()`?**
> Vì mỗi request đều gọi → thêm 1 query DB/request sẽ chậm. Trade-off: đổi role không hiệu lực ngay (tối đa 15 phút). Giải pháp: `tokenVersion` trong `User`, tăng version khi đổi role → check trong `validate()` (1 query nhẹ, vẫn nhanh hơn query full user).

**Q: Refresh token hoạt động thế nào?**
> Mô hình chuẩn: Access token 15 phút (trong memory/localStorage) + Refresh token 7 ngày (HttpOnly cookie, không JS đọc được). Khi access token hết hạn → client gọi `POST /auth/refresh` → server verify refresh token → cấp access token mới → user không bị logout. **Dự án đã có endpoint `POST /auth/refresh` trong feature list nhưng implementation chưa hoàn chỉnh.**

**Q: OAuth user có mật khẩu không?**
> `passwordHash: ''` — rỗng. `login()` kiểm tra `if (!user || !user.passwordHash)` → chặn login bằng email thường cho tài khoản OAuth-only. Đúng cách.

**Q: Tại sao `sub` thay vì `userId`?**
> Chuẩn JWT RFC 7519 quy định `sub` (subject) là định danh chủ thể. Dùng `sub` giúp token tương thích với thư viện/verify tool chuẩn, dễ tích hợp OIDC/OAuth2 server sau này.

**Q: Đổi role trong DB thì sao?**
> Token đã cấp vẫn giữ role cũ tối đa 15 phút. Sau đó token hết hạn → login lại → nhận role mới. Chấp nhận được với hệ thống nội bộ. Nếu cần tức thì → thêm `tokenVersion`.
