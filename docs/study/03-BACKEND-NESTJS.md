# 03 — Backend NestJS: Kiến Trúc & Pattern

> **Nguồn:** đọc trực tiếp `backend/src/` — `main.ts`, `app.module.ts`, `auth/`, `common/`, và các module nghiệp vụ.

---

## 1. Tại Sao NestJS?

NestJS = framework NodeJS lấy cảm hứng từ Angular, giải quyết 3 vấn đề của Express thuần:

| Vấn đề Express thuần | NestJS giải quyết |
|---------------------|-------------------|
| Business logic lẫn trong route handler | Tách **Controller** (HTTP) / **Service** (logic) / **Prisma** (data) |
| Không có cơ chế DI → phụ thuộc khó test | **Dependency Injection** qua decorator `@Injectable()` |
| Auth/role check lặp lại ở mọi route | **Guard** + **Decorator** khai báo, áp dụng tập trung |

---

## 2. Vòng Đời một Request — 6 Tầng

```
HTTP Request
    ↓
[1] MIDDLEWARE (Nest tích hợp Express) — parse body, CORS
    ↓
[2] GUARD — JwtAuthGuard: xác thực token → gắn user vào request
    ↓
[3] GUARD — RolesGuard: @Roles('ADMIN') → kiểm tra role
    ↓
[4] PIPE — ValidationPipe: validate DTO (class-validator), whitelist, transform
    ↓
[5] CONTROLLER — nhận @Body/@Query/@Param, gọi Service
    ↓
[6] SERVICE — business logic, transaction, gọi Prisma
    ↓
INTERCEPTOR — bọc response (lỗi → format chuẩn)
    ↓
HTTP Response
```

### 2.1 Đăng ký Global — `backend/src/main.ts`

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');                    // ← mọi route thành /api/...

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,     // ← strip field không khai báo trong DTO (chống mass assignment)
    transform: true,     // ← tự convert string → number/bool theo type DTO
  }));

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,     // ← cho phép cookie (cần cho refresh token)
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With'],
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port, '0.0.0.0');   // 0.0.0.0 để truy cập từ máy khác trong LAN
}
```

**Ý nghĩa từng dòng quan trọng:**

| Cấu hình | Tác dụng | Rủi ro nếu bỏ |
|-----------|----------|---------------|
| `whitelist: true` | Chặn client gửi field lạ (VD gửi `role: 'ADMIN'` khi đăng ký) | **Mass assignment** — lỗ hổng bảo mật nghiêm trọng |
| `transform: true` | `transform: true` biến `"5"` (string từ query) → `5` (number) | So sánh sai kiểu → bug âm thầm |
| `credentials: true` | Cookie refresh token gửi kèm | Silent refresh hỏng |
| `setGlobalPrefix('api')` | Chuẩn hóa URL | Frontend phải hardcode `/auth` thay vì `/api/auth` |

---

## 3. Cấu Trúc Module — Dependency Injection

### 3.1 Ví dụ module thật: `auth/auth.module.ts`

```typescript
@Module({
  imports: [JwtModule.register({ secret: ..., signOptions: { expiresIn: '15m' } })],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
```

**4 khái niệm cần nhớ:**

| Khái niệm | Ý nghĩa |
|-----------|---------|
| `imports` | Module khác dùng (ở đây: `JwtModule`) |
| `controllers` | Lớp xử lý HTTP (`@Controller`, `@Get`, `@Post`) |
| `providers` | Service, Strategy, Guard — **được Nest quản lý vòng đời** |
| `exports` | Cái được module khác dùng lại |

### 3.2 Dependency Injection hoạt động thế nào

```typescript
// tasks/tasks.service.ts
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,                    // ← global module
    private readonly projectAccessService: ProjectAccessService, // ← từ ProjectsModule
    private readonly triggers: NotificationTriggersService,      // ← từ NotificationsModule
  ) {}
}
```

Nest đọc **metadata** từ decorator `@Injectable()`, tự tìm provider tương ứng trong module registry và inject vào constructor. Nhờ đó:
- Test dễ: `new TasksService(mockPrisma, mockAccess, mockTriggers)` — không cần DI container
- Không phụ thuộc vòng: `TasksService` không biết `PrismaService` được implement thế nào

### 3.3 `PrismaService` — Global Module

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}
```

