# 06 — Feature M2: Điểm Danh Thông Minh & Quản Trị Chuyên Cần

> **Module:** `backend/src/attendance/` — **39 file**, 11 service
> **Frontend:** `frontend/src/features/attendance/` — 29 file
> **Đây là module nghiệp vụ đầy đủ nhất, làm chuẩn cho các module sau.**

---

## 1. Bối Cảnh & Vấn Đề Giải Quyết

**Vấn đề:** máy chấm công vân tay/thẻ từ — xếp hàng, thuê nhân sự vận hành, không biết ai vắng mặt cho đến cuối ngày, không hỗ trợ WFH (đại dịch COVID chứng minh nhu cầu này).

**Giải pháp WorkSync:** nhân viên bấm 1 nút trên web/mobile. Backend **tự động xác thực kép**:
1. **IP Public** có thuộc dải IP Wifi mạng nội bộ văn phòng?
2. **GPS** có nằm trong bán kính quanh tọa độ văn phòng?

Trải nghiệm: 1.2 giây (mục tiêu ≤ 3 giây — đạt).

---

## 2. Kiến Trúc Module — 11 Service Chuyên Biệt

```
attendance/
├── attendance.controller.ts   (361 dòng)  ← 15+ endpoint
├── attendance.service.ts      (517 dòng)  ← orchestrator check-in/out
├── attendance.module.ts       (43 dòng)
│
├── utils/
│   ├── office-presets.ts      (112 dòng)  ← 3 văn phòng FPT + Haversine
│   └── time-calculator.ts     (90 dòng)   ← công thức giờ làm, OT, về sớm
│
├── geo-validation.service.ts  (58 dòng)   ← Geofencing
├── ip-validation.service.ts   (34 dòng)   ← IP range check
│
├── wfh.service.ts             (225 dòng)
├── leave.service.ts           (201 dòng)
├── leave-balance.service.ts   (62 dòng)
├── overtime.service.ts        (113 dòng)
├── early-leave.service.ts     (105 dòng)
├── break.service.ts           (88 dòng)
├── auto-approve.service.ts    (62 dòng)   ← cron 09:30
└── export.service.ts          (181 dòng)   ← Excel + PDF
```

> **Bài học kiến trúc:** Tách 11 service thay vì 1 file khổng lồ. Mỗi file < 250 dòng → dễ đọc, dễ test, dễ giao cho người khác.

---

## 3. Xác Thực GPS — Công Thức Haversine

### 3.1 Vì sao không dùng công thức khoảng cách phẳng (Euclidean)?

Trông bề mặt giống nhau, nhưng **sai số rất lớn ở vĩ độ cao**. Ví dụ ở Đà Nẵng (15.97°N):

| Công thức | Sai số ở 100m |
|-----------|---------------|
| Euclidean (x = lon × cos(lat)) | ~±3m — chấp nhận được |
| Haversine (trên sphere) | < 0.5m — chính xác |

Ở vĩ độ cao hơn (Hà Nội 21°N, TP.HCM 10.7°N) sai số Euclidean tăng lên. Haversine là chuẩn cho geofencing.

### 3.2 Code thật (`utils/office-presets.ts`)

```typescript
const EARTH_RADIUS_METERS = 6371000;   // 6.371.000 mét

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two coordinates in meters
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}
```

### 3.3 Giải thích từng dòng

```
dLat, dLon          → góc giữa 2 điểm (đổi độ → radian)
sin²(dLat/2) + cos(lat1)·cos(lat2)·sin²(dLon/2)  → a
c = 2·atan2(√a, √(1−a))  → góc ở tâm (radian)
d = R · c                → khoảng cách (mét)
```

**`atan2(y, x)`** (không phải `atan(y/x)`) — `atan2` xử lý đúng 4 góc phần tư, tránh lỗi chia cho 0 khi x = 0.

### 3.4 Tìm văn phòng gần nhất

