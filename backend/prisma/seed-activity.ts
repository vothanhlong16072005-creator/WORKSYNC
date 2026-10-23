import { PrismaClient } from '@prisma/client';
import { DRY_RUN, dateOffset, log, logSuccess, seedId } from './seed-lib/helpers.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('\n================================================================');
  console.log('💬 SEED ACTIVITY (WorkLogs, Comments, Reactions, Epics, Deps, Fields)');
  console.log(`⚙️  Chế độ: ${DRY_RUN ? 'DRY-RUN (Không ghi vào DB)' : 'EXECUTE'}`);
  console.log('================================================================\n');

  // Lấy các user demo
  const [admin, pm1, pm2, head, devLong] = await Promise.all([
    prisma.user.findFirst({ where: { email: 'admin@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'pm@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'pm2@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'head@gmail.com' } }),
    prisma.user.findFirst({ where: { email: 'vothanhlong1704@gmail.com' } }),
  ]);

  if (!admin || !pm1 || !pm2 || !head || !devLong) {
    throw new Error('Thiếu các tài khoản demo chính!');
  }

  // 1. TẠO 4 EPICS CHO 2 DỰ ÁN TRỌNG ĐIỂM
  const epicConfigs = [
    {
      id: seedId('epic', 'platform', 1),
      projectId: 'proj-platform-v3',
      title: 'Tái cấu trúc Kiến trúc & Microservices v3.1',
      description: 'Chuyển đổi toàn diện hệ thống sang mô hình Clean Architecture và Redis Presence Engine',
      color: '#2563EB',
    },
    {
      id: seedId('epic', 'platform', 2),
      projectId: 'proj-platform-v3',
      title: 'WebRTC Mesh Theater Mode & Video Collaboration',
      description: 'Nâng cấp phòng họp trực tuyến với độ phân giải cao và chia sẻ màn hình mượt mà',
      color: '#7C3AED',
    },
    {
      id: seedId('epic', 'mobile', 1),
      projectId: 'proj-mobile-app',
      title: 'Hạ tầng Định vị Chấm công Geofence 100m',
      description: 'Thuật toán định vị thông minh và chống giả mạo GPS tòa nhà FPT Complex',
      color: '#059669',
    },
    {
      id: seedId('epic', 'mobile', 2),
      projectId: 'proj-mobile-app',
      title: 'Bảo mật Sinh trắc học & Push Notifications',
      description: 'Xác thực vân tay, FaceID và kết nối thời gian thực qua Firebase Cloud Messaging',
      color: '#D97706',
    },
  ];

  // 2. LẤY CÁC TASK TRONG HỆ THỐNG ĐỂ GÁN WORKLOG VÀ COMMENT
  const existingTasks = await prisma.task.findMany({
    where: { deletedAt: null },
    take: 30,
    select: { id: true, title: true, projectId: true, assigneeId: true },
  });

  if (existingTasks.length === 0) {
    log('WARN', 'Không tìm thấy task có sẵn để gán activity.');
  }

  // 3. TẠO 5 CẶP TASK DEPENDENCIES (FINISH_TO_START)
  const dependencyPairs: { taskId: string; dependsOnId: string }[] = [];
  if (existingTasks.length >= 6) {
    for (let i = 0; i < Math.min(5, Math.floor(existingTasks.length / 2)); i++) {
      dependencyPairs.push({
        taskId: existingTasks[i * 2 + 1].id,
        dependsOnId: existingTasks[i * 2].id,
      });
    }
  }

  // 4. TẠO ~50 WORKLOGS
  const workLogDescriptions = [
    'Tối ưu hóa chỉ mục composite index PostgreSQL và đo lường latency',
    'Triển khai unit test suite cho module phân quyền RBAC',
    'Sửa lỗi đồng bộ luồng video WebRTC khi chuyển đổi chế độ xem',
    'Viết tài liệu OpenAPI 3.0 và kiểm thử các schema DTO',
    'Debug bộ lọc định vị GPS chống rung tọa độ tại văn phòng',
    'Soát xét mã nguồn (Code Review) cho các PR của thành viên nhóm',
    'Cấu hình cụm Redis Cache và kiểm thử tải kết nối đồng thời',
    'Thiết kế giao diện người dùng theo phong cách Bauhaus hiện đại',
    'Kiểm tra tính tương thích trên các phiên bản trình duyệt di động',
    'Thảo luận phương án tích hợp AI Gemini tóm tắt biên bản họp',
  ];

  const workLogs = [];
  const candidateUsers = [devLong, pm1, pm2, head];

  for (let i = 0; i < 50; i++) {
    const task = existingTasks[i % existingTasks.length];
    const u = candidateUsers[i % candidateUsers.length];
    const daysAgo = -((i % 25) + 1);
    const durationMins = [45, 60, 90, 120, 150, 180, 240][i % 7];
    const desc = workLogDescriptions[i % workLogDescriptions.length];

    if (task) {
      workLogs.push({
        id: seedId('worklog', i + 1),
        taskId: task.id,
        userId: task.assigneeId || u.id,
        duration: durationMins,
        description: desc,
        logDate: dateOffset(daysAgo),
      });
    }
  }

  // 5. TẠO ~35 COMMENTS VÀ ~20 REACTIONS
  const commentTemplates = [
    'Mình đã hoàn thành việc tối ưu hóa endpoint này, latency giảm từ 220ms xuống còn 65ms.',
    'Nhờ team test kỹ trường hợp mất mạng đột ngột xem dữ liệu có tự động lưu vào local cache không nhé.',
    'Đã kiểm tra trên môi trường Staging, các chức năng hoạt động rất ổn định.',
    'Cần bổ sung thêm một số test case biên cho hàm tính toán thời gian làm việc.',
    'Tài liệu đặc tả rất rõ ràng, team dev có thể bắt tay vào triển khai ngay.',
    'Phần giao diện Bauhaus nhìn rất sang trọng và trực quan, trải nghiệm mượt mà.',
    'Đã merge PR sau khi hoàn tất kiểm tra an toàn bảo mật OWASP.',
  ];

  const comments = [];
  const reactions = [];
  const emojis = ['👍', '🚀', '❤️', '🎉', '🔥'];

  for (let i = 0; i < 35; i++) {
    const task = existingTasks[i % existingTasks.length];
    const author = candidateUsers[i % candidateUsers.length];
    const content = commentTemplates[i % commentTemplates.length];
    const commentId = seedId('comment', i + 1);

    if (task) {
      comments.push({
        id: commentId,
        taskId: task.id,
        authorId: author.id,
        content,
      });

      // Tạo Reaction cho ~20 comments
      if (i < 20) {
        const reactor = candidateUsers[(i + 1) % candidateUsers.length];
        const emoji = emojis[i % emojis.length];
        reactions.push({
          id: seedId('reaction', i + 1),
          commentId,
          userId: reactor.id,
          emoji,
        });
      }
    }
  }

  // 6. TẠO CUSTOM FIELDS & CUSTOM VALUES CHO 2 DỰ ÁN
  const customFieldConfigs = [
    {
      id: seedId('cf', 'platform', 'complexity'),
      projectId: 'proj-platform-v3',
      name: 'Độ phức tạp kỹ thuật',
      fieldType: 'DROPDOWN' as const,
      options: ['Thấp (Low)', 'Trung bình (Medium)', 'Cao (High)', 'Rất cao (Critical)'],
    },
    {
      id: seedId('cf', 'platform', 'jira'),
      projectId: 'proj-platform-v3',
      name: 'Mã JIRA liên kết',
      fieldType: 'TEXT' as const,
      options: [],
    },
    {
      id: seedId('cf', 'mobile', 'risk'),
      projectId: 'proj-mobile-app',
      name: 'Mức độ rủi ro',
      fieldType: 'DROPDOWN' as const,
      options: ['An toàn', 'Cần theo dõi', 'Báo động đỏ'],
    },
  ];

  if (DRY_RUN) {
    log('DRY-RUN', `Sẽ tạo:`);
    console.log({
      Epics: epicConfigs.length,
      TaskDependencies: dependencyPairs.length,
      WorkLogs: workLogs.length,
      Comments: comments.length,
      Reactions: reactions.length,
      CustomFields: customFieldConfigs.length,
    });
    await prisma.$disconnect();
    return;
  }

  // THỰC THI TRONG TRANSACTION
  await prisma.$transaction(async (tx) => {
    // 1. Tạo Epics
    for (const ep of epicConfigs) {
      await tx.epic.upsert({
        where: { id: ep.id },
        update: {
          title: ep.title,
          description: ep.description,
          color: ep.color,
        },
        create: {
          id: ep.id,
          projectId: ep.projectId,
          title: ep.title,
          description: ep.description,
          color: ep.color,
        },
      });
    }

    // 2. Tạo Task Dependencies
    for (let i = 0; i < dependencyPairs.length; i++) {
      const pair = dependencyPairs[i];
      const depId = seedId('dep', i + 1);
      await tx.taskDependency.upsert({
        where: { taskId_dependsOnId: { taskId: pair.taskId, dependsOnId: pair.dependsOnId } },
        update: { dependencyType: 'FINISH_TO_START' },
        create: {
          id: depId,
          taskId: pair.taskId,
          dependsOnId: pair.dependsOnId,
          dependencyType: 'FINISH_TO_START',
        },
      });
    }

    // 3. Tạo WorkLogs
    for (const wl of workLogs) {
      await tx.workLog.upsert({
        where: { id: wl.id },
        update: {
          duration: wl.duration,
          description: wl.description,
          logDate: wl.logDate,
        },
        create: {
          id: wl.id,
          taskId: wl.taskId,
          userId: wl.userId,
          duration: wl.duration,
          description: wl.description,
          logDate: wl.logDate,
        },
      });
    }

    // 4. Tạo Comments & Reactions
    for (const c of comments) {
      await tx.comment.upsert({
        where: { id: c.id },
        update: {
          content: c.content,
        },
        create: {
          id: c.id,
          taskId: c.taskId,
          authorId: c.authorId,
          content: c.content,
          mentions: [],
        },
      });
    }

    for (const r of reactions) {
      await tx.reaction.upsert({
        where: { commentId_userId_emoji: { commentId: r.commentId, userId: r.userId, emoji: r.emoji } },
        update: {},
        create: {
          id: r.id,
          commentId: r.commentId,
          userId: r.userId,
          emoji: r.emoji,
        },
      });
    }

    // 5. Tạo Custom Fields & Values
    for (const cf of customFieldConfigs) {
      await tx.customField.upsert({
        where: { id: cf.id },
        update: {
          name: cf.name,
          fieldType: cf.fieldType,
          options: cf.options,
        },
        create: {
          id: cf.id,
          projectId: cf.projectId,
          name: cf.name,
          fieldType: cf.fieldType,
          options: cf.options,
        },
      });
    }

    // Gán CustomFieldValue cho một số task của platform-v3
    const platformTasks = existingTasks.filter((t) => t.projectId === 'proj-platform-v3');
    for (let i = 0; i < Math.min(platformTasks.length, 6); i++) {
      const task = platformTasks[i];
      const valId = seedId('cfval', task.id, 1);
      await tx.customFieldValue.upsert({
        where: { taskId_customFieldId: { taskId: task.id, customFieldId: seedId('cf', 'platform', 'complexity') } },
        update: { value: ['Thấp (Low)', 'Trung bình (Medium)', 'Cao (High)'][i % 3] },
        create: {
          id: valId,
          taskId: task.id,
          customFieldId: seedId('cf', 'platform', 'complexity'),
          value: ['Thấp (Low)', 'Trung bình (Medium)', 'Cao (High)'][i % 3],
        },
      });
    }
  });

  logSuccess('ACTIVITY', 'Đã khởi tạo thành công 4 Epics, Task Dependencies, 50 WorkLogs, 35 Comments, 20 Reactions và Custom Fields!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed activity failed:', e);
  process.exit(1);
});
