import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const usersConfig = [
  {
    email: 'hr@worksync.com',
    roleTasks: [
      [
        'Soát xét hồ sơ ứng viên vị trí Senior React Developer cho dự án Mobile App',
        'Tổng hợp dữ liệu chấm công GPS nửa đầu tháng 10 cho toàn thể nhân sự FPT Complex',
        'Phê duyệt 3 đơn xin WFH và 2 đơn xin nghỉ phép thường niên',
      ],
      [
        'Tổ chức buổi phỏng vấn vòng 2 ứng viên DevOps AWS',
        'Gặp mặt trao đổi trực tiếp 1-1 với nhân sự mới gia nhập tuần trước',
        'Kiểm tra và chuẩn bị ngân sách quà tặng kỷ niệm thâm niên quý 4',
      ],
      [
        'Cập nhật chính sách làm việc hybrid và hướng dẫn đăng ký WFH',
        'Gửi thư chúc mừng sinh nhật cho 4 nhân sự trong tuần này',
        'Xử lý phản hồi của nhân viên về hệ thống chấm công địa lý 100m',
      ],
    ],
    blockers: ['Cần phòng Kỹ thuật xác nhận thêm về khung đánh giá năng lực dev'],
    planned: [
      'Gặp Trưởng phòng Kỹ thuật để thống nhất định biên nhân sự tháng 11',
      'Hoàn tất báo cáo chuyên cần tuần cho Ban Giám Đốc',
    ],
  },
  {
    email: 'admin@worksync.com',
    roleTasks: [
      [
        'Rà soát bảo mật OWASP Top 10 và kiểm toán các endpoint API Admin',
        'Tối ưu hóa chỉ mục PostgreSQL cho bảng AttendanceRecord và ChatMessage',
        'Triển khai bản vá WebRTC Mesh Theater Mode trên môi trường Cloud',
      ],
      [
        'Kiểm tra tải hệ thống Socket.IO đạt 500 connections đồng thời',
        'Cấu hình tường lửa AWS WAF và chứng chỉ SSL cho cụm Microservices',
        'Họp kiến trúc cùng lead dev về module AI Meeting transcript',
      ],
      [
        'Thiết lập pipeline CI/CD GitHub Actions build và deploy tự động Vercel/Render',
        'Kiểm tra backup database tự động định kỳ 6 tiếng/lần',
        'Review pull request của team Core Platform',
      ],
    ],
    blockers: ['Đang chờ Neon hoàn tất nâng cấp phiên bản Postgres 16'],
    planned: [
      'Nâng cấp cụm Redis cache cho presence tracking đa tab',
      'Đánh giá hiệu năng AI Gemini 1.5 Flash cho tính năng tóm tắt tài liệu',
    ],
  },
  {
    email: 'head@gmail.com',
    roleTasks: [
      [
        'Họp giao ban toàn phòng Kỹ thuật đánh giá tiến độ 3 dự án trọng điểm',
        'Phê duyệt kế hoạch nhân sự và đổi PM dự án Platform v3.1',
        'Xét duyệt đơn đăng ký làm thêm giờ (OT) chuẩn bị go-live',
      ],
      [
        'Thẩm định thiết kế kiến trúc phân hệ Báo cáo ngày tự động bằng AI',
        'Làm việc cùng PM về phương án tháo gỡ rủi ro chậm tiến độ module Chat',
        'Ký duyệt nghiệm thu kỹ thuật Sprint 14',
      ],
      [
        'Tham gia hội đồng đánh giá thử việc 2 kỹ sư phần mềm mới',
        'Rà soát ngân sách hạ tầng điện toán đám mây tháng 10',
        'Định hướng kế hoạch đào tạo công nghệ mới quý 4',
      ],
    ],
    blockers: ['Một số task integration bên thứ 3 cần chờ đối tác cấp sandbox'],
    planned: [
      'Họp demo trực tiếp với Ban Lãnh Đạo FPT Software',
      'Chốt danh sách nhân sự xuất sắc khen thưởng tháng 10',
    ],
  },
  {
    email: 'pm@worksync.com',
    roleTasks: [
      [
        'Điều phối Daily Standup 15 phút đúng chuẩn cho dự án Platform v3.1',
        'Cập nhật tiến độ Burndown Chart Sprint 14 trên bảng Scrum',
        'Review nghiệm thu 4 User Stories hoàn thành từ dev team',
      ],
      [
        'Lên kế hoạch Backlog Refinement chuẩn bị cho Sprint 15 tuần tới',
        'Xử lý vướng mắc của QA về môi trường kiểm thử tự động',
        'Báo cáo tiến độ phân bổ nguồn lực gửi Trưởng phòng Kỹ thuật',
      ],
      [
        'Chốt scope các tính năng MVP của dự án Mobile App',
        'Bàn giao phân quyền dự án và tài liệu cho PM kế nhiệm',
        'Kiểm tra lại checklist sẵn sàng bàn giao sản phẩm',
      ],
    ],
    blockers: ['Team thiếu 1 máy test iOS để kiểm tra push notification APNs'],
    planned: [
      'Tổ chức Sprint Review và Retrospective với toàn đội',
      'Khởi động Sprint 15 với 32 story points cam kết',
    ],
  },
  {
    email: 'nam.hoang@worksync.com',
    roleTasks: [
      [
        'Hoàn thiện API xác thực JWT và cơ chế refresh token an toàn qua HttpOnly Cookie',
        'Fix lỗi phân quyền IDOR trong module chỉnh sửa thông tin cá nhân',
        'Viết unit test cho dịch vụ Chấm công đạt độ bao phủ 95%',
      ],
      [
        'Tối ưu hóa câu truy vấn Prisma loại bỏ hoàn toàn hiện tượng N+1 query',
        'Tích hợp Web Push VAPID gửi thông báo đẩy trực tiếp đến trình duyệt',
        'Code review pull request của dev junior',
      ],
      [
        'Xây dựng schema validation với Zod cho toàn bộ 12 DTOs của hệ thống',
        'Hỗ trợ DevOps cấu hình biến môi trường production',
        'Viết tài liệu Swagger/OpenAPI cho đối tác tích hợp',
      ],
    ],
    blockers: ['Không có vướng mắc / Tiến độ thuận lợi'],
    planned: [
      'Nghiên cứu áp dụng Server-Sent Events cho luồng AI streaming',
      'Hoàn thành module xuất báo cáo Excel đa định dạng',
    ],
  },
  {
    email: 'bao.dang@worksync.com',
    roleTasks: [
      [
        'Cấu hình Nginx reverse proxy với HTTP/2 và nén Brotli',
        'Triển khai cụm giám sát Prometheus & Grafana theo dõi CPU/RAM container',
        'Viết Docker Compose đa tầng tối ưu dung lượng image từ 1.2GB xuống 180MB',
      ],
      [
        'Kiểm tra tự động gia hạn chứng chỉ Let\'s Encrypt SSL',
        'Thiết lập cảnh báo Slack Alertmanager khi backend có lỗi HTTP 5xx',
        'Chạy benchmark tải k6 đạt 1,200 RPS với latency < 45ms',
      ],
      [
        'Phân quyền IAM role bảo mật tuyệt đối cho dịch vụ S3 / R2 storage',
        'Xây dựng script sao lưu cơ sở dữ liệu hàng đêm gửi về cold storage',
        'Rà soát lỗ hổng hệ điều hành Linux máy chủ',
      ],
    ],
    blockers: ['Cần xin cấp thêm dung lượng RAM cho cụm máy chủ Staging'],
    planned: [
      'Nâng cấp phiên bản Node.js LTS 22 trên toàn bộ image Docker',
      'Tự động hóa rollback khi container gặp crash loop',
    ],
  },
];