```typescript
export function findNearestOffice(lat: number, lng: number): NearestOfficeResult {
  let nearest = OFFICE_PRESETS[0]!;
  let minDistance = Infinity;

  for (const office of OFFICE_PRESETS) {
    const d = haversineDistance(lat, lng, office.lat, office.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = office;
    }
  }
  return { office: nearest, distanceMeters: minDistance };
}
```

**O(n) với n = 3** — không cần tối ưu. Tự động nhận diện chi nhánh gần nhất.

---

## 4. 3 Văn Phòng FPT — Dữ Liệu Thật

```typescript
export const OFFICE_PRESETS: readonly OfficePreset[] = [
  {
    id: 'dn', code: 'FPT_DN',
    nameVi: 'FPT Complex Đà Nẵng',
    nameEn: 'FPT Complex Da Nang',
    addressVi: 'Đường Nam Kỳ Khởi Nghĩa, P. Hòa Hải, Q. Ngũ Hành Sơn, TP. Đà Nẵng',
    lat: 15.9686, lng: 108.2608,
    radiusMeters: 100,                    // ← 100m
    buildingSvg: '/office-buildings/fpt-dn.svg',
    city: 'Da Nang',
  },
  {
    id: 'hn', code: 'FPT_HN',
    nameVi: 'FPT Software Tower Hà Nội',
    addressVi: 'Số 10 Phố Phạm Văn Bạch, Q. Cầu Giấy, TP. Hà Nội',
    lat: 21.0285, lng: 105.7842,
    radiusMeters: 100,
    buildingSvg: '/office-buildings/fpt-hn.svg',
    city: 'Hanoi',
  },
  {
    id: 'hcm', code: 'FPT_HCM',
    nameVi: 'FPT Tân Thuận TP.HCM',
    addressVi: 'Lô T2, Đường D1, Khu chế xuất Tân Thuận, Quận 7, TP.HCM',
    lat: 10.7735, lng: 106.732,
    radiusMeters: 100,
    buildingSvg: '/office-buildings/fpt-hcm.svg',
    city: 'Ho Chi Minh',
  },
] as const;
```

### ⚠️ Điểm cần lưu ý khi trình bày

| Nguồn | Bán kính |
|-------|----------|
| `docs/01-FEATURES.md`, `MO_TA_DU_AN.md` (thiết kế) | 500m |
| `office-presets.ts` (code thực tế) | **100m** |
| `geo-validation.service.ts` (default param) | 500m — **nhưng luôn được override** |

**Code thực tế dùng 100m** (commit `891b458`: "geofence 100m"). Lý do: 100m đủ để cover tòa nhà FPT mà vẫn chặn được check-in từ quán cà phê gần đó.

**`geo-validation.service.ts` có `radiusMeters = 500` là default param**, nhưng trong `attendance.service.ts` luôn truyền `config.gpsRadiusMeters` (từ `SystemConfig`, mặc định 100) → default 500 **không bao giờ được dùng**. Đây là code smell nhỏ nên biết.

---

## 5. Xác Thực IP — Chống Giả Mạo Tọa Độ

### 5.1 Code thật (`ip-validation.service.ts`)

```typescript
@Injectable()
export class IpValidationService {
  /**
   * Normalize IP (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
   */
  private normalizeIp(ip: string): string {
    if (!ip) return '';
    const trimmed = ip.trim();
    if (trimmed.startsWith('::ffff:')) {
      return trimmed.replace('::ffff:', '');
    }
    return trimmed;
  }

  isAllowed(clientIp: string, allowedRanges?: string[]): boolean {
    if (!clientIp || typeof clientIp !== 'string') return false;
    if (!allowedRanges || !Array.isArray(allowedRanges) || allowedRanges.length === 0) return false;

    const cleanIp = this.normalizeIp(clientIp);
    if (!cleanIp) return false;

    try {
      return Boolean(ipRangeCheck(cleanIp, allowedRanges));
    } catch {
      return false;      // ← fail-closed: lỗi → cho là KHÔNG hợp lệ
    }
  }
}
```

