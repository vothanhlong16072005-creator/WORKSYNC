import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRY_RUN, log, logSuccess, seedId } from './seed-lib/helpers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function buildTiptapJson(paragraphs: string[]): any {
  return {
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }],
    })),
  };
}

async function main() {
  console.log('\n================================================================');
  console.log('📄 SEED PROJECT & DEPARTMENT DOCUMENTS (Tài liệu & File đính kèm)');
  console.log(`⚙️  Chế độ: ${DRY_RUN ? 'DRY-RUN (Không ghi vào DB)' : 'EXECUTE'}`);
  console.log('================================================================\n');

  const uploadDir = path.resolve(__dirname, '../uploads/documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 1. LẤY CÁC USER DEMO
  const [admin, pm1, pm2, head, headDesign, hr, devLong] = await Promise.all([
    prisma.user.findFirst({ where: { email: 'admin@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'pm@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'pm2@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'head@gmail.com' } }),
    prisma.user.findFirst({ where: { email: 'head.design@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'hr@worksync.com' } }),
    prisma.user.findFirst({ where: { email: 'vothanhlong1704@gmail.com' } }),
  ]);

  if (!admin || !pm1 || !pm2 || !head || !hr || !devLong) {
    throw new Error('Thiếu một trong các tài khoản demo bắt buộc!');
  }

  // 2. DANH SÁCH 18 TÀI LIỆU (15 PROJECT + 2 DEPARTMENT + 1 COMPANY)
  const docConfigs = [
    // --- 4 tài liệu proj-platform-v3 (Owner: pm@worksync.com) ---
    {
      id: seedId('doc', 'platform', 1),
      title: 'Tài liệu Thiết kế Kiến trúc Hệ thống WorkSync Enterprise v3.1',
      scope: 'PROJECT' as const,
      type: 'STANDARD' as const,
      projectId: 'proj-platform-v3',
      departmentId: 'dept-eng',
      ownerId: pm1.id,
      tags: ['architecture', 'backend', 'v3.1'],
      aiSummary: 'Mô tả cấu trúc tổng quan hệ thống phân tán, luồng xử lý WebRTC, Redis Cluster và cơ chế bảo mật JWT/RBAC.',
      paragraphs: [
        'Hệ thống WorkSync v3.1 áp dụng mô hình Clean Architecture phân tách rõ ràng giữa Core Business Entities, Use Cases và Infrastructure Adapters.',
        'Toàn bộ giao tiếp thời gian thực được xử lý qua cụm Socket.IO kết hợp Redis Pub/Sub đảm bảo khả năng mở rộng ngang tới hàng nghìn kết nối.',
        'Cơ sở dữ liệu PostgreSQL 16 được tối ưu hóa chỉ mục cho các truy vấn bảng lớn như AttendanceRecord, ChatMessage và Task.',
      ],
      versions: [
        { version: 1, note: 'Khởi tạo tài liệu kiến trúc sơ bộ', savedById: pm1.id },
        { version: 2, note: 'Bổ sung sơ đồ mạng FPT Data Center và quy chuẩn API', savedById: devLong.id },
      ],
      attachments: [
        { name: 'WorkSync_v3.1_Architecture_Diagram.pdf', ext: 'pdf', mime: 'application/pdf', content: 'PDF Architecture Diagram v3.1' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: true },
        { userId: head.id, canEdit: false, canComment: true, canShare: true },
      ],
    },
    {
      id: seedId('doc', 'platform', 2),
      title: 'Đặc tả Kỹ thuật Tích hợp WebRTC Theater Mode & Presence',
      scope: 'PROJECT' as const,
      type: 'TASK_REQUIREMENT' as const,
      projectId: 'proj-platform-v3',
      departmentId: 'dept-eng',
      ownerId: pm1.id,
      tags: ['webrtc', 'spec', 'video'],
      aiSummary: 'Yêu cầu kỹ thuật chi tiết về luồng video stream, cơ chế báo hiệu Signalling và khử vọng âm thanh AudioWorklet.',
      paragraphs: [
        'Tính năng Theater Mode hỗ trợ trình chiếu toàn màn hình tỷ lệ 16:9 với độ phân giải tối đa 1080p 30fps.',
        'Khi một người tham gia chia sẻ màn hình, video camera của chính họ sẽ hiển thị ở góc phải thu nhỏ và đồng bộ trực tiếp với các client khác.',
      ],
      versions: [
        { version: 1, note: 'Bản thảo yêu cầu kỹ thuật luồng media WebRTC', savedById: pm1.id },
        { version: 2, note: 'Bổ sung thông số Bitrate và STUN/TURN fallback', savedById: devLong.id },
      ],
      attachments: [
        { name: 'WebRTC_Mesh_Spec_2026.docx', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content: 'WebRTC Specifications document' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: false },
      ],
    },
    {
      id: seedId('doc', 'platform', 3),
      title: 'Báo cáo Kiểm thử Hiệu năng Tải Đỉnh & An toàn Thông tin Quý 3',
      scope: 'PROJECT' as const,
      type: 'TASK_SUBMISSION' as const,
      projectId: 'proj-platform-v3',
      departmentId: 'dept-eng',
      ownerId: pm1.id,
      tags: ['performance', 'security', 'audit'],
      aiSummary: 'Kết quả kiểm toán bảo mật OWASP Top 10 và benchmark tải 500 RPS đạt p95 latency 78ms.',
      paragraphs: [
        'Hệ thống đã trải qua đợt pentest chuyên sâu không phát hiện lỗ hổng nghiêm trọng SQL Injection hay RCE.',
        'Các endpoint nhạy cảm đã được bọc rate-limit 100 req/min/IP bằng Redis Token Bucket.',
      ],
      versions: [
        { version: 1, note: 'Bản tổng hợp kết quả chạy kiểm thử JMeter', savedById: devLong.id },
      ],
      attachments: [
        { name: 'JMeter_LoadTest_Summary_Q3.xlsx', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content: 'Performance benchmark data' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: true },
        { userId: admin.id, canEdit: true, canComment: true, canShare: true },
      ],
    },
    {
      id: seedId('doc', 'platform', 4),
      title: 'Biên bản Họp Rà soát Tiến độ Dự án Nền tảng (Platform Review)',
      scope: 'PROJECT' as const,
      type: 'MEETING_MINUTES' as const,
      projectId: 'proj-platform-v3',
      departmentId: 'dept-eng',
      ownerId: pm1.id,
      tags: ['meeting', 'minutes', 'roadmap'],
      aiSummary: 'Thống nhất kế hoạch ra mắt phiên bản v3.1 chính thức vào ngày 15/11/2026.',
      paragraphs: [
        'Ban dự án đánh giá cao nỗ lực hoàn thành tính năng Theater Mode trước hạn 3 ngày.',
        'Phân công anh Võ Thanh Long phụ trách kiểm tra lại tính năng kéo thả trạng thái công việc tại màn Team Project.',
      ],
      versions: [
        { version: 1, note: 'Ghi chép biên bản cuộc họp tổng kết', savedById: pm1.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: false },
      ],
    },

    // --- 3 tài liệu proj-mobile-app (Owner: pm2@worksync.com - ĐÃ GIẢI QUYẾT KHOẢNG TRỐNG 0 DOC) ---
    {
      id: seedId('doc', 'mobile', 1),
      title: 'Đặc tả Kỹ thuật Ứng dụng WorkSync Mobile iOS & Android v1.2',
      scope: 'PROJECT' as const,
      type: 'STANDARD' as const,
      projectId: 'proj-mobile-app',
      departmentId: 'dept-eng',
      ownerId: pm2.id,
      tags: ['mobile', 'react-native', 'spec'],
      aiSummary: 'Kiến trúc React Native 0.74 New Architecture, tối ưu hóa bộ nhớ và hỗ trợ chế độ Offline-first.',
      paragraphs: [
        'Ứng dụng Mobile phục vụ cán bộ nhân viên điểm danh định vị GPS, nhận thông báo giao việc nhanh và trao đổi tin nhắn phòng ban.',
        'Mã nguồn được tổ chức theo Feature-based modularity với Zustand quản lý state cục bộ và TanStack Query đồng bộ máy chủ.',
      ],
      versions: [
        { version: 1, note: 'Bản thảo ban đầu đặc tả Mobile App', savedById: pm2.id },
        { version: 2, note: 'Cập nhật thư viện bản đồ và giải pháp định vị nền', savedById: devLong.id },
      ],
      attachments: [
        { name: 'WorkSync_Mobile_Tech_Spec_v1.2.pdf', ext: 'pdf', mime: 'application/pdf', content: 'Mobile Tech Spec Document' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: true },
        { userId: head.id, canEdit: false, canComment: true, canShare: true },
      ],
    },
    {
      id: seedId('doc', 'mobile', 2),
      title: 'Hướng dẫn Cấu hình Định vị Geofence & Kiểm tra Chống Giả mạo GPS',
      scope: 'PROJECT' as const,
      type: 'TASK_REQUIREMENT' as const,
      projectId: 'proj-mobile-app',
      departmentId: 'dept-eng',
      ownerId: pm2.id,
      tags: ['gps', 'geofence', 'security'],
      aiSummary: 'Quy trình thẩm định tính hợp lệ của tọa độ GPS, bán kính 100m tòa nhà FPT Complex và phát hiện Mock Location.',
      paragraphs: [
        'Hệ thống tự động từ chối điểm danh nếu phát hiện thiết bị bật cờ isMockLocation hoặc tọa độ lệch quá 100m so với tâm tòa nhà.',
        'Tọa độ mẫu của văn phòng Đà Nẵng: Latitude 16.0321, Longitude 108.2234.',
      ],
      versions: [
        { version: 1, note: 'Quy chuẩn kiểm tra tọa độ chống gian lận', savedById: pm2.id },
      ],
      attachments: [
        { name: 'GPS_Mock_Detection_Test_Cases.xlsx', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content: 'GPS Test cases sheet' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: true },
      ],
    },
    {
      id: seedId('doc', 'mobile', 3),
      title: 'Báo cáo Kiểm thử Thực tế Điểm danh trên 15 Dòng Thiết bị Di động',
      scope: 'PROJECT' as const,
      type: 'TASK_SUBMISSION' as const,
      projectId: 'proj-mobile-app',
      departmentId: 'dept-eng',
      ownerId: pm2.id,
      tags: ['qa', 'testing', 'devices'],
      aiSummary: 'Tỷ lệ điểm danh thành công đạt 99.4% trên các dòng máy iPhone 13-15 và Samsung Galaxy S22-S24.',
      paragraphs: [
        'Tốc độ lấy tọa độ định vị trung bình là 1.8 giây, tiêu hao dưới 1.5% dung lượng pin sau ca làm việc 8 tiếng.',
        'Giao diện hiển thị trực quan và hỗ trợ xoay ngang màn hình cho máy tính bảng iPad.',
      ],
      versions: [
        { version: 1, note: 'Báo cáo nghiệm thu vòng thử nghiệm Beta nội bộ', savedById: devLong.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: true },
      ],
    },

    // --- 3 tài liệu proj-ai-meeting (Owner: pm@worksync.com) ---
    {
      id: seedId('doc', 'ai-meeting', 1),
      title: 'Kế hoạch Triển khai Mô hình Tóm tắt Biên bản Cuộc họp bằng Gemini AI',
      scope: 'PROJECT' as const,
      type: 'STANDARD' as const,
      projectId: 'proj-ai-meeting',
      departmentId: 'dept-eng',
      ownerId: pm1.id,
      tags: ['ai', 'gemini', 'minutes'],
      aiSummary: 'Quy trình bóc tách giọng nói, trích xuất quyết định trọng tâm và tự động tạo Task theo định dạng JSON.',
      paragraphs: [
        'Hệ thống thu thập bản ghi âm audio chunk, chuyển đổi sang text qua Web Speech API / Whisper, sau đó gửi prompt tới Gemini 1.5 Flash.',
        'Mỗi biên bản tự động bóc tách 3 phần: Quyết định quan trọng (Decisions), Công việc cần làm (Action Items) và Rủi ro tồn đọng (Risks).',
      ],
      versions: [
        { version: 1, note: 'Bản thiết kế pipeline xử lý AI meeting', savedById: pm1.id },
      ],
      attachments: [
        { name: 'Gemini_Prompt_Template_Meeting_Minutes.json', ext: 'json', mime: 'application/json', content: '{"prompt": "Generate meeting minutes strictly in JSON"}' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: true },
      ],
    },
    {
      id: seedId('doc', 'ai-meeting', 2),
      title: 'Yêu cầu Tích hợp Ghi âm & Live Transcription Thời gian Thực',
      scope: 'PROJECT' as const,
      type: 'TASK_REQUIREMENT' as const,
      projectId: 'proj-ai-meeting',
      departmentId: 'dept-eng',
      ownerId: pm1.id,
      tags: ['transcription', 'audio', 'realtime'],
      aiSummary: 'Giao diện hiển thị phụ đề trực tiếp có highlight người đang phát biểu và phân loại giọng nói theo Speaker ID.',
      paragraphs: [
        'Phụ đề hiển thị nổi ở chân màn hình meeting và tự động cuộn theo dòng phát biểu mới nhất.',
      ],
      versions: [
        { version: 1, note: 'Quy định kỹ thuật độ trễ subtitle dưới 500ms', savedById: pm1.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: false },
      ],
    },
    {
      id: seedId('doc', 'ai-meeting', 3),
      title: 'Biên bản Họp Trực tuyến Đánh giá Độ chính xác Nhận dạng Tiếng Việt',
      scope: 'PROJECT' as const,
      type: 'MEETING_MINUTES' as const,
      projectId: 'proj-ai-meeting',
      departmentId: 'dept-eng',
      ownerId: pm1.id,
      tags: ['nlp', 'vietnamese', 'benchmark'],
      aiSummary: 'Độ chính xác Word Error Rate (WER) đạt 8.2% trên ngữ cảnh kỹ thuật công nghệ thông tin.',
      paragraphs: [
        'Mô hình nhận diện chính xác các thuật ngữ chuyên ngành như Kubernetes, Microservices, Pull Request và CI/CD Pipeline.',
      ],
      versions: [
        { version: 1, note: 'Ghi nhận kết quả thử nghiệm 50 đoạn audio mẫu', savedById: pm1.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: false },
      ],
    },

    // --- 2 tài liệu proj-infra-devops (Owner: head@gmail.com) ---
    {
      id: seedId('doc', 'infra', 1),
      title: 'Cẩm nang Vận hành & Phục hồi Sự cố Hạ tầng FPT Data Center (Runbook)',
      scope: 'PROJECT' as const,
      type: 'STANDARD' as const,
      projectId: 'proj-infra-devops',
      departmentId: 'dept-eng',
      ownerId: head.id,
      tags: ['devops', 'runbook', 'fpt-dc'],
      aiSummary: 'Kịch bản ứng phó sự cố gián đoạn mạng, chuyển đổi dự phòng DB Master-Replica và khôi phục snapshot nhanh.',
      paragraphs: [
        'Tài liệu quy định chi tiết thời gian phản hồi sự cố (MTTR) dưới 15 phút đối với các dịch vụ cấp độ P1.',
        'Mọi thay đổi cấu hình hạ tầng bắt buộc phải thông qua pull request trên repo Terraform hạ tầng.',
      ],
      versions: [
        { version: 1, note: 'Khởi tạo tài liệu Runbook chuẩn vận hành', savedById: head.id },
      ],
      attachments: [
        { name: 'Disaster_Recovery_Plan_FPT_DC01.pdf', ext: 'pdf', mime: 'application/pdf', content: 'Disaster recovery procedures' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: true, canComment: true, canShare: true },
        { userId: admin.id, canEdit: true, canComment: true, canShare: true },
      ],
    },
    {
      id: seedId('doc', 'infra', 2),
      title: 'Quy trình Triển khai Zero-Downtime Deployment với Kubernetes EKS',
      scope: 'PROJECT' as const,
      type: 'TASK_REQUIREMENT' as const,
      projectId: 'proj-infra-devops',
      departmentId: 'dept-eng',
      ownerId: head.id,
      tags: ['kubernetes', 'deployment', 'ci-cd'],
      aiSummary: 'Chiến lược Rolling Update kết hợp Readiness/Liveness Probe bảo đảm không rớt request khi phát hành phiên bản mới.',
      paragraphs: [
        'Cấu hình maxSurge: 25% và maxUnavailable: 0% trong file deployment manifest.',
      ],
      versions: [
        { version: 1, note: 'Hướng dẫn cấu hình Helm Chart và ArgoCD', savedById: head.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: false },
      ],
    },

    // --- 2 tài liệu proj-hr-culture (Owner: hr@worksync.com) ---
    {
      id: seedId('doc', 'hr', 1),
      title: 'Chính sách Điểm danh Định vị & Chế độ Phúc lợi Hybrid Working 2026',
      scope: 'PROJECT' as const,
      type: 'STANDARD' as const,
      projectId: 'proj-hr-culture',
      departmentId: 'dept-hr',
      ownerId: hr.id,
      tags: ['hr', 'policy', 'hybrid'],
      aiSummary: 'Quy định giờ làm việc tiêu chuẩn 08:00 - 17:30, số ngày WFH tối đa 2 ngày/tuần và quy trình duyệt phép.',
      paragraphs: [
        'Cán bộ nhân viên thực hiện điểm danh qua mobile hoặc web app trong khung giờ cho phép từ 06:00 đến 12:00.',
        'Đơn xin WFH được hệ thống tự động phê duyệt lúc 09:30 sáng nếu được gửi trước giờ quy định.',
      ],
      versions: [
        { version: 1, note: 'Ban hành chính sách làm việc linh hoạt áp dụng toàn công ty', savedById: hr.id },
      ],
      attachments: [
        { name: 'Chinh_Sach_Lam_Viec_WorkSync_2026.pdf', ext: 'pdf', mime: 'application/pdf', content: 'HR Hybrid Policy 2026' },
      ],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: false },
        { userId: admin.id, canEdit: true, canComment: true, canShare: true },
      ],
    },
    {
      id: seedId('doc', 'hr', 2),
      title: 'Kế hoạch Tổ chức Ngày hội Văn hóa WorkSync & Gala Chào mừng Thành viên Mới',
      scope: 'PROJECT' as const,
      type: 'STANDARD' as const,
      projectId: 'proj-hr-culture',
      departmentId: 'dept-hr',
      ownerId: hr.id,
      tags: ['culture', 'event', 'team-building'],
      aiSummary: 'Chương trình gắn kết đội ngũ, vinh danh nhân sự xuất sắc và chào đón 10 tân binh gia nhập quý 4.',
      paragraphs: [
        'Sự kiện diễn ra vào ngày thứ Sáu cuối cùng của tháng với các hoạt động workshop công nghệ và tiệc tea-break.',
      ],
      versions: [
        { version: 1, note: 'Dự thảo ngân sách và kịch bản chi tiết', savedById: hr.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: false },
      ],
    },

    // --- 1 tài liệu p-dept-eng-1 (Owner: vothanhlong1704@gmail.com) ---
    {
      id: seedId('doc', 'eng-mobile', 1),
      title: 'Sổ tay Lập trình Viên Frontend: Chuẩn Clean Code & Atomic Design',
      scope: 'PROJECT' as const,
      type: 'STANDARD' as const,
      projectId: 'p-dept-eng-1',
      departmentId: 'dept-eng',
      ownerId: devLong.id,
      tags: ['guidelines', 'clean-code', 'react'],
      aiSummary: 'Quy chuẩn đặt tên component, tổ chức folder, xử lý loading/empty state và tối ưu hóa CSS bằng Tailwind.',
      paragraphs: [
        'Mỗi component tuân thủ Single Responsibility Principle và định nghĩa rõ ràng Props Interface với TypeScript strict.',
        'Tránh re-render không cần thiết bằng useMemo và useCallback cho các hàm xử lý sự kiện nặng.',
      ],
      versions: [
        { version: 1, note: 'Khởi tạo sổ tay phát triển nội bộ team Frontend', savedById: devLong.id },
        { version: 2, note: 'Bổ sung hướng dẫn sử dụng Lucide React icon chuẩn Bauhaus', savedById: devLong.id },
      ],
      attachments: [
        { name: 'Clean_Code_Handbook_2026.pdf', ext: 'pdf', mime: 'application/pdf', content: 'Frontend clean code handbook' },
      ],
      permissions: [
        { userId: head.id, canEdit: true, canComment: true, canShare: true },
        { userId: pm1.id, canEdit: false, canComment: true, canShare: true },
      ],
    },

    // --- 2 tài liệu DEPARTMENT ---
    {
      id: seedId('doc', 'dept-eng', 'general'),
      title: 'Quy định Kỹ thuật & Chuẩn Bàn giao Mã nguồn Phòng Kỹ thuật Phần mềm',
      scope: 'DEPARTMENT' as const,
      type: 'COMPANY_POLICY' as const,
      projectId: null,
      departmentId: 'dept-eng',
      ownerId: head.id,
      tags: ['engineering', 'standards', 'dept-eng'],
      aiSummary: 'Quy chuẩn Branching Strategy (Git Flow), Code Review tối thiểu 2 approvals và tỷ lệ unit test coverage >= 80%.',
      paragraphs: [
        'Mọi pull request phải có mô tả ngắn gọn, ảnh chụp màn hình UI (nếu có) và vượt qua 100% CI pipeline.',
      ],
      versions: [
        { version: 1, note: 'Ban hành quy định kỹ thuật chung cho phòng Kỹ thuật', savedById: head.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: false },
      ],
    },
    {
      id: seedId('doc', 'dept-design', 'general'),
      title: 'Hệ thống Thiết kế Giao diện WorkSync Design System (Figma & Tokens)',
      scope: 'DEPARTMENT' as const,
      type: 'STANDARD' as const,
      projectId: null,
      departmentId: 'dept-design',
      ownerId: headDesign?.id || admin.id,
      tags: ['design-system', 'tokens', 'ui-ux'],
      aiSummary: 'Bảng màu chuẩn, thang kích thước typography fluid scale và quy tắc bo góc border-radius chuẩn Bauhaus.',
      paragraphs: [
        'Màu sắc chủ đạo sử dụng dải màu Blue #2563EB kết hợp Slate #0F172A tạo cảm giác sang trọng và chuyên nghiệp.',
      ],
      versions: [
        { version: 1, note: 'Phát hành Design System v2.0 cho nhóm Thiết kế', savedById: headDesign?.id || admin.id },
      ],
      attachments: [],
      permissions: [
        { userId: devLong.id, canEdit: false, canComment: true, canShare: false },
      ],
    },

    // --- 1 tài liệu COMPANY ---
    {
      id: seedId('doc', 'company', 'handbook'),
      title: 'Sổ tay Văn hóa Doanh nghiệp & Quy chế Hoạt động WorkSync 2026',
      scope: 'COMPANY' as const,
      type: 'COMPANY_POLICY' as const,
      projectId: null,
      departmentId: null,
      ownerId: admin.id,
      tags: ['handbook', 'culture', 'company'],
      aiSummary: 'Tầm nhìn, sứ mệnh, giá trị cốt lõi và các quy tắc ứng xử chuẩn mực trong môi trường công nghệ tiên phong.',
      paragraphs: [
        'WorkSync cam kết xây dựng môi trường làm việc minh bạch, lấy hiệu quả công việc và sự hài lòng của nhân viên làm thước đo trung tâm.',
        'Mọi cán bộ nhân viên đều có quyền đóng góp ý kiến cải tiến quy trình trực tiếp tới Ban Điều hành.',
      ],
      versions: [
        { version: 1, note: 'Phát hành sổ tay văn hóa doanh nghiệp toàn công ty', savedById: admin.id },
      ],
      attachments: [
        { name: 'WorkSync_Company_Handbook_2026.pdf', ext: 'pdf', mime: 'application/pdf', content: 'WorkSync Company Handbook 2026' },
      ],
      permissions: [],
    },
  ];

  if (DRY_RUN) {
    log('DRY-RUN', `Sẽ tạo/cập nhật ${docConfigs.length} tài liệu (15 PROJECT, 2 DEPARTMENT, 1 COMPANY).`);
    let totalVersions = 0;
    let totalAttachments = 0;
    let totalPerms = 0;

    docConfigs.forEach((d) => {
      totalVersions += d.versions.length;
      totalAttachments += d.attachments.length;
      totalPerms += d.permissions.length;
    });

    log('DRY-RUN', `Tổng cộng có ${totalVersions} version, ${totalAttachments} file đính kèm thật, ${totalPerms} permissions.`);
    log('DRY-RUN', `Tất cả file đính kèm sẽ được ghi thật vào: ${uploadDir}`);
    await prisma.$disconnect();
    return;
  }

  // THỰC THI TRONG TRANSACTION
  await prisma.$transaction(async (tx) => {
    for (const doc of docConfigs) {
      const tiptapContent = buildTiptapJson(doc.paragraphs);
      const contentText = doc.paragraphs.join('\n\n');

      // 1. Upsert Document
      const createdDoc = await tx.document.upsert({
        where: { id: doc.id },
        update: {
          title: doc.title,
          content: tiptapContent,
          contentText,
          scope: doc.scope,
          type: doc.type,
          ownerId: doc.ownerId,
          projectId: doc.projectId,
          departmentId: doc.departmentId,
          aiSummary: doc.aiSummary,
          tags: doc.tags,
          currentVersion: doc.versions.length,
          updatedById: doc.ownerId,
        },
        create: {
          id: doc.id,
          title: doc.title,
          content: tiptapContent,
          contentText,
          scope: doc.scope,
          type: doc.type,
          ownerId: doc.ownerId,
          projectId: doc.projectId,
          departmentId: doc.departmentId,
          aiSummary: doc.aiSummary,
          tags: doc.tags,
          currentVersion: doc.versions.length,
          createdById: doc.ownerId,
          updatedById: doc.ownerId,
        },
      });

      // 2. Tạo DocumentVersion
      for (const ver of doc.versions) {
        const verId = seedId('docver', doc.id, ver.version);
        await tx.documentVersion.upsert({
          where: { documentId_version: { documentId: doc.id, version: ver.version } },
          update: {
            title: doc.title,
            content: tiptapContent,
            contentText,
            changeNote: ver.note,
            savedById: ver.savedById,
          },
          create: {
            id: verId,
            documentId: doc.id,
            version: ver.version,
            title: doc.title,
            content: tiptapContent,
            contentText,
            changeNote: ver.note,
            savedById: ver.savedById,
          },
        });
      }

      // 3. Tạo DocumentAttachment và ghi file thật trên disk
      for (let i = 0; i < doc.attachments.length; i++) {
        const att = doc.attachments[i];
        const attachId = seedId('docatt', doc.id, i + 1);
        const fileNameOnDisk = `seed-${doc.id}-${i + 1}.${att.ext}`;
        const filePath = path.join(uploadDir, fileNameOnDisk);

        // Ghi file vật lý thật lên ổ đĩa
        fs.writeFileSync(filePath, att.content, 'utf8');

        await tx.documentAttachment.upsert({
          where: { id: attachId },
          update: {
            fileName: att.name,
            fileSize: Buffer.byteLength(att.content, 'utf8'),
            mimeType: att.mime,
            minioKey: fileNameOnDisk,
          },
          create: {
            id: attachId,
            documentId: doc.id,
            fileName: att.name,
            fileSize: Buffer.byteLength(att.content, 'utf8'),
            mimeType: att.mime,
            minioKey: fileNameOnDisk,
            minioBucket: 'worksync-documents',
            uploadedById: doc.ownerId,
          },
        });
      }

      // 4. Tạo DocumentPermission
      for (const perm of doc.permissions) {
        const permId = seedId('docperm', doc.id, perm.userId);
        await tx.documentPermission.upsert({
          where: { documentId_userId: { documentId: doc.id, userId: perm.userId } },
          update: {
            canEdit: perm.canEdit,
            canComment: perm.canComment,
            canShare: perm.canShare,
          },
          create: {
            id: permId,
            documentId: doc.id,
            userId: perm.userId,
            canEdit: perm.canEdit,
            canComment: perm.canComment,
            canShare: perm.canShare,
            grantedById: doc.ownerId,
          },
        });
      }
    }

    // 5. Chuẩn hóa DocumentVersion cho các tài liệu cũ còn thiếu phiên bản
    const allDocs = await tx.document.findMany({
      where: { deletedAt: null },
      include: { versions: { orderBy: { version: 'asc' } } },
    });
    for (const d of allDocs) {
      if (d.versions.length === 0) {
        await tx.documentVersion.create({
          data: {
            id: seedId('docver', d.id, 1),
            documentId: d.id,
            version: 1,
            title: d.title,
            content: d.content || buildTiptapJson(['Nội dung tài liệu khởi tạo']),
            contentText: d.contentText || d.title,
            changeNote: 'Bản lưu trữ khởi tạo (Tự động đồng bộ)',
            savedById: d.ownerId,
          },
        });
        await tx.document.update({
          where: { id: d.id },
          data: { currentVersion: 1 },
        });
      } else if (d.currentVersion !== d.versions.length) {
        await tx.document.update({
          where: { id: d.id },
          data: { currentVersion: d.versions.length },
        });
      }
    }
  });

  logSuccess('DOCUMENTS', `Đã tạo 18 tài liệu phong phú, versions, file đính kèm thật và quyền chia sẻ thành công!`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed project docs failed:', e);
  process.exit(1);
});
