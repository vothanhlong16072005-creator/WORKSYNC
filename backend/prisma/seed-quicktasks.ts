import { PrismaClient } from '@prisma/client';
import { DRY_RUN, dateOffset, log, logSuccess, seedId } from './seed-lib/helpers.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('\n================================================================');
  console.log('⚡ SEED QUICKTASKS (Giao việc nhanh — Đa trạng thái & Hạn chót)');
  console.log(`⚙️  Chế độ: ${DRY_RUN ? 'DRY-RUN (Không ghi vào DB)' : 'EXECUTE'}`);
  console.log('================================================================\n');

  // Lấy các user demo
  const [admin, pm1, pm2, head, hr, devLong] = await Promise.all([
    prisma.user.findFirst({ where: { email: 'admin@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'pm@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'pm2@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'head@gmail.com' } }),
    prisma.user.findFirst({ where: { email: 'hr@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'vothanhlong1704@gmail.com' } }),
  ]);

  if (!admin || !pm1 || !pm2 || !head || !hr || !devLong) {
    throw new Error('Thiếu một trong các tài khoản demo bắt buộc!');
  }

  // Danh sách QuickTask cần tạo:
  // Đảm bảo vothanhlong1704 nhận >= 8 task đa trạng thái
  const quickTasks = [
    // --- 1. GIAO BỞI PM1 (pm@worksync.com) - 8 tasks ---
    {
      id: seedId('quicktask', 'pm1', 1),
      title: 'Tối ưu hóa phản hồi API /tasks/kanban dưới 100ms',
      description: 'Đánh chỉ mục composite index cho bảng Task theo (projectId, status, position)',
      projectId: 'proj-platform-v3',
      assignedById: pm1.id,
      assigneeId: devLong.id,
      dueDaysOffset: -2, // QUÁ HẠN
      priority: 'URGENT',
      status: 'IN_PROGRESS',
    },
    {
      id: seedId('quicktask', 'pm1', 2),
      title: 'Kiểm toán lỗ hổng IDOR trên endpoint cập nhật tài liệu',
      description: 'Kiểm tra chặt chẽ userId vs ownerId/collaborators trước khi cho phép PUT/DELETE',
      projectId: 'proj-platform-v3',
      assignedById: pm1.id,
      assigneeId: devLong.id,
      dueDaysOffset: 1, // NGÀY MAI
      priority: 'HIGH',
      status: 'TODO',
    },
    {
      id: seedId('quicktask', 'pm1', 3),
      title: 'Xử lý lỗi rò rỉ bộ nhớ WebRTC PeerConnection khi đóng tab đột ngột',
      description: 'Bổ sung hook cleanup tracks, stop streams và emit disconnect event',
      projectId: 'proj-platform-v3',
      assignedById: pm1.id,
      assigneeId: devLong.id,
      dueDaysOffset: 3,
      priority: 'HIGH',
      status: 'IN_REVIEW',
    },
    {
      id: seedId('quicktask', 'pm1', 4),
      title: 'Viết tài liệu Swagger OpenAPI 3.0 cho Module Automation',
      description: 'Định nghĩa chi tiết request body schema, enum và response codes 200/400/403',
      projectId: 'proj-platform-v3',
      assignedById: pm1.id,
      assigneeId: devLong.id,
      dueDaysOffset: -4, // QUÁ HẠN
      priority: 'MEDIUM',
      status: 'BLOCKED',
    },
    {
      id: seedId('quicktask', 'pm1', 5),
      title: 'Kiểm tra tương thích giao diện dark mode trên trình duyệt Safari',
      description: 'Fix màu chữ bị mờ nhạt ở dropdown menu và modal header',
      projectId: 'proj-platform-v3',
      assignedById: pm1.id,
      assigneeId: devLong.id,
      dueDaysOffset: -10,
      priority: 'LOW',
      status: 'DONE',
    },
    {
      id: seedId('quicktask', 'pm1', 6),
      title: 'Tích hợp Gemini 1.5 Flash tạo Action Items tự động sau cuộc họp',
      description: 'Thiết kế prompt định dạng JSON strict output chứa người phụ trách và deadline',
      projectId: 'proj-ai-meeting',
      assignedById: pm1.id,
      assigneeId: devLong.id,
      dueDaysOffset: 2,
      priority: 'URGENT',
      status: 'IN_PROGRESS',
    },
    {
      id: seedId('quicktask', 'pm1', 7),
      title: 'Lọc nhiễu âm thanh đầu vào WebRTC bằng AudioWorklet',
      description: 'Triển khai thuật toán khử vọng Echo Cancellation và nén tiếng ồn môi trường',
      projectId: 'proj-ai-meeting',
      assignedById: pm1.id,
      assigneeId: devLong.id,
      dueDaysOffset: 4,
      priority: 'HIGH',
      status: 'TODO',
    },
    {
      id: seedId('quicktask', 'pm1', 8),
      title: 'Soát xét checklist bảo mật trước đợt kiểm toán định kỳ quý 4',
      description: 'Kiểm tra phân quyền truy cập DB và chứng chỉ SSL TLS 1.3',
      projectId: null, // Personal
      assignedById: pm1.id,
      assigneeId: pm1.id,
      dueDaysOffset: 0, // HÔM NAY
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },

    // --- 2. GIAO BỞI PM2 (pm2@worksync.com) - 7 tasks ---
    {
      id: seedId('quicktask', 'pm2', 1),
      title: 'Khắc phục xung đột Geofence khi nhân viên đứng ở ranh giới sảnh FPT',
      description: 'Nâng bán kính quét từ 80m lên 100m và áp dụng bộ lọc Kalman giảm rung tọa độ',
      projectId: 'proj-mobile-app',
      assignedById: pm2.id,
      assigneeId: devLong.id,
      dueDaysOffset: 1,
      priority: 'URGENT',
      status: 'IN_PROGRESS',
    },
    {
      id: seedId('quicktask', 'pm2', 2),
      title: 'Tối ưu hóa render danh sách thông báo tin nhắn trên iOS 17',
      description: 'Chuyển sang FlashList của Shopify để tránh giật lag khi cuộn nhanh',
      projectId: 'proj-mobile-app',
      assignedById: pm2.id,
      assigneeId: devLong.id,
      dueDaysOffset: 5,
      priority: 'HIGH',
      status: 'TODO',
    },
    {
      id: seedId('quicktask', 'pm2', 3),
      title: 'Xử lý logic tự động Check-out khi nhân viên rời khỏi vùng định vị 30 phút',
      description: 'Bảo đảm ném event thông báo xác nhận trước khi tự động đóng ca',
      projectId: 'proj-mobile-app',
      assignedById: pm2.id,
      assigneeId: devLong.id,
      dueDaysOffset: -1, // QUÁ HẠN
      priority: 'HIGH',
      status: 'BLOCKED',
    },
    {
      id: seedId('quicktask', 'pm2', 4),
      title: 'Thiết kế icon Splash Screen chuẩn độ phân giải xxxhdpi cho Android',
      description: 'Xuất file SVG vector chuẩn màu xanh thương hiệu #2563EB',
      projectId: 'proj-mobile-app',
      assignedById: pm2.id,
      assigneeId: pm2.id,
      dueDaysOffset: -5,
      priority: 'MEDIUM',
      status: 'DONE',
    },
    {
      id: seedId('quicktask', 'pm2', 5),
      title: 'Kiểm thử Push Notification trên mạng 4G/5G khi khóa màn hình',
      description: 'Ghi log thời gian trễ từ khi server gửi đến khi thiết bị rung thông báo',
      projectId: 'proj-mobile-app',
      assignedById: pm2.id,
      assigneeId: pm2.id,
      dueDaysOffset: 2,
      priority: 'LOW',
      status: 'TODO',
    },
    {
      id: seedId('quicktask', 'pm2', 6),
      title: 'Tổng hợp phản hồi người dùng nội bộ về bản build Alpha v1.2.0',
      description: 'Ghi nhận các ý kiến đánh giá về độ mượt của cử chỉ vuốt đổi tab',
      projectId: null,
      assignedById: pm2.id,
      assigneeId: pm2.id,
      dueDaysOffset: 0, // HÔM NAY
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
    {
      id: seedId('quicktask', 'pm2', 7),
      title: 'Chuẩn bị slide giới thiệu tính năng Mobile App cho buổi Demo Day',
      description: 'Trình bày luồng người dùng từ Check-in, nhận QuickTask đến tham gia cuộc họp',
      projectId: null,
      assignedById: pm2.id,
      assigneeId: pm2.id,
      dueDaysOffset: 3,
      priority: 'HIGH',
      status: 'TODO',
    },

    // --- 3. GIAO BỞI HEAD (head@gmail.com) - 6 tasks (Cùng phòng dept-eng) ---
    {
      id: seedId('quicktask', 'head', 1),
      title: 'Nâng cấp cụm Redis Cache lên phiên bản 7.2 Alpine tại FPT DC-01',
      description: 'Thực hiện lúc 22:00 để tránh ảnh hưởng phiên làm việc của nhân viên',
      projectId: 'proj-infra-devops',
      assignedById: head.id,
      assigneeId: devLong.id,
      dueDaysOffset: 2,
      priority: 'URGENT',
      status: 'TODO',
    },
    {
      id: seedId('quicktask', 'head', 2),
      title: 'Thiết lập rule giám sát CPU > 85% và Disk Usage > 80% trên Prometheus',
      description: 'Cấu hình webhook bắn thông báo trực tiếp vào kênh chat DevOps nội bộ',
      projectId: 'proj-infra-devops',
      assignedById: head.id,
      assigneeId: devLong.id,
      dueDaysOffset: -3, // QUÁ HẠN
      priority: 'HIGH',
      status: 'IN_REVIEW',
    },
    {
      id: seedId('quicktask', 'head', 3),
      title: 'Kiểm toán bảo mật phân quyền Role-based Access Control toàn bộ API',
      description: 'Đảm bảo EMPLOYEE không thể gọi các endpoint của Trưởng phòng hoặc Quản trị viên',
      projectId: 'proj-infra-devops',
      assignedById: head.id,
      assigneeId: head.id,
      dueDaysOffset: 0,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    },
    {
      id: seedId('quicktask', 'head', 4),
      title: 'Cấu hình tự động backup PostgreSQL database lên kho lưu trữ offsite',
      description: 'Script pg_dump chạy định kỳ 02:00 sáng mỗi ngày kèm checksum SHA256',
      projectId: 'proj-infra-devops',
      assignedById: head.id,
      assigneeId: head.id,
      dueDaysOffset: -12,
      priority: 'MEDIUM',
      status: 'DONE',
    },
    {
      id: seedId('quicktask', 'head', 5),
      title: 'Soát xét định biên nhân sự và nhu cầu tuyển dụng bổ sung quý 4',
      description: 'Thống nhất với phòng Nhân sự về việc tuyển thêm 2 Senior React Developers',
      projectId: null,
      assignedById: head.id,
      assigneeId: head.id,
      dueDaysOffset: 4,
      priority: 'LOW',
      status: 'TODO',
    },
    {
      id: seedId('quicktask', 'head', 6),
      title: 'Chuẩn bị kế hoạch bảo trì định kỳ hệ thống mạng nội bộ FPT Complex',
      description: 'Thông báo trước 48 giờ cho toàn thể nhân sự tòa nhà',
      projectId: 'proj-infra-devops',
      assignedById: head.id,
      assigneeId: devLong.id,
      dueDaysOffset: -8,
      priority: 'MEDIUM',
      status: 'DONE',
    },

    // --- 4. GIAO BỞI ADMIN (admin@worksync.com) - 3 tasks ---
    {
      id: seedId('quicktask', 'admin', 1),
      title: 'Rà soát danh sách nhân sự mới gia nhập và kích hoạt tài khoản hệ thống',
      description: 'Bảo đảm 100% nhân viên mới có hồ sơ phòng ban và mã định danh hợp lệ',
      projectId: null,
      assignedById: admin.id,
      assigneeId: hr.id,
      dueDaysOffset: 1,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    },
    {
      id: seedId('quicktask', 'admin', 2),
      title: 'Cập nhật chính sách làm việc Hybrid và chế độ duyệt đơn WFH tự động',
      description: 'Cấu hình ngưỡng duyệt tự động lúc 09:30 sáng trên Admin Control Center',
      projectId: null,
      assignedById: admin.id,
      assigneeId: hr.id,
      dueDaysOffset: -1, // QUÁ HẠN
      priority: 'URGENT',
      status: 'TODO',
    },
    {
      id: seedId('quicktask', 'admin', 3),
      title: 'Kiểm tra báo cáo an toàn thông tin và nhật ký truy cập hệ thống tháng 10',
      description: 'Xuất file báo cáo PDF lưu trữ theo chuẩn ISO 27001',
      projectId: null,
      assignedById: admin.id,
      assigneeId: admin.id,
      dueDaysOffset: 3,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
  ];

  if (DRY_RUN) {
    log('DRY-RUN', `Sẽ tạo/cập nhật ${quickTasks.length} QuickTasks.`);
    const countByAssignee: Record<string, number> = {};
    const countByStatus: Record<string, number> = {};
    let overdueCount = 0;

    quickTasks.forEach((qt) => {
      countByAssignee[qt.assigneeId] = (countByAssignee[qt.assigneeId] || 0) + 1;
      countByStatus[qt.status] = (countByStatus[qt.status] || 0) + 1;
      if (qt.dueDaysOffset < 0 && qt.status !== 'DONE') overdueCount++;
    });

    console.log('Thống kê theo Assignee:', {
      'vothanhlong1704@gmail.com (Demo Employee)': countByAssignee[devLong.id] || 0,
      'pm@worksync.com (Demo PM)': countByAssignee[pm1.id] || 0,
      'pm2@worksync.com (Demo PM2)': countByAssignee[pm2.id] || 0,
      'head@gmail.com (Demo Head)': countByAssignee[head.id] || 0,
      'hr@worksync.com (Demo HR)': countByAssignee[hr.id] || 0,
    });
    console.log('Thống kê theo Trạng thái:', countByStatus);
    console.log(`Số QuickTask quá hạn (Overdue badge): ${overdueCount}`);
    await prisma.$disconnect();
    return;
  }

  // THỰC THI TRONG TRANSACTION
  await prisma.$transaction(async (tx) => {
    for (const qt of quickTasks) {
      const dueDate = dateOffset(qt.dueDaysOffset);
      const completedAt = qt.status === 'DONE' ? dueDate : null;

      await tx.quickTask.upsert({
        where: { id: qt.id },
        update: {
          title: qt.title,
          description: qt.description,
          projectId: qt.projectId,
          assignedById: qt.assignedById,
          assigneeId: qt.assigneeId,
          dueDate,
          priority: qt.priority as any,
          status: qt.status as any,
          completedAt,
        },
        create: {
          id: qt.id,
          title: qt.title,
          description: qt.description,
          projectId: qt.projectId,
          assignedById: qt.assignedById,
          assigneeId: qt.assigneeId,
          dueDate,
          priority: qt.priority as any,
          status: qt.status as any,
          completedAt,
        },
      });
    }
  });

  logSuccess('QUICKTASKS', `Đã tạo thành công ${quickTasks.length} QuickTasks đa dạng trạng thái và phòng ban!`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed quicktasks failed:', e);
  process.exit(1);
});
