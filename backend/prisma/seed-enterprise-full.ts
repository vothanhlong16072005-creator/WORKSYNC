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
  ProjectWorkflowType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function getLocalDateOnly(d: Date): Date {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

async function main() {
  console.log('🚀 [SEED] Bắt đầu khởi tạo dữ liệu doanh nghiệp chuẩn 100% Real...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 0. Khởi tạo Cấu hình hệ thống (SystemConfig) - FIX LỖI SYSTEM CONFIG NOT INITIALIZED
  console.log('⚙️ [0/8] Khởi tạo Cấu hình hệ thống (SystemConfig)...');
  await prisma.systemConfig.upsert({
    where: { id: 'default-system-config' },
    update: {
      companyName: 'FPT Complex Đà Nẵng',
      companyLogoUrl: '/logo.png',
      timezone: 'Asia/Ho_Chi_Minh',
      workStartTime: '08:30',
      workEndTime: '17:30',
      checkinStartTime: '06:00',
      checkinEndTime: '23:59',
      allowedIpRanges: ['127.0.0.1', '::1', '192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '118.69.0.0/16', '0.0.0.0/0'],
      officeLatitude: 15.968600,
      officeLongitude: 108.260800,
      gpsRadiusMeters: 5000,
      wfhAutoApproveTime: '09:30',
    },
    create: {
      id: 'default-system-config',
      companyName: 'FPT Complex Đà Nẵng',
      companyLogoUrl: '/logo.png',
      timezone: 'Asia/Ho_Chi_Minh',
      workStartTime: '08:30',
      workEndTime: '17:30',
      checkinStartTime: '06:00',
      checkinEndTime: '23:59',
      allowedIpRanges: ['127.0.0.1', '::1', '192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '118.69.0.0/16', '0.0.0.0/0'],
      officeLatitude: 15.968600,
      officeLongitude: 108.260800,
      gpsRadiusMeters: 5000,
      wfhAutoApproveTime: '09:30',
    },
  });

  // 1. Khởi tạo 5 Phòng ban (Departments)
  console.log('🏢 [1/8] Tạo danh mục Phòng ban doanh nghiệp...');
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
  console.log('👤 [2/8] Tạo hồ sơ nhân sự thực tế với tên người và ảnh đại diện...');
  const users = [
    {
      email: 'admin@worksync.com',
      name: 'Võ Thanh Long (Admin / CTO)',
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
      email: 'head.eng@worksync.com',
      name: 'Trần Minh Quân (Trưởng phòng)',
      role: Role.DEPARTMENT_HEAD,
      position: 'Trưởng phòng Kỹ thuật Phần mềm (Department Head)',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      email: 'pm@worksync.com',
      name: 'Nguyễn Minh Tuấn (PM)',
      role: Role.PM,
      position: 'Senior Project Manager / Agile Coach',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      email: 'pm2@worksync.com',
      name: 'Trần Thị Thu Hà (PM)',
      role: Role.PM,
      position: 'Technical Project Lead',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
    {
      email: 'hr@worksync.com',
      name: 'Lê Thị Hồng Nhung (HR)',
      role: Role.HR,
      position: 'Head of People & Culture Operations',
      departmentId: 'dept-hr',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    },
    {
      email: 'hr2@worksync.com',
      name: 'Phạm Hoàng Nam (HR)',
      role: Role.HR,
      position: 'Senior HR Specialist / Talent Acquisition',
      departmentId: 'dept-hr',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    {
      email: 'vothanhlong1704@gmail.com',
      name: 'Long Võ (Lead Dev)',
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

  const adminId = userMap.get('admin@worksync.com')!;
  const headId = userMap.get('head@gmail.com')!;
  const pm1Id = userMap.get('pm@worksync.com')!;
  const pm2Id = userMap.get('pm2@worksync.com')!;
  const hrId = userMap.get('hr@worksync.com')!;
  const devLongId = userMap.get('vothanhlong1704@gmail.com')!;
  const devNamId = userMap.get('nam.hoang@worksync.com')!;
  const devBaoId = userMap.get('bao.dang@worksync.com')!;
  const desLinhId = userMap.get('linh.vu@worksync.com')!;
  const qaNganId = userMap.get('ngan.trinh@worksync.com')!;
  const devDatId = userMap.get('dat.nguyen@worksync.com')!;

  // 3. Khởi tạo 5 Dự án Doanh nghiệp phong phú cho tất cả các Role demo
  console.log('📁 [3/8] Tạo danh mục dự án thực tế cho từng PM & Trưởng phòng...');

  // Dự án 1: WorkSync Enterprise Platform v3.1 (PM: Nguyễn Minh Tuấn) -> SCRUM
  const projPlatform = await prisma.project.upsert({
    where: { id: 'proj-platform-v3' },
    update: {
      name: 'WorkSync Enterprise Platform v3.1',
      description: 'Nền tảng quản trị công việc, tiến độ sprint và nhân sự doanh nghiệp',
      createdById: pm1Id,
      pmId: pm1Id,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.SCRUM,
      status: ProjectStatus.ACTIVE,
      color: '#2563EB',
    },
    create: {
      id: 'proj-platform-v3',
      name: 'WorkSync Enterprise Platform v3.1',
      description: 'Nền tảng quản trị công việc, tiến độ sprint và nhân sự doanh nghiệp',
      kind: ProjectKind.TEAM,
      createdById: pm1Id,
      pmId: pm1Id,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.SCRUM,
      status: ProjectStatus.ACTIVE,
      color: '#2563EB',
    },
  });

  // Dự án 2: WorkSync Mobile App (PM: Trần Thị Thu Hà) -> SCRUM
  const projMobile = await prisma.project.upsert({
    where: { id: 'proj-mobile-app' },
    update: {
      name: 'WorkSync Mobile App (iOS & Android)',
      description: 'Ứng dụng di động điểm danh Geofence GPS và phê duyệt nhanh ca kíp',
      createdById: pm2Id,
      pmId: pm2Id,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.SCRUM,
      status: ProjectStatus.ACTIVE,
      color: '#10B981',
    },
    create: {
      id: 'proj-mobile-app',
      name: 'WorkSync Mobile App (iOS & Android)',
      description: 'Ứng dụng di động điểm danh Geofence GPS và phê duyệt nhanh ca kíp',
      kind: ProjectKind.TEAM,
      createdById: pm2Id,
      pmId: pm2Id,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.SCRUM,
      status: ProjectStatus.ACTIVE,
      color: '#10B981',
    },
  });

  // Dự án 3: AI Speech & WebRTC Meeting (PM: Nguyễn Minh Tuấn) -> SCRUM
  const projAi = await prisma.project.upsert({
    where: { id: 'proj-ai-meeting' },
    update: {
      name: 'AI Meeting & Speech Intelligence',
      description: 'Hệ thống họp trực tuyến WebRTC và biên bản họp tự động bằng AI Gemini',
      createdById: pm1Id,
      pmId: pm1Id,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.SCRUM,
      status: ProjectStatus.ACTIVE,
      color: '#8B5CF6',
    },
    create: {
      id: 'proj-ai-meeting',
      name: 'AI Meeting & Speech Intelligence',
      description: 'Hệ thống họp trực tuyến WebRTC và biên bản họp tự động bằng AI Gemini',
      kind: ProjectKind.TEAM,
      createdById: pm1Id,
      pmId: pm1Id,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.SCRUM,
      status: ProjectStatus.ACTIVE,
      color: '#8B5CF6',
    },
  });

  // Dự án 4: Hạ tầng Cloud & Bảo mật FPT DC-01 (PM: Trần Minh Quân - Trưởng phòng) -> KANBAN
  const projInfra = await prisma.project.upsert({
    where: { id: 'proj-infra-devops' },
    update: {
      name: 'Cloud Infrastructure & DevOps CI/CD (FPT DC-01)',
      description: 'Kiến trúc cụm AWS EKS, giám sát Prometheus/Grafana và an toàn thông tin ISO-27001',
      createdById: headId,
      pmId: headId,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.KANBAN,
      status: ProjectStatus.ACTIVE,
      color: '#F59E0B',
    },
    create: {
      id: 'proj-infra-devops',
      name: 'Cloud Infrastructure & DevOps CI/CD (FPT DC-01)',
      description: 'Kiến trúc cụm AWS EKS, giám sát Prometheus/Grafana và an toàn thông tin ISO-27001',
      kind: ProjectKind.TEAM,
      createdById: headId,
      pmId: headId,
      departmentId: 'dept-eng',
      workflowType: ProjectWorkflowType.KANBAN,
      status: ProjectStatus.ACTIVE,
      color: '#F59E0B',
    },
  });

  // Dự án 5: Chương trình Đào tạo & Văn hóa FPT 2026 (PM: Lê Thị Hồng Nhung - HR Lead) -> KANBAN
  const projHr = await prisma.project.upsert({
    where: { id: 'proj-hr-culture' },
    update: {
      name: 'Chương trình Phát triển Nhân tài & Văn hóa FPT 2026',
      description: 'Khung năng lực nhân sự số, chính sách phúc lợi và chương trình gắn kết nhân viên',
      createdById: hrId,
      pmId: hrId,
      departmentId: 'dept-hr',
      workflowType: ProjectWorkflowType.KANBAN,
      status: ProjectStatus.ACTIVE,
      color: '#EC4899',
    },
    create: {
      id: 'proj-hr-culture',
      name: 'Chương trình Phát triển Nhân tài & Văn hóa FPT 2026',
      description: 'Khung năng lực nhân sự số, chính sách phúc lợi và chương trình gắn kết nhân viên',
      kind: ProjectKind.TEAM,
      createdById: hrId,
      pmId: hrId,
      departmentId: 'dept-hr',
      workflowType: ProjectWorkflowType.KANBAN,
      status: ProjectStatus.ACTIVE,
      color: '#EC4899',
    },
  });

  // Gán thành viên đầy đủ cho tất cả dự án để mọi tài khoản demo đều thấy dự án phong phú
  const allProjects = [projPlatform, projMobile, projAi, projInfra, projHr];
  const coreDemoUsers = [adminId, headId, pm1Id, hrId, devLongId, devNamId, devBaoId, desLinhId, qaNganId, devDatId];

  for (const proj of allProjects) {
    for (const uid of coreDemoUsers) {
      let role = 'MEMBER';
      if (proj.createdById === uid) role = 'PM';
      else if (uid === adminId) role = 'SPONSOR';
      else if (uid === headId) role = 'HEAD_DEPT';
      else if (uid === devLongId) role = 'LEAD_DEV';

      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: proj.id, userId: uid } },
        update: { projectRole: role },
        create: { projectId: proj.id, userId: uid, projectRole: role },
      });
    }
  }

  // Gán pm2Id làm PM cho dự án Mobile App
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projMobile.id, userId: pm2Id } },
    update: { projectRole: 'PM' },
    create: { projectId: projMobile.id, userId: pm2Id, projectRole: 'PM' },
  });

  // 4. Khởi tạo Sprints thực tế
  console.log('🏃 [4/8] Khởi tạo các Sprint đang chạy và kế hoạch...');
  const now = new Date();
  const sprintStart = new Date(now.getTime() - 8 * 24 * 3600 * 1000); // 8 ngày trước
  const sprintEnd = new Date(now.getTime() + 6 * 24 * 3600 * 1000);   // còn 6 ngày

  const sprint14 = await prisma.sprint.upsert({
    where: { id: 'sprint-platform-14' },
    update: {
      name: 'Sprint 14: Platform v3.1 Stabilization & WebRTC Theater Mode',
      goal: 'Tối ưu trải nghiệm họp trực tuyến, đồng bộ Presence và hoàn tất báo cáo Sprint',
      startDate: sprintStart,
      endDate: sprintEnd,
      status: SprintStatus.ACTIVE,
    },
    create: {
      id: 'sprint-platform-14',
      projectId: projPlatform.id,
      name: 'Sprint 14: Platform v3.1 Stabilization & WebRTC Theater Mode',
      goal: 'Tối ưu trải nghiệm họp trực tuyến, đồng bộ Presence và hoàn tất báo cáo Sprint',
      startDate: sprintStart,
      endDate: sprintEnd,
      status: SprintStatus.ACTIVE,
    },
  });

  const sprintMobile1 = await prisma.sprint.upsert({
    where: { id: 'sprint-mobile-01' },
    update: {
      name: 'Sprint 1: Geofence GPS & Native Check-in',
      goal: 'Tích hợp bản đồ GPS FPT Complex và tính năng check-in một chạm',
      startDate: sprintStart,
      endDate: sprintEnd,
      status: SprintStatus.ACTIVE,
    },
    create: {
      id: 'sprint-mobile-01',
      projectId: projMobile.id,
      name: 'Sprint 1: Geofence GPS & Native Check-in',
      goal: 'Tích hợp bản đồ GPS FPT Complex và tính năng check-in một chạm',
      startDate: sprintStart,
      endDate: sprintEnd,
      status: SprintStatus.ACTIVE,
    },
  });

  const sprintInfra1 = await prisma.sprint.upsert({
    where: { id: 'sprint-infra-01' },
    update: {
      name: 'Sprint Infra: AWS EKS & Multi-AZ Disaster Recovery',
      goal: 'Triển khai cụm Kubernetes đa vùng và thiết lập cảnh báo tự động',
      startDate: sprintStart,
      endDate: sprintEnd,
      status: SprintStatus.ACTIVE,
    },
    create: {
      id: 'sprint-infra-01',
      projectId: projInfra.id,
      name: 'Sprint Infra: AWS EKS & Multi-AZ Disaster Recovery',
      goal: 'Triển khai cụm Kubernetes đa vùng và thiết lập cảnh báo tự động',
      startDate: sprintStart,
      endDate: sprintEnd,
      status: SprintStatus.ACTIVE,
    },
  });

  // 5. Khởi tạo Tasks phong phú cho các Sprint
  console.log('📝 [5/8] Tạo danh mục công việc chuyên sâu có Assignee, Priority và Deadline...');
  const tasks = [
    {
      id: 'TASK-101',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devLongId,
      title: 'Tối ưu hóa giao diện Theater Mode cuộc họp WebRTC chuẩn Google Meet',
      description: 'Mở rộng khung trình chiếu toàn màn hình, thanh thumbnail camera gọn gàng.',
      status: TaskStatus.DONE,
      priority: Priority.URGENT,
      storyPoints: 5,
      timeEstimate: 16,
      timeTracked: 16,
      position: 1000,
      dueDate: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-102',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devNamId,
      title: 'Xây dựng WebSocket Gateway realtime cho Presence & Điểm danh',
      description: 'Phát sự kiện presence:init và đồng bộ chấm xanh trực tuyến tức thời.',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      storyPoints: 8,
      timeEstimate: 20,
      timeTracked: 20,
      position: 2000,
      dueDate: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-103',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devLongId,
      title: 'Khắc phục lỗi mất tin nhắn chat trong cuộc họp khi đóng thanh drawer',
      description: 'Lưu trữ tin nhắn vào chatHistory ngay khi nhận được qua socket.',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      storyPoints: 3,
      timeEstimate: 8,
      timeTracked: 8,
      position: 3000,
      dueDate: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-104',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devLongId,
      title: 'Hỗ trợ dán ảnh trực tiếp từ Clipboard (Ctrl+V) vào ô chat',
      description: 'Tự động bắt sự kiện onPaste và gửi tệp ảnh đính kèm tức thời.',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      storyPoints: 2,
      timeEstimate: 4,
      timeTracked: 4,
      position: 4000,
      dueDate: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-105',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: desLinhId,
      title: 'Kiểm toán hệ thống Design System Bauhaus & chuẩn tương phản WCAG AA',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      storyPoints: 5,
      timeEstimate: 16,
      timeTracked: 10,
      position: 5000,
      dueDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-106',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: qaNganId,
      title: 'Viết kịch bản kiểm thử tự động E2E cho quy trình Phê duyệt chấm công',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      storyPoints: 5,
      timeEstimate: 12,
      timeTracked: 6,
      position: 6000,
      dueDate: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
    },
    {
      id: 'TASK-107',
      projectId: projPlatform.id,
      sprintId: sprint14.id,
      createdById: pm1Id,
      assigneeId: devNamId,
      title: 'Tích hợp Gemini 1.5 Flash tạo biên bản tóm tắt cuộc họp tự động',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      storyPoints: 8,
      timeEstimate: 24,
      timeTracked: 0,
      position: 7000,
      dueDate: new Date(now.getTime() + 4 * 24 * 3600 * 1000),
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
    // Tasks for Infra
    {
      id: 'TASK-301',
      projectId: projInfra.id,
      sprintId: sprintInfra1.id,
      createdById: headId,
      assigneeId: devBaoId,
      title: 'Cấu hình SSL & Load Balancer Nginx cho Cụm FPT DC-01',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      storyPoints: 5,
      timeEstimate: 10,
      timeTracked: 10,
      position: 1000,
      dueDate: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
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

  // 6. Khởi tạo Lịch sử điểm danh 120 ngày (~6 tháng) cho tất cả tài khoản chính để Heatmap & Stats đầy đủ
  console.log('⏰ [6/8] Khởi tạo lịch sử điểm danh 6 tháng (120 ngày) cho các tài khoản demo...');
  const keyAttendanceUsers = [devLongId, adminId, headId, pm1Id, hrId, devNamId, devBaoId];
  const startDate = new Date(now.getTime() - 120 * 24 * 3600 * 1000); // 120 ngày trước
  const yesterday = new Date(now.getTime() - 1 * 24 * 3600 * 1000);

  const cur = new Date(startDate);
  let seededDays = 0;

  while (cur <= yesterday) {
    const dayOfWeek = cur.getDay(); // 0: CN, 6: T7
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateOnly = getLocalDateOnly(cur);
      const y = cur.getFullYear();
      const m = cur.getMonth();
      const d = cur.getDate();

      for (let uIdx = 0; uIdx < keyAttendanceUsers.length; uIdx++) {
        const uid = keyAttendanceUsers[uIdx];
        // Pseudo-random deterministic ratio
        const seedVal = (d * 13 + m * 7 + uIdx * 17) % 100;
        let status: AttendanceStatus = AttendanceStatus.ON_TIME;
        let inHour = 8;
        let inMin = 10 + (seedVal % 18);
        let outHour = 17;
        let outMin = 32 + (seedVal % 25);
        let note = 'Check-in đúng giờ FPT Complex Đà Nẵng';
        let method = 'GEOFENCE_GPS';

        if (seedVal > 92) {
          // 8% LATE
          status = AttendanceStatus.LATE;
          inHour = 8;
          inMin = 36 + (seedVal % 18);
          note = 'Đi muộn do ùn tắc giao thông cầu Trần Thị Lý';
        } else if (seedVal > 86) {
          // 6% WFH
          status = AttendanceStatus.WFH;
          method = 'REMOTE_APP';
          note = 'Làm việc từ xa theo đơn WFH đã phê duyệt';
        } else if (seedVal > 83) {
          // 3% Nghỉ phép
          status = AttendanceStatus.ABSENT_APPROVED;
          note = 'Nghỉ phép năm có đơn được HR phê duyệt';
        }

        const checkInTime = status !== AttendanceStatus.ABSENT_APPROVED
          ? new Date(Date.UTC(y, m, d, inHour - 7, inMin))
          : null;
        const checkOutTime = status !== AttendanceStatus.ABSENT_APPROVED
          ? new Date(Date.UTC(y, m, d, outHour - 7, outMin))
          : null;

        await prisma.attendanceRecord.upsert({
          where: { userId_date: { userId: uid, date: dateOnly } },
          update: {
            status,
            checkInTime,
            checkOutTime,
            checkInMethod: method,
            checkInLat: 15.9686,
            checkInLng: 108.2608,
            note,
          },
          create: {
            userId: uid,
            date: dateOnly,
            status,
            checkInTime,
            checkOutTime,
            checkInMethod: method,
            checkInLat: 15.9686,
            checkInLng: 108.2608,
            note,
          },
        });
      }
      seededDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  console.log(`  → Đã nạp ${seededDays} ngày làm việc lịch sử cho ${keyAttendanceUsers.length} tài khoản.`);

  // Bản ghi HÔM NAY: Cho phép admin@worksync.com và vothanhlong1704@gmail.com tự bấm điểm danh test
  // nam.hoang và bao.dang đã điểm danh trước để dashboard có dữ liệu thực tế
  const todayOnly = getLocalDateOnly(now);
  await prisma.attendanceRecord.upsert({
    where: { userId_date: { userId: devNamId, date: todayOnly } },
    update: {
      status: AttendanceStatus.ON_TIME,
      checkInTime: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 8 - 7, 18)),
      checkInMethod: 'GEOFENCE_GPS',
      checkInLat: 15.9686,
      checkInLng: 108.2608,
      note: 'Check-in đúng giờ FPT Complex',
    },
    create: {
      userId: devNamId,
      date: todayOnly,
      status: AttendanceStatus.ON_TIME,
      checkInTime: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 8 - 7, 18)),
      checkInMethod: 'GEOFENCE_GPS',
      checkInLat: 15.9686,
      checkInLng: 108.2608,
      note: 'Check-in đúng giờ FPT Complex',
    },
  });

  // 7. Tạo Đơn chờ duyệt (Approval Queue) cho Trưởng phòng & HR demo tính năng Phê duyệt
  console.log('📋 [7/8] Tạo đơn xin WFH, nghỉ phép, làm thêm giờ đang chờ duyệt (Pending)...');
  const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const dayAfter = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 2));

  // WFH Pending
  const existingWfh = await prisma.wfhRequest.findFirst({ where: { userId: devNamId, date: tomorrow } });
  if (!existingWfh) {
    await prisma.wfhRequest.create({
      data: {
        userId: devNamId,
        date: tomorrow,
        expectedStart: '08:30',
        expectedEnd: '17:30',
        reason: 'Khu vực nhà bị cắt điện lưới buổi sáng, xin WFH để đảm bảo hoàn thành API NestJS đúng hạn.',
        status: RequestStatus.PENDING,
      },
    });
  }

  // Leave Pending
  const existingLeave = await prisma.leaveRequest.findFirst({ where: { userId: qaNganId, startDate: tomorrow } });
  if (!existingLeave) {
    await prisma.leaveRequest.create({
      data: {
        userId: qaNganId,
        startDate: tomorrow,
        endDate: dayAfter,
        leaveType: LeaveType.ANNUAL,
        dayCount: 2,
        reason: 'Xin nghỉ phép 2 ngày đưa người thân đi khám sức khỏe định kỳ tại Bệnh viện Đa khoa Đà Nẵng.',
        status: RequestStatus.PENDING,
      },
    });
  }

  // Overtime Pending
  const existingOt = await prisma.overtimeRequest.findFirst({ where: { userId: devDatId, date: tomorrow } });
  if (!existingOt) {
    await prisma.overtimeRequest.create({
      data: {
        userId: devDatId,
        date: tomorrow,
        registeredStart: new Date(tomorrow.getTime() + 17.5 * 3600 * 1000),
        registeredEnd: new Date(tomorrow.getTime() + 20.5 * 3600 * 1000),
        registeredHours: 3.0,
        reason: 'Test hồi quy tự động (Regression Test) cho phiên bản WorkSync Mobile App v1.2.',
        status: RequestStatus.PENDING,
      },
    });
  }

  console.log('🎉 [8/8] Toàn bộ dữ liệu doanh nghiệp 100% Real đã được nạp thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
