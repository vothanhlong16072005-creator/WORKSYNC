import { PrismaClient, TaskStatus, Priority } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const user = await p.user.findUnique({
    where: { email: 'vothanhlong1704@gmail.com' },
  });

  if (!user) {
    console.error('User not found!');
    return;
  }

  const userId = user.id;
  const personalProjectId = 'personal_' + userId;

  // 1. Ensure personal project exists
  await p.project.upsert({
    where: { id: personalProjectId },
    update: { color: '#3B82F6' },
    create: {
      id: personalProjectId,
      name: 'Việc cá nhân',
      kind: 'PERSONAL',
      color: '#3B82F6',
      personalOwnerId: userId,
      createdById: userId,
    },
  });

  // 2. Ensure team project p1 exists and add membership
  await p.project.upsert({
    where: { id: 'p1' },
    update: { color: '#2563EB', name: 'PLATFORM v3.1' },
    create: { id: 'p1', name: 'PLATFORM v3.1', color: '#2563EB', createdById: userId },
  });

  await p.projectMember.upsert({
    where: { projectId_userId: { projectId: 'p1', userId } },
    update: { projectRole: 'DEV' },
    create: { projectId: 'p1', userId, projectRole: 'DEV' },
  });

  // 3. Create team project p2 (Mobile App)
  await p.project.upsert({
    where: { id: 'p2' },
    update: { color: '#059669', name: 'WorkSync Mobile App' },
    create: { id: 'p2', name: 'WorkSync Mobile App', color: '#059669', createdById: userId },
  });

  await p.projectMember.upsert({
    where: { projectId_userId: { projectId: 'p2', userId } },
    update: { projectRole: 'DEV' },
    create: { projectId: 'p2', userId, projectRole: 'DEV' },
  });

  // 4. Create team project p3 (AI Core)
  await p.project.upsert({
    where: { id: 'p3' },
    update: { color: '#7C3AED', name: 'AI & Automation Core' },
    create: { id: 'p3', name: 'AI & Automation Core', color: '#7C3AED', createdById: userId },
  });

  await p.projectMember.upsert({
    where: { projectId_userId: { projectId: 'p3', userId } },
    update: { projectRole: 'DEV' },
    create: { projectId: 'p3', userId, projectRole: 'DEV' },
  });

  // 5. Tasks for personal project
  const personalTasks = [
    {
      id: 'PERS-1',
      title: 'Ôn tập kiến thức React 19 & Zustand State Machine',
      description: 'Nắm vững kiến thức optimistic update, state machine discriminated unions, và xử lý race conditions.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      position: 1024,
      labels: ['HỌC TẬP', 'FRONTEND'],
      projectId: personalProjectId,
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'PERS-2',
      title: 'Chuẩn bị Slide báo cáo thực tập doanh nghiệp',
      description: 'Tổng hợp các tính năng đã hoàn thiện trong dự án WorkSync (Auth, Kanban Board, DnD) để báo cáo giáo viên.',
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      position: 1024,
      labels: ['BÁO CÁO', 'DEADLINE'],
      projectId: personalProjectId,
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'PERS-3',
      title: 'Tổng kết tiến độ tuần 12 & cập nhật CV cá nhân',
      description: 'Ghi lại các công nghệ đã thực chiến: NestJS 12, Prisma 5, PostgreSQL 16, Bauhaus UI.',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      position: 1024,
      labels: ['TÀI LIỆU'],
      projectId: personalProjectId,
      createdById: userId,
      assigneeId: userId,
    },
  ];

  for (const t of personalTasks) {
    await p.task.upsert({ where: { id: t.id }, update: t, create: t });
  }

  // 6. Tasks for p1 (PLATFORM v3.1)
  const p1Tasks = [
    {
      id: 'T-104',
      title: 'SETUP CLOUD INFRASTRUCTURE',
      description: 'Cấu hình Docker Compose, PostgreSQL 16 và Redis 7 cho môi trường phát triển cục bộ.',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      position: 1024,
      labels: ['INFRA', 'DEVOPS'],
      projectId: 'p1',
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'T-105',
      title: 'DESIGN SYSTEM REFACTOR',
      description: 'Audit và làm lại toàn bộ giao diện theo ngôn ngữ thiết kế Bauhaus Editorial (viền 2px, đổ bóng sắc nét).',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      position: 1024,
      labels: ['DESIGN', 'UI', 'SAAS'],
      projectId: 'p1',
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'T-106',
      title: 'TÍCH HỢP API CHẤM CÔNG GPS & IP VĂN PHÒNG',
      description: 'Đang gửi bản PR cho Tech Lead đánh giá (Code Review). Kiểm tra tính toán khoảng cách Haversine dưới 100m.',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      position: 1024,
      labels: ['ATTENDANCE', 'API'],
      projectId: 'p1',
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'T-107',
      title: 'SỬA LỖI BẢO MẬT IDOR TRÊN ENDPOINT TASK',
      description: 'Đang bị chặn: Cần Project Manager và Security Lead thống nhất ma trận phân quyền giữa role PM và Member.',
      status: TaskStatus.BLOCKED,
      priority: Priority.URGENT,
      position: 1024,
      labels: ['SECURITY', 'BUG'],
      projectId: 'p1',
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'T-108',
      title: 'CẤU HÌNH GOOGLE OAUTH 2.0 VÀ JWT AUTH',
      description: 'Hoàn thành tích hợp đăng nhập tài khoản Google và cấp phát token JWT bảo mật.',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 1024,
      labels: ['AUTH', 'BACKEND'],
      projectId: 'p1',
      createdById: userId,
      assigneeId: userId,
    },
  ];

  for (const t of p1Tasks) {
    await p.task.upsert({ where: { id: t.id }, update: t, create: t });
  }

  // 7. Tasks for p2 (Mobile App)
  const p2Tasks = [
    {
      id: 'M-201',
      title: 'Thiết kế Mobile Kanban Board với cử chỉ cảm ứng',
      description: 'Hỗ trợ thao tác vuốt (swipe) và kéo thả mượt mà trên màn hình cảm ứng nhỏ.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      position: 1024,
      labels: ['MOBILE', 'UI'],
      projectId: 'p2',
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'M-202',
      title: 'Tích hợp Push Notification qua Firebase FCM',
      description: 'Gửi thông báo đẩy khi có task mới được gán cho nhân viên.',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      position: 1024,
      labels: ['NOTIFICATION', 'MOBILE'],
      projectId: 'p2',
      createdById: userId,
      assigneeId: userId,
    },
    {
      id: 'M-203',
      title: 'Kiểm thử kết nối WebRTC Video Call trên mạng 4G',
      description: 'Bị chặn: Cần đăng ký SSL Certificate / TURN server để kết nối qua tường lửa NAT mạng di động.',
      status: TaskStatus.BLOCKED,
      priority: Priority.URGENT,
      position: 1024,
      labels: ['WEBRTC', 'BUG'],
      projectId: 'p2',
      createdById: userId,
      assigneeId: userId,
    },
  ];

  for (const t of p2Tasks) {
    await p.task.upsert({ where: { id: t.id }, update: t, create: t });
  }

  console.log('Successfully seeded rich data for user Long Vo!');
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
