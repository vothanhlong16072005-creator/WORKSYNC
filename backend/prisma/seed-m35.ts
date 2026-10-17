/**
 * M3.5 Seed Data
 * Thêm DEPARTMENT_HEAD role users + QuickTask examples
 *
 * Idempotent: chạy nhiều lần OK
 *
 * Users thêm mới (mật khẩu: Password123!):
 *  - head.eng@worksync.com   (Trưởng phòng Engineering)
 *  - head.design@worksync.com (Trưởng phòng Design)
 *  - head.sales@worksync.com  (Trưởng phòng Sales)
 */
import { PrismaClient, TaskStatus, Priority, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [M3.5 SEED] Bắt đầu tạo dữ liệu Department Head + Quick Task...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Tạo 3 trưởng phòng (DEPARTMENT_HEAD)
  const heads = [
    {
      email: 'head.eng@worksync.com',
      name: 'Nguyễn Văn Hùng',
      position: 'Trưởng phòng Engineering',
      departmentId: 'dept-eng',
      avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+Hung&background=0F172A&color=fff&size=128',
    },
    {
      email: 'head.design@worksync.com',
      name: 'Trần Thị Mai',
      position: 'Trưởng phòng Design',
      departmentId: 'dept-design',
      avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+Mai&background=EC4899&color=fff&size=128',
    },
    {
      email: 'head.sales@worksync.com',
      name: 'Lê Hoàng Anh',
      position: 'Trưởng phòng Sales',
      departmentId: 'dept-sales',
      avatar: 'https://ui-avatars.com/api/?name=Le+Hoang+Anh&background=10B981&color=fff&size=128',
    },
  ];

  const headUsers = [];
  for (const h of heads) {
    const user = await prisma.user.upsert({
      where: { email: h.email },
      update: {
        name: h.name,
        position: h.position,
        role: Role.DEPARTMENT_HEAD,
        departmentId: h.departmentId,
        avatar: h.avatar,
      },
      create: {
        email: h.email,
        passwordHash,
        name: h.name,
        position: h.position,
        role: Role.DEPARTMENT_HEAD,
        departmentId: h.departmentId,
        avatar: h.avatar,
        language: 'VI',
      },
    });
    headUsers.push(user);
    console.log(`  ✅ ${user.email} — ${user.position}`);
  }

  // 2. Tạo dự án cho phòng Engineering
  const headEng = headUsers[0];
  const empInEng = await prisma.user.findFirst({
    where: { departmentId: 'dept-eng', role: 'EMPLOYEE' },
  });

  const engProject = await prisma.project.upsert({
    where: { id: 'p-dept-eng-1' },
    update: {
      pmId: empInEng?.id ?? null,
      departmentId: 'dept-eng',
      workflowType: 'SCRUM',
    },
    create: {
      id: 'p-dept-eng-1',
      name: 'WorkSync Mobile (iOS/Android)',
      description: 'Mobile app do Trưởng phòng Engineering tạo & chỉ định PM quản lý',
      kind: 'TEAM',
      workflowType: 'SCRUM',
      color: '#3B82F6',
      icon: '📱',
      createdById: headEng.id,
      pmId: empInEng?.id ?? null,
      departmentId: 'dept-eng',
      status: 'ACTIVE',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  // Project 2: Kanban workflow
  const engProject2 = await prisma.project.upsert({
    where: { id: 'p-dept-eng-2' },
    update: {
      pmId: empInEng?.id ?? null,
      departmentId: 'dept-eng',
      workflowType: 'KANBAN',
    },
    create: {
      id: 'p-dept-eng-2',
      name: 'Cloud Infrastructure & DevOps CI/CD',
      description: 'Hạ tầng AWS EKS, tự động hóa pipeline và giám sát hiệu năng',
      kind: 'TEAM',
      workflowType: 'KANBAN',
      color: '#6366F1',
      icon: '☁️',
      createdById: headEng.id,
      pmId: empInEng?.id ?? null,
      departmentId: 'dept-eng',
      status: 'ACTIVE',
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-11-30'),
    },
  });

  // Add members to projects
  const deptEngUsers = await prisma.user.findMany({
    where: { departmentId: 'dept-eng' },
  });

  for (const proj of [engProject, engProject2]) {
    for (const u of deptEngUsers) {
      const pRole = u.id === headEng.id ? 'DEPT_HEAD' : u.id === empInEng?.id ? 'PM' : 'DEV';
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: proj.id, userId: u.id } },
        update: { projectRole: pRole },
        create: {
          projectId: proj.id,
          userId: u.id,
          projectRole: pRole,
          joinedAt: new Date(),
        },
      });
    }
  }

  // Active Sprint for p-dept-eng-1
  const endSprint = new Date();
  endSprint.setDate(endSprint.getDate() + 6);
  const sprint1 = await prisma.sprint.upsert({
    where: { id: 'sprint-eng-1' },
    update: {
      status: 'ACTIVE',
      endDate: endSprint,
    },
    create: {
      id: 'sprint-eng-1',
      projectId: engProject.id,
      name: 'Sprint 14: Mobile Biometrics & Push Sync',
      goal: 'Hoàn thành đăng nhập FaceID/Vân tay và đồng bộ thông báo đẩy',
      status: 'ACTIVE',
      startDate: new Date('2026-10-10'),
      endDate: endSprint,
      durationDays: 14,
      createdById: empInEng?.id ?? headEng.id,
    },
  });

  // Sprint tasks
  const sprintTasks = [
    { id: 'st-1', title: 'Tích hợp LocalAuthentication FaceID/TouchID', status: TaskStatus.DONE },
    { id: 'st-2', title: 'Cấu hình Firebase Cloud Messaging service worker', status: TaskStatus.DONE },
    { id: 'st-3', title: 'Thiết kế màn hình đồng bộ offline cache', status: TaskStatus.IN_PROGRESS },
    { id: 'st-4', title: 'Kiểm thử e2e luồng check-in trên thiết bị Android', status: TaskStatus.TODO },
  ];

  for (const st of sprintTasks) {
    await prisma.task.upsert({
      where: { id: st.id },
      update: { status: st.status },
      create: {
        id: st.id,
        title: st.title,
        status: st.status,
        projectId: engProject.id,
        sprintId: sprint1.id,
        createdById: headEng.id,
        assigneeId: empInEng?.id ?? headEng.id,
        priority: Priority.HIGH,
      },
    });
  }

  // Attendance for today for dept-eng users
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statuses = ['ON_TIME', 'ON_TIME', 'WFH', 'LATE', 'ON_TIME', 'ON_TIME'] as const;
  for (let i = 0; i < deptEngUsers.length; i++) {
    const u = deptEngUsers[i];
    const st = statuses[i % statuses.length];
    const checkIn = new Date(today);
    checkIn.setHours(8, 15 + i * 5, 0, 0);

    await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: u.id, date: today } },
      update: { status: st, checkInTime: checkIn },
      create: {
        userId: u.id,
        date: today,
        status: st,
        checkInTime: checkIn,
        checkInMethod: st === 'WFH' ? 'WFH' : 'GPS',
      },
    });
  }

  console.log(`  ✅ Department Projects & Sprint 14 configured with real members`);

  // 3. Tạo Quick Task mẫu cho Trưởng phòng Engineering giao cho nhân viên phòng mình
  if (empInEng) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    dayAfter.setHours(17, 0, 0, 0);

    const sampleTasks = [
      {
        id: 'qt-1',
        title: 'Review PR #234 về authentication flow',
        description: 'Trưởng phòng yêu cầu review trước 17:00 hôm nay',
        priority: Priority.HIGH,
        dueDate: tomorrow,
        status: TaskStatus.TODO,
        projectId: engProject.id,
      },
      {
        id: 'qt-2',
        title: 'Duyệt báo giá nhà cung cấp AWS EKS',
        description: 'Vendor gửi báo giá renewal Q4, cần duyệt trước 20/10',
        priority: Priority.MEDIUM,
        dueDate: dayAfter,
        status: TaskStatus.IN_PROGRESS,
        projectId: engProject2.id,
      },
    ];

    for (const t of sampleTasks) {
      await prisma.quickTask.upsert({
        where: { id: t.id },
        update: t,
        create: {
          ...t,
          assigneeId: empInEng.id,
          assignedById: headEng.id,
        },
      });
    }
    console.log(`  ✅ Created ${sampleTasks.length} Quick Tasks assigned to ${empInEng.name}`);
  }

  // 4. Tạo Quick Task không thuộc project (personal)
  const allEmployees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    take: 3,
  });

  for (let i = 0; i < allEmployees.length; i++) {
    const emp = allEmployees[i];
    const due = new Date();
    due.setDate(due.getDate() + (i + 1));

    await prisma.quickTask.upsert({
      where: { id: `qt-personal-${i}` },
      update: {},
      create: {
        id: `qt-personal-${i}`,
        title: `Hoàn thành training bắt buộc Q4 - ${emp.name}`,
        description: 'Training security awareness + GDPR, hoàn thành trong tuần',
        assigneeId: emp.id,
        assignedById: headEng.id,
        dueDate: due,
        priority: Priority.MEDIUM,
        status: TaskStatus.TODO,
        projectId: null, // personal
      },
    });
  }
  console.log(`  ✅ Created ${allEmployees.length} personal Quick Tasks`);

  console.log('✨ M3.5 Seed hoàn tất!\n');
  console.log('📋 Tài khoản Department Head mới (mật khẩu: Password123!):');
  heads.forEach((h) => console.log(`   - ${h.email}  (${h.position})`));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
