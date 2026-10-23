import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  
  // Tạo hoặc cập nhật tài khoản head@gmail.com
  const user = await prisma.user.upsert({
    where: { email: 'head@gmail.com' },
    update: {
      role: Role.DEPARTMENT_HEAD,
      departmentId: 'dept-eng',
      name: 'Trần Minh Quân (Trưởng phòng)',
      position: 'Trưởng phòng Kỹ thuật Phần mềm (Department Head)',
      status: 'ACTIVE',
    },
    create: {
      email: 'head@gmail.com',
      passwordHash,
      name: 'Trần Minh Quân (Trưởng phòng)',
      role: Role.DEPARTMENT_HEAD,
      position: 'Trưởng phòng Kỹ thuật Phần mềm (Department Head)',
      departmentId: 'dept-eng',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      status: 'ACTIVE',
      language: 'VI',
    },
  });

  // Cập nhật department dept-eng managerId trỏ về user này
  await prisma.department.update({
    where: { id: 'dept-eng' },
    data: { managerId: user.id },
  });

  console.log('✅ Upserted user head@gmail.com thành công:', {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    departmentId: user.departmentId,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
