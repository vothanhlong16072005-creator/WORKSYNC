/**
 * Seed: Calendar — Module M8 Work Calendar
 * Generates rich mock items across all 6 kinds:
 * Tasks, Sprints, Meetings, Leaves, WFH, Overtime
 * + Deliberately creates 1 conflict (meeting overlap)
 */
import {
  PrismaClient,
  TaskStatus,
  Priority,
  SprintStatus,
  MeetingScope,
  MeetingStatus,
  RSVP,
  LeaveType,
  RequestStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const now = new Date();
const addDays = (d: number, h = 9, m = 0) => {
  const target = new Date(now);
  target.setDate(target.getDate() + d);
  target.setHours(h, m, 0, 0);
  return target;
};

async function main() {
  console.log('📅 [SEED-CALENDAR] Khởi tạo dữ liệu mẫu cho Work Calendar (M8)...');

  // 1. Get existing users & TEAM projects (never personal projects)
  const users = await prisma.user.findMany({ where: { deletedAt: null }, take: 10 });
  const projects = await prisma.project.findMany({ where: { kind: 'TEAM', deletedAt: null }, take: 3 });

  if (users.length === 0 || projects.length === 0) {
    console.log('⚠️ Không tìm thấy users hoặc team projects. Vui lòng chạy seed-enterprise-full trước.');
    return;
  }

  // Cleanup any old calendar test sprints and meetings to prevent duplicate conflicts
  await prisma.meetingAttendee.deleteMany({
    where: { meeting: { title: { in: ['Họp đồng bộ tiến độ dự án WorkSync', 'Phỏng vấn kỹ thuật Backend Senior (Trùng giờ)'] } } },
  });
  await prisma.meeting.deleteMany({
    where: { title: { in: ['Họp đồng bộ tiến độ dự án WorkSync', 'Phỏng vấn kỹ thuật Backend Senior (Trùng giờ)'] } },
  });
  await prisma.sprint.deleteMany({
    where: { name: { in: ['Sprint 24 — M8 Work Calendar & Analytics', 'Sprint 25 — Mobile Responsive & Optimization'] } },
  });

  // Find employee and PM users (never assign tasks to Admin!)
  const devUser = users.find((u) => u.role === 'EMPLOYEE') || users[1] || users[0];
  const pmUser = users.find((u) => u.role === 'PM') || users[0];
  const p0 = projects[0];
  const p1 = projects[1] || p0;

  // 2. Seed Tasks with due dates (idempotent cleanup)
  console.log('  → Seeding sample tasks...');
  const taskTitles = [
    'Tối ưu hóa query database cho Calendar Timeline',
    'Thiết kế giao diện Timeline canvas chuẩn PaaS',
    'Xử lý lỗi kéo thả Reschedule RBAC',
    'Task quá hạn kiểm tra alert conflict',
    'Task quá hạn thứ hai',
  ];
  await prisma.task.deleteMany({
    where: { title: { in: taskTitles } },
  });

  const tasksData = [
    {
      title: 'Tối ưu hóa query database cho Calendar Timeline',
      description: 'Index các cột startTime, dueDate, status',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: addDays(1, 17, 0),
      projectId: p0.id,
      assigneeId: devUser.id,
      createdById: pmUser.id,
    },
    {
      title: 'Thiết kế giao diện Timeline canvas chuẩn PaaS',
      description: 'Bauhaus style grid layout Day/Week/Month',
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      dueDate: addDays(2, 18, 0),
      projectId: p0.id,
      assigneeId: devUser.id,
      createdById: pmUser.id,
    },
    {
      title: 'Xử lý lỗi kéo thả Reschedule RBAC',
      description: 'Chặn kéo thả khi không phải creator',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: addDays(3, 12, 0),
      projectId: p1.id,
      assigneeId: devUser.id,
      createdById: pmUser.id,
    },
    {
      title: 'Task quá hạn kiểm tra alert conflict',
      description: 'Task này bị trễ hạn để test badge cảnh báo',
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      dueDate: addDays(-2, 17, 0),
      projectId: p0.id,
      assigneeId: devUser.id,
      createdById: pmUser.id,
    },
    {
      title: 'Task quá hạn thứ hai',
      description: 'Cùng trễ hạn để test overload',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: addDays(-1, 15, 0),
      projectId: p0.id,
      assigneeId: devUser.id,
      createdById: pmUser.id,
    },
  ];

  for (const t of tasksData) {
    const exists = await prisma.task.findFirst({
      where: { title: t.title, projectId: t.projectId },
    });
    if (!exists) {
      await prisma.task.create({ data: t });
    }
  }

  // 3. Seed Sprints
  console.log('  → Seeding sample sprints...');
  await prisma.sprint.create({
    data: {
      projectId: p0.id,
      name: 'Sprint 24 — M8 Work Calendar & Analytics',
      goal: 'Hoàn thiện toàn bộ Module Timeline Calendar và Export ICS',
      status: SprintStatus.ACTIVE,
      startDate: addDays(-3, 0, 0),
      endDate: addDays(11, 23, 59),
      createdById: u0.id,
    },
  });

  await prisma.sprint.create({
    data: {
      projectId: p1.id,
      name: 'Sprint 25 — Mobile Responsive & Optimization',
      goal: 'Tối ưu trải nghiệm mobile và offline cache',
      status: SprintStatus.PLANNING,
      startDate: addDays(12, 0, 0),
      endDate: addDays(26, 23, 59),
      createdById: u1.id,
    },
  });

  // 4. Seed Meetings with deliberate overlap (Conflict)
  console.log('  → Seeding meetings with overlap conflict...');
  await prisma.meeting.create({
    data: {
      title: 'Họp đồng bộ tiến độ dự án WorkSync',
      description: 'Thảo luận timeline release Q4',
      scopeType: MeetingScope.PROJECT,
      projectId: p0.id,
      startTime: addDays(1, 9, 0),
      endTime: addDays(1, 10, 0),
      status: MeetingStatus.SCHEDULED,
      createdById: u0.id,
      attendees: {
        create: [
          { userId: u0.id, rsvp: RSVP.ACCEPTED },
          { userId: u1.id, rsvp: RSVP.ACCEPTED },
        ],
      },
    },
  });

  // Overlapping meeting at same time for u0!
  await prisma.meeting.create({
    data: {
      title: 'Phỏng vấn kỹ thuật Backend Senior (Trùng giờ)',
      description: 'Conflict overlap test với cuộc họp tiến độ',
      scopeType: MeetingScope.ONE_ON_ONE,
      startTime: addDays(1, 9, 30),
      endTime: addDays(1, 10, 30),
      status: MeetingStatus.SCHEDULED,
      createdById: u2.id,
      attendees: {
        create: [
          { userId: u0.id, rsvp: RSVP.ACCEPTED },
          { userId: u2.id, rsvp: RSVP.ACCEPTED },
        ],
      },
    },
  });

  // 5. Seed Leaves, WFH, Overtime (idempotent checks)
  console.log('  → Seeding approved leaves & attendance requests...');
  try {
    await prisma.leaveRequest.create({
      data: {
        userId: u1.id,
        startDate: addDays(3, 0, 0),
        endDate: addDays(4, 23, 59),
        leaveType: LeaveType.ANNUAL,
        reason: 'Nghỉ phép thường niên cùng gia đình',
        status: RequestStatus.APPROVED,
        dayCount: 2,
      },
    });
  } catch {}

  try {
    await prisma.wfhRequest.create({
      data: {
        userId: u0.id,
        date: addDays(2, 0, 0),
        reason: 'Làm việc từ xa để tập trung release',
        expectedStart: '08:30',
        expectedEnd: '17:30',
        status: RequestStatus.APPROVED,
      },
    });
  } catch {}

  try {
    await prisma.overtimeRequest.create({
      data: {
        userId: u0.id,
        date: addDays(2, 0, 0),
        registeredStart: addDays(2, 18, 0),
        registeredEnd: addDays(2, 21, 0),
        registeredHours: 3,
        reason: 'Tăng ca deploy release sprint',
        status: RequestStatus.APPROVED,
      },
    });
  } catch {}

  console.log('✅ [SEED-CALENDAR] Thành công! Đã tạo các sự kiện mẫu đa dạng trên Work Calendar.');
}

main()
  .catch((e) => {
    console.error('⚠️ [SEED-CALENDAR] Cảnh báo seed calendar:', e?.message || e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
