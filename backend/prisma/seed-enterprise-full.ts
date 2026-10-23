import {
  PrismaClient,
  Role,
  UserStatus,
  ProjectKind,
  ProjectStatus,
  SprintStatus,
  TaskStatus,
  Priority,
  AttendanceStatus,
  RequestStatus,
  LeaveType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 [SEED] Bắt đầu khởi tạo dữ liệu doanh nghiệp chuẩn 100% Real...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Khởi tạo 5 Phòng ban (Departments)
  console.log('🏢 [1/6] Tạo danh mục Phòng ban doanh nghiệp...');
  const departments = [
    {
      id: 'dept-eng',
      name: 'Kỹ thuật phần mềm (Software Engineering)',
      description: 'Phát triển kiến trúc backend, frontend và hạ tầng cloud',
    },
    {
      id: 'dept-prod',
      name: 'Phát triển Sản phẩm (Product Management)',
      description: 'Quản trị backlog, tiến độ Sprint Agile và định hướng tính năng',
    },
    {
      id: 'dept-design',
      name: 'Thiết kế Trải nghiệm (UI/UX & Design)',
      description: 'Hệ thống thiết kế Bauhaus, trải nghiệm người dùng và đồ họa số',
    },
    {
      id: 'dept-hr',
      name: 'Quản trị Nhân sự & Văn hóa (People & Culture)',
      description: 'Chính sách chấm công, quỹ phép, phúc lợi và phát triển nhân tài',
    },
    {
      id: 'dept-sales',
      name: 'Tư vấn Giải pháp Doanh nghiệp (Enterprise Solutions)',
      description: 'Chăm sóc khách hàng doanh nghiệp và triển khai giải pháp WorkSync',
    },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
  }

  // 2. Khởi tạo & Cập nhật Nhân sự Thực tế (Users with Real Names & Avatars)
  console.log('👤 [2/6] Tạo hồ sơ nhân sự thực tế với tên người và ảnh đại diện...');
  const users = [
    {
      email: 'admin@worksync.com',
      name: 'Võ Thanh Long',
      role: Role.ADMIN,
      position: 'Chief Technology Officer (CTO)',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    {
      email: 'head@gmail.com',
      name: 'Trần Minh Quân (Trưởng phòng)',
      role: Role.DEPARTMENT_HEAD,
      position: 'Trưởng phòng Kỹ thuật Phần mềm (Department Head)',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      email: 'pm@worksync.com',
      name: 'Nguyễn Minh Tuấn',
      role: Role.PM,
      position: 'Senior Project Manager / Agile Coach',
      departmentId: 'dept-prod',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      email: 'pm2@worksync.com',
      name: 'Trần Thị Thu Hà',
      role: Role.PM,
      position: 'Technical Project Lead',
      departmentId: 'dept-prod',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
    {
      email: 'hr@worksync.com',
      name: 'Lê Thị Hồng Nhung',
      role: Role.HR,
      position: 'Head of People & Culture Operations',
      departmentId: 'dept-hr',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    },
    {
      email: 'hr2@worksync.com',
      name: 'Phạm Hoàng Nam',
      role: Role.HR,
      position: 'Senior HR Specialist / Talent Acquisition',
      departmentId: 'dept-hr',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    {
      email: 'vothanhlong1704@gmail.com',
      name: 'Long Võ',
      role: Role.EMPLOYEE,
      position: 'Lead Frontend Engineer',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
    {
      email: 'nam.hoang@worksync.com',
      name: 'Hoàng Văn Nam',
      role: Role.EMPLOYEE,
      position: 'Senior Backend Engineer (NestJS & Prisma)',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    },
    {
      email: 'bao.dang@worksync.com',
      name: 'Đặng Quốc Bảo',
      role: Role.EMPLOYEE,
      position: 'DevOps & Cloud Architect',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    },
    {
      email: 'linh.vu@worksync.com',
      name: 'Vũ Thùy Linh',
      role: Role.EMPLOYEE,
      position: 'Lead UI/UX Designer',
      departmentId: 'dept-design',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
    {
      email: 'thao.do@worksync.com',
      name: 'Đỗ Phương Thảo',
      role: Role.EMPLOYEE,
      position: 'Product Designer (Design Systems)',
      departmentId: 'dept-design',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
    {
      email: 'ngan.trinh@worksync.com',
      name: 'Trịnh Kim Ngân',
      role: Role.EMPLOYEE,
      position: 'Lead QA & Automation Test Engineer',
      departmentId: 'dept-prod',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150',
    },
    {
      email: 'dat.nguyen@worksync.com',
      name: 'Nguyễn Thành Đạt',
      role: Role.EMPLOYEE,
      position: 'Mobile Engineer (React Native & Flutter)',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    },
    {
      email: 'quan.bui@worksync.com',
      name: 'Bùi Anh Quân',
      role: Role.EMPLOYEE,
      position: 'Enterprise Solutions Director',
      departmentId: 'dept-sales',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    },
    {
      email: 'truc.mai@worksync.com',
      name: 'Mai Thanh Trúc',
      role: Role.EMPLOYEE,
      position: 'Customer Success Manager',
      departmentId: 'dept-sales',
      avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150',
    },
  ];

  const userMap = new Map<string, string>(); // email -> id

  for (const u of users) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        position: u.position,
        departmentId: u.departmentId,
        avatar: u.avatar,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        position: u.position,
        departmentId: u.departmentId,
        avatar: u.avatar,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
    userMap.set(u.email, record.id);

    // Auto-create personal project for seeded user if not existing
    const existingPersonal = await prisma.project.findFirst({
      where: { kind: ProjectKind.PERSONAL, personalOwnerId: record.id },
    });
    if (!existingPersonal) {
      await prisma.project.create({
        data: {
          name: 'Việc cá nhân',
          kind: ProjectKind.PERSONAL,
          createdById: record.id,
          personalOwnerId: record.id,
          color: '#4D7FC2',
        },
      });
    }
  }

  const pm1Id = userMap.get('pm@worksync.com')!;
  const pm2Id = userMap.get('pm2@worksync.com')!;
  const devLongId = userMap.get('vothanhlong1704@gmail.com')!;
  const devNamId = userMap.get('nam.hoang@worksync.com')!;
  const devBaoId = userMap.get('bao.dang@worksync.com')!;
  const desLinhId = userMap.get('linh.vu@worksync.com')!;
  const qaNganId = userMap.get('ngan.trinh@worksync.com')!;
  const devDatId = userMap.get('dat.nguyen@worksync.com')!;
  const adminId = userMap.get('admin@worksync.com')!;

  // 3. Khởi tạo Dự án Doanh nghiệp (Team Projects)
  console.log('📁 [3/6] Tạo dự án thực tế gán chủ nhiệm cho từng PM...');

  // Dự án 1: WorkSync Enterprise Platform v3.1 (PM: Nguyễn Minh Tuấn)
  const projPlatform = await prisma.project.upsert({
    where: { id: 'proj-platform-v3' },
    update: {
      name: 'WorkSync Enterprise Platform v3.1',
      description: 'Nền tảng quản trị công việc, tiến độ sprint và nhân sự doanh nghiệp',
      createdById: pm1Id,
      status: ProjectStatus.ACTIVE,
      color: '#2563EB',
    },
    create: {
      id: 'proj-platform-v3',
      name: 'WorkSync Enterprise Platform v3.1',
      description: 'Nền tảng quản trị công việc, tiến độ sprint và nhân sự doanh nghiệp',
      kind: ProjectKind.TEAM,
      createdById: pm1Id,
      status: ProjectStatus.ACTIVE,
      color: '#2563EB',
    },
  });

  // Dự án 2: WorkSync Mobile App (PM: Trần Thị Thu Hà)
  const projMobile = await prisma.project.upsert({
    where: { id: 'proj-mobile-app' },
    update: {
      name: 'WorkSync Mobile App (iOS & Android)',
      description: 'Ứng dụng di động điểm danh Geofence GPS và phê duyệt nhanh ca kíp',
      createdById: pm2Id,
      status: ProjectStatus.ACTIVE,
      color: '#10B981',
    },
    create: {
      id: 'proj-mobile-app',
      name: 'WorkSync Mobile App (iOS & Android)',
      description: 'Ứng dụng di động điểm danh Geofence GPS và phê duyệt nhanh ca kíp',
      kind: ProjectKind.TEAM,
      createdById: pm2Id,
      status: ProjectStatus.ACTIVE,
      color: '#10B981',
    },
  });

  // Dự án 3: AI Speech & WebRTC Meeting (PM: Nguyễn Minh Tuấn)
  const projAi = await prisma.project.upsert({
    where: { id: 'proj-ai-meeting' },
    update: {
      name: 'AI Meeting & Speech Intelligence',
      description: 'Hệ thống họp trực tuyến WebRTC và biên bản họp tự động bằng AI Gemini',
      createdById: pm1Id,
      status: ProjectStatus.ACTIVE,
      color: '#8B5CF6',
    },
    create: {
      id: 'proj-ai-meeting',
      name: 'AI Meeting & Speech Intelligence',
      description: 'Hệ thống họp trực tuyến WebRTC và biên bản họp tự động bằng AI Gemini',
      kind: ProjectKind.TEAM,
      createdById: pm1Id,
      status: ProjectStatus.ACTIVE,
      color: '#8B5CF6',
    },
  });

  // Cập nhật Project Members
  const platformMembers = [
    { userId: pm1Id, role: 'PM' },
    { userId: devLongId, role: 'LEAD_DEV' },
    { userId: devNamId, role: 'BACKEND_DEV' },
    { userId: devBaoId, role: 'DEVOPS' },
    { userId: desLinhId, role: 'DESIGNER' },
    { userId: qaNganId, role: 'QA' },
  ];

  for (const m of platformMembers) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projPlatform.id, userId: m.userId } },
      update: { projectRole: m.role },
      create: { projectId: projPlatform.id, userId: m.userId, projectRole: m.role },
    });
  }

  const mobileMembers = [
    { userId: pm2Id, role: 'PM' },
    { userId: devDatId, role: 'MOBILE_DEV' },
    { userId: devLongId, role: 'FRONTEND_DEV' },
    { userId: qaNganId, role: 'QA' },
  ];

  for (const m of mobileMembers) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projMobile.id, userId: m.userId } },
      update: { projectRole: m.role },
      create: { projectId: projMobile.id, userId: m.userId, projectRole: m.role },
    });
  }

  const aiMembers = [
    { userId: pm1Id, role: 'PM' },
    { userId: adminId, role: 'AI_ARCHITECT' },
    { userId: devNamId, role: 'BACKEND_DEV' },
  ];

  for (const m of aiMembers) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projAi.id, userId: m.userId } },
      update: { projectRole: m.role },
      create: { projectId: projAi.id, userId: m.userId, projectRole: m.role },
    });
  }

  // 4. Khởi tạo Sprints thực tế
  console.log('🏃 [4/6] Khởi tạo các Sprint đang chạy và kế hoạch...');
  const now = new Date();
  const sprintStart = new Date(now.getTime() - 8 * 24 * 3600 * 1000); // 8 ngày trước
  const sprintEnd = new Date(now.getTime() + 6 * 24 * 3600 * 1000);   // còn 6 ngày

  const sprint14 = await prisma.sprint.upsert({
    where: { id: 'sprint-platform-14' },
    update: {
      name: 'Sprint 14 — Phân quyền & Bảng điều khiển Đa vai trò',
      status: SprintStatus.ACTIVE,
      startDate: sprintStart,
      endDate: sprintEnd,
    },
    create: {
      id: 'sprint-platform-14',
      projectId: projPlatform.id,
      name: 'Sprint 14 — Phân quyền & Bảng điều khiển Đa vai trò',
      status: SprintStatus.ACTIVE,
      startDate: sprintStart,
      endDate: sprintEnd,
    },
  });

  const sprintMobile1 = await prisma.sprint.upsert({
    where: { id: 'sprint-mob-01' },
    update: {
      name: 'Sprint 1 — MVP Điểm danh GPS & Mobile Push',
      status: SprintStatus.ACTIVE,
      startDate: sprintStart,
      endDate: sprintEnd,
    },
    create: {
      id: 'sprint-mob-01',
      projectId: projMobile.id,
      name: 'Sprint 1 — MVP Điểm danh GPS & Mobile Push',
      status: SprintStatus.ACTIVE,
      startDate: sprintStart,
      endDate: sprintEnd,
    },
  });

  // 5. Khởi tạo Tasks Chi tiết có Story Points & Assignee thực tế
  console.log('📝 [5/6] Tạo danh mục Tasks chuyên sâu có Assignee và Deadline...');
  const tasks = [
    {
      id: 'TASK-101',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devLongId,
      title: 'Tối ưu hóa Bảng điều khiển Quản lý dự án PM với biểu đồ Burndown',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      storyPoints: 5,
      timeEstimate: 16,
      timeTracked: 10,
      position: 1000,
      dueDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-102',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devNamId,
      title: 'Sửa lỗi bảo mật IDOR trên endpoint tác vụ dự án',
      status: TaskStatus.DONE,
      priority: Priority.URGENT,
      storyPoints: 5,
      timeEstimate: 12,
      timeTracked: 12,
      position: 2000,
      dueDate: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-103',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: desLinhId,
      title: 'Thiết kế bộ icon và Design Token Bauhaus chuẩn Enterprise',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      storyPoints: 3,
      timeEstimate: 8,
      timeTracked: 8,
      position: 3000,
      dueDate: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-104',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devBaoId,
      title: 'Kiểm thử tải kết nối WebRTC Video Call trên mạng 4G',
      status: TaskStatus.BLOCKED,
      priority: Priority.URGENT,
      storyPoints: 8,
      timeEstimate: 20,
      timeTracked: 4,
      position: 4000,
      dueDate: new Date(now.getTime() + 1 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-105',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: qaNganId,
      title: 'Viết bộ kiểm thử tự động E2E cho quy trình Phê duyệt đơn WFH/Nghỉ phép',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      storyPoints: 5,
      timeEstimate: 14,
      timeTracked: 12,
      position: 5000,
      dueDate: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-106',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devNamId,
      title: 'Tích hợp Gateway thanh toán VNPay & Stripe Checkout',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      storyPoints: 8,
      timeEstimate: 24,
      timeTracked: 0,
      position: 6000,
      dueDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-107',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devLongId,
      title: 'Đồng bộ hóa trạng thái Online/Offline của thành viên nhóm qua WebSocket',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      storyPoints: 3,
      timeEstimate: 8,
      timeTracked: 0,
      position: 7000,
      dueDate: new Date(now.getTime() + 4 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-108',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devBaoId,
      title: 'Cấu hình SSL & Load Balancer Nginx cho Cụm FPT DC-01',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      storyPoints: 5,
      timeEstimate: 10,
      timeTracked: 10,
      position: 8000,
      dueDate: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
    },
    // Tasks for Mobile
    {
      id: 'TASK-201',
      projectId: projMobile.id,
      sprintId: sprintMobile1.id,
      createdById: pm2Id,
      assigneeId: devDatId,
      title: 'Tích hợp Geofence GPS FPT Complex Đà Nẵng trên ứng dụng Android',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      storyPoints: 5,
      timeEstimate: 16,
      timeTracked: 8,
      position: 1000,
      dueDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-202',
      projectId: projMobile.id,
      sprintId: sprintMobile1.id,
      createdById: pm2Id,
      assigneeId: devDatId,
      title: 'Thông báo đẩy FCM khi đơn xin nghỉ phép được HR phê duyệt',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      storyPoints: 3,
      timeEstimate: 8,
      timeTracked: 0,
      position: 2000,
      dueDate: new Date(now.getTime() + 4 * 24 * 3600 * 1000),
    },
  ];

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {
        title: t.title,
        status: t.status,
        priority: t.priority,
        storyPoints: t.storyPoints,
        timeEstimate: t.timeEstimate,
        timeTracked: t.timeTracked,
        dueDate: t.dueDate,
        assigneeId: t.assigneeId,
        projectId: t.projectId,
        sprintId: t.sprintId,
      },
      create: t,
    });
  }

  // 6. Khởi tạo AttendanceRecords thực tế cho hôm nay
  console.log('⏰ [6/6] Tạo dữ liệu chấm công thực tế cho ngày hôm nay...');
  const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // 12 người điểm danh (10 đúng giờ, 2 đi muộn)
  const allUserIds = Array.from(userMap.values());
  for (let i = 0; i < allUserIds.length; i++) {
    const uid = allUserIds[i];
    let status: AttendanceStatus = AttendanceStatus.ON_TIME;
    let checkInMin = 12 + (i % 15);
    let checkInHour = 8;

    if (i === 1) {
      // 1 người đi muộn
      status = AttendanceStatus.LATE;
      checkInHour = 8;
      checkInMin = 48;
    } else if (i === 4) {
      // 1 người đi muộn 22p
      status = AttendanceStatus.LATE;
      checkInHour = 8;
      checkInMin = 52;
    } else if (i === 8) {
      // WFH
      status = AttendanceStatus.WFH;
    } else if (i === 10) {
      // Nghỉ phép
      status = AttendanceStatus.ABSENT_APPROVED;
    }

    const checkInTime = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), checkInHour - 7, checkInMin));

    await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: uid, date: todayDate } },
      update: {
        status,
        checkInTime: status !== AttendanceStatus.ABSENT_APPROVED ? checkInTime : null,
        checkInMethod: status === AttendanceStatus.WFH ? 'REMOTE_APP' : 'GEOFENCE_GPS',
        checkInLat: 15.9686,
        checkInLng: 108.2608,
        note: status === AttendanceStatus.LATE ? 'Gặp ùn tắc giao thông trên cầu Trần Thị Lý' : 'Check-in đúng giờ FPT Complex',
      },
      create: {
        userId: uid,
        date: todayDate,
        status,
        checkInTime: status !== AttendanceStatus.ABSENT_APPROVED ? checkInTime : null,
        checkInMethod: status === AttendanceStatus.WFH ? 'REMOTE_APP' : 'GEOFENCE_GPS',
        checkInLat: 15.9686,
        checkInLng: 108.2608,
        note: status === AttendanceStatus.LATE ? 'Gặp ùn tắc giao thông trên cầu Trần Thị Lý' : 'Check-in đúng giờ FPT Complex',
      },
    });
  }

  console.log('🎉 [DONE] Toàn bộ dữ liệu doanh nghiệp 100% Real đã được nạp thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
