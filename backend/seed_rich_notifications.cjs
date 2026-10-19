const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const longVo = await prisma.user.findFirst({ where: { email: 'vothanhlong1704@gmail.com' } });
  if (!longVo) throw new Error('Long Vo user not found');

  const pmUser = await prisma.user.findFirst({ where: { role: 'DEPARTMENT_HEAD' } }) || longVo;
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || longVo;

  // Find some tasks assigned to or in Long Vo's projects
  const sampleTasks = await prisma.task.findMany({
    take: 5,
    where: { deletedAt: null },
    include: { project: true },
  });

  const t1 = sampleTasks[0] || { id: 'TASK-101', title: 'Tối ưu hóa Bảng điều khiển Quản lý dự án PM', projectId: 'p1' };
  const t2 = sampleTasks[1] || { id: 'T-107', title: 'Sửa lỗi bảo mật IDOR trên endpoint Task', projectId: 'p1' };
  const t3 = sampleTasks[2] || { id: 'M-202', title: 'Tích hợp Push Notification qua Firebase FCM', projectId: 'p1' };

  console.log(`Seeding rich notifications for ${longVo.name} (${longVo.id})...`);

  // Remove existing notifications for Long Vo to have a pristine, realistic set
  await prisma.notification.deleteMany({
    where: { userId: longVo.id },
  });

  const now = new Date();
  const minutesAgo = (m) => new Date(now.getTime() - m * 60 * 1000);
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 3600 * 1000);

  const notificationsToCreate = [
    // 1. TASK - Deadline warning (URGENT - Unread)
    {
      userId: longVo.id,
      type: 'TASK',
      category: 'task.deadline.1h',
      title: `Hạn chót sắp đến: ${t1.title}`,
      body: 'Công việc chỉ còn khoảng 1 giờ nữa là đến hạn chót! Vui lòng cập nhật trạng thái tiến độ.',
      data: {
        taskId: t1.id,
        projectId: t1.projectId,
        url: `/tasks?taskId=${t1.id}`,
      },
      isRead: false,
      createdAt: minutesAgo(15),
    },
    // 2. TASK - New task assigned (Unread)
    {
      userId: longVo.id,
      type: 'TASK',
      category: 'task.assigned',
      title: `Bạn được giao công việc mới: ${t2.title}`,
      body: `Dự án: ${t2.project?.name || 'WorkSync Platform'}. Người giao: ${pmUser.name || 'Quản lý dự án'}.`,
      data: {
        taskId: t2.id,
        projectId: t2.projectId,
        url: `/tasks?taskId=${t2.id}`,
      },
      isRead: false,
      createdAt: hoursAgo(2),
      actorId: pmUser.id,
    },
    // 3. MEETING - Upcoming meeting (Unread)
    {
      userId: longVo.id,
      type: 'MEETING',
      category: 'meeting.reminder.1h',
      title: 'Sắp diễn ra: "Sprint Review & Demo Lab 6"',
      body: 'Cuộc họp sẽ bắt đầu lúc 16:30 tại phòng họp trực tuyến. Vui lòng kiểm tra micro & camera.',
      data: {
        url: '/meetings',
      },
      isRead: false,
      createdAt: minutesAgo(40),
      actorId: pmUser.id,
    },
    // 4. ATTENDANCE_APPROVAL - WFH Approved (Unread)
    {
      userId: longVo.id,
      type: 'ATTENDANCE_APPROVAL',
      category: 'attendance.approved',
      title: 'Đơn làm việc từ xa (WFH) đã được duyệt',
      body: 'Trưởng phòng đã phê duyệt yêu cầu WFH ngày 21/10 của bạn. Chúc bạn làm việc hiệu quả!',
      data: {
        url: '/attendance',
      },
      isRead: false,
      createdAt: hoursAgo(3),
      actorId: pmUser.id,
    },
    // 5. MENTION - Mentioned in Task (Unread)
    {
      userId: longVo.id,
      type: 'MENTION',
      category: 'mention.user',
      title: `${pmUser.name || 'Nguyễn Văn Đức'} đã nhắc đến bạn`,
      body: `Trong "${t1.title}": "@Long Võ em kiểm tra lại phần biểu đồ burndown xem đã lấy đúng sprint hiện tại chưa nhé!"`,
      data: {
        taskId: t1.id,
        projectId: t1.projectId,
        url: `/tasks?taskId=${t1.id}`,
      },
      isRead: false,
      createdAt: hoursAgo(5),
      actorId: pmUser.id,
    },
    // 6. QUICK_TASK - Quick task assigned (Unread)
    {
      userId: longVo.id,
      type: 'QUICK_TASK',
      category: 'quicktask.assigned',
      title: 'Việc nhanh mới: Rà soát cấu hình CORS & Header bảo mật API',
      body: 'Hạn chót: 18:00 hôm nay. Ưu tiên xử lý trước giờ tan ca.',
      data: {
        url: '/quick-tasks',
      },
      isRead: false,
      createdAt: hoursAgo(4),
      actorId: pmUser.id,
    },
    // 7. MEETING - AI Summary ready (Read)
    {
      userId: longVo.id,
      type: 'MEETING',
      category: 'meeting.ai_summary',
      title: 'Biên bản cuộc họp AI đã sẵn sàng: "Kiến trúc hệ thống M5 & M6"',
      body: 'Mô hình Google Gemini 1.5 Flash đã hoàn tất trích xuất biên bản cuộc họp, 5 hành động chính và danh sách việc cần làm.',
      data: {
        url: '/meetings',
      },
      isRead: true,
      readAt: hoursAgo(6),
      createdAt: hoursAgo(8),
    },
    // 8. TASK - Review requested (Read)
    {
      userId: longVo.id,
      type: 'TASK',
      category: 'task.review',
      title: `Công việc chờ duyệt: ${t3.title}`,
      body: 'Thành viên đã cập nhật và gửi yêu cầu nghiệm thu tính năng thông báo FCM.',
      data: {
        taskId: t3.id,
        projectId: t3.projectId,
        url: `/tasks?taskId=${t3.id}`,
      },
      isRead: true,
      readAt: hoursAgo(10),
      createdAt: hoursAgo(12),
    },
    // 9. ATTENDANCE_APPROVAL - Leave Request Approved (Read)
    {
      userId: longVo.id,
      type: 'ATTENDANCE_APPROVAL',
      category: 'attendance.leave_approved',
      title: 'Đơn xin nghỉ phép đã được chấp thuận',
      body: 'Đơn nghỉ phép năm 1 ngày (25/10) đã được phê duyệt. Số ngày phép còn lại: 11 ngày.',
      data: {
        url: '/attendance',
      },
      isRead: true,
      readAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    // 10. MENTION - Mentioned in Document (Read)
    {
      userId: longVo.id,
      type: 'MENTION',
      category: 'mention.document',
      title: `${adminUser.name || 'Quản trị viên'} đã nhắc đến bạn trong Tài liệu dự án`,
      body: 'Trong "Quy chuẩn mã nguồn WorkSync 2026": "Các module mới cần tuân thủ ts-strict và Clean Architecture."',
      data: {
        url: '/documents',
      },
      isRead: true,
      readAt: daysAgo(2),
      createdAt: daysAgo(2),
      actorId: adminUser.id,
    },
    // 11. QUICK_TASK - Quick task completed (Read)
    {
      userId: longVo.id,
      type: 'QUICK_TASK',
      category: 'quicktask.completed',
      title: 'Việc nhanh hoàn thành: Cập nhật biến môi trường Staging',
      body: 'Đã hoàn thành và xác nhận đồng bộ hệ thống.',
      data: {
        url: '/quick-tasks',
      },
      isRead: true,
      readAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
  ];

  for (const item of notificationsToCreate) {
    await prisma.notification.create({ data: item });
  }

  const count = await prisma.notification.count({ where: { userId: longVo.id } });
  console.log(`Successfully seeded ${count} notifications for ${longVo.name}!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
