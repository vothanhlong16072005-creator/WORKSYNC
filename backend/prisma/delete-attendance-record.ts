/**
 * Xóa bản ghi điểm danh gần nhất của một user (dùng cho demo / gỡ nhầm).
 *
 * Usage:
 *   npx tsx prisma/delete-attendance-record.ts <email> [--all]
 *
 * Mặc định: xóa bản ghi HÔM NAY. Thêm `--all` để xóa toàn bộ.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [emailArg, ...flags] = process.argv.slice(2);
  if (!emailArg) {
    console.error('Usage: npx tsx prisma/delete-attendance-record.ts <email> [--all]');
    process.exit(1);
  }

  const deleteAll = flags.includes('--all');

  const user = await prisma.user.findUnique({
    where: { email: emailArg },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    console.error(`❌ Không tìm thấy user: ${emailArg}`);
    process.exit(1);
  }

  console.log(`👤 ${user.name} <${user.email}>`);

  const records = await prisma.attendanceRecord.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    ...(deleteAll ? {} : { take: 1 }),
    select: { id: true, date: true, status: true, checkInTime: true, checkOutTime: true },
  });

  if (records.length === 0) {
    console.log('ℹ️  Không có bản ghi nào để xóa.');
    return;
  }

  for (const r of records) {
    console.log(
      `🗑️  Xóa bản ghi ${r.id} | date=${r.date.toISOString().slice(0, 10)} | status=${r.status} | in=${r.checkInTime?.toISOString() ?? '-'} | out=${r.checkOutTime?.toISOString() ?? '-'}`,
    );
    await prisma.attendanceRecord.delete({ where: { id: r.id } });
  }

  console.log(`✅ Đã xóa ${records.length} bản ghi điểm danh.`);
}

main()
  .catch((e) => {
    console.error('ERR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
