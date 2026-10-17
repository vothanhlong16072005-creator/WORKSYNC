import { PrismaClient, DocumentScope, DocumentType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Enterprise-Grade Document Management System...');

  // Ensure upload directory exists and create sample physical files
  const uploadDir = path.resolve(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 1. PDF File
  const samplePdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 18 Tf\n50 700 Td\n(WorkSync Enterprise - Security Policy 2026) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n307\n%%EOF';
  fs.writeFileSync(path.join(uploadDir, 'so_tay_an_toan_thong_tin_2026.pdf'), samplePdfContent);
  fs.writeFileSync(path.join(uploadDir, 'k8s_cluster_deployment_guide.pdf'), samplePdfContent);

  // 2. PNG File
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAhSURBVChTY2AYBfgzMDAw/GdAASxQGhmD5BgZGJAAAKHBA/8Zz4i0AAAAAElFTkSuQmCC';
  fs.writeFileSync(path.join(uploadDir, 'worksync_architecture_diagram_v2.png'), Buffer.from(pngBase64, 'base64'));

  // 3. YAML File
  fs.writeFileSync(path.join(uploadDir, 'prometheus_alert_rules.yaml'), 'groups:\n- name: WorkSyncAlerts\n  rules:\n  - alert: HighCpuUsage\n    expr: process_cpu_seconds_total > 0.8\n');

  console.log('Physical files created in:', uploadDir);

  const users = await prisma.user.findMany();
  const admin = users.find((u) => u.role === 'ADMIN') || users[0];
  const deptHead = users.find((u) => u.role === 'DEPARTMENT_HEAD') || users[0];
  const hr = users.find((u) => u.role === 'HR') || users[0];
  const pm = users.find((u) => u.role === 'PM') || users[0];
  const employee = users.find((u) => u.role === 'EMPLOYEE') || users[0];

  const depts = await prisma.department.findMany();
  const projs = await prisma.project.findMany();
  const tasks = await prisma.task.findMany();
  const meetings = await prisma.meeting.findMany();

  const engDept = depts.find((d) => d.name.toLowerCase().includes('kỹ thuật') || d.name.toLowerCase().includes('eng')) || depts[0];

  // Specific projects
  const devopsProject = projs.find((p) => p.id === 'p-dept-eng-2') || projs.find((p) => p.name.includes('DevOps')) || projs[0];
  const aiProject = projs.find((p) => p.id === 'p3') || projs.find((p) => p.name.includes('AI')) || projs[1] || projs[0];

  // Specific tasks in devopsProject
  const k8sTask = tasks.find((t) => t.id === 'cmvcotqpg000lku9qa5wega7a') || tasks.find((t) => t.projectId === devopsProject.id) || tasks[0];
  const monitoringTask = tasks.find((t) => t.id === 'cmvcotqps000nku9qcxcq6xl1') || tasks.find((t) => t.projectId === devopsProject.id && t.id !== k8sTask?.id) || tasks[1] || tasks[0];

  const sampleMeeting = meetings[0];

  // Ensure key users have project memberships to test all project documents seamlessly
  for (const p of projs) {
    for (const u of [admin, deptHead, hr, pm, employee]) {
      if (!u) continue;
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: p.id, userId: u.id } },
        update: {},
        create: {
          projectId: p.id,
          userId: u.id,
          projectRole: u.role === 'PM' || u.role === 'ADMIN' ? 'PM' : 'MEMBER',
        },
      });
    }
  }

  if (employee) {
    await prisma.user.update({
      where: { id: employee.id },
      data: { departmentId: engDept?.id },
    }).catch(() => {});
  }

  const docsToSeed = [
    // =========================================================================
    // 1. COMPANY POLICY (U5) - Admin creates, all roles read
    // =========================================================================
    {
      id: 'doc-company-01',
      title: 'Quy chế An toàn Thông tin & Bảo mật Dữ liệu Doanh nghiệp 2026',
      scope: DocumentScope.COMPANY,
      type: DocumentType.COMPANY_POLICY,
      ownerId: admin.id,
      createdById: admin.id,
      updatedById: admin.id,
      tags: ['Bảo mật', 'Quy chế', 'Tuân thủ', 'ISO-27001'],
      viewCount: 88,
      aiSummary: 'Văn bản quy định toàn diện về an toàn thông tin: (1) Bắt buộc 2FA/MFA và tiêu chuẩn mật khẩu 12 ký tự; (2) Phân loại dữ liệu thành 4 cấp độ và bắt buộc mã hóa AES-256; (3) Quy trình ứng cứu sự cố bảo mật trong vòng 120 phút với mức kỷ luật nghiêm khắc.',
      contentText: `QUY CHẾ AN TOÀN THÔNG TIN & BẢO MẬT DỮ LIỆU DOANH NGHIỆP 2026
Mục đích: Thiết lập các chuẩn mực và quy định quản lý an toàn thông tin bắt buộc trên toàn hệ thống WorkSync Enterprise.

CHƯƠNG I: QUY ĐỊNH CHUNG
Điều 1: Phạm vi và Đối tượng áp dụng
Quy chế này áp dụng bắt buộc đối với toàn bộ cán bộ nhân viên, thực tập sinh, nhà thầu phụ và đối tác có quyền truy cập vào hạ tầng mạng, máy chủ và cơ sở dữ liệu của WorkSync.

CHƯƠNG II: TIÊU CHUẨN XÁC THỰC & BẢO MẬT TÀI KHOẢN
Điều 2: Quản lý Mật khẩu & Xác thực đa yếu tố (2FA)
- Bắt buộc kích hoạt xác thực hai yếu tố (MFA qua Google Authenticator hoặc Khóa phần cứng FIDO2) cho 100% tài khoản.
- Mật khẩu tối thiểu 12 ký tự, bao gồm: chữ hoa, chữ thường, số và ký tự đặc biệt. Định kỳ thay đổi 90 ngày.
- Nghiêm cấm chia sẻ tài khoản hoặc lưu trữ mật khẩu dưới dạng văn bản thô (plain text).

CHƯƠNG III: PHÂN LOẠI & MÃ HÓA DỮ LIỆU
Điều 3: Phân cấp bảo mật thông tin
- Cấp 1 (Công khai): Tài liệu tiếp thị, giới thiệu sản phẩm.
- Cấp 2 (Nội bộ): Tài liệu quy trình, tiêu chuẩn kỹ thuật phòng ban.
- Cấp 3 (Bảo mật): Mã nguồn dự án, biên bản họp chiến lược, dữ liệu cá nhân nhân viên.
- Cấp 4 (Tuyệt mật): Khóa mã hóa, thông tin thẻ thanh toán, cơ sở dữ liệu khách hàng doanh nghiệp.
Bắt buộc mã hóa lưu trữ (AES-256) và mã hóa truyền dẫn (TLS 1.3) đối với toàn bộ dữ liệu Cấp 3 và Cấp 4.

CHƯƠNG IV: QUY TRÌNH ỨNG PHÓ SỰ CỐ AN NINH
Khi phát hiện bất kỳ dấu hiệu rò rỉ hoặc tấn công mạng, nhân sự phải báo cáo ngay cho Đội Ứng Cứu Sự Cố (SOC) qua hotline nội bộ trong vòng tối đa 120 phút.`,
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Quy chế An toàn Thông tin & Bảo mật Dữ liệu Doanh nghiệp 2026' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Văn bản quy định chính sách bảo mật thông tin bắt buộc áp dụng cho toàn thể cán bộ nhân viên và đối tác của WorkSync.' }] },
          
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Chương I: Quy Định Chung & Phạm Vi Áp Dụng' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Quy chế này thiết lập các nguyên tắc cốt lõi nhằm bảo vệ toàn vẹn tài sản số, mã nguồn và dữ liệu khách hàng theo tiêu chuẩn ISO/IEC 27001:2022.' }] },

          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Chương II: Tiêu Chuẩn Quản Lý Tài Khoản & Xác Thực (MFA)' }] },
          { type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bắt buộc kích hoạt xác thực hai yếu tố (2FA/MFA) qua ứng dụng Authenticator hoặc Hardware Key.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mật khẩu tối thiểu 12 ký tự: kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hệ thống tự động khóa tài khoản sau 5 lần đăng nhập thất bại liên tiếp.' }] }] }
          ]},

          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Chương III: Bảng Ma Trận Phân Cấp Dữ Liệu' }] },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cấp độ bảo mật' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Loại dữ liệu' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Yêu cầu mã hóa' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quyền truy cập' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cấp 1 - Public' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thông cáo báo chí, landing page' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Không bắt buộc' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tất cả mọi người' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cấp 2 - Internal' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quy trình phòng ban, tài liệu nội bộ' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'TLS 1.3 in-transit' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nhân viên công ty' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cấp 3 - Confidential' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Source code, thiết kế hệ thống' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AES-256 at-rest' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thành viên dự án' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cấp 4 - Restricted' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cơ sở dữ liệu khách hàng, Khóa bí mật' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AES-256 + HSM Key' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chỉ Admin & Lead' }] }] }
                ]
              }
            ]
          },

          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Chương IV: Kế Hoạch Ứng Phó Sự Cố (Incident Response)' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Khi phát hiện dấu hiệu xâm nhập trái phép hoặc rò rỉ dữ liệu, nhân sự phải lập tức thực hiện quy trình 3 bước:' }] },
          { type: 'orderedList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ngắt kết nối mạng của thiết bị bị nghi nhiễm mã độc.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Liên hệ Đội Ứng cứu Sự cố (SOC) qua hotline hoặc kênh khẩn cấp.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ghi nhận chi tiết thời gian và các hành vi bất thường phục vụ điều tra số học.' }] }] }
          ]}
        ]
      },
      currentVersion: 2,
    },

    // =========================================================================
    // 2. PROJECT SPECIFICATION (U1) - Linked to Task in Cloud DevOps project
    // =========================================================================
    {
      id: 'doc-task-spec-01',
      title: 'Đặc Tả Kỹ Thuật (Spec): Thiết Lập Cụm Kubernetes K8s Multi-AZ Trên AWS EKS',
      scope: DocumentScope.PROJECT,
      type: DocumentType.TASK_REQUIREMENT,
      projectId: devopsProject.id,
      linkedTaskId: k8sTask ? k8sTask.id : undefined,
      ownerId: pm.id,
      createdById: pm.id,
      updatedById: pm.id,
      tags: ['Kubernetes', 'EKS', 'DevOps', 'AWS', 'HighAvailability'],
      viewCount: 45,
      aiSummary: 'Đặc tả kỹ thuật thiết lập cụm AWS EKS đa vùng Multi-AZ: (1) Cấu hình 3 Node Groups với Auto-scaling; (2) Tích hợp AWS Load Balancer Controller; (3) Cài đặt Calico CNI để phân tách Network Policy; (4) Tiêu chí nghiệm thu uptime 99.95%.',
      contentText: `ĐẶC TẢ KỸ THUẬT (SYSTEM SPECIFICATION)
Dự án: ${devopsProject.name}
Công việc: ${k8sTask ? k8sTask.title : 'Thiết lập cụm K8s EKS'}

1. Mục tiêu kiến trúc:
Xây dựng hạ tầng Container Orchestration trên AWS EKS phục vụ nền tảng WorkSync Enterprise với khả năng chịu lỗi cao (High Availability), tự động co giãn (Auto Scaling) và bảo mật mạng đa lớp.

2. Yêu cầu cấu hình phần cứng & mạng:
- Phiên bản Kubernetes: v1.30
- Vùng triển khai: ap-southeast-1 (Singapore) trải đều trên 3 Availability Zones (ap-southeast-1a, 1b, 1c).
- Worker Nodes: Tối thiểu 3 nodes m6i.xlarge, tự động scale tối đa 12 nodes theo chỉ số CPU/Memory.

3. Tiêu chí kiểm thử & Nghiệm thu:
- [x] Pod Anti-Affinity được kích hoạt để phân tán các bản sao Pod sang các Node khác nhau.
- [x] NetworkPolicy chặn toàn bộ traffic từ bên ngoài truy cập trực tiếp vào Database Pods.
- [x] Thời gian phục hồi tự động khi 1 Node bị sập dưới 45 giây.`,
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Đặc Tả Kỹ Thuật (Spec): Cụm Kubernetes AWS EKS' }] },
          { type: 'paragraph', content: [{ type: 'text', text: `Dự án: ${devopsProject.name} | Gắn liền với Task: ${k8sTask ? k8sTask.title : 'K8s Task'}` }] },

          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Kiến Trúc Hạ Tầng Cụm (Cluster Architecture)' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Cụm EKS được cấu hình với mô hình Multi-AZ nhằm đáp ứng cam kết SLA 99.95% cho các dịch vụ cốt lõi.' }] },

          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thông số' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quy cách kỹ thuật' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục đích sử dụng' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kubernetes Version' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'v1.30.2' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bản ổn định dài hạn (LTS)' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Instance Type' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'm6i.xlarge (4 vCPU, 16GB RAM)' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chạy NestJS backend & Socket.IO' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Storage Class' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'EBS gp3 (IOPS 3000, 125 MB/s)' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Persistent Volume cho Prometheus' }] }] }
                ]
              }
            ]
          },

          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Cấu Hình Triển Khai Mẫu (Deployment Manifest)' }] },
          {
            type: 'codeBlock',
            attrs: { language: 'yaml' },
            content: [{ type: 'text', text: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: worksync-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: worksync-backend
  template:
    metadata:
      labels:
        app: worksync-backend
    spec:
      containers:
      - name: api
        image: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/worksync-backend:v2.0
        ports:
        - containerPort: 4000
        resources:
          limits:
            cpu: "1000m"
            memory: "1024Mi"
          requests:
            cpu: "250m"
            memory: "512Mi"` }]
          }
        ]
      },
      currentVersion: 1,
    },

    // =========================================================================
    // 3. TASK SUBMISSION / DELIVERABLE (U2) - Linked to Monitoring Task in DevOps
    // =========================================================================
    {
      id: 'doc-task-sub-01',
      title: 'Báo Cáo Nghiệm Thu & Bàn Giao: Hệ Thống Giám Sát Prometheus & Grafana',
      scope: DocumentScope.PROJECT,
      type: DocumentType.TASK_SUBMISSION,
      projectId: devopsProject.id,
      linkedTaskId: monitoringTask ? monitoringTask.id : undefined,
      ownerId: employee.id,
      createdById: employee.id,
      updatedById: employee.id,
      tags: ['Deliverable', 'NghiệmThu', 'Prometheus', 'Grafana', 'Metrics'],
      viewCount: 31,
      aiSummary: 'Báo cáo bàn giao hệ thống quan trắc hạ tầng: Đã tích hợp Prometheus thu thập chỉ số CPU/RAM/Network của NestJS và PostgreSQL, dựng 4 dashboards Grafana trực quan và cấu hình cảnh báo tự động về Slack khi CPU > 85%.',
      contentText: `BÁO CÁO NGHIỆM THU & BÀN GIAO CÔNG VIỆC
Người nộp: ${employee.name} (${employee.email})
Dự án: ${devopsProject.name}
Công việc: ${monitoringTask ? monitoringTask.title : 'Giám sát Prometheus & Grafana'}

Kính gửi: Project Manager & Tech Lead Phòng Kỹ thuật.
Tôi xin báo cáo kết quả hoàn thành và bàn giao hệ thống giám sát như sau:

1. Các hạng mục đã triển khai:
- Đã cài đặt Prometheus Operator trên namespace 'monitoring'.
- Đã cấu hình node-exporter trên toàn bộ 3 worker nodes.
- Đã tích hợp Prometheus client vào backend NestJS để đo đếm latency request và socket connections.
- Đã cấu hình 4 Grafana Dashboards chuyên nghiệp:
  + Dashboard 1: Tổng quan sức khỏe Cụm Kubernetes (Cluster Overview).
  + Dashboard 2: Tần suất API & Tỷ lệ lỗi HTTP 5xx / 4xx.
  + Dashboard 3: Số lượng kết nối Socket.IO trực tuyến theo thời gian thực.
  + Dashboard 4: Tài nguyên cơ sở dữ liệu PostgreSQL (Connection Pool & Slow Queries).

2. Quy tắc cảnh báo (Alerting Rules):
- Cảnh báo vàng (Warning): CPU sử dụng liên tục > 75% trong 5 phút.
- Cảnh báo đỏ (Critical): Tỷ lệ lỗi 500 > 2% hoặc dung lượng ổ đĩa còn dưới 15%.`,
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Báo Cáo Nghiệm Thu: Giám Sát Prometheus & Grafana' }] },
          { type: 'paragraph', content: [{ type: 'text', text: `Người bàn giao: ${employee.name} | Dự án: ${devopsProject.name}` }] },

          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Bảng Tổng Hợp Chỉ Số Kiểm Thử' }] },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chỉ số đo lường' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Giá trị đạt được' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Trạng thái nghiệm thu' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tần số lấy mẫu (Scrape Interval)' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '15 giây' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ĐẠT' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thời gian lưu trữ (Data Retention)' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '30 ngày trên gp3' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ĐẠT' }] }] }
                ]
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tốc độ cảnh báo qua Webhook' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '< 3 giây' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ĐẠT' }] }] }
                ]
              }
            ]
          },

          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Tài Liệu Bàn Giao Kèm Theo' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Đã đính kèm file cấu hình rules: prometheus_alert_rules.yaml và tài liệu vận hành k8s_cluster_deployment_guide.pdf trong danh mục tệp đính kèm của tài liệu này.' }] }
        ]
      },
      currentVersion: 1,
    },

    // =========================================================================
    // 4. PROJECT ARCHITECTURE (U3) - Cloud Infrastructure & DevOps
    // =========================================================================
    {
      id: 'doc-proj-arch-01',
      title: 'Tài Liệu Thiết Kế Kiến Trúc Hạ Tầng Cloud & Quy Trình CI/CD Tự Động',
      scope: DocumentScope.PROJECT,
      type: DocumentType.STANDARD,
      projectId: devopsProject.id,
      ownerId: pm.id,
      createdById: pm.id,
      updatedById: pm.id,
      tags: ['Architecture', 'Cloud', 'DevOps', 'CI/CD', 'Docker'],
      viewCount: 62,
      aiSummary: 'Tài liệu kiến trúc hạ tầng Cloud DevOps: Tự động hóa quy trình phân phối liên tục (CI/CD) qua GitHub Actions, tối ưu hóa Docker đa tầng và cơ chế Zero-Downtime Rolling Update.',
      contentText: `TÀI LIỆU KIẾN TRÚC HẠ TẦNG CLOUD & DEVOPS
Dự án: ${devopsProject.name}

1. Sơ đồ dòng chảy CI/CD (Pipeline Flow):
Developer Push Code -> GitHub Actions -> Linter & Unit Tests -> Docker Build -> AWS ECR -> EKS Rolling Update -> Slack Notification.

2. Quản lý bí mật (Secrets Management):
Toàn bộ API Keys và Database Credentials được lưu trữ tập trung tại AWS Secrets Manager và đồng bộ vào K8s Secrets qua External Secrets Operator.`,
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Thiết Kế Kiến Trúc Hạ Tầng Cloud & CI/CD' }] },
          { type: 'paragraph', content: [{ type: 'text', text: `Dự án: ${devopsProject.name}` }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Quy Trình Tự Động Hóa CI/CD' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Mọi commit đẩy lên nhánh develop và main đều phải vượt qua bài kiểm thử tự động trước khi triển khai.' }] }
        ]
      },
      currentVersion: 3,
    },

    // =========================================================================
    // 5. MEETING MINUTES (U4) - Sprint Planning in DevOps Project
    // =========================================================================
    {
      id: 'doc-meeting-min-01',
      title: 'Biên Bản Họp: Sprint Planning & Triển Khai Hạ Tầng Giám Sát Tuần 42',
      scope: DocumentScope.PROJECT,
      type: DocumentType.MEETING_MINUTES,
      projectId: devopsProject.id,
      linkedMeetingId: sampleMeeting ? sampleMeeting.id : undefined,
      ownerId: pm.id,
      createdById: pm.id,
      updatedById: pm.id,
      tags: ['BiênBảnHọp', 'SprintPlanning', 'Tuần42', 'DevOps'],
      viewCount: 29,
      aiSummary: 'Biên bản cuộc họp Sprint Planning: Thống nhất các mục tiêu hạ tầng tuần 42, phân chia công việc Kubernetes và Prometheus, hạn chót nghiệm thu ngày thứ Sáu.',
      contentText: `BIÊN BẢN HỌP SPRINT PLANNING TUẦN 42
Dự án: ${devopsProject.name}
Chủ trì: ${pm.name}
Thư ký: ${employee.name}

Nội dung thảo luận:
1. Đánh giá hạ tầng hiện hữu: Hệ thống EKS hoạt động ổn định trên 3 AZ.
2. Thống nhất mục tiêu tuần: Hoàn tất tích hợp Prometheus/Grafana và kết nối cảnh báo.
3. Cam kết thời hạn: Bàn giao toàn bộ tài liệu kiểm thử trước 17:00 ngày 24/10/2026.`,
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Biên Bản Cuộc Họp Sprint Planning Tuần 42' }] },
          { type: 'paragraph', content: [{ type: 'text', text: `Chủ trì: ${pm.name} | Thư ký: ${employee.name} | Dự án: ${devopsProject.name}` }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Các Quyết Định Chính' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Toàn đội đã biểu quyết thông qua kiến trúc cụm K8s và chỉ định Long Võ làm đầu mối kiểm thử Prometheus.' }] }
        ]
      },
      currentVersion: 1,
    },

    // =========================================================================
    // 6. DEPARTMENT DOC - Engineering Guidelines
    // =========================================================================
    {
      id: 'doc-dept-eng-01',
      title: 'Tiêu Chuẩn Kiến Trúc & Code Conventions Phòng Kỹ Thuật (Engineering)',
      scope: DocumentScope.DEPARTMENT,
      type: DocumentType.STANDARD,
      departmentId: engDept?.id,
      ownerId: deptHead.id,
      createdById: deptHead.id,
      updatedById: deptHead.id,
      tags: ['Engineering', 'Architecture', 'TypeScript', 'BestPractices'],
      viewCount: 41,
      aiSummary: 'Tiêu chuẩn kỹ thuật phòng R&D: (1) TypeScript Strict Mode không sử dụng any; (2) Clean Architecture phân lớp; (3) Quy trình Git Flow tối thiểu 1 Tech Lead approval.',
      contentText: 'Tiêu chuẩn code nghiêm ngặt cho toàn bộ dự án thuộc phòng Kỹ thuật.',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Tiêu Chuẩn Code Conventions Phòng Kỹ Thuật' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Áp dụng cho toàn bộ dự án phần mềm của phòng Kỹ thuật.' }] }
        ]
      },
      currentVersion: 1,
    },

    // =========================================================================
    // 7. PERSONAL NOTE (EMPLOYEE)
    // =========================================================================
    {
      id: 'doc-personal-01',
      title: 'Sổ Tay Kỹ Thuật Cá Nhân: Tối Ưu Hóa React 19 & Tiptap ProseMirror',
      scope: DocumentScope.PERSONAL,
      type: DocumentType.STANDARD,
      ownerId: employee.id,
      createdById: employee.id,
      updatedById: employee.id,
      tags: ['CáNhân', 'React19', 'Performance', 'Tiptap'],
      viewCount: 14,
      aiSummary: 'Ghi chú nghiên cứu cá nhân về ProseMirror state và tối ưu hóa hiệu năng render.',
      contentText: 'Ghi chú kỹ thuật cá nhân phục vụ công việc hàng ngày.',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Sổ Tay Nghiên Cứu Cá Nhân' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Tổng hợp mẹo và kinh nghiệm tối ưu hóa frontend.' }] }
        ]
      },
      currentVersion: 1,
    },
  ];

  for (const doc of docsToSeed) {
    await prisma.document.upsert({
      where: { id: doc.id },
      update: doc,
      create: doc,
    });
    console.log(`- Upserted: [${doc.scope}] ${doc.title}`);

    // Seed versions
    if (doc.id === 'doc-company-01') {
      await prisma.documentVersion.upsert({
        where: { documentId_version: { documentId: doc.id, version: 1 } },
        update: {},
        create: {
          documentId: doc.id,
          version: 1,
          title: 'Quy chế An toàn Thông tin Doanh nghiệp (Bản thảo sơ bộ v1.0)',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bản thảo ban đầu chưa bao gồm quy định về mã hóa dữ liệu đám mây.' }] }] },
          contentText: 'Bản thảo ban đầu chưa bao gồm quy định về mã hóa dữ liệu đám mây.',
          changeNote: 'Khởi tạo bản thảo chính sách đầu tiên xin ý kiến Ban Giám Đốc',
          savedById: admin.id,
          createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        },
      });

      await prisma.documentVersion.upsert({
        where: { documentId_version: { documentId: doc.id, version: 2 } },
        update: {},
        create: {
          documentId: doc.id,
          version: 2,
          title: doc.title,
          content: doc.content,
          contentText: doc.contentText,
          changeNote: 'Bổ sung quy định bắt buộc 2FA/MFA và bảng ma trận phân cấp bảo mật',
          savedById: admin.id,
          createdAt: new Date(),
        },
      });

      // Clear existing attachments then re-create
      await prisma.documentAttachment.deleteMany({ where: { documentId: doc.id } });
      await prisma.documentAttachment.create({
        data: {
          documentId: doc.id,
          fileName: 'so_tay_an_toan_thong_tin_2026.pdf',
          fileSize: 1024 * 240,
          mimeType: 'application/pdf',
          minioKey: 'so_tay_an_toan_thong_tin_2026.pdf',
          minioBucket: 'worksync-documents',
          uploadedById: admin.id,
        },
      });
    }

    if (doc.id === 'doc-proj-arch-01') {
      await prisma.documentVersion.upsert({
        where: { documentId_version: { documentId: doc.id, version: 1 } },
        update: {},
        create: {
          documentId: doc.id,
          version: 1,
          title: 'Tài Liệu Kiến Trúc WorkSync v1.0 (Monolith)',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kiến trúc v1 ban đầu trước khi refactor sang Cloud Native.' }] }] },
          contentText: 'Kiến trúc v1 ban đầu trước khi refactor sang Cloud Native.',
          changeNote: 'Snapshot kiến trúc ban đầu',
          savedById: pm.id,
          createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000),
        },
      });

      await prisma.documentVersion.upsert({
        where: { documentId_version: { documentId: doc.id, version: 2 } },
        update: {},
        create: {
          documentId: doc.id,
          version: 2,
          title: 'Tài Liệu Kiến Trúc WorkSync v2.0-RC1',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bản ứng cử Release Candidate với Prisma ORM.' }] }] },
          contentText: 'Bản ứng cử Release Candidate với Prisma ORM.',
          changeNote: 'Cập nhật sơ đồ Database PostgreSQL và migration',
          savedById: deptHead.id,
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        },
      });

      await prisma.documentAttachment.deleteMany({ where: { documentId: doc.id } });
      await prisma.documentAttachment.create({
        data: {
          documentId: doc.id,
          fileName: 'worksync_architecture_diagram_v2.png',
          fileSize: 1024 * 512,
          mimeType: 'image/png',
          minioKey: 'worksync_architecture_diagram_v2.png',
          minioBucket: 'worksync-documents',
          uploadedById: pm.id,
        },
      });
    }

    if (doc.id === 'doc-task-sub-01') {
      await prisma.documentAttachment.deleteMany({ where: { documentId: doc.id } });
      await prisma.documentAttachment.create({
        data: {
          documentId: doc.id,
          fileName: 'prometheus_alert_rules.yaml',
          fileSize: 1024 * 12,
          mimeType: 'text/yaml',
          minioKey: 'prometheus_alert_rules.yaml',
          minioBucket: 'worksync-documents',
          uploadedById: employee.id,
        },
      });
      await prisma.documentAttachment.create({
        data: {
          documentId: doc.id,
          fileName: 'k8s_cluster_deployment_guide.pdf',
          fileSize: 1024 * 180,
          mimeType: 'application/pdf',
          minioKey: 'k8s_cluster_deployment_guide.pdf',
          minioBucket: 'worksync-documents',
          uploadedById: employee.id,
        },
      });
    }
  }

  console.log('Document seeding completed successfully with rich enterprise content!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
