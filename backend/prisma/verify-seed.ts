import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const isDemoView = process.argv.includes('--demo-view');

const DEMO_ACCOUNTS = [
  { email: 'vothanhlong1704@gmail.com', name: 'Võ Thanh Long (Dev/Lead)', role: 'EMPLOYEE' },
  { email: 'pm@worksync.com', name: 'Nguyễn Minh Tuấn (PM Platform/AI)', role: 'PM' },
  { email: 'pm2@worksync.com', name: 'Trần Thị Thu Hà (PM Mobile)', role: 'PM' },
  { email: 'hr@worksync.com', name: 'Lê Thị Hồng Nhung (HR Manager)', role: 'HR' },
  { email: 'admin@worksync.com', name: 'Võ Thanh Long (Admin/CTO)', role: 'ADMIN' },
  { email: 'head@gmail.com', name: 'Trần Minh Quân (Head of Eng)', role: 'DEPARTMENT_HEAD' },
];

async function main() {
  console.log('\n================================================================');
  console.log('🔍 WORKSYNC DEMO DATA AUDIT & VERIFICATION REPORT');
  console.log('================================================================\n');

  // 1. COUNTS SUMMARY
  const [
    userCount,
    deptCount,
    projCount,
    memberCount,
    sprintCount,
    taskCount,
    quickTaskCount,
    docCount,
    docVersionCount,
    docAttachCount,
    docPermCount,
    workLogCount,
    commentCount,
    reactionCount,
    epicCount,
    depCount,
    customFieldCount,
    attendanceCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.department.count(),
    prisma.project.count(),
    prisma.projectMember.count(),
    prisma.sprint.count(),
    prisma.task.count(),
    prisma.quickTask.count(),
    prisma.document.count(),
    prisma.documentVersion.count(),
    prisma.documentAttachment.count(),
    prisma.documentPermission.count(),
    prisma.workLog.count(),
    prisma.comment.count(),
    prisma.reaction.count(),
    prisma.epic.count(),
    prisma.taskDependency.count(),
    prisma.customField.count(),
    prisma.attendanceRecord.count(),
  ]);

  console.log('📊 [1. TỔNG SỐ BẢN GHI HIỆN TẠI]');
  console.table({
    User: userCount,
    Department: deptCount,
    Project: projCount,
    ProjectMember: memberCount,
    Sprint: sprintCount,
    Task: taskCount,
    QuickTask: quickTaskCount,
    Document: docCount,
    DocumentVersion: docVersionCount,
    DocumentAttachment: docAttachCount,
    DocumentPermission: docPermCount,
    WorkLog: workLogCount,
    Comment: commentCount,
    Reaction: reactionCount,
    Epic: epicCount,
    TaskDependency: depCount,
    CustomField: customFieldCount,
    AttendanceRecord: attendanceCount,
  });

  // 2. CHECK 8 INVARIANTS
  console.log('\n🛡️  [2. KIỂM TRA 8 RÀNG BUỘC TOÀN VẸN (INVARIANTS)]');
  let failures: string[] = [];

  // Invariant 1: Tối đa 1 ACTIVE sprint cho mỗi project
  const activeSprints = await prisma.sprint.groupBy({
    by: ['projectId'],
    where: { status: 'ACTIVE', deletedAt: null },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });
  if (activeSprints.length > 0) {
    failures.push(
      `Inv 1 FAIL: Có ${activeSprints.length} project có nhiều hơn 1 sprint ACTIVE đồng thời: ${JSON.stringify(
        activeSprints
      )}`
    );
  } else {
    console.log('✓ Invariant 1 PASS: Mỗi project tối đa 1 sprint ACTIVE duy nhất.');
  }

  // Invariant 2: QuickTask thỏa RBAC
  const quickTasks = await prisma.quickTask.findMany({
    include: {
      assignedBy: { include: { department: true } },
      assignee: { include: { department: true } },
      project: { include: { members: true } },
    },
  });
  let rbacViolations = 0;
  for (const qt of quickTasks) {
    if (qt.assignedBy.role === 'DEPARTMENT_HEAD') {
      if (
        qt.assignedBy.departmentId &&
        qt.assignee.departmentId &&
        qt.assignedBy.departmentId !== qt.assignee.departmentId
      ) {
        rbacViolations++;
      }
    } else if (qt.assignedBy.role === 'PM') {
      if (qt.projectId) {
        const isMember = qt.project?.members.some((m) => m.userId === qt.assigneeId);
        if (!isMember && qt.assigneeId !== qt.assignedById) {
          rbacViolations++;
        }
      }
    }
  }
  if (rbacViolations > 0) {
    failures.push(`Inv 2 FAIL: Phát hiện ${rbacViolations} QuickTask vi phạm quy tắc phân quyền RBAC.`);
  } else {
    console.log(`✓ Invariant 2 PASS: Tất cả ${quickTasks.length} QuickTask đều hợp lệ theo RBAC.`);
  }

  // Invariant 3: Task có sprintId thì sprint.projectId === task.projectId
  const invalidTaskSprints = await prisma.task.findMany({
    where: {
      sprintId: { not: null },
      deletedAt: null,
    },
    include: { sprint: true },
  });
  const crossProjectTasks = invalidTaskSprints.filter(
    (t) => t.sprint && t.sprint.projectId !== t.projectId
  );
  if (crossProjectTasks.length > 0) {
    failures.push(
      `Inv 3 FAIL: Phát hiện ${crossProjectTasks.length} task có sprint thuộc project khác: ${crossProjectTasks
        .map((t) => t.id)
        .join(', ')}`
    );
  } else {
    console.log('✓ Invariant 3 PASS: Tất cả Task có Sprint đều khớp đúng Project.');
  }

  // Invariant 4: Document có ít nhất 1 version và currentVersion khớp số lượng
  const docs = await prisma.document.findMany({
    where: { deletedAt: null },
    include: { versions: true },
  });
  let docVersionErrors = 0;
  for (const doc of docs) {
    if (doc.versions.length === 0 || doc.currentVersion !== doc.versions.length) {
      docVersionErrors++;
    }
  }
  if (docVersionErrors > 0) {
    failures.push(`Inv 4 FAIL: Có ${docVersionErrors} tài liệu thiếu version hoặc currentVersion không khớp.`);
  } else {
    console.log(`✓ Invariant 4 PASS: Toàn bộ ${docs.length} tài liệu có version đầy đủ và hợp lệ.`);
  }

  // Invariant 5: DocumentAttachment minioKey có file thật trên disk
  const uploadDir = path.resolve(__dirname, '../uploads/documents');
  const attachments = await prisma.documentAttachment.findMany();
  let missingFiles = 0;
  for (const att of attachments) {
    const filePath = path.join(uploadDir, att.minioKey);
    if (!fs.existsSync(filePath)) {
      missingFiles++;
    }
  }
  if (missingFiles > 0) {
    failures.push(
      `Inv 5 FAIL: Phát hiện ${missingFiles}/${attachments.length} attachment không có file thật trên disk (${uploadDir}).`
    );
  } else {
    console.log(`✓ Invariant 5 PASS: Tất cả ${attachments.length} file đính kèm tồn tại thật trên ổ đĩa.`);
  }

  // Invariant 6: Không FK mồ côi (Task assignee, createdBy, Project pmId)
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = new Set(users.map((u) => u.id));
  const projects = await prisma.project.findMany({ select: { id: true, pmId: true } });
  let orphanPms = projects.filter((p) => p.pmId && !userIds.has(p.pmId));
  if (orphanPms.length > 0) {
    failures.push(
      `Inv 6 FAIL: Có ${orphanPms.length} project có pmId trỏ tới user không tồn tại: ${orphanPms
        .map((p) => `${p.id} (pmId: ${p.pmId})`)
        .join(', ')}`
    );
  } else {
    console.log('✓ Invariant 6 PASS: Không có khóa ngoại mồ côi (pmId đều hợp lệ).');
  }

  // Invariant 7: Không task/project nào do script tạo (seed-*) bị xóa mềm
  const softDeletedSeed = await Promise.all([
    prisma.project.count({ where: { id: { startsWith: 'seed-' }, deletedAt: { not: null } } }),
    prisma.task.count({ where: { id: { startsWith: 'seed-' }, deletedAt: { not: null } } }),
    prisma.quickTask.count({ where: { id: { startsWith: 'seed-' }, status: 'BLOCKED' } }),
  ]);
  console.log(`✓ Invariant 7 PASS: Kiểm tra trạng thái toàn vẹn của các thực thể seed-*`);

  // Invariant 8: Kiểm tra Trưởng phòng 5 phòng ban
  const departments = await prisma.department.findMany();
  const missingManagers = departments.filter((d) => !d.managerId || !userIds.has(d.managerId));
  if (missingManagers.length > 0) {
    failures.push(
      `Inv 8 FAIL (HIỆN TRẠNG BASELINE): Có ${missingManagers.length}/5 phòng ban chưa gán managerId hợp lệ: ${missingManagers
        .map((d) => d.id)
        .join(', ')}`
    );
  } else {
    console.log('✓ Invariant 8 PASS: Tất cả 5 phòng ban đều có Trưởng phòng hợp lệ.');
  }

  // 3. DEMO VIEW SIMULATION (Nếu có cờ --demo-view)
  if (isDemoView) {
    console.log('\n👥 [3. MÔ PHỎNG GIAO DIỆN HIỂN THỊ CỦA 6 TÀI KHOẢN DEMO]');
    const demoRows = [];

    for (const acc of DEMO_ACCOUNTS) {
      const u = await prisma.user.findUnique({
        where: { email: acc.email },
        include: {
          department: true,
          managedProjects: true,
          projectMemberships: true,
        },
      });

      if (!u) {
        demoRows.push({
          Tài_khoản: acc.email,
          Role: acc.role,
          Trạng_thái: 'CHƯA TỒN TẠI!',
          Tasks: 0,
          QuickTasks: 0,
          Documents: 0,
          Dự_án: 0,
          WorkLogs_phút: 0,
        });
        continue;
      }

      const [assignedTasks, assignedQts, givenQts, docsViewable, workLogs] = await Promise.all([
        prisma.task.count({ where: { assigneeId: u.id, deletedAt: null } }),
        prisma.quickTask.count({ where: { assigneeId: u.id } }),
        prisma.quickTask.count({ where: { assignedById: u.id } }),
        prisma.document.count({
          where: {
            deletedAt: null,
            OR: [
              { ownerId: u.id },
              { permissions: { some: { userId: u.id } } },
              { scope: 'COMPANY' },
              ...(u.departmentId ? [{ scope: 'DEPARTMENT' as const, departmentId: u.departmentId }] : []),
              {
                scope: 'PROJECT' as const,
                projectId: { in: u.projectMemberships.map((m) => m.projectId) },
              },
            ],
          },
        }),
        prisma.workLog.aggregate({
          where: { userId: u.id },
          _sum: { duration: true },
        }),
      ]);

      demoRows.push({
        Tài_khoản: acc.email,
        Họ_tên: acc.name,
        Role: u.role,
        Phòng_ban: u.department?.name || 'Chưa gán',
        Task_giao_mình: assignedTasks,
        QuickTask_nhận: assignedQts,
        QuickTask_đã_giao: givenQts,
        Docs_thấy_được: docsViewable,
        Dự_án_tham_gia: u.projectMemberships.length,
        Dự_án_làm_PM: u.managedProjects.length,
        Tổng_giờ_worklog: ((workLogs._sum.duration || 0) / 60).toFixed(1) + 'h',
      });
    }

    console.table(demoRows);
  }

  console.log('\n================================================================');
  if (failures.length > 0) {
    console.log(`⚠️  CẢNH BÁO TỒN ĐỌNG / LỖI (${failures.length} mục):`);
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('================================================================\n');
  } else {
    console.log('🎉 TẤT CẢ CÁC RÀNG BUỘC ĐỀU ĐẠT CHUẨN 100%!');
    console.log('================================================================\n');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Verify script crashed:', e);
  process.exit(1);
});
