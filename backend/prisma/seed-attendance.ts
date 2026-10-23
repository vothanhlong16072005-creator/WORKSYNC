import { PrismaClient, AttendanceStatus, RequestStatus, LeaveType, BreakType } from '@prisma/client';

const prisma = new PrismaClient();

function getLocalDateOnly(d: Date): Date {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

async function main() {
  console.log('--- Bắt đầu tạo dữ liệu thực tế cho Attendance Module ---');

  // 1. Tìm user chính (Long Võ)
  let mainUser = await prisma.user.findFirst({
    where: { email: 'vothanhlong1704@gmail.com' },
  });

  if (!mainUser) {
    mainUser = await prisma.user.findFirst({
      where: { role: 'EMPLOYEE' },
    });
  }

  if (!mainUser) {
    throw new Error('Không tìm thấy user nào để tạo dữ liệu');
  }

  console.log(`User chính: ${mainUser.name} (${mainUser.email}) - ID: ${mainUser.id}`);

  // Tìm admin / PM để làm reviewer
  const adminUser = await prisma.user.findFirst({
    where: { OR: [{ role: 'ADMIN' }, { role: 'PM' }, { role: 'HR' }] },
  });
  const reviewerId = adminUser?.id ?? mainUser.id;

  // Lấy các đồng nghiệp khác để tạo đơn chờ duyệt (Approval queue)
  const otherUsers = await prisma.user.findMany({
    where: { id: { not: mainUser.id } },
    take: 4,
  });

  // 2. Tạo AttendanceRecords trong 10 tháng (từ 2026-01-05 đến 2026-10-14)
  console.log('Đang tạo nhật ký điểm danh 365 ngày cho Heatmap & Stats...');
  
  const today = new Date(2026, 9, 14); // 14/10/2026
  const startDate = new Date(2026, 0, 5); // 05/01/2026

  let countCreated = 0;
  const cur = new Date(startDate);

  while (cur < today) {
    const dayOfWeek = cur.getDay(); // 0: CN, 6: T7
    
    // Chỉ tạo cho ngày làm việc (Thứ 2 đến Thứ 6)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateOnly = getLocalDateOnly(cur);
      
      // Seed ngẫu nhiên theo tỷ lệ chuẩn doanh nghiệp
      const rand = Math.random();
      let status: AttendanceStatus = AttendanceStatus.ON_TIME;
      let checkInTime: Date | null = null;
      let checkOutTime: Date | null = null;
      let checkInMethod = 'GPS';
      let note = 'Check-in khuôn viên FPT Complex Đà Nẵng';

      const y = cur.getFullYear();
      const m = cur.getMonth();
      const d = cur.getDate();

      if (rand < 0.82) {
        // 82% Đi làm đúng giờ
        status = AttendanceStatus.ON_TIME;
        const inMin = 10 + Math.floor(Math.random() * 18); // 08:10 - 08:28
        const inSec = Math.floor(Math.random() * 59);
        checkInTime = new Date(y, m, d, 8, inMin, inSec);

        const outMin = 35 + Math.floor(Math.random() * 40); // 17:35 - 18:15
        const outSec = Math.floor(Math.random() * 59);
        checkOutTime = new Date(y, m, d, 17, outMin, outSec);
        checkInMethod = Math.random() > 0.2 ? 'GPS' : 'IP';
      } else if (rand < 0.90) {
        // 8% Đi muộn nhẹ (8:35 - 8:50)
        status = AttendanceStatus.LATE;
        const inMin = 35 + Math.floor(Math.random() * 18);
        const inSec = Math.floor(Math.random() * 59);
        checkInTime = new Date(y, m, d, 8, inMin, inSec);

        const outMin = 40 + Math.floor(Math.random() * 30);
        checkOutTime = new Date(y, m, d, 17, outMin, 0);
        checkInMethod = 'GPS';
        note = 'Đi muộn do kẹt xe cầu Rồng / mưa lớn';
      } else if (rand < 0.95) {
        // 5% Làm việc từ xa (WFH)
        status = AttendanceStatus.WFH;
        checkInTime = new Date(y, m, d, 8, 25, 0);
        checkOutTime = new Date(y, m, d, 17, 30, 0);
        checkInMethod = 'MANUAL';
        note = 'Làm việc tại nhà theo đơn WFH đã duyệt';
      } else if (rand < 0.98) {
        // 3% Về sớm có phép (Early Leave Approved)
        status = AttendanceStatus.EARLY_LEAVE_APPROVED;
        checkInTime = new Date(y, m, d, 8, 15, 0);
        checkOutTime = new Date(y, m, d, 16, 0, 0); // về lúc 16:00
        checkInMethod = 'GPS';
        note = 'Về sớm có phép theo đơn Early Leave';
      } else {
        // 2% Nghỉ phép năm (Absent Approved)
        status = AttendanceStatus.ABSENT_APPROVED;
        checkInTime = null;
        checkOutTime = null;
        checkInMethod = 'MANUAL';
        note = 'Nghỉ phép năm (Annual Leave)';
      }

      await prisma.attendanceRecord.upsert({
        where: {
          userId_date: {
            userId: mainUser.id,
            date: dateOnly,
          },
        },
        update: {
          status,
          checkInTime,
          checkOutTime,
          checkInLat: 15.968600,
          checkInLng: 108.260800,
          checkInIp: '192.168.1.105',
          checkInMethod,
          note,
        },
        create: {
          userId: mainUser.id,
          date: dateOnly,
          status,
          checkInTime,
          checkOutTime,
          checkInLat: 15.968600,
          checkInLng: 108.260800,
          checkInIp: '192.168.1.105',
          checkInMethod,
          note,
        },
      });
      countCreated++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  // 3. Tạo bản ghi HÔM NAY (14/10/2026) cho Long Võ:
  // Đã check-in lúc 08:18:42 sáng, chưa check-out (đang trong ca làm việc)
  const todayDateOnly = getLocalDateOnly(today);
  const todayCheckInTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 18, 42);

  await prisma.attendanceRecord.upsert({
    where: {
      userId_date: {
        userId: mainUser.id,
        date: todayDateOnly,
      },
    },
    update: {
      status: AttendanceStatus.ON_TIME,
      checkInTime: todayCheckInTime,
      checkOutTime: null, // Đang làm việc!
      checkInLat: 15.968600,
      checkInLng: 108.260800,
      checkInIp: '192.168.1.42',
      checkInMethod: 'GPS',
      note: 'Check-in GPS tại FPT Complex Đà Nẵng',
    },
    create: {
      userId: mainUser.id,
      date: todayDateOnly,
      status: AttendanceStatus.ON_TIME,
      checkInTime: todayCheckInTime,
      checkOutTime: null,
      checkInLat: 15.968600,
      checkInLng: 108.260800,
      checkInIp: '192.168.1.42',
      checkInMethod: 'GPS',
      note: 'Check-in GPS tại FPT Complex Đà Nẵng',
    },
  });
  console.log(`Đã tạo ${countCreated} bản ghi lịch sử và bản ghi HÔM NAY cho ${mainUser.name}`);

  // 4. Tạo các đơn WFH cho Long Võ
  await prisma.wfhRequest.deleteMany({ where: { userId: mainUser.id } });
  await prisma.wfhRequest.createMany({
    data: [
      {
        userId: mainUser.id,
        date: new Date(2026, 8, 18),
        expectedStart: '08:30',
        expectedEnd: '17:30',
        reason: 'Nhà có thợ sửa chữa hệ thống mạng và điện nước',
        status: RequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(2026, 8, 17, 15, 30),
      },
      {
        userId: mainUser.id,
        date: new Date(2026, 9, 2),
        expectedStart: '08:30',
        expectedEnd: '17:30',
        reason: 'Thời tiết mưa bão ngập tuyến đường Ngũ Hành Sơn',
        status: RequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(2026, 9, 1, 18, 0),
      },
      {
        userId: mainUser.id,
        date: new Date(2026, 9, 20),
        expectedStart: '08:30',
        expectedEnd: '17:30',
        reason: 'Chờ nhận bàn giao thiết bị phòng lab tại nhà',
        status: RequestStatus.PENDING,
      },
    ],
  });

  // 5. Tạo các đơn Nghỉ phép (Leave Requests) cho Long Võ
  await prisma.leaveRequest.deleteMany({ where: { userId: mainUser.id } });
  await prisma.leaveRequest.createMany({
    data: [
      {
        userId: mainUser.id,
        startDate: new Date(2026, 7, 20),
        endDate: new Date(2026, 7, 21),
        leaveType: LeaveType.ANNUAL,
        dayCount: 2,
        reason: 'Nghỉ du lịch thường niên cùng gia đình tại Quy Nhơn',
        status: RequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(2026, 7, 18),
      },
      {
        userId: mainUser.id,
        startDate: new Date(2026, 8, 10),
        endDate: new Date(2026, 8, 10),
        leaveType: LeaveType.ANNUAL,
        dayCount: 1,
        reason: 'Khám sức khỏe định kỳ',
        status: RequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(2026, 8, 8),
      },
      {
        userId: mainUser.id,
        startDate: new Date(2026, 9, 23),
        endDate: new Date(2026, 9, 23),
        leaveType: LeaveType.ANNUAL,
        dayCount: 1,
        reason: 'Giải quyết việc riêng gia đình',
        status: RequestStatus.PENDING,
      },
    ],
  });

  // 6. Tạo đơn Về sớm (EarlyLeaveRequest) cho Long Võ
  await prisma.earlyLeaveRequest.deleteMany({ where: { userId: mainUser.id } });
  await prisma.earlyLeaveRequest.create({
    data: {
      userId: mainUser.id,
      date: new Date(2026, 8, 25),
      expectedLeaveTime: new Date(2026, 8, 25, 16, 0, 0),
      reason: 'Đưa người thân đi khám tại Bệnh viện Phụ sản - Nhi Đà Nẵng',
      status: RequestStatus.APPROVED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(2026, 8, 25, 11, 20),
    },
  });

  // 7. Tạo đơn Làm thêm giờ (OvertimeRequest) cho Long Võ
  await prisma.overtimeRequest.deleteMany({ where: { userId: mainUser.id } });
  await prisma.overtimeRequest.create({
    data: {
      userId: mainUser.id,
      date: new Date(2026, 9, 8),
      registeredStart: new Date(2026, 9, 8, 17, 30, 0),
      registeredEnd: new Date(2026, 9, 8, 20, 30, 0),
      registeredHours: 3.0,
      actualHours: 2.8,
      reason: 'Deploy bản vá khẩn cấp (Hotfix Release) cho PLATFORM v3.1',
      status: RequestStatus.APPROVED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(2026, 9, 8, 16, 45),
    },
  });

  // 8. Tạo BreakLog hôm nay cho Long Võ
  await prisma.breakLog.deleteMany({ where: { userId: mainUser.id } });
  await prisma.breakLog.create({
    data: {
      userId: mainUser.id,
      date: todayDateOnly,
      startTime: new Date(2026, 9, 14, 12, 0, 0),
      endTime: new Date(2026, 9, 14, 13, 0, 0),
      duration: 60,
      reason: 'Ăn trưa tại Canteen FPT Complex',
      type: BreakType.MANUAL,
    },
  });

  // 9. Tạo đơn PENDING từ các đồng nghiệp khác để hiển thị Hàng đợi duyệt (Approval Queue)
  if (otherUsers.length > 0) {
    console.log('Đang tạo đơn chờ duyệt từ đồng nghiệp cho Hàng đợi phê duyệt (Approval Queue)...');
    
    // User 1
    const u1 = otherUsers[0];
    const d1 = new Date(2026, 9, 16);
    const existingWfh1 = await prisma.wfhRequest.findFirst({ where: { userId: u1.id, date: d1 } });
    if (!existingWfh1) {
      await prisma.wfhRequest.create({
        data: {
          userId: u1.id,
          date: d1,
          expectedStart: '08:30',
          expectedEnd: '17:30',
          reason: 'Chăm sóc con nhỏ bị sốt tại nhà',
          status: RequestStatus.PENDING,
        },
      });
    }

    const dLeave1Start = new Date(2026, 9, 21);
    const existingLeave1 = await prisma.leaveRequest.findFirst({ where: { userId: u1.id, startDate: dLeave1Start } });
    if (!existingLeave1) {
      await prisma.leaveRequest.create({
        data: {
          userId: u1.id,
          startDate: dLeave1Start,
          endDate: new Date(2026, 9, 22),
          leaveType: LeaveType.ANNUAL,
          dayCount: 2,
          reason: 'Về quê đám cưới người thân',
          status: RequestStatus.PENDING,
        },
      });
    }

    const dEarly1 = new Date(2026, 9, 15);
    const existingEarly1 = await prisma.earlyLeaveRequest.findFirst({ where: { userId: u1.id, date: dEarly1 } });
    if (!existingEarly1) {
      await prisma.earlyLeaveRequest.create({
        data: {
          userId: u1.id,
          date: dEarly1,
          expectedLeaveTime: new Date(2026, 9, 15, 16, 15),
          reason: 'Đi họp phụ huynh đầu năm học cho con',
          status: RequestStatus.PENDING,
        },
      });
    }

    // User 2
    if (otherUsers.length > 1) {
      const u2 = otherUsers[1];
      const dWfh2 = new Date(2026, 9, 17);
      const existingWfh2 = await prisma.wfhRequest.findFirst({ where: { userId: u2.id, date: dWfh2 } });
      if (!existingWfh2) {
        await prisma.wfhRequest.create({
          data: {
            userId: u2.id,
            date: dWfh2,
            expectedStart: '08:30',
            expectedEnd: '17:30',
            reason: 'Nghiên cứu tài liệu và test hiệu năng mạng độc lập',
            status: RequestStatus.PENDING,
          },
        });
      }

      const dOt2 = new Date(2026, 9, 15);
      const existingOt2 = await prisma.overtimeRequest.findFirst({ where: { userId: u2.id, date: dOt2 } });
      if (!existingOt2) {
        await prisma.overtimeRequest.create({
          data: {
            userId: u2.id,
            date: dOt2,
            registeredStart: new Date(2026, 9, 15, 17, 30),
            registeredEnd: new Date(2026, 9, 15, 20, 30),
            registeredHours: 3.0,
            reason: 'Test hồi quy (Regression Test) cho Sprint 4',
            status: RequestStatus.PENDING,
          },
        });
      }
    }

    // User 3
    if (otherUsers.length > 2) {
      const u3 = otherUsers[2];
      const dLeave3 = new Date(2026, 9, 28);
      const existingLeave3 = await prisma.leaveRequest.findFirst({ where: { userId: u3.id, startDate: dLeave3 } });
      if (!existingLeave3) {
        await prisma.leaveRequest.create({
          data: {
            userId: u3.id,
            startDate: dLeave3,
            endDate: dLeave3,
            leaveType: LeaveType.ANNUAL,
            dayCount: 1,
            reason: 'Gia đình có lễ giỗ',
            status: RequestStatus.PENDING,
          },
        });
      }

      const dOt3 = new Date(2026, 9, 16);
      const existingOt3 = await prisma.overtimeRequest.findFirst({ where: { userId: u3.id, date: dOt3 } });
      if (!existingOt3) {
        await prisma.overtimeRequest.create({
          data: {
            userId: u3.id,
            date: dOt3,
            registeredStart: new Date(2026, 9, 16, 17, 30),
            registeredEnd: new Date(2026, 9, 16, 20, 0),
            registeredHours: 2.5,
            reason: 'Chuẩn bị môi trường UAT cho khách hàng nghiệm thu',
            status: RequestStatus.PENDING,
          },
        });
      }
    }
  }

  console.log('✅ Hoàn tất tạo dữ liệu thực tế cho Attendance Module!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