Đăng ký `prisma` vào `global: true` trong `app.module.ts` → mọi module đều inject được `PrismaService` mà không cần `imports`.

---

## 4. Guard — Cơ Chế Bảo Mật

### 4.1 `JwtAuthGuard` (`auth/guards/jwt-auth.guard.ts`)

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('You must be logged in');
    }
    return user;   // ← user được gắn vào request.user
  }
}
```

`AuthGuard('jwt')` của Passport:
1. Đọc header `Authorization: Bearer <token>`
2. Gọi `JwtStrategy.validate(payload)` → trả về object user
3. Gắn vào `request.user`

### 4.2 `JwtStrategy` (`auth/strategies/jwt.strategy.ts`)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,   // ← token hết hạn → 401
      secretOrKey: process.env.JWT_SECRET || 'super_secret_key',
    });
  }

  async validate(payload: { sub, email, name?, role, departmentId? }) {
    return {
      id: payload.sub,       // ← map sub → id (tiêu chuẩn JWT)
      email: payload.email,
      name: payload.name,
      role: payload.role,           // ← ROLE NẰM TRONG TOKEN (đã ký)
      departmentId: payload.departmentId ?? null,
    };
  }
}
```

> **Điểm bảo mật quan trọng:** `validate()` **không query database**. Role lấy từ **payload JWT đã ký** → client không thể tự sửa role. Đổi role chỉ có thể bằng cách đổi DB → token cũ vẫn giữ role cũ cho đến hết hạn (15 phút).

**Điểm yếu cần nhận biết:** đổi role không hiệu lực tức thì (tối đa 15 phút). Giải pháp production: thêm `tokenVersion` trong `User` và check trong `validate()`.

### 4.3 `RolesGuard` (`common/guards/roles.guard.ts`)

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),      // ← ưu tiên metadata ở method
      context.getClass(),        // ← fallback metadata ở class
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;              // ← không khai báo @Roles → cho qua
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('User role not found');
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Requires one of roles: [${requiredRoles.join(', ')}]`);
    }
    return true;
  }
}
```

**`getAllAndOverride`** đọc metadata từ method trước, class sau — cho phép `@Roles()` ở cấp method ghi đè cấp class.

### 4.4 Decorator `@Roles` (`common/decorators/roles.decorator.ts`)

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: (Role | keyof typeof Role | string)[]) =>
  SetMetadata(ROLES_KEY, roles);
```

### 4.5 Áp dụng Guard trong Controller

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)     // ← áp cho cả class
export class UsersController {
  @Get()
  @Roles('ADMIN', 'HR', 'DEPARTMENT_HEAD')  // ← override ở method
  findAll(@CurrentUser() user: any) { ... }

  @Patch(':id/role')
  @Roles('ADMIN')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) { ... }
}
```