async function main() {
  console.log('🌱 [SEED-DAILY-REPORTS] Khởi tạo dữ liệu mẫu 14 ngày Báo cáo ngày (Module M10)...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let createdCount = 0;

  for (const cfg of usersConfig) {
    const user = await prisma.user.findUnique({
      where: { email: cfg.email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      console.log(`⚠️ Bỏ qua ${cfg.email} vì chưa tìm thấy trong database`);
      continue;
    }

    // Tạo báo cáo cho 14 ngày làm việc gần nhất
    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const reportDate = new Date(today);
      reportDate.setDate(reportDate.getDate() - dayOffset);

      // Bỏ qua Chủ nhật (0) để giống thực tế làm việc
      if (reportDate.getDay() === 0) continue;

      const taskIndex = dayOffset % cfg.roleTasks.length;
      const tasksDone = cfg.roleTasks[taskIndex];
      const blocker = dayOffset % 4 === 0 ? cfg.blockers[0] : 'Tiến độ thuận lợi, không có vướng mắc kỹ thuật.';
      const plannedTomorrow = cfg.planned.join('\n- ');

      const content = `### Báo Cáo Ngày Làm Việc (${reportDate.toLocaleDateString('vi-VN')})\n\n**Họ và tên:** ${user.name}\n\n**1. Công việc đã hoàn thành hôm nay:**\n- ${tasksDone.join('\n- ')}\n\n**2. Khó khăn / Vướng mắc:**\n${blocker}\n\n**3. Kế hoạch ngày mai:**\n- ${plannedTomorrow}`;

      const submittedAt = new Date(reportDate);
      submittedAt.setHours(17, 15 + (dayOffset % 25), 0, 0);

      await prisma.dailyReport.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: reportDate,
          },
        },
        update: {
          content,
          tasksDone,
          blockers: blocker,
          plannedTomorrow: `- ${plannedTomorrow}`,
          isLocked: dayOffset > 0, // Các ngày quá khứ bị khóa, hôm nay mở
          lateSubmission: false,
          submittedAt,
          submittedById: user.id,
        },
        create: {
          userId: user.id,
          date: reportDate,
          content,
          tasksDone,
          blockers: blocker,
          plannedTomorrow: `- ${plannedTomorrow}`,
          isLocked: dayOffset > 0,
          lateSubmission: false,
          submittedAt,
          submittedById: user.id,
        },
      });

      createdCount++;
    }
  }

  console.log(`✅ [SEED-DAILY-REPORTS] Hoàn tất nạp ${createdCount} bản ghi Báo cáo ngày!`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed daily reports:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
