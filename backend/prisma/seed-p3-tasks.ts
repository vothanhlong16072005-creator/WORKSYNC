import { PrismaClient, TaskStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu tạo dữ liệu tasks cho dự án p3 (AI & Automation Core)...');

  // 1. Cập nhật PM và mô tả cho p3
  await prisma.project.update({
    where: { id: 'p3' },
    data: {
      pmId: 'user_bao',
      description: 'Hệ thống tự động hóa quy trình nghiệp vụ & tích hợp AI trợ lý thông minh cho doanh nghiệp',
      status: 'ACTIVE',
    },
  });

  const longVoId = 'cmuvi29fs0000mdn33tuizp7m'; // vothanhlong1704@gmail.com
  const pmBaoId = 'user_bao';                   // tranvanbao@worksync.internal
  const maiId = 'user_mai';                     // lethimai@worksync.internal
  const longQaId = 'user_long_qa';               // nguyenhoanglong@worksync.internal
  const ducId = 'user_duc';                     // phamminhduc@worksync.internal

  // Xóa tasks cũ nếu có của p3 để seed mới chuẩn xác
  await prisma.task.deleteMany({
    where: { projectId: 'p3' },
  });

  const now = new Date();
  const d = (daysOffset: number) => new Date(now.getTime() + daysOffset * 86400000);

  const tasksData = [
    // --- TODO (Cần làm) ---
    {
      title: 'Nghiên cứu kiến trúc tích hợp Local LLM vLLM / Ollama cho On-Premise',
      description: 'Đánh giá hiệu năng và độ trễ của mô hình Llama-3-8B và Qwen-2.5 khi deploy trên máy chủ GPU nội bộ doanh nghiệp nhằm bảo mật dữ liệu.',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      storyPoints: 8,
      timeEstimate: 24,
      timeTracked: 0,
      position: 1024,
      dueDate: d(7),
      labels: ['AI', 'Architecture', 'R&D'],
      assigneeId: longVoId,
      createdById: pmBaoId,
    },
    {
      title: 'Tích hợp Webhook tự động kích hoạt tác vụ từ Slack & Microsoft Teams',
      description: 'Xây dựng module API nhận Webhook từ Slack bot để tự động phân loại công việc khẩn cấp vào bảng Kanban dự án.',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      storyPoints: 5,
      timeEstimate: 16,
      timeTracked: 0,
      position: 2048,
      dueDate: d(10),
      labels: ['Integration', 'Webhook', 'Automation'],
      assigneeId: ducId,
      createdById: pmBaoId,
    },

    // --- IN_PROGRESS (Đang thực hiện) ---
    {
      title: 'Phát triển Pipeline trích xuất thông tin tự động từ tài liệu PDF hợp đồng',
      description: 'Sử dụng kỹ thuật OCR và AI Document Intelligence để trích xuất số hợp đồng, ngày ký, giá trị pháp lý và điều khoản phạt.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      storyPoints: 13,
      timeEstimate: 40,
      timeTracked: 18,
      position: 1024,
      dueDate: d(3),
      labels: ['AI', 'OCR', 'Document'],
      assigneeId: longVoId,
      createdById: pmBaoId,
    },
    {
      title: 'Tối ưu hóa bộ nhớ đệm Redis & Vector DB Chroma cho tính năng Semantic Search',
      description: 'Giảm thời gian tìm kiếm tương đồng văn bản từ 450ms xuống dưới 60ms cho tập dữ liệu 500,000 vectors.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      storyPoints: 5,
      timeEstimate: 20,
      timeTracked: 12,
      position: 2048,
      dueDate: d(5),
      labels: ['VectorDB', 'Performance', 'Redis'],
      assigneeId: maiId,
      createdById: pmBaoId,
    },
    {
      title: 'Thiết kế giao diện Interactive Chatbot Assistant chuẩn Bauhaus Modern',
      description: 'Giao diện popup chat thông minh với streaming response (Server-Sent Events), code syntax highlighting và gợi ý câu hỏi tiếp theo.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      storyPoints: 5,
      timeEstimate: 16,
      timeTracked: 8,
      position: 3072,
      dueDate: d(4),
      labels: ['UI/UX', 'Frontend', 'React'],
      assigneeId: longVoId,
      createdById: pmBaoId,
    },

    // --- BLOCKED (Điểm nghẽn) ---
    {
      title: 'Đăng ký cấp phát Quota GPU NVIDIA H100 tại FPT Data Center',
      description: 'Đang chờ phê duyệt từ Ban quản trị hạ tầng IT & Khối tài chính để mở cổng kết nối GPU Cluster huấn luyện mô hình phân loại.',
      status: TaskStatus.BLOCKED,
      priority: Priority.URGENT,
      storyPoints: 3,
      timeEstimate: 8,
      timeTracked: 2,
      position: 1024,
      dueDate: d(1),
      labels: ['Infra', 'DevOps', 'Blocked'],
      assigneeId: ducId,
      createdById: pmBaoId,
    },

    // --- DONE (Hoàn thành) ---
    {
      title: 'Thiết lập mô hình phân loại độ ưu tiên task tự động bằng NLP TF-IDF',
      description: 'Đã hoàn thành huấn luyện mô hình phân loại text tiếng Việt với độ chính xác F1-score đạt 91.4% trên tập test 2,000 tasks.',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      storyPoints: 8,
      timeEstimate: 24,
      timeTracked: 22,
      position: 1024,
      dueDate: d(-3),
      labels: ['MachineLearning', 'NLP', 'Backend'],
      assigneeId: longVoId,
      createdById: pmBaoId,
      completedById: longVoId,
      completedAt: d(-1),
    },
    {
      title: 'Xây dựng bộ API Swagger & Documentations cho Automation Module',
      description: 'Đã hoàn thành viết tài liệu API chi tiết tại /api/docs với 18 endpoints, payload schema và mã lỗi chuẩn HTTP.',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      storyPoints: 3,
      timeEstimate: 12,
      timeTracked: 10,
      position: 2048,
      dueDate: d(-5),
      labels: ['API', 'Documentation'],
      assigneeId: longQaId,
      createdById: pmBaoId,
      completedById: longQaId,
      completedAt: d(-2),
    },
    {
      title: 'Kiểm thử tải hiệu năng Automation Triggers với K6 & Artillery',
      description: 'Thực hiện stress test chịu tải 1,000 concurrent webhook triggers/second với tỷ lệ lỗi 0% và p95 latency 78ms.',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      storyPoints: 5,
      timeEstimate: 16,
      timeTracked: 15,
      position: 3072,
      dueDate: d(-7),
      labels: ['QA', 'Performance', 'K6'],
      assigneeId: longQaId,
      createdById: pmBaoId,
      completedById: longQaId,
      completedAt: d(-4),
    },
    {
      title: 'Khởi tạo cấu trúc repository và phân chia monorepo modules',
      description: 'Cấu hình linter, tsconfig strict mode, GitHub Actions CI và Docker Compose môi trường dev hoàn chỉnh.',
      status: TaskStatus.DONE,
      priority: Priority.LOW,
      storyPoints: 2,
      timeEstimate: 8,
      timeTracked: 6,
      position: 4096,
      dueDate: d(-10),
      labels: ['DevOps', 'Setup'],
      assigneeId: maiId,
      createdById: pmBaoId,
      completedById: pmBaoId,
      completedAt: d(-8),
    },
  ];

  for (const t of tasksData) {
    await prisma.task.create({
      data: {
        projectId: 'p3',
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        storyPoints: t.storyPoints,
        timeEstimate: t.timeEstimate,
        timeTracked: t.timeTracked,
        position: t.position,
        dueDate: t.dueDate,
        labels: t.labels,
        assigneeId: t.assigneeId,
        createdById: t.createdById,
        completedById: t.completedById,
        completedAt: t.completedAt,
      },
    });
  }

  // 2. Seed tasks cho p-dept-eng-2 nếu có
  const projEng2 = await prisma.project.findUnique({ where: { id: 'p-dept-eng-2' } });
  if (projEng2) {
    await prisma.task.deleteMany({ where: { projectId: 'p-dept-eng-2' } });
    await prisma.task.create({
      data: {
        projectId: 'p-dept-eng-2',
        title: 'Thiết lập cụm Kubernetes Cluster K8s trên AWS EKS',
        description: 'Cấu hình node groups, autoscaling, ingress controller và cert-manager cho môi trường staging.',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        storyPoints: 8,
        timeEstimate: 24,
        timeTracked: 12,
        position: 1024,
        createdById: projEng2.createdById,
        assigneeId: longVoId,
        labels: ['DevOps', 'K8s', 'AWS'],
      },
    });
    await prisma.task.create({
      data: {
        projectId: 'p-dept-eng-2',
        title: 'Cấu hình hệ thống giám sát Prometheus & Grafana Dashboards',
        description: 'Theo dõi CPU, Memory, Disk I/O, Network traffic và alert qua Telegram bot.',
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        storyPoints: 5,
        timeEstimate: 16,
        timeTracked: 14,
        position: 1024,
        createdById: projEng2.createdById,
        assigneeId: longVoId,
        completedById: longVoId,
        completedAt: new Date(),
        labels: ['Monitoring', 'Grafana'],
      },
    });
  }

  console.log(`✅ Đã tạo thành công ${tasksData.length} tasks phong phú cho dự án p3!`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed tasks:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