### 4.6 `@CurrentUser` (`common/decorators/current-user.decorator.ts`)

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;      // ← lấy user do JwtAuthGuard gắn vào
  },
);
```

**Điểm then chốt:** Controller **không bao giờ** nhận `userId` từ `@Body()`. Luôn lấy từ token → chặn IDOR ngay từ đầu.

---

## 5. DTO & Validation — Chặn Mass Assignment

### 5.1 Ví dụ DTO (`auth/dto/register.dto.ts`)

```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
```

**Nhờ `whitelist: true`**, nếu client gửi `role: 'ADMIN'` → field bị **strip khỏi payload** → không tới được Service. Đây là lớp phòng thủ quan trọng nhất.

### 5.2 ValidationPipe với `transform: true`

```typescript
// DTO: page = 1 (number)
// Query string: ?page=5 → "5" (string)
// transform: true → tự convert sang number 5
```

### 5.3 Enum validation

```typescript
import { IsEnum } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
```

`@IsEnum` chặn giá trị không hợp lệ trước khi vào business logic.

---

## 6. Service Layer — Business Logic & RBAC

### 6.1 Pattern chuẩn của dự án

```typescript
// tasks/tasks.service.ts — tạo task
async create(createTaskDto: CreateTaskDto, actorOrUserId: CurrentActor | string) {
  const actor: CurrentActor = typeof actorOrUserId === 'string'
    ? { id: actorOrUserId, role: Role.EMPLOYEE }
    : actorOrUserId;
  const userId = actor.id;

  const project = await this.prisma.project.findUnique({
    where: { id: createTaskDto.projectId },
    select: {
      id: true, kind: true, personalOwnerId: true, name: true,
      pmId: true, departmentId: true, createdById: true,
      members: { where: { userId }, select: { projectRole: true } },
    },
  });

  if (!project) throw new NotFoundException('Dự án không tồn tại hoặc đã bị xóa');

  // ★ RBAC 3 nhánh: PERSONAL / TEAM
  if (project.kind === ProjectKind.PERSONAL) {
    if (project.personalOwnerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền tạo công việc trên bảng cá nhân của người khác');
    }
  } else {
    const isProjectPM = project.pmId === userId || project.members[0]?.projectRole === 'PM';
    const isDeptHead = actor.role === Role.DEPARTMENT_HEAD && (
      project.createdById === userId ||
      project.pmId === userId ||
      (!!actor.departmentId && project.departmentId === actor.departmentId)
    );
    const isAdmin = actor.role === Role.ADMIN;

    if (!isAdmin && !isDeptHead && !isProjectPM) {
      throw new ForbiddenException('Chỉ Quản trị viên, Trưởng phòng hoặc Quản lý dự án (PM) mới có quyền tạo công việc trong dự án nhóm');
    }
  }
  // ...
}
```

### 6.2 `select` có chọn lọc — Không bao giờ `findUnique` không select

```typescript
// ✅ Đúng — chỉ lấy cần dùng
await this.prisma.task.findUnique({
  where: { id },
  select: { id: true, title: true, status: true, assignee: { select: { id: true, name: true } } },
});

// ❌ Sai — lấy toàn bộ row + relations
await this.prisma.task.findUnique({ where: { id }, include: { ... } });
```

**Lý do:** bảng `Task` có 30+ field, `User` có 30 relations. `include` không cần thiết → tốn băng thông + RAM.

### 6.3 Tách service theo subdomain

Module `attendance/` có **7 service riêng biệt** thay vì 1 file khổng lồ:

| Service | Dòng | Trách nhiệm |
|---------|------|-------------|
| `AttendanceService` | 517 | Orchestrator: check-in, check-out, query |
| `WfhService` | 225 | Đơn WFH + duyệt |
| `LeaveService` | 201 | Đơn nghỉ phép + quỹ phép |
| `OvertimeService` | 113 | Đơn OT + công thức HRM |
| `EarlyLeaveService` | 105 | Đơn về sớm |
| `BreakService` | 88 | Nhật ký nghỉ giữa ngày |
| `LeaveBalanceService` | 62 | Quỹ phép |
| `AutoApproveService` | 62 | Cron tự duyệt 09:30 |
| `GeoValidationService` | 58 | Haversine |
| `IpValidationService` | 34 | Kiểm tra dải IP |
| `ExportService` | 181 | Excel/PDF |

> **Bài học rút ra (có thể nói với giáo viên):** File lớn nhất trong dự án là `chat.service.ts` (862 dòng) và `calendar.service.ts` (755 dòng) — đây là **nợ kỹ thuật** cần tách như `attendance/` đã làm.

---

## 7. Exception — Mã lỗi chuẩn NestJS

| Exception | HTTP Code | Dùng khi |
|-----------|-----------|----------|
| `BadRequestException` | 400 | Input sai logic (VD: ngày start > end) |
| `UnauthorizedException` | 401 | Chưa xác thực / token hết hạn |
| `ForbiddenException` | 403 | Đã xác thực nhưng không đủ quyền |
| `NotFoundException` | 404 | Không tìm thấy resource |
| `ConflictException` | 409 | Xung đột (VD: email đã tồn tại) |
| `InternalServerErrorException` | 500 | Lỗi không lường trước |

**Phân biệt quan trọng:**
- **401** = "Tôi không biết bạn là ai" → thiếu/sai token
- **403** = "Tôi biết bạn là ai, nhưng bạn không được làm việc này" → thiếu role/quyền

---

## 8. Socket.IO Gateway — Pattern Realtime

### 8.1 Khai báo Gateway (`chat/chat.gateway.ts`)

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',           // ← namespace riêng
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;              // ← inject server Socket.IO

  private readonly onlineUsers = new Map<string, Set<Socket>>();
  //                    userId → Set<Socket>  (1 user nhiều tab)

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) { /* xác thực JWT */ }
  handleDisconnect(client: Socket) { /* dọn state */ }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.join(`conv:${data.conversationId}`);
  }
}
```

