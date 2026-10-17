import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding notifications...');

  const headEng = await prisma.user.findUnique({
    where: { email: 'head.eng@worksync.com' },
  });

  const emp = await prisma.user.findFirst({
    where: { email: 'vothanhlong1704@gmail.com' },
  });

  if (!headEng) {
    console.log('User head.eng@worksync.com not found, skipping');
    return;
  }

  // Delete old test notifications for head.eng
  await prisma.notification.deleteMany({
    where: { userId: headEng.id },
  });

  const notifications = [
    {
      userId: headEng.id,
      type: NotificationType.MEETING,
      category: 'meeting.created',
      title: 'Cuộc họp mới: "Sprint Planning & Kiến trúc M9"',
      body: 'Long Võ đã mời bạn tham gia cuộc họp vào lúc 09:00 ngày mai.',
      data: { url: '/meetings' },
      isRead: false,
      actorId: emp?.id,
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    },
    {
      userId: headEng.id,
      type: NotificationType.ATTENDANCE_APPROVAL,
      category: 'attendance.pending',
      title: '⏳ Đơn xin WFH mới cần duyệt',
      body: 'Võ Thanh Long vừa gửi đơn xin làm việc từ xa ngày 20/10.',
      data: { url: '/attendance?tab=approval' },
      isRead: false,
      actorId: emp?.id,
      createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 min ago
    },
    {
      userId: headEng.id,
      type: NotificationType.QUICK_TASK,
      category: 'quicktask.assigned',
      title: '⚡ Công việc nhanh: "Kiểm tra cấu hình Web Push VAPID"',
      body: 'Hạn chót: 18:00 hôm nay. Vui lòng kiểm tra chứng chỉ.',
      data: { url: '/quick-tasks' },
      isRead: false,
      actorId: emp?.id,
      createdAt: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago
    },
    {
      userId: headEng.id,
      type: NotificationType.MENTION,
      category: 'mention.user',
      title: '@ Long Võ đã nhắc đến bạn trong task #WS-104',
      body: '"@head.eng anh xem giúp em luồng Socket.IO gateway đã kết nối ổn chưa nhé!"',
      data: { url: '/projects/p3' },
      isRead: false,
      actorId: emp?.id,
      createdAt: new Date(Date.now() - 4 * 3600 * 1000), // 4 hours ago
    },
    {
      userId: headEng.id,
      type: NotificationType.TASK,
      category: 'task.review',
      title: '👀 Công việc chờ duyệt: "Tối ưu hiệu năng Prisma Query"',
      body: 'Task đã hoàn thành và được chuyển sang cột Chờ duyệt (IN_REVIEW).',
      data: { url: '/projects/p3' },
      isRead: true,
      readAt: new Date(Date.now() - 1 * 3600 * 1000),
      actorId: emp?.id,
      createdAt: new Date(Date.now() - 8 * 3600 * 1000), // 8 hours ago
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: n,
    });
  }

  console.log(`Seeded ${notifications.length} notifications for ${headEng.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
