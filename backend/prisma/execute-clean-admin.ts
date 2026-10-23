import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 [CLEANUP] Bắt đầu dọn dẹp các task và xung đột lịch của tài khoản Admin...');

  const admin = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'ADMIN' },
        { email: 'admin@worksync.com' },
      ],
    },
  });

  if (!admin) {
    console.log('⚠️ Không tìm thấy tài khoản admin');
    return;
  }

  console.log(`👤 Admin: ${admin.name} (${admin.email}) [ID: ${admin.id}]`);

  // 1. Tìm tất cả task mà admin được gán (assigneeId = admin.id)
  const assignedTasks = await prisma.task.findMany({
    where: { assigneeId: admin.id },
    select: { id: true, title: true },
  });

  console.log(`📋 Số lượng task được gán cho Admin: ${assignedTasks.length}`);
  const taskIds = assignedTasks.map((t) => t.id);

  if (taskIds.length > 0) {
    // Xóa liên kết dependencies
    const delDeps = await prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { taskId: { in: taskIds } },
          { dependsOnId: { in: taskIds } },
        ],
      },
    });
    console.log(`  → Đã xóa ${delDeps.count} task dependencies`);

    // Xóa task comments
    const delComments = await prisma.comment.deleteMany({
      where: { taskId: { in: taskIds } },
    });
    console.log(`  → Đã xóa ${delComments.count} task comments`);

    // Xóa work logs
    const delLogs = await prisma.workLog.deleteMany({
      where: { taskId: { in: taskIds } },
    });
    console.log(`  → Đã xóa ${delLogs.count} work logs`);

    // Xóa task
    const delTasks = await prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });
    console.log(`  → Đã xóa thành công ${delTasks.count} tasks của admin`);
  }

  // 2. Xóa QuickTasks nếu có
  const delQuick = await prisma.quickTask.deleteMany({
    where: { assigneeId: admin.id },
  });
  console.log(`⚡ Đã xóa ${delQuick.count} quick tasks của admin`);

  // 3. Dọn dẹp các cuộc họp trùng lặp (duplicate meetings cùng tiêu đề và thời gian)
  const allMeetings = await prisma.meeting.findMany({
    select: { id: true, title: true, startTime: true, createdById: true },
    orderBy: { createdAt: 'asc' },
  });

  const seen = new Set<string>();
  const duplicateMeetingIds: string[] = [];

  for (const m of allMeetings) {
    const key = `${m.title.trim().toLowerCase()}_${new Date(m.startTime).getTime()}`;
    if (seen.has(key)) {
      duplicateMeetingIds.push(m.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateMeetingIds.length > 0) {
    await prisma.meetingAttendee.deleteMany({
      where: { meetingId: { in: duplicateMeetingIds } },
    });
    const delMeets = await prisma.meeting.deleteMany({
      where: { id: { in: duplicateMeetingIds } },
    });
    console.log(`🗓️ Đã xóa ${delMeets.count} cuộc họp trùng lặp`);
  }

  // 4. Kiểm tra lại số task còn lại của admin
  const remainingTasks = await prisma.task.count({
    where: { assigneeId: admin.id },
  });
  console.log(`✅ Hoàn tất! Số task còn lại của admin: ${remainingTasks}`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi dọn dẹp:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