### 5.2 2 chi tiết kỹ thuật đáng chú ý

**① Normalize IPv4-mapped IPv6**

Node.js trả IP client dưới dạng `::ffff:192.168.1.1` khi request qua IPv6 socket. Nếu không bỏ prefix `::ffff:` → so sánh với dải IPv4 không khớp → check-in IP luôn fail. Đây là **bug thực tế rất dễ gặp**.

**② Fail-closed**

```typescript
catch { return false; }
```
Lỗi → coi như **không hợp lệ** (từ chối), không phải cho qua. Nguyên tắc bảo mật: **lỗi hệ thống không được mở cửa**.

### 5.3 Thư viện `ip-range-check`

Hỗ trợ định dạng:
```
"192.168.1.0/24"        ← CIDR
"192.168.1.1-192.168.1.50"  ← dải
"192.168.1.*"           ← wildcard
```

Dữ liệu lưu trong `SystemConfig.allowedIpRanges String[]`.

---

## 6. Luồng Check-In — 8 Bước

```typescript
async checkIn(userId: string, dto: CheckInDto, now = new Date()): Promise<AttendanceRecord> {
  const config = await this.prisma.systemConfig.findFirst();
  if (!config) throw new InternalServerErrorException('System config not initialized');

  const timezone = config.timezone || 'Asia/Ho_Chi_Minh';

  // ① Kiểm tra khung giờ check-in
  const withinWindow = this.isWithinCheckinWindow(
    now, config.checkinStartTime, config.checkinEndTime, timezone,
  );
  if (!withinWindow) {
    throw new BadRequestException({
      code: 'OUTSIDE_CHECKIN_WINDOW',
      message: `Chỉ được phép check-in từ ${config.checkinStartTime} đến ${config.checkinEndTime}`,
    });
  }

  const today = this.getLocalDateOnly(now, timezone);

  // ② Đã check-in hôm nay chưa?
  const existing = await this.prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId, date: today } },   // ← unique composite
  });
  if (existing) {
    throw new ConflictException({
      code: 'ALREADY_CHECKED_IN',
      message: 'Bạn đã check-in hôm nay rồi',
    });
  }

  // ③ Có đơn WFH được duyệt hôm nay không?
  const approvedWfh = await this.prisma.wfhRequest.findFirst({
    where: { userId, date: today, status: { in: ['APPROVED', 'AUTO_APPROVED'] } },
  });

  // ④ Xác định status
  let status: AttendanceStatus;
  if (approvedWfh) {
    status = AttendanceStatus.WFH;
  } else {
    status = this.determineStatus(now, config.workStartTime, timezone);
  }

  // ⑤ Validate IP
  const ipAllowed = dto.ipAddress
    ? this.ipValidation.isAllowed(dto.ipAddress, config.allowedIpRanges)
    : false;

  // ⑥ Validate GPS
  const gpsValid =
    dto.latitude != null && dto.longitude != null
      ? this.geoValidation.isWithinRadius(
          dto.latitude, dto.longitude,
          config.officeLatitude, config.officeLongitude,
          config.gpsRadiusMeters,        // ← truyền từ config, không dùng default
        )
      : false;

  // ⑦ Xác định phương thức check-in
  let checkInMethod: string;
  if (dto.latitude != null && dto.longitude != null && gpsValid) {
    checkInMethod = 'GPS';
  } else if (ipAllowed) {
    checkInMethod = 'IP';
  } else {
    checkInMethod = 'MANUAL';        // ← vẫn cho phép, nhưng ghi chú cảnh báo
  }

  // ⑧ Ghi chú nếu không khớp
  let note = dto.note ?? null;
  if (!note) {
    if (!approvedWfh && !gpsValid && !ipAllowed) {
      note = 'Check-in ngoài vùng văn phòng (IP/GPS không khớp)';
    }
  }

  return this.prisma.attendanceRecord.create({ data: { ... } });
}
```