### 8.2 Xác thực WebSocket — KHÁC REST

REST dùng header `Authorization`. WebSocket phải truyền token qua **handshake**:

```typescript
// chat/chat.gateway.ts — handleConnection
const token =
  (client.handshake.auth?.token as string | undefined) ||
  (client.handshake.query?.token as string | undefined) ||
  client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

if (!token) { client.disconnect(); return; }

const decoded = this.jwtService.verify<JwtPayload>(token, {
  secret: process.env.JWT_SECRET || 'super_secret_jwt_key_worksync',
});
if (!decoded?.sub) { client.disconnect(); return; }

client.data.userId = decoded.sub;
client.join(`user:${decoded.sub}`);   // ← room cá nhân để nhận notification riêng
```

**3 nơi có thể truyền token** → hỗ trợ nhiều client (React Native không có `handshake.auth`).

### 8.3 Room — Đơn vị phân phối của Socket.IO

| Room | Pattern | Nhận được |
|------|---------|-----------|
| `conv:${id}` | `client.join()` | Tin nhắn trong hội thoại đó |
| `user:${id}` | `client.join()` | Notification riêng của user đó |
| `meetingId` | `client.join()` | Event WebRTC signaling trong phòng họp |

**Broadcast 3 scope:**

```typescript
this.server.emit('event', data);                    // → TẤT CẢ client (presence)
this.server.to(`conv:${id}`).emit('event', data);  // → room cụ thể
client.to(`conv:${id}`).emit('event', data);        // → room, TRỪ người gửi
client.emit('event', data);                         // → CHỈ người gửi
```

### 8.4 Set<Socket> — 1 User Nhiều Tab

```typescript
private readonly onlineUsers = new Map<string, Set<Socket>>();

handleConnection(client: Socket) {
  if (!this.onlineUsers.has(userId)) this.onlineUsers.set(userId, new Set());
  this.onlineUsers.get(userId)!.add(client);       // ← thêm socket vào set
}

handleDisconnect(client: Socket) {
  const userSockets = this.onlineUsers.get(userId)!;
  userSockets.delete(client);
  if (userSockets.size === 0) {                     // ← chỉ OFFLINE khi KHÔNG còn socket nào
    this.onlineUsers.delete(userId);
    this.server.emit('presence:update', { userId, status: 'OFFLINE' });
  }
}

isUserOnline(userId: string): boolean {
  const sockets = this.onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
}
```

> **Điểm hay:** `isUserOnline()` được dùng ở `chat.service.ts` để hiển thị trạng thái online/offline. Nếu chỉ dùng `Map<string, Socket>` thì user mở 2 tab sẽ bị báo offline khi đóng 1 tab — bug kinh điển.

---

## 9. Cron Job — Tác vụ tự động

`notifications/notifications.cron.ts` (95 dòng) + `attendance/auto-approve.service.ts` (62 dòng).

```typescript
@Injectable()
export class NotificationsCronService {
  @Cron('0 30 16 * * *')        // ← 16:30 mỗi ngày
  async sendDailyReportReminder() { ... }

  @Cron('0 30 9 * * *')        // ← 09:30 mỗi ngày
  async autoApprovePendingWfh() { ... }
}
```

**Cú pháp cron 6 trường:** `giây phút giờ ngày tháng thứ`.

**Múi giờ:** NestJS Cron dùng timezone hệ thống. Dự án dùng `Asia/Ho_Chi_Minh` — cần đảm bảo container có `TZ` env đúng, nếu không cron sẽ chạy lệch giờ (VD: 16:30 UTC = 23:30 VN).

---

## 10. Phân Tích Dependency — Ví dụ Module Meetings

```
meetings.module.ts
   ├── imports: PrismaModule, MeetingsAccessService
   ├── controllers: MeetingsController
   ├── providers:
   │     ├── MeetingsService      (690 dòng) — CRUD, RSVP, export
   │     ├── MeetingAiService     (536 dòng) — Gemini
   │     ├── MeetingsGateway      (501 dòng) — WebRTC signaling
   │     └── MeetingsAccessService (181 dòng) — RBAC
   └── exports: MeetingsService, MeetingsGateway
```

