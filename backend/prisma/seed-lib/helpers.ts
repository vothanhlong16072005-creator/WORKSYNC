import { PrismaClient } from '@prisma/client';

export const DRY_RUN = process.argv.includes('--dry-run');

export function log(section: string, message: string) {
  console.log(`[\x1b[36m${section}\x1b[0m] ${message}`);
}

export function logSuccess(section: string, message: string) {
  console.log(`[\x1b[32m${section} ✓\x1b[0m] ${message}`);
}

export function logWarn(section: string, message: string) {
  console.log(`[\x1b[33m${section} ⚠\x1b[0m] ${message}`);
}

export function logError(section: string, message: string) {
  console.error(`[\x1b[31m${section} ✗\x1b[0m] ${message}`);
}

/**
 * Tạo deterministic ID có tiền tố `seed-` để đảm bảo rollback an toàn
 */
export function seedId(prefix: string, ...parts: (string | number)[]): string {
  const sanitized = parts.map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, '_')).join('-');
  return `seed-${prefix}-${sanitized}`;
}

/**
 * Tính Date dựa trên độ lệch ngày, giờ, phút so với thời điểm hiện tại
 */
export function dateOffset(days: number = 0, hours: number = 0, minutes: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours, d.getMinutes() + minutes, 0, 0);
  return d;
}

/**
 * Chuẩn hóa Date chỉ lấy ngày (00:00:00 UTC) cho các trường @db.Date của Prisma
 */
export function vnDateOnly(daysOffset: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

/**
 * Helper tìm User theo email với fallback linh hoạt
 */
export async function resolveUserByEmail(
  prisma: any,
  email: string,
  fallbackRole?: string
): Promise<any> {
  let user = await prisma.user.findUnique({
    where: { email },
    include: { department: true },
  });
  if (!user && fallbackRole) {
    user = await prisma.user.findFirst({
      where: { role: fallbackRole as any, status: 'ACTIVE' },
      include: { department: true },
    });
  }
  return user;
}