### 6.1 Bảng `checkInMethod` — 3 giá trị

| Method | Điều kiện | Ý nghĩa |
|--------|-----------|----------|
| `GPS` | có lat/lng + trong bán kính | Xác thực mạnh nhất |
| `IP` | IP trong dải văn phòng (không có GPS hợp lệ) | Xác thực wifi |
| `MANUAL` | Không khớp IP lẫn GPS | Vẫn tạo bản ghi + ghi chú cảnh báo |

> **Quyết định thiết kế quan trọng:** Hệ thống **không chặn** check-in khi không xác thực được → vẫn ghi nhận + đánh dấu `MANUAL` + ghi chú. HR sẽ xử lý sau. **Chặn cứng** sẽ gây bất tiện khi mạng lỗi/nhà mới. Đây là trade-off "kinh doanh" hợp lý — nên giải thích khi giáo viên hỏi.

### 6.2 Logic xác định status (`determineStatus`)

```typescript
const diff = currentMinutes - startMinutes;   // startMinutes = 08:00

if (diff <= 0)  return AttendanceStatus.ON_TIME;        // ≤ 08:00
if (diff <= 15) return AttendanceStatus.LATE;           // 08:01 – 08:15
if (diff <= 60) return AttendanceStatus.VERY_LATE;      // 08:16 – 09:00
return AttendanceStatus.ABSENT_UNAPPROVED;              // > 09:00
```

**Lưu ý:** code dùng `workStartTime` (08:00) làm mốc, khác với `MO_TA_DU_AN.md` (09:00). Code thực tế: `SystemConfig.workStartTime = '08:00'`, `checkinEndTime = '12:00'`.

---

## 7. Xử Lý Timezone — Vấn Đề Dễ Sai Nhất

### 7.1 `getLocalDateOnly` — chuẩn hóa ngày theo múi giờ VN

```typescript
private getLocalDateOnly(date = new Date(), timezone = 'Asia/Ho_Chi_Minh'): Date {
  let dateStr: string;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    dateStr = formatter.format(date);      // → "YYYY-MM-DD"
  } catch {
    dateStr = date.toISOString().split('T')[0];   // fallback
  }
  return new Date(`${dateStr}T00:00:00.000Z`);   // ← midnight UTC
}
```

**Vì sao phải làm vậy?** Cột `date` trong DB là kiểu `@db.Date` (chỉ ngày, không giờ). Nếu user check-in lúc 00:30 ngày 25/10 (giờ VN) mà server dùng UTC → UTC vẫn là 17:30 ngày 24/10 → ghi sai ngày.

**`en-CA`** là locale cho format `YYYY-MM-DD` — chính xác, không phụ thuộc thứ tự ngày/tháng.

**`T00:00:00.000Z`** — chuẩn hóa về midnight UTC để giá trị so sánh được (`@@unique([userId, date])`).

### 7.2 Tính giờ làm việc (`utils/time-calculator.ts`)

```typescript
export function getLunchOverlapMinutes(
  checkIn: Date, checkOut: Date,
  config: LunchConfig = DEFAULT_LUNCH_CONFIG,
): number {
  if (checkOut <= checkIn) return 0;

  const dayStart = startOfDay(checkIn);
  const lunchStart = set(dayStart, { hours: config.lunchStartHour, minutes: 0 });
  const lunchEnd = set(dayStart, { hours: config.lunchEndHour, minutes: 0 });

  const overlapStart = max([checkIn, lunchStart]);    // ← date-fns max/min
  const overlapEnd = min([checkOut, lunchEnd]);

  if (overlapStart >= overlapEnd) return 0;
  return differenceInMinutes(overlapEnd, overlapStart);
}

export function calculateWorkHours(checkIn, checkOut, config = DEFAULT_LUNCH_CONFIG): number {
  const inDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
  const outDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;

  if (!inDate || !outDate || isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 0;
  if (outDate <= inDate) return 0;

  const totalMinutes = differenceInMinutes(outDate, inDate);
  const lunchOverlap = getLunchOverlapMinutes(inDate, outDate, config);
  const workMinutes = Math.max(0, totalMinutes - lunchOverlap);
  return Math.round((workMinutes / 60) * 100) / 100;   // ← 2 chữ số thập phân
}
```

