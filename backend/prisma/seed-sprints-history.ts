import { PrismaClient } from '@prisma/client';
import { DRY_RUN, dateOffset, log, logSuccess, seedId } from './seed-lib/helpers.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('\n================================================================');
  console.log('🏃 SEED SPRINTS & TASK HISTORY (Sprint lịch sử & Burndown Chart)');
  console.log(`⚙️  Chế độ: ${DRY_RUN ? 'DRY-RUN (Không ghi vào DB)' : 'EXECUTE'}`);
  console.log('================================================================\n');

  // Lấy các user demo
  const [pm1, pm2, head, devLong] = await Promise.all([
    prisma.user.findFirst({ where: { email: 'pm@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'pm2@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'head@gmail.com' } }),
    prisma.user.findFirst({ where: { email: 'vothanhlong1704@gmail.com' } }),
  ]);

  if (!pm1 || !pm2 || !head || !devLong) {
    throw new Error('Thiếu một trong các tài khoản demo (pm, pm2, head, vothanhlong1704)!');
  }

  // 1. KẾ HOẠCH SỬA 3 SPRINT LỖI HIỆN TẠI
  const fixSprints = [
    {
      id: 'sprint-mobile-01',
      status: 'COMPLETED' as const,
      completedAt: dateOffset(-15),
      reason: 'Sửa lỗi 2 sprint ACTIVE cùng lúc trong proj-mobile-app',
    },
    {
      id: 'sprint_p1_14',
      status: 'COMPLETED' as const,
      completedAt: dateOffset(-9),
      reason: 'Sprint p1 đã quá hạn (15/10) nhưng vẫn đang treo ACTIVE',
    },
    {
      id: 'sprint_p2_04',
      status: 'COMPLETED' as const,
      completedAt: dateOffset(-5),
      reason: 'Sprint p2 đã quá hạn (19/10) nhưng vẫn đang treo ACTIVE',
    },
  ];

  // 2. KẾ HOẠCH TẠO 6 SPRINT COMPLETED MỚI CÓ BURNDOWN ĐẸP
  const sprintDefs = [
    {
      id: seedId('sprint', 'platform', 's12'),
      projectId: 'proj-platform-v3',
      name: 'Sprint 12 — Platform v3.1 Core Architecture Refactor',
      goal: 'Tái cấu trúc Clean Architecture & tối ưu hóa chỉ mục PostgreSQL',
      createdById: pm1.id,
      startOffsetDays: -60,
      endOffsetDays: -46,
      tasks: [
        { title: 'Tối ưu hóa Connection Pool cho Prisma & Redis Cluster', points: 8, timeEst: 20, timeTrack: 20, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Thiết kế middleware kiểm toán bảo mật JWT Refresh Token', points: 5, timeEst: 14, timeTrack: 14, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Chuyển đổi toàn bộ DTO sang class-validator v0.15', points: 3, timeEst: 8, timeTrack: 8, assigneeId: pm1.id, status: 'DONE' },
        { title: 'Benchmark hiệu năng API Endpoint /api/tasks dưới tải 200 RPS', points: 5, timeEst: 12, timeTrack: 12, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Xây dựng module phân trang Cursor-based cho Notification', points: 3, timeEst: 10, timeTrack: 10, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Tài liệu hóa kiến trúc Microservices & sơ đồ luồng dữ liệu C4', points: 2, timeEst: 6, timeTrack: 6, assigneeId: pm1.id, status: 'DONE' },
      ],
    },
    {
      id: seedId('sprint', 'platform', 's13'),
      projectId: 'proj-platform-v3',
      name: 'Sprint 13 — WebRTC Theater Mode & Presence Engine',
      goal: 'Hoàn thiện tính năng chia sẻ màn hình 1080p và hiện diện trực tuyến',
      createdById: pm1.id,
      startOffsetDays: -45,
      endOffsetDays: -31,
      tasks: [
        { title: 'Fix lỗi camera overlay góc phải khi bật chia sẻ toàn màn hình', points: 5, timeEst: 12, timeTrack: 12, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Cấu hình STUN/TURN Coturn Server cho kết nối NAT đối xứng', points: 8, timeEst: 18, timeTrack: 18, assigneeId: head.id, status: 'DONE' },
        { title: 'Cơ chế bù trừ độ trễ Socket.IO Presence Heartbeat 15s', points: 5, timeEst: 14, timeTrack: 14, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Xây dựng giao diện Theater Mode với tỉ lệ khung hình 16:9', points: 5, timeEst: 15, timeTrack: 15, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Xử lý đồng bộ audio-level indicator cho người đang phát biểu', points: 3, timeEst: 8, timeTrack: 8, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Kiểm thử tải WebRTC Mesh 6 người tham gia đồng thời', points: 5, timeEst: 10, timeTrack: 10, assigneeId: pm1.id, status: 'DONE' },
      ],
    },
    {
      id: seedId('sprint', 'mobile', 's1'),
      projectId: 'proj-mobile-app',
      name: 'Sprint 1 — Geofence GPS Core Engine & Offline Storage',
      goal: 'Hoàn thiện định vị GPS bán kính 100m phục vụ điểm danh chuẩn xác',
      createdById: pm2.id,
      startOffsetDays: -60,
      endOffsetDays: -46,
      tasks: [
        { title: 'Tích hợp react-native-geolocation-service tính khoảng cách Haversine', points: 8, timeEst: 20, timeTrack: 20, assigneeId: pm2.id, status: 'DONE' },
        { title: 'Lưu trữ offline SQLite khi mất kết nối mạng và tự sync khi có internet', points: 5, timeEst: 16, timeTrack: 16, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Bảo vệ chống Fake GPS / Mock Location trên Android & iOS', points: 5, timeEst: 14, timeTrack: 14, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Thiết kế hoạt họa Radar Scanner khi quét tọa độ văn phòng FPT', points: 3, timeEst: 10, timeTrack: 10, assigneeId: pm2.id, status: 'DONE' },
        { title: 'Tối ưu hóa tiêu hao pin chế độ Background Geofence dưới 2% / ca', points: 5, timeEst: 12, timeTrack: 12, assigneeId: devLong.id, status: 'DONE' },
      ],
    },
    {
      id: seedId('sprint', 'mobile', 's2'),
      projectId: 'proj-mobile-app',
      name: 'Sprint 2 — Push Notification & Biometric Auth (FaceID/Vân tay)',
      goal: 'Tích hợp Firebase FCM và xác thực sinh trắc học chuẩn FIDO2',
      createdById: pm2.id,
      startOffsetDays: -45,
      endOffsetDays: -31,
      tasks: [
        { title: 'Tích hợp Keychain (iOS) & Keystore (Android) lưu Token an toàn', points: 5, timeEst: 14, timeTrack: 14, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Xử lý deep-link từ Push Notification mở đúng màn hình công việc', points: 5, timeEst: 12, timeTrack: 12, assigneeId: pm2.id, status: 'DONE' },
        { title: 'Bảo mật xác thực FaceID / Vân tay trước khi duyệt đơn khẩn cấp', points: 3, timeEst: 10, timeTrack: 10, assigneeId: pm2.id, status: 'DONE' },
        { title: 'Kiểm thử Push Notification trên thiết bị thật iOS 17 và Android 14', points: 3, timeEst: 8, timeTrack: 8, assigneeId: devLong.id, status: 'DONE' },
      ],
    },
    {
      id: seedId('sprint', 'infra', 's10'),
      projectId: 'proj-infra-devops',
      name: 'Sprint 10 — EKS Multi-AZ Foundation & Zero-Downtime Pipeline',
      goal: 'Thiết lập hạ tầng FPT Data Center chịu tải cao và sao lưu tự động',
      createdById: head.id,
      startOffsetDays: -58,
      endOffsetDays: -44,
      tasks: [
        { title: 'Cấu hình Ingress NGINX Controller & SSL Wildcard Let\'s Encrypt', points: 5, timeEst: 12, timeTrack: 12, assigneeId: head.id, status: 'DONE' },
        { title: 'Thiết lập cụm PostgreSQL Replica Streaming dự phòng nóng', points: 8, timeEst: 22, timeTrack: 22, assigneeId: head.id, status: 'DONE' },
        { title: 'Tự động hóa kịch bản pg_dump sao lưu DB lên S3 mỗi 6 giờ', points: 5, timeEst: 14, timeTrack: 14, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Cấu hình Prometheus Alertmanager gửi cảnh báo CPU > 85% về Slack', points: 3, timeEst: 8, timeTrack: 8, assigneeId: head.id, status: 'DONE' },
        { title: 'Tối ưu hóa Dockerfile Multi-stage giảm kích thước image còn 120MB', points: 3, timeEst: 8, timeTrack: 8, assigneeId: devLong.id, status: 'DONE' },
      ],
    },
    {
      id: seedId('sprint', 'dept-eng', 's1'),
      projectId: 'p-dept-eng-1',
      name: 'Sprint 1 — Mobile MVP Module Chấm công & Điểm danh',
      goal: 'Ra mắt phiên bản thử nghiệm chấm công nội bộ cho phòng Kỹ thuật',
      createdById: devLong.id,
      startOffsetDays: -55,
      endOffsetDays: -41,
      tasks: [
        { title: 'Xây dựng giao diện Đồng hồ số ca làm việc theo giờ thực tế', points: 5, timeEst: 12, timeTrack: 12, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Xử lý logic tự động tính toán số giờ làm việc, giờ tăng ca OT', points: 5, timeEst: 15, timeTrack: 15, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Tích hợp popup xác nhận Check-in/Check-out bảo đảm không nhầm lẫn', points: 3, timeEst: 8, timeTrack: 8, assigneeId: devLong.id, status: 'DONE' },
        { title: 'Báo cáo tổng hợp chuyên cần tuần dạng biểu đồ đường', points: 5, timeEst: 14, timeTrack: 14, assigneeId: devLong.id, status: 'DONE' },
      ],
    },
  ];

  if (DRY_RUN) {
    log('DRY-RUN', `Sẽ cập nhật ${fixSprints.length} sprint lỗi về COMPLETED.`);
    log('DRY-RUN', `Sẽ tạo 6 sprint COMPLETED mới cho các dự án của PM demo.`);
    let totalTasks = 0;
    sprintDefs.forEach((s) => (totalTasks += s.tasks.length));
    log('DRY-RUN', `Tổng cộng sẽ tạo ${totalTasks} task lịch sử có story points, estimate & tracked.`);
    await prisma.$disconnect();
    return;
  }

  // THỰC THI TRONG TRANSACTION
  await prisma.$transaction(async (tx) => {
    // 1. Sửa 3 sprint lỗi
    for (const fix of fixSprints) {
      await tx.sprint.updateMany({
        where: { id: fix.id },
        data: {
          status: fix.status,
          completedAt: fix.completedAt,
        },
      });
      log('SPRINT', `Đã cập nhật sprint ${fix.id} -> COMPLETED: ${fix.reason}`);
    }

    // 2. Tạo 6 sprint mới + tasks
    let taskIndex = 0;
    for (const sp of sprintDefs) {
      const startDate = dateOffset(sp.startOffsetDays);
      const endDate = dateOffset(sp.endOffsetDays);
      const completedAt = endDate;

      await tx.sprint.upsert({
        where: { id: sp.id },
        update: {
          name: sp.name,
          goal: sp.goal,
          status: 'COMPLETED',
          startDate,
          endDate,
          completedAt,
          durationDays: 14,
        },
        create: {
          id: sp.id,
          projectId: sp.projectId,
          name: sp.name,
          goal: sp.goal,
          status: 'COMPLETED',
          startDate,
          endDate,
          completedAt,
          durationDays: 14,
          createdById: sp.createdById,
        },
      });

      // Tạo các Task trong Sprint
      for (let i = 0; i < sp.tasks.length; i++) {
        const t = sp.tasks[i];
        const taskId = seedId('task', 'sprint', sp.id, i + 1);
        taskIndex++;

        await tx.task.upsert({
          where: { id: taskId },
          update: {
            title: t.title,
            status: t.status as any,
            storyPoints: t.points,
            timeEstimate: t.timeEst,
            timeTracked: t.timeTrack,
            position: 1024 * (i + 1),
            assigneeId: t.assigneeId,
            completedById: t.status === 'DONE' ? t.assigneeId : null,
            completedAt: t.status === 'DONE' ? endDate : null,
          },
          create: {
            id: taskId,
            projectId: sp.projectId,
            sprintId: sp.id,
            title: t.title,
            status: t.status as any,
            priority: 'HIGH',
            storyPoints: t.points,
            timeEstimate: t.timeEst,
            timeTracked: t.timeTrack,
            position: 1024 * (i + 1),
            assigneeId: t.assigneeId,
            createdById: sp.createdById,
            completedById: t.status === 'DONE' ? t.assigneeId : null,
            completedAt: t.status === 'DONE' ? endDate : null,
          },
        });
      }
    }
  });

  logSuccess('SPRINTS', 'Đã sửa 3 sprint lỗi và tạo 6 sprint lịch sử cùng các task hoàn tất thành công!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed sprints failed:', e);
  process.exit(1);
});
