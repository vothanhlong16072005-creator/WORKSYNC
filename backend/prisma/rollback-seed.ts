import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRY_RUN, log, logSuccess, logWarn } from './seed-lib/helpers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('\n================================================================');
  console.log(`🧹 ROLLBACK SEED DATA (Safe deletion of 'seed-*' records)`);
  console.log(`⚙️  Chế độ: ${DRY_RUN ? 'DRY-RUN (Chỉ đếm, KHÔNG xóa dữ liệu)' : 'EXECUTE (Xóa thực tế)'}`);
  console.log('================================================================\n');

  const uploadDir = path.resolve(__dirname, '../uploads/documents');

  // 1. Đếm số bản ghi seed-*
  const [
    customFieldVals,
    customFields,
    dependencies,
    reactions,
    comments,
    workLogs,
    docPerms,
    docAttaches,
    docVersions,
    docs,
    quickTasks,
    tasks,
    epics,
    sprints,
    projectMembers,
    projects,
    users,
  ] = await Promise.all([
    prisma.customFieldValue.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.customField.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.taskDependency.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.reaction.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.comment.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.workLog.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.documentPermission.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.documentAttachment.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.documentVersion.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.document.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.quickTask.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.task.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.epic.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.sprint.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.projectMember.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.project.count({ where: { id: { startsWith: 'seed-' } } }),
    prisma.user.count({ where: { id: { startsWith: 'seed-' } } }),
  ]);

  const summary = {
    CustomFieldValue: customFieldVals,
    CustomField: customFields,
    TaskDependency: dependencies,
    Reaction: reactions,
    Comment: comments,
    WorkLog: workLogs,
    DocumentPermission: docPerms,
    DocumentAttachment: docAttaches,
    DocumentVersion: docVersions,
    Document: docs,
    QuickTask: quickTasks,
    Task: tasks,
    Epic: epics,
    Sprint: sprints,
    ProjectMember: projectMembers,
    Project: projects,
    User: users,
  };

  console.table(summary);

  const totalSeedRecords = Object.values(summary).reduce((a, b) => a + b, 0);
  log('ROLLBACK', `Tổng cộng có ${totalSeedRecords} bản ghi có tiền tố 'seed-'.`);

  if (totalSeedRecords === 0) {
    logSuccess('ROLLBACK', 'Không có bản ghi seed nào cần xóa.');
    await prisma.$disconnect();
    return;
  }

  if (DRY_RUN) {
    logWarn('ROLLBACK', 'DRY-RUN kết thúc. Không có bản ghi nào bị xóa khỏi database.');
    await prisma.$disconnect();
    return;
  }

  // 2. Xóa các file đính kèm vật lý seed-*
  const attachments = await prisma.documentAttachment.findMany({
    where: { id: { startsWith: 'seed-' } },
  });
  let filesDeleted = 0;
  for (const att of attachments) {
    const filePath = path.join(uploadDir, att.minioKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        filesDeleted++;
      } catch (err) {
        logWarn('ATTACHMENT', `Không thể xóa file ${filePath}: ${(err as Error).message}`);
      }
    }
  }
  log('ROLLBACK', `Đã xóa ${filesDeleted} file đính kèm trên ổ đĩa.`);

  // 3. Thực hiện xóa theo thứ tự toàn vẹn khóa ngoại trong transaction
  await prisma.$transaction(async (tx) => {
    await tx.customFieldValue.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.customField.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.taskDependency.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.reaction.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.comment.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.workLog.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.documentPermission.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.documentAttachment.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.documentVersion.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.document.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.quickTask.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.task.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.epic.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.sprint.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.projectMember.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.project.deleteMany({ where: { id: { startsWith: 'seed-' } } });
    await tx.user.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  });

  logSuccess('ROLLBACK', `Hoàn tất xóa toàn bộ dữ liệu seed! Hệ thống trở về trạng thái an toàn.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Rollback script crashed:', e);
  process.exit(1);
});