**Ví dụ đã ghi trong JSDoc:**

| Check-in | Check-out | Tổng | Trừ nghỉ trưa | Kết quả |
|----------|-----------|------|---------------|---------|
| 08:30 | 17:30 | 540 phút | 60 | **8.0 giờ** |
| 08:30 | 12:00 | 210 phút | 0 | **3.5 giờ** |
| 13:00 | 18:00 | 300 phút | 0 | **5.0 giờ** |

**`max`/`min` của `date-fns`** — so sánh 2 Date, trả về Date sớm/lớn hơn. Xử lý đúng case check-in 11:00 check-out 14:00 (nghỉ trưa 12:00-13:00 chồng lấn).

### 7.3 Công thức OT theo HRM (`calculateActualOTHours`)

```typescript
/**
 * HRM standard: actualOT = min(registeredHours, checkOutTime - workEndTime)
 */
export function calculateActualOTHours(
  checkOut: Date, registeredHours: number,
  workEndHour: number = 17, workEndMinute: number = 30,
): number {
  if (registeredHours <= 0) return 0;
  const dayStart = startOfDay(checkOut);
  const workEnd = set(dayStart, { hours: workEndHour, minutes: workEndMinute });
  if (checkOut <= workEnd) return 0;
  const actualMinutes = differenceInMinutes(checkOut, workEnd);
  const actualHours = Math.min(registeredHours, actualMinutes / 60);   // ★ min()
  return Math.round(actualHours * 10) / 10;
}
```

**Ý nghĩa `min()`:** nhân viên đăng ký OT 3h nhưng chỉ làm đến 19:00 (giờ hết 17:30 → 1.5h) → OT thực tế = **1.5h**, không phải 3h. Ngăn gian lậy "đăng ký nhiều để nhận nhiều".

### 7.4 Công thức về sớm (`calculateEarlyMinutes`)

```typescript
export function calculateEarlyMinutes(
  checkOut: Date, workEndHour = 17, workEndMinute = 30,
  timezone = 'Asia/Ho_Chi_Minh',
): number {
  const dayStart = startOfDay(checkOut);
  const workEnd = set(dayStart, { hours: workEndHour, minutes: workEndMinute });
  return differenceInMinutes(workEnd, checkOut);
}
```
- **Dương** = về sớm (VD: +60 = về sớm 1 tiếng)
- **Âm** = ở lại quá muộn (VD: -30 = ở lại 30 phút)

---

## 8. Luồng Check-Out — Phát Hiện Về Sớm

```typescript
async checkOut(userId: string, dto: CheckOutDto, now = new Date()) {
  const existing = await this.prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (!existing) throw new BadRequestException({ code: 'NOT_CHECKED_IN', ... });
  if (existing.checkOutTime) {
    throw new ConflictException({ code: 'ALREADY_CHECKED_OUT', ... });
  }

  // ★ Phát hiện về sớm
  let finalStatus = existing.status;
  const workEnd = new Date(today);
  workEnd.setHours(17, 30, 0, 0);
  if (now < workEnd) {
    const earlyLeave = await this.prisma.earlyLeaveRequest.findFirst({
      where: { userId, date: today, status: 'APPROVED' },
    });
    // Nếu expectedLeaveTime >= now → đi đúng giờ đã đăng ký → vẫn hợp lệ
    if (earlyLeave && new Date(earlyLeave.expectedLeaveTime).getTime() >= now.getTime()) {
      finalStatus = AttendanceStatus.EARLY_LEAVE_APPROVED;
    } else {
      finalStatus = AttendanceStatus.EARLY_LEAVE_UNAPPROVED;
    }
  }
  // ...
}
```

