import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔔 [SEED-NOTIFICATIONS] Khởi tạo thông báo thực tế cho tất cả tài khoản demo...');

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'head@gmail.com',
          'head.eng@worksync.com',
          'admin@worksync.com',
          'pm@worksync.com',
          'hr@worksync.com',
          'vothanhlong1704@gmail.com',
        ],
      },
    },
  });

  const emp = await prisma.user.findFirst({
    where: { email: 'vothanhlong1704@gmail.com' },
  });

  for (const u of users) {
    // Xóa thông báo cũ để tránh duplicate
    await prisma.notification.deleteMany({
      where: { userId: u.id },
    });

    const notifs: Array<{
      userId: string;
      type: NotificationType;
      category: string;
      title: string;
      body: string;
      data: any;
      isRead: boolean;
      readAt?: Date;
      actorId?: string;
      createdAt: Date;
    }> = [];

    if (u.role === 'ADMIN') {
      notifs.push(
        {
          userId: u.id,
          type: NotificationType.MEETING,
          category: 'meeting.created',
          title: 'Cuộc họp Hội đồng Quản trị & CTO: Định hướng Q4/2026',
          body: 'Lịch họp trực tuyến lúc 10:00 sáng mai trên phòng họp số #1.',
          data: { url: '/meetings' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
        },
        {
          userId: u.id,
          type: NotificationType.TASK,
          category: 'system.audit',
          title: '🛡️ Báo cáo kiểm toán bảo mật ISO-27001 đã hoàn tất',
          body: 'Cụm Kubernetes AWS EKS và các API Gateway đã đạt chuẩn tuân thủ.',
          data: { url: '/documents' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      );
    } else if (u.role === 'DEPARTMENT_HEAD') {
      notifs.push(
        {
          userId: u.id,
          type: NotificationType.ATTENDANCE_APPROVAL,
          category: 'attendance.pending',
          title: '⏳ Đơn xin WFH mới cần duyệt từ Hoàng Văn Nam',
          body: 'Lý do: Cắt điện bảo trì lưới điện buổi sáng, xin WFH để hoàn thành API NestJS đúng hạn.',
          data: { url: '/attendance?tab=approval' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          userId: u.id,
          type: NotificationType.TASK,
          category: 'task.review',
          title: '👀 Công việc chờ duyệt: "Cấu hình SSL & Load Balancer Nginx"',
          body: 'Đặng Quốc Bảo đã hoàn thành task và chuyển sang cột Chờ duyệt.',
          data: { url: '/projects/proj-platform-v3' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 45 * 60 * 1000),
        },
        {
          userId: u.id,
          type: NotificationType.QUICK_TASK,
          category: 'quicktask.assigned',
          title: '⚡ Công việc nhanh: "Kiểm tra chứng chỉ Web Push VAPID"',
          body: 'Hạn chót: 18:00 hôm nay. Vui lòng rà soát trên cụm Production.',
          data: { url: '/quick-tasks' },
          isRead: true,
          readAt: new Date(Date.now() - 30 * 60 * 1000),
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 2 * 3600 * 1000),
        },
      );
    } else if (u.role === 'PM') {
      notifs.push(
        {
          userId: u.id,
          type: NotificationType.TASK,
          category: 'sprint.started',
          title: '🚀 Sprint 14 "Platform v3.1 Stabilization" chính thức bắt đầu',
          body: 'Tổng số 8 tasks, 34 Story Points. Hạn chót sprint sau 6 ngày.',
          data: { url: '/projects/proj-platform-v3?tab=sprints' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 20 * 60 * 1000),
        },
        {
          userId: u.id,
          type: NotificationType.MENTION,
          category: 'mention.task',
          title: '@ Long Võ đã cập nhật tiến độ WebRTC trên Task #TASK-104',
          body: '"@pm em đã hoàn thành tích hợp Dual-Track camera + screen share anh nhé!"',
          data: { url: '/projects/proj-platform-v3' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 50 * 60 * 1000),
        },
      );
    } else if (u.role === 'HR') {
      notifs.push(
        {
          userId: u.id,
          type: NotificationType.ATTENDANCE_APPROVAL,
          category: 'leave.pending',
          title: '⏳ Đơn xin nghỉ phép năm từ Trịnh Kim Ngân cần duyệt',
          body: 'Thời gian: 2 ngày (21/10 - 22/10). Lý do: Về quê dự đám cưới người thân.',
          data: { url: '/attendance?tab=approval' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 25 * 60 * 1000),
        },
        {
          userId: u.id,
          type: NotificationType.ATTENDANCE_APPROVAL,
          category: 'overtime.pending',
          title: '⏳ Đơn đăng ký làm thêm giờ (OT) từ Nguyễn Thành Đạt',
          body: 'Đăng ký 3.0 giờ OT ngày 15/10 để test hồi quy Mobile App.',
          data: { url: '/attendance?tab=approval' },
          isRead: false,
          actorId: emp?.id,
          createdAt: new Date(Date.now() - 75 * 60 * 1000),
        },
      );
    } else {
      // EMPLOYEE (vothanhlong1704@gmail.com)
      notifs.push(
        {
          userId: u.id,
          type: NotificationType.TASK,
          category: 'task.assigned',
          title: '⚡ Bạn được phân công công việc mới: "Tối ưu Theater Mode Cuộc họp"',
          body: 'Chủ nhiệm dự án Nguyễn Minh Tuấn đã gán task #TASK-103 cho bạn.',
          data: { url: '/projects/proj-platform-v3' },
          isRead: false,
          actorId: u.id,
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          userId: u.id,
          type: NotificationType.ATTENDANCE_APPROVAL,
          category: 'wfh.approved',
          title: '✅ Đơn xin WFH của bạn đã được Trưởng phòng phê duyệt',
          body: 'Trưởng phòng Trần Minh Quân đã phê duyệt đơn làm việc từ xa ngày 20/10.',
          data: { url: '/attendance' },
          isRead: false,
          actorId: u.id,
          createdAt: new Date(Date.now() - 120 * 60 * 1000),
        },
        {
          userId: u.id,
          type: NotificationType.MEETING,
          category: 'meeting.invite',
          title: 'Cuộc họp mới: "Sprint 14 Demo & Retrospective"',
          body: 'Lịch họp vào lúc 15:30 chiều nay trên WorkSync Video.',
          data: { url: '/meetings' },
          isRead: true,
          readAt: new Date(Date.now() - 30 * 60 * 1000),
          actorId: u.id,
          createdAt: new Date(Date.now() - 180 * 60 * 1000),
        },
      );
    }

    for (const n of notifs) {
      await prisma.notification.create({ data: n });
    }
    console.log(`  → Seeded ${notifs.length} thông báo cho ${u.name} (${u.email})`);
  }

  console.log('✅ [SEED-NOTIFICATIONS] Hoàn tất nạp thông báo mẫu!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
