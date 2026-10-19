/**
 * Seed: Meetings — Module M5 / M5.1
 * Tạo 10 cuộc họp mẫu phủ 3 scopes × 3 statuses + 2 có biên bản (M5.1)
 *
 * Chạy:  cd backend && npx tsx prisma/seed-meetings.ts
 * Hoặc import từ seed-enterprise-full.ts sau khi tạo users/projects
 *
 * Lưu ý: Phải chạy seed-enterprise-full.ts trước để có users + projects
 */
import {
  MeetingScope,
  MeetingStatus,
  PrismaClient,
  RSVP,
} from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper: tạo Date ở quá khứ / tương lai tương đối so với hiện tại
 */
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);
const hoursFromNow = (n: number) => new Date(Date.now() + n * 3600 * 1000);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000);

async function main() {
  console.log('🎥 [SEED-MEETINGS] Bắt đầu tạo 10 cuộc họp mẫu cho Module M5...');

  // 1. Lấy user IDs (giả định đã chạy seed-enterprise-full)
  const pm1 = await prisma.user.findUnique({ where: { email: 'pm@worksync.com' } });
  const pm2 = await prisma.user.findUnique({ where: { email: 'pm2@worksync.com' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@worksync.com' } });
  const hr1 = await prisma.user.findUnique({ where: { email: 'hr@worksync.com' } });
  const devLong = await prisma.user.findUnique({ where: { email: 'vothanhlong1704@gmail.com' } });
  const devNam = await prisma.user.findUnique({ where: { email: 'nam.hoang@worksync.com' } });
  const devBao = await prisma.user.findUnique({ where: { email: 'bao.dang@worksync.com' } });
  const desLinh = await prisma.user.findUnique({ where: { email: 'linh.vu@worksync.com' } });
  const qaNgan = await prisma.user.findUnique({ where: { email: 'ngan.trinh@worksync.com' } });
  const devDat = await prisma.user.findUnique({ where: { email: 'dat.nguyen@worksync.com' } });

  if (!pm1 || !pm2 || !admin || !hr1) {
    throw new Error('❌ Chưa có users — hãy chạy seed-enterprise-full.ts trước!');
  }

  // 2. Lấy projects
  const projPlatform = await prisma.project.findUnique({ where: { id: 'proj-platform-v3' } });
  const projMobile = await prisma.project.findUnique({ where: { id: 'proj-mobile-app' } });
  const projAi = await prisma.project.findUnique({ where: { id: 'proj-ai-meeting' } });

  if (!projPlatform || !projMobile || !projAi) {
    throw new Error('❌ Chưa có projects — hãy chạy seed-enterprise-full.ts trước!');
  }

  // ============================================================
  // 10 MEETINGS MẪU
  // Phủ: 3 scopes × 3 statuses + 1-on-1 + có biên bản + có AI summary
  // ============================================================

  const meetings = [
    // ─────────────────────────────────────────────────────────
    // NHÓM 1: SCHEDULED (Sắp diễn ra) — 3 meetings
    // ─────────────────────────────────────────────────────────
    {
      id: 'meet-sched-001',
      title: 'Sprint 15 Planning — WorkSync Platform v3.1',
      description:
        'Lên kế hoạch Sprint 15: phân rã user story, ước lượng story points, cam kết scope và xác định capacity team.',
      scopeType: MeetingScope.PROJECT,
      projectId: projPlatform.id,
      departmentId: null,
      startTime: hoursFromNow(4), // +4h
      endTime: hoursFromNow(5.5), // +5.5h (90 phút)
      status: MeetingStatus.SCHEDULED,
      createdById: pm1.id,
      attendeeIds: [pm1.id, devLong!.id, devNam!.id, devBao!.id, desLinh!.id, qaNgan!.id],
      attendeeRSVPs: [
        { userId: pm1.id, rsvp: RSVP.ACCEPTED },
        { userId: devLong!.id, rsvp: RSVP.ACCEPTED },
        { userId: devNam!.id, rsvp: RSVP.PENDING },
        { userId: devBao!.id, rsvp: RSVP.ACCEPTED },
        { userId: desLinh!.id, rsvp: RSVP.DECLINED },
        { userId: qaNgan!.id, rsvp: RSVP.PENDING },
      ],
    },
    {
      id: 'meet-sched-002',
      title: 'All-Hands Phòng Kỹ thuật — Tháng 10/2026',
      description:
        'Họp toàn phòng Kỹ thuật: cập nhật tiến độ 3 dự án, chia sẻ best practices, Q&A tuyển dụng Q4.',
      scopeType: MeetingScope.DEPARTMENT,
      projectId: null,
      departmentId: 'dept-eng',
      startTime: hoursFromNow(28), // +28h (ngày mai)
      endTime: hoursFromNow(29.5),
      status: MeetingStatus.SCHEDULED,
      createdById: admin.id,
      attendeeIds: [admin.id, devLong!.id, devNam!.id, devBao!.id, devDat!.id],
      attendeeRSVPs: [
        { userId: admin.id, rsvp: RSVP.ACCEPTED },
        { userId: devLong!.id, rsvp: RSVP.ACCEPTED },
        { userId: devNam!.id, rsvp: RSVP.ACCEPTED },
        { userId: devBao!.id, rsvp: RSVP.PENDING },
        { userId: devDat!.id, rsvp: RSVP.PENDING },
      ],
    },
    {
      id: 'meet-sched-003',
      title: '1-1 Check-in: PM Tuấn ↔ Lead Dev Long',
      description:
        '1-1 hàng tuần: review tiến độ cá nhân, blockers, kế hoạch sprint tới, định hướng sự nghiệp.',
      scopeType: MeetingScope.ONE_ON_ONE,
      projectId: null,
      departmentId: null,
      startTime: hoursFromNow(48), // +2 ngày
      endTime: hoursFromNow(48.5),
      status: MeetingStatus.SCHEDULED,
      createdById: pm1.id,
      attendeeIds: [pm1.id, devLong!.id],
      attendeeRSVPs: [
        { userId: pm1.id, rsvp: RSVP.ACCEPTED },
        { userId: devLong!.id, rsvp: RSVP.ACCEPTED },
      ],
    },

    // ─────────────────────────────────────────────────────────
    // NHÓM 2: IN_PROGRESS (Đang diễn ra) — 2 meetings
    // ─────────────────────────────────────────────────────────
    {
      id: 'meet-ongoing-001',
      title: 'Daily Standup Mobile App — Ngày 9 Sprint 1',
      description:
        'Daily 15 phút: 3 câu hỏi cổ điển (Hôm qua làm gì / Hôm nay làm gì / Có blocker gì).',
      scopeType: MeetingScope.PROJECT,
      projectId: projMobile.id,
      departmentId: null,
      startTime: minutesAgo(5), // bắt đầu 5 phút trước → đang diễn ra
      endTime: hoursFromNow(0.25), // kết thúc 15 phút nữa
      status: MeetingStatus.IN_PROGRESS,
      createdById: pm2.id,
      attendeeIds: [pm2.id, devDat!.id, devLong!.id, qaNgan!.id],
      attendeeRSVPs: [
        { userId: pm2.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 5, durationMin: 5 },
        { userId: devDat!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 4, durationMin: 4 },
        { userId: devLong!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 3, durationMin: 3 },
        { userId: qaNgan!.id, rsvp: RSVP.PENDING, joined: false, durationMin: 0 },
      ],
    },
    {
      id: 'meet-ongoing-002',
      title: 'Demo Sprint Review — WorkSync Mobile App MVP',
      description:
        'Demo MVP cho stakeholders: Geofence GPS check-in, FCM push notification, offline-first sync.',
      scopeType: MeetingScope.PROJECT,
      projectId: projMobile.id,
      departmentId: null,
      startTime: minutesAgo(20), // đang diễn ra 20 phút
      endTime: minutesAgo(-40), // còn 40 phút nữa
      status: MeetingStatus.IN_PROGRESS,
      createdById: pm2.id,
      attendeeIds: [pm2.id, devDat!.id, admin.id, desLinh!.id],
      attendeeRSVPs: [
        { userId: pm2.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 20, durationMin: 20 },
        { userId: devDat!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 18, durationMin: 18 },
        { userId: admin.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 15, durationMin: 15 },
        { userId: desLinh!.id, rsvp: RSVP.DECLINED, joined: false, durationMin: 0 },
      ],
    },

    // ─────────────────────────────────────────────────────────
    // NHÓM 3: COMPLETED (Đã kết thúc) — 4 meetings
    // 2 trong số này CÓ BIÊN BẢN (1 có AI Summary cache M5.1)
    // ─────────────────────────────────────────────────────────
    {
      id: 'meet-done-001',
      title: 'Sprint 14 Retrospective — WorkSync Platform',
      description:
        'Retro cuối sprint: What went well / What to improve / Action items cho sprint tới.',
      scopeType: MeetingScope.PROJECT,
      projectId: projPlatform.id,
      departmentId: null,
      startTime: daysAgo(2),
      endTime: new Date(daysAgo(2).getTime() + 60 * 60 * 1000),
      status: MeetingStatus.COMPLETED,
      createdById: pm1.id,
      attendeeIds: [pm1.id, devLong!.id, devNam!.id, devBao!.id, desLinh!.id, qaNgan!.id],
      attendeeRSVPs: [
        { userId: pm1.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 60, durationMin: 58 },
        { userId: devLong!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 60, durationMin: 55 },
        { userId: devNam!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 58, durationMin: 60 },
        { userId: devBao!.id, rsvp: RSVP.ACCEPTED, joined: false, durationMin: 0 }, // absent
        { userId: desLinh!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 55, durationMin: 60 },
        { userId: qaNgan!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 58, durationMin: 50 },
      ],
      minutes: {
        content: `<h2>Biên bản Sprint 14 Retrospective</h2>
<h3>1. Tổng kết Sprint 14</h3>
<p>Sprint 14 đã hoàn thành 28/32 story points (87.5%). Có 2 task delay: TASK-104 (WebRTC load test) bị blocked do thiếu môi trường staging, TASK-106 (VNPay integration) chưa kịp review.</p>
<h3>2. What went well</h3>
<ul>
  <li>PM Tuấn breakdown rõ ràng task ngay từ đầu sprint, team không phải rework.</li>
  <li>Dev Nam fix lỗi IDOR nhanh trong 2 ngày (TASK-102) — closed trước deadline 1 ngày.</li>
  <li>Designer Linh hoàn thành bộ Design Token đúng hẹn, dev team apply ngay vào Sprint.</li>
  <li>QA Ngân viết E2E test cho quy trình phê duyệt WFH — 18 test cases passed.</li>
</ul>
<h3>3. What to improve</h3>
<ul>
  <li>Task TASK-104 (WebRTC load test) bị stuck vì DevOps chưa setup được môi trường staging. Cần owner rõ ràng hơn cho infra task.</li>
  <li>Daily standup kéo dài 25-30 phút thay vì 15 phút — cần refocus vào 3 câu hỏi.</li>
  <li>Thiếu documentation cho VNPay integration — onboarding người mới sẽ khó.</li>
</ul>
<h3>4. Action items cho Sprint 15</h3>
<ul>
  <li>DevOps Bảo: Hoàn thành setup môi trường staging với SSL (deadline: 22/10).</li>
  <li>PM Tuấn: Áp dụng time-box 15 phút cho daily standup bằng timer.</li>
  <li>Dev Nam: Viết tài liệu kỹ thuật cho VNPay/Stripe integration (deadline: 25/10).</li>
  <li>Designer Linh: Thiết kế thêm 2 component cho module Notification.</li>
</ul>`,
        withAiSummary: true,
      },
    },
    {
      id: 'meet-done-002',
      title: 'Họp đối tác doanh nghiệp FPT Software',
      description: 'Thương thảo hợp đồng triển khai WorkSync cho 200 nhân viên FPT Software Đà Nẵng.',
      scopeType: MeetingScope.ONE_ON_ONE,
      projectId: null,
      departmentId: null,
      startTime: daysAgo(5),
      endTime: new Date(daysAgo(5).getTime() + 90 * 60 * 1000),
      status: MeetingStatus.COMPLETED,
      createdById: admin.id,
      attendeeIds: [admin.id, pm1.id],
      attendeeRSVPs: [
        { userId: admin.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 90, durationMin: 90 },
        { userId: pm1.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 88, durationMin: 88 },
      ],
      minutes: {
        content: `<h2>Biên bản họp đối tác FPT Software</h2>
<p>Cuộc họp với đại diện FPT Software Đà Nẵng về triển khai WorkSync cho 200 nhân viên vận hành.</p>
<h3>1. Phạm vi triển khai</h3>
<ul>
  <li>200 users, chia thành 4 phòng ban: Kỹ thuật, Sản phẩm, Kinh doanh, Hành chính.</li>
  <li>Module cần: Attendance (GPS), Project Management, Meeting, Document.</li>
  <li>On-premise deployment tại DC FPT Đà Nẵng (yêu cầu bảo mật).</li>
</ul>
<h3>2. Pricing & SLA</h3>
<ul>
  <li>Gói Enterprise: 800 triệu VNĐ/năm, bao gồm support 24/7.</li>
  <li>SLA uptime 99.5%, penalty 5% phí tháng nếu vi phạm.</li>
  <li>Triển khai trong 8 tuần, go-live dự kiến 15/12/2026.</li>
</ul>
<h3>3. Action items</h3>
<ul>
  <li>Long (CTO): Gửi bản đề xuất kỹ thuật trước 22/10.</li>
  <li>PM Tuấn: Lên kế hoạch triển khai chi tiết, breakdown 8 tuần thành milestones.</li>
  <li>Sales Mai Trúc: Khởi tạo hợp đồng pháp lý, gửi phòng Legal review.</li>
</ul>
<h3>4. Risks</h3>
<ul>
  <li>Rủi ro 1: On-premise cần dedicate DevOps 2 người full-time trong 4 tuần đầu.</li>
  <li>Rủi ro 2: Tích hợp SSO với hệ thống HRM cũ của FPT cần research trước.</li>
</ul>`,
        withAiSummary: false, // Chưa generate, để user test
      },
    },
    {
      id: 'meet-done-003',
      title: 'Onboarding thành viên mới — Phòng Kỹ thuật',
      description: 'Giới thiệu quy trình làm việc, cấp quyền, training cho 2 thành viên mới.',
      scopeType: MeetingScope.DEPARTMENT,
      projectId: null,
      departmentId: 'dept-eng',
      startTime: daysAgo(7),
      endTime: new Date(daysAgo(7).getTime() + 2 * 60 * 60 * 1000),
      status: MeetingStatus.COMPLETED,
      createdById: admin.id,
      attendeeIds: [admin.id, devLong!.id, devNam!.id, devBao!.id, devDat!.id],
      attendeeRSVPs: [
        { userId: admin.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 120, durationMin: 118 },
        { userId: devLong!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 118, durationMin: 115 },
        { userId: devNam!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 115, durationMin: 120 },
        { userId: devBao!.id, rsvp: RSVP.ACCEPTED, joined: false, durationMin: 0 },
        { userId: devDat!.id, rsvp: RSVP.DECLINED, joined: false, durationMin: 0 },
      ],
      // Không có biên bản — để test case empty
    },
    {
      id: 'meet-done-004',
      title: 'AI Project Sync — Weekly',
      description: 'Weekly sync dự án AI Speech: tiến độ Whisper integration, blocker.',
      scopeType: MeetingScope.PROJECT,
      projectId: projAi.id,
      departmentId: null,
      startTime: daysAgo(1),
      endTime: new Date(daysAgo(1).getTime() + 45 * 60 * 1000),
      status: MeetingStatus.COMPLETED,
      createdById: pm1.id,
      attendeeIds: [pm1.id, admin.id, devNam!.id],
      attendeeRSVPs: [
        { userId: pm1.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 45, durationMin: 45 },
        { userId: admin.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 43, durationMin: 45 },
        { userId: devNam!.id, rsvp: RSVP.ACCEPTED, joined: true, joinedMinAgo: 40, durationMin: 45 },
      ],
    },

    // ─────────────────────────────────────────────────────────
    // NHÓM 4: CANCELLED (Đã hủy) — 1 meeting
    // ─────────────────────────────────────────────────────────
    {
      id: 'meet-cancelled-001',
      title: 'Khách hàng Demo (Đã hủy do lịch đối tác)',
      description: 'Demo WorkSync cho khách hàng tiềm năng — đã hủy do đối tác bận họp nội bộ.',
      scopeType: MeetingScope.ONE_ON_ONE,
      projectId: null,
      departmentId: null,
      startTime: daysAgo(3),
      endTime: new Date(daysAgo(3).getTime() + 60 * 60 * 1000),
      status: MeetingStatus.CANCELLED,
      createdById: pm1.id,
      attendeeIds: [pm1.id, admin.id],
      attendeeRSVPs: [
        { userId: pm1.id, rsvp: RSVP.DECLINED, joined: false, durationMin: 0 },
        { userId: admin.id, rsvp: RSVP.DECLINED, joined: false, durationMin: 0 },
      ],
    },
  ];

  // ============================================================
  // EXECUTE: Insert meetings + attendees + minutes
  // ============================================================
  for (const m of meetings) {
    // Delete existing (for idempotent re-seed)
    await prisma.meetingAttendee.deleteMany({ where: { meetingId: m.id } });
    await prisma.meetingMinute.deleteMany({ where: { meetingId: m.id } });
    await prisma.meeting.deleteMany({ where: { id: m.id } });

    // Create meeting
    const created = await prisma.meeting.create({
      data: {
        id: m.id,
        title: m.title,
        description: m.description,
        scopeType: m.scopeType,
        projectId: m.projectId,
        departmentId: m.departmentId,
        startTime: m.startTime,
        endTime: m.endTime,
        status: m.status,
        createdById: m.createdById,
      },
    });

    // Create attendees
    for (const a of m.attendeeRSVPs) {
      const joinedAt = a.joined ? minutesAgo(a.joinedMinAgo) : null;
      const leftAt =
        a.joined && a.durationMin
          ? new Date(minutesAgo(a.joinedMinAgo).getTime() + a.durationMin * 60 * 1000)
          : null;
      const totalDurationSeconds = (a.durationMin ?? 0) * 60;

      await prisma.meetingAttendee.create({
        data: {
          meetingId: created.id,
          userId: a.userId,
          rsvp: a.rsvp,
          rsvpAt: a.rsvp !== RSVP.PENDING ? new Date() : null,
          joinedAt,
          leftAt,
          totalDurationSeconds,
        },
      });
    }

    // Create minutes (if any)
    if ('minutes' in m && m.minutes) {
      const minuteData: any = {
        meetingId: created.id,
        content: m.minutes.content,
      };

      if (m.minutes.withAiSummary) {
        minuteData.aiSummary = `<h3>📋 Tóm tắt</h3>
<p>Sprint 14 đạt 87.5% story points (28/32). Có 2 task delay là TASK-104 (WebRTC load test) và TASK-106 (VNPay). Tuy nhiên team giữ vững tốc độ và chất lượng, đặc biệt là việc fix lỗi IDOR nhanh chóng.</p>

<h3>✅ Điểm tốt</h3>
<ul>
  <li>PM Tuấn breakdown task rõ ràng ngay đầu sprint → giảm rework</li>
  <li>Dev Nam fix lỗi IDOR (TASK-102) nhanh trong 2 ngày, closed trước deadline 1 ngày</li>
  <li>Designer Linh hoàn thành bộ Design Token đúng hẹn, dev team apply ngay được</li>
  <li>QA Ngân viết 18 E2E test cases cho phê duyệt WFH — 100% pass</li>
</ul>

<h3>⚠️ Cần cải thiện</h3>
<ul>
  <li>Task TASK-104 (WebRTC load test) bị blocked vì chưa setup được môi trường staging</li>
  <li>Daily standup kéo dài 25-30 phút thay vì 15 phút</li>
  <li>Thiếu documentation cho VNPay integration</li>
</ul>

<h3>📌 Action Items Sprint 15</h3>
<ul>
  <li><strong>DevOps Bảo:</strong> Setup môi trường staging với SSL (deadline: 22/10)</li>
  <li><strong>PM Tuấn:</strong> Áp dụng timer 15 phút cho daily standup</li>
  <li><strong>Dev Nam:</strong> Viết tài liệu kỹ thuật VNPay/Stripe (deadline: 25/10)</li>
  <li><strong>Designer Linh:</strong> Thiết kế 2 component mới cho module Notification</li>
</ul>

<h3>⚡ Risks</h3>
<ul>
  <li>Nếu không setup được staging trước 22/10, sprint 15 sẽ tiếp tục delay với TASK-110 (load test)</li>
</ul>`;
        minuteData.actionItems = [
          { task: 'Setup môi trường staging với SSL', assignee: 'DevOps Bảo', deadline: '2026-10-22', priority: 'HIGH', confidence: 0.95 },
          { task: 'Áp dụng timer 15 phút cho daily standup', assignee: 'PM Tuấn', deadline: '2026-10-21', priority: 'MEDIUM', confidence: 0.9 },
          { task: 'Viết tài liệu kỹ thuật VNPay/Stripe', assignee: 'Dev Nam', deadline: '2026-10-25', priority: 'HIGH', confidence: 0.85 },
          { task: 'Thiết kế 2 component mới cho module Notification', assignee: 'Designer Linh', deadline: '2026-10-28', priority: 'MEDIUM', confidence: 0.8 },
        ];
        minuteData.decisions = [
          'Sprint 15 sẽ tập trung 70% vào việc fix task carry-over từ Sprint 14',
          'Áp dụng time-box 15 phút cứng cho daily standup từ 21/10',
          'Designer Linh sẽ tăng cường review UI với PM Tuấn mỗi 2 ngày',
        ];
        minuteData.risksAndQuestions = {
          risks: [
            'Nếu setup staging chậm, TASK-110 (load test) sẽ delay',
            'Daily standup vẫn kéo dài có thể ảnh hưởng focus time của dev',
          ],
          openQuestions: [
            'Có nên thuê thêm 1 DevOps part-time trong 2 tuần đầu Sprint 15?',
            'VNPay có hỗ trợ sandbox test môi trường production-like không?',
          ],
        };
        minuteData.aiGeneratedAt = new Date(daysAgo(2).getTime() + 90 * 60 * 1000);
        minuteData.aiModel = 'gemini-1.5-flash';
        minuteData.aiTokensUsed = 1820;
      }

      await prisma.meetingMinute.create({ data: minuteData });
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  const stats = {
    total: meetings.length,
    scheduled: meetings.filter((m) => m.status === MeetingStatus.SCHEDULED).length,
    inProgress: meetings.filter((m) => m.status === MeetingStatus.IN_PROGRESS).length,
    completed: meetings.filter((m) => m.status === MeetingStatus.COMPLETED).length,
    cancelled: meetings.filter((m) => m.status === MeetingStatus.CANCELLED).length,
    withMinutes: meetings.filter((m) => 'minutes' in m && m.minutes).length,
    withAiSummary: meetings.filter((m) => 'minutes' in m && m.minutes?.withAiSummary).length,
  };

  console.log('\n✅ [SEED-MEETINGS] Hoàn tất!');
  console.log('─────────────────────────────────────────');
  console.log(`   Tổng:               ${stats.total} meetings`);
  console.log(`   📅 SCHEDULED:        ${stats.scheduled}`);
  console.log(`   🔴 IN_PROGRESS:      ${stats.inProgress}`);
  console.log(`   ✅ COMPLETED:        ${stats.completed}`);
  console.log(`   ❌ CANCELLED:        ${stats.cancelled}`);
  console.log(`   📝 Có biên bản:      ${stats.withMinutes}`);
  console.log(`   🤖 Có AI summary:    ${stats.withAiSummary}`);
  console.log('─────────────────────────────────────────');
  console.log('\n💡 Bạn có thể truy cập http://localhost:5173/meetings để xem.\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed meetings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