**`EARLY_LEAVE_APPROVED` vs `EARLY_LEAVE_UNAPPROVED`** — 2 enum riêng, thay vì dùng chung `LATE`. Lý do: HR cần phân biệt "về sớm có đơn" (hợp lệ) với "về sớm không đơn" (cần xử lý).

**Điều kiện `expectedLeaveTime >= now`** — nhân viên đăng ký về sớm lúc 16:00 nhưng thực tế về lúc 15:00 (sớm hơn dự kiến) → `UNAPPROVED`. Hợp lý: về sớm quá mức đăng ký.

---

## 9. 4 Loại Đơn Từ + Quy Trình Duyệt

### 9.1 Bảng tổng quan

| Đơn | Model | Quyền duyệt | Tự động |
|------|-------|-------------|---------|
| **Nghỉ phép** | `LeaveRequest` | HR, DEPT_HEAD | ❌ (trừ quỹ phép) |
| **WFH** | `WfhRequest` | HR, DEPT_HEAD, PM | ✅ 09:30 |
| **Về sớm** | `EarlyLeaveRequest` | HR, DEPT_HEAD, PM | ❌ |
| **Làm thêm giờ** | `OvertimeRequest` | HR, DEPT_HEAD, PM | ❌ |
| **Ra ngoài** | `BreakLog` | — (ghi nhận tự do) | ❌ |

### 9.2 Quỹ Nghỉ Phép — `dayCount Float`

```prisma
model LeaveRequest {
  startDate  DateTime   @db.Date
  endDate    DateTime   @db.Date
  leaveType  LeaveType  // ANNUAL | SICK | UNPAID | COMPENSATORY
  dayCount   Float      // ← 2.0 = 2 ngày, 0.5 = nửa ngày
  status     RequestStatus @default(PENDING)
  reviewedBy String?
  reviewedAt DateTime?
}
```

**`Float` thay vì `Int`** — cho phép nghỉ nửa ngày (buổi sáng hoặc buổi chiều). Nghiệp vụ HR thực tế cần thiết.

### 9.3 Auto-approve WFH lúc 09:30 (`auto-approve.service.ts`)

```typescript
@Cron('0 30 9 * * *')     // 09:30 mỗi ngày
async autoApprovePendingWfh() {
  const today = this.getLocalDateOnly();
  const pending = await this.prisma.wfhRequest.findMany({
    where: { date: today, status: 'PENDING' },
  });

  for (const req of pending) {
    await this.prisma.wfhRequest.update({
      where: { id: req.id },
      data: {
        status: 'AUTO_APPROVED',
        reviewedAt: new Date(),
        // reviewedBy: null hoặc 'system'
      },
    });
    // Gửi notification cho nhân viên
  }
}
```

**Lý do nghiệp vụ:** nhếch nhân viên WFH không cần nhờ HR xử lý thủ công mỗi sáng. Nhưng nếu HR cần kiểm tra thì vẫn có thể duyệt/từ chối trước 09:30.

**`status: 'AUTO_APPROVED'`** là enum riêng (không dùng `APPROVED`) → **phân biệt được** "HR duyệt" vs "hệ thống tự duyệt" khi báo cáo.

### 9.4 Endpoint phê duyệt

```
PATCH /api/attendance/wfh-requests/:id/approve
PATCH /api/attendance/wfh-requests/:id/reject
PATCH /api/attendance/leave-requests/:id/approve    ← trừ quỹ phép (transaction)
PATCH /api/attendance/early-leave-requests/:id/approve
PATCH /api/attendance/overtime-requests/:id/approve
GET  /api/attendance/approval-queue                 ← hàng đợi cho HR/PM/DEPT_HEAD
```

**Duyệt nghỉ phép phải là transaction** (trừ quỹ + ghi `ABSENT_APPROVED` cho các ngày + notification) — không được làm nửa vời.