**Tách `AccessService` riêng là pattern quan trọng** — file này chỉ chứa logic "ai được phép làm gì", dễ test, dễ đọc, không bị trộn với business logic.

---

## 11. Testing Backend

### 11.1 Cấu trúc

```
backend/src/**/*.spec.ts    → unit test (Vitest)
backend/test/               → integration test (supertest)
```

**38 test file** trong `src/`.

### 11.2 Pattern mock Prisma

```typescript
// meetings.service.spec.ts
const prismaMock = {
  meeting: { findUnique: vi.fn(), create: vi.fn() },
  meetingAttendee: { findMany: vi.fn(), create: vi.fn() },
  // ...
};

const service = new MeetingsService(
  prismaMock as unknown as PrismaService,
  triggersMock,      // ← mock NotificationTriggersService
  meetingAiMock,     // ← mock MeetingAiService
);
```

**Kỹ thuật:** `as unknown as PrismaService` — ép kiểu mock object thành PrismaService. Không cần mock toàn bộ 37 model.

### 11.3 Lệnh chạy

```bash
npm test              # vitest run
npm run test:cov      # + coverage
npm run test:watch    # watch mode
npm run test:debug    # debug với --inspect-brk
```

---

## 12. Lỗi Thường Gặp & Cách Tránh

| Lỗi | Triệu chứng | Cách tránh (đã áp dụng trong dự án) |
|-----|-------------|-------------------------------------|
| Quên `whitelist: true` | Client set `role: 'ADMIN'` khi register | Luôn bật `whitelist` |
| Dùng `userId` từ `@Body` | IDOR — sửa task của người khác | Luôn `@CurrentUser()` |
| Query không `select` | Response nặng, chậm | Chọn đúng field cần |
| `Promise.all` với ghi DB | Race condition khi 2 request cùng lúc | `$transaction` |
| Cron sai timezone | Chạy lệch giờ | Set `TZ=Asia/Ho_Chi_Minh` |
| `SetMetadata` không đọc được | `@Roles` không hoạt động | Guard phải `getAllAndOverride` |
| Socket.IO chưa verify token | Bất kỳ ai cũng join được phòng | Verify trong `handleConnection` |

---

## 13. Câu Hỏi Thường Gặp

**Q: NestJS khác Express ở chỗ nào?**
> NestJS là **framework** (có cấu trúc, DI, module, guard, interceptor, DTO pipeline); Express là **middleware framework** (chỉ là chuỗi middleware + router). NestJS thực chất build trên Express.

**Q: `@Injectable()` làm gì?**
> Đánh dấu class là provider, cho Nest biết để quản lý vòng đời (tạo instance 1 lần/singleton) và inject được. Không có decorator này thì DI không hoạt động.

**Q: Tại sao dùng `Reflector` để đọc metadata?**
> `@SetMetadata()` gắn metadata vào class/method qua `Reflect.defineMetadata`. `Reflector.getAllAndOverride()` đọc lại — đây là cách decorator + guard giao tiếp, giống cách Spring dùng Annotation.

**Q: `select` trong Prisma có khác `include` không?**
> `include` lấy thêm **quan hệ** (relation), `select` chọn **field cụ thể** (kể cả của relation). Có thể dùng cùng lúc: `select: { title: true, assignee: { select: { name: true } } }`.

**Q: Vì sao không dùng Repository pattern?**
> Dự án chọn Service layer gọi thẳng Prisma. Với 37 model và app quy mô này, thêm Repository tạo thêm 1 tầng gián tiếp mà không mang lại lợi ích lớn. Prisma Client đã là abstraction layer đủ.

**Q: Xử lý lỗi ở đâu?**
> NestJS mặc định trả `{ statusCode, message, error }`. Dự án dùng exception chuẩn (`NotFoundException`...) nên response nhất quán mà không cần code thêm. Có thể thêm `ExceptionFilter` riêng để envelope `{ success, data, error }` như `docs/02-API-CONTRACT.md` mô tả — **đây là điểm chưa đồng bộ giữa docs và code**.

**Q: `onDelete: Cascade` trong Prisma hoạt động ở DB hay app?**
> Ở **tầng DB** — tạo `ON DELETE CASCADE` trong PostgreSQL. Xóa `Meeting` → PostgreSQL tự xóa `MeetingAttendee`. Không cần code app can thiệp.