---

## 10. Frontend — 5 Tab & Bản Đồ

### 10.1 `AttendancePage.tsx` — Hub với 5 tab

| Tab | Nội dung | Component |
|-----|----------|-----------|
| **Hôm nay** | Banner live-ticking, quỹ phép, bản đồ geofence | `GeofenceMapCard`, `LeaveBalanceCard` |
| **Lịch sử** | Bảng nhiệt 365 ngày (GitHub-style), biểu đồ 30 ngày | `CalendarHeatmapView`, `StatsSummaryView` |
| **Đơn của tôi** | Danh sách đơn đã nộp | `MyRequests` |
| **Hàng đợi duyệt** | Duyệt WFH/phép/OT (HR/PM/DEPT_HEAD) | `ApprovalQueueView` |
| **Cài đặt** | Cấu hình giờ làm, IP, GPS | `AttendanceSettingsView` |

**Guard ở cấp tab**, không phải cấp page — vì `/attendance` mở cho **mọi vai trò** (chỉ khác nhau ở tab duyệt):

```tsx
// App.tsx
{/* Attendance is open to ALL authenticated roles; tab-level guards run inside the page. */}
<Route path="/attendance" element={<AttendancePage />} />
```

### 10.2 Bản đồ Leaflet (`GeofenceMapCard.tsx`)

```tsx
import { MapContainer, Circle, Marker, Popup, Polyline } from 'react-leaflet';
```

**Hiển thị:**
- Marker vị trí hiện tại (động)
- **Circle** bán kính geofence (SVG tròn)
- Marker văn phòng với custom building SVG icon
- Polyline nối vị trí hiện tại → văn phòng (animated)

**Leaflet** (không phải Google Maps) vì: nhẹ, OpenStreetMap miễn phí, **không cần API key**.

### 10.3 Bảng nhiệt 365 ngày (`CalendarHeatmapView.tsx`)

**Kiểu GitHub Contributions:**
```
        T2  T3  T4  T5  T6  T7   CN
Tuần 1  ▢   ▣   ▣   ▢   ▢   ▢    ▢
Tuần 2  ▣   ▣   ▢   ▣   ▣   ▢    ▢
...
52 tuần × 7 ngày = 364 ô
```
- Mỗi ô = 1 ngày
- Màu = trạng thái chấm công (9 trạng thái → 9 mức màu)
- Tooltip = chi tiết giờ check-in/out, giờ làm việc

### 10.4 Thu thập IP — `usePublicIp.ts`

```typescript
export function usePublicIp() {
  const [ip, setIp] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setIp(d.ip); })
      .catch(() => { if (!cancelled) setIp(null); });
    return () => { cancelled = true; };
  }, []);
  return ip;
}
```

**Vì sao cần IP public?** IP mà browser thấy là IP trong mạng nội bộ (192.168.x.x) — không phải IP Wifi văn phòng. `api.ipify.org` trả IP public mà server nhìn thấy.

**Fallback:** nếu fetch fail → IP = null → `checkInMethod` = `GPS` hoặc `MANUAL`.

---

## 11. Xuất Báo Cáo Excel & PDF (`export.service.ts`)

```typescript
// backend/src/attendance/export.service.ts
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
```

| Định dạng | Thư viện | Ghi chú |
|-----------|-----------|---------|
| `.xlsx` | `xlsx` (SheetJS) | Multi-sheet: chi tiết + tổng hợp |
| `.pdf` | `jspdf` + `jspdf-autotable` | Header, bảng, footer |

**Chi tiết quan trọng: UTF-8 BOM cho file CSV/Excel**

Khi export CSV tiếng Việt, Excel trên Windows mở ra bị lỗi font ("Anh Tuấn" → "Anh Tuấn" sai dấu) nếu **không có BOM**.

```typescript
// Thêm BOM vào đầu file
const BOM = '\uFEFF';
const csvContent = BOM + rows.map(...).join('\n');
```

> Đây chính là bug đã được sửa trong commit `2912a84`: "nâng cấp xuất CSV / Excel có UTF-8 BOM". Rất đáng để kể — là lỗi thực tế, không phải lý thuyết.

---

## 12. Bảng Tổng Hợp 9 Trạng Thái Chấm Công

| Status | Ý nghĩa | Ghi chú |
|--------|---------|---------|
| `ON_TIME` | Check-in ≤ giờ quy định | |
| `LATE` | Trễ ≤ 15 phút | |
| `VERY_LATE` | Trễ 16–60 phút | |
| `ABSENT_UNAPPROVED` | Vắng mặt không phép | |
| `ABSENT_APPROVED` | Nghỉ phép đã duyệt | Ghi khi duyệt đơn |
| `WFH` | Làm việc từ xa đã duyệt | |
| `EARLY_LEAVE_APPROVED` | Về sớm có đơn | |
| `EARLY_LEAVE_UNAPPROVED` | Về sớm không đơn | |
| `BUSINESS_TRIP` | Công tác | |

---

## 13. Câu Hỏi Thường Gặp

**Q: Check-in từ nhà (WFH) có được không?**
> Được, nhưng phải **có đơn WFH được duyệt** (hoặc auto-approve lúc 09:30). Khi đó status = `WFH`, không cần IP/GPS khớp. Nếu không có đơn mà check-in từ nhà → status tính theo giờ + ghi chú "ngoài vùng văn phòng".

**Q: GPS bị giả mạo thì sao?**
> Đó là lý do có **xác thực kép** (IP + GPS). Giả mạo GPS khó nhưng không phải không được — nên kết hợp kiểm tra IP (khó giả mạo hơn nhiều vì phải ở trong mạng Wifi công ty). Ngoài ra có thể thêm **định vị tương đối** (kiểm tra movement pattern) ở phiên bản nâng cao.

**Q: Tại sao `date` lưu kiểu `@db.Date` mà không phải DateTime?**
> Vì nghiệp vụ là "ngày nào", không phải "lúc nào". Tách `date` (ngày) và `checkInTime`/`checkOutTime` (giờ) → query theo ngày cực nhanh bằng index, không cần range query.

**Q: Vì sao có cả `checkInTime` và `date` — trùng nhau không?**
> Không trùng. `date` = 25/10/2026 (ngày làm việc). `checkInTime` = 25/10/2026 08:14:33 (thời điểm chính xác). Cần cả 2: 1 để group theo ngày, 1 để tính giờ làm việc.

**Q: Xử lý case về sớm thế nào?**
> Nhân viên đăng ký đơn `EarlyLeaveRequest` với `expectedLeaveTime`. Khi check-out trước 17:30 → kiểm tra đơn: nếu `expectedLeaveTime >= now` → `EARLY_LEAVE_APPROVED`, ngược lại → `EARLY_LEAVE_UNAPPROVED`. HR xử lý trong hàng đợi duyệt.

**Q: Nghỉ trưa có được trừ không?**
> Có. `getLunchOverlapMinutes` tính phần giao overlap giữa [checkIn, checkOut] và [12:00, 13:00]. Check-in 08:30 check-out 17:30 → trừ 60 phút → 8.0 giờ.

**Q: Vì sao module này có nhiều service nhất?**
> Vì nghiệp vụ chấm công có nhiều quy tắc độc lập: GPS, IP, phép, WFH, về sớm, OT, nghỉ trưa, export, auto-approve. Gom vào 1 file → file 1500 dòng, không test được. Tách service theo subdomain là cách chuẩn để giữ mỗi file dưới 250 dòng.

**Q: Độ trễ P95 của API?**
> 45–120ms nhờ Redis cache + Prisma index (theo `docs/00-PRD.md` §3). Check-in 1-click: **1.2 giây** (mục tiêu ≤ 3s) — đã đạt.
