import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DRY_RUN, log, logSuccess, logWarn, seedId } from './seed-lib/helpers.ts';

const prisma = new PrismaClient();

const PASSWORD_PLAIN = 'Password123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD_PLAIN, 10);

async function main() {
  console.log('\n================================================================');
  console.log('🏢 SEED ORGANIZATIONAL DATA (Phòng ban & Nhân viên & Dự án)');
  console.log(`⚙️  Chế độ: ${DRY_RUN ? 'DRY-RUN (Không ghi vào DB)' : 'EXECUTE'}`);
  console.log('================================================================\n');

  // 1. TÌM TÀI KHOẢN ĐỂ GÁN TRƯỞNG PHÒNG
  const headEng = await prisma.user.findFirst({
    where: { email: 'head@gmail.com' },
  });
  const headDesign = await prisma.user.findFirst({
    where: { email: 'head.design@worksync.com' },
  });
  const headSales = await prisma.user.findFirst({
    where: { email: 'head.sales@worksync.com' },
  });
  const pmUser = await prisma.user.findFirst({
    where: { email: 'pm@worksync.com' },
  });

  if (!headEng) throw new Error('Không tìm thấy tài khoản head@gmail.com!');
  if (!pmUser) throw new Error('Không tìm thấy tài khoản pm@worksync.com!');

  // 2. DANH SÁCH USER MỚI (2 Head + 8 Employee)
  const newUsers = [
    // 2 Trưởng phòng bổ sung
    {
      id: seedId('user', 'head-prod'),
      email: 'head.prod@worksync.com',
      name: 'Đặng Quốc Huy (Head of Product)',
      role: 'DEPARTMENT_HEAD',
      position: 'Trưởng phòng Quản lý Sản phẩm',
      departmentId: 'dept-prod',
      avatar: 'https://ui-avatars.com/api/?name=Dang+Quoc+Huy&background=0D9488&color=fff',
    },
    {
      id: seedId('user', 'head-hr'),
      email: 'head.hr@worksync.com',
      name: 'Ngô Thanh Vân (Head of HR)',
      role: 'DEPARTMENT_HEAD',
      position: 'Trưởng phòng Nhân sự & Văn hóa',
      departmentId: 'dept-hr',
      avatar: 'https://ui-avatars.com/api/?name=Ngo+Thanh+Van&background=7C3AED&color=fff',
    },
    // 8 Nhân viên mới trải đều 4 phòng ban
    {
      id: seedId('user', 'dev1-eng'),
      email: 'dev1.eng@worksync.com',
      name: 'Nguyễn Văn Tiến',
      role: 'EMPLOYEE',
      position: 'Kỹ sư Frontend (React/TypeScript)',
      departmentId: 'dept-eng',
      avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+Tien&background=2563EB&color=fff',
    },
    {
      id: seedId('user', 'dev2-eng'),
      email: 'dev2.eng@worksync.com',
      name: 'Lê Hoàng Phúc',
      role: 'EMPLOYEE',
      position: 'Kỹ sư Backend (Node.js/Postgres)',
      departmentId: 'dept-eng',
      avatar: 'https://ui-avatars.com/api/?name=Le+Hoang+Phuc&background=1D4ED8&color=fff',
    },
    {
      id: seedId('user', 'ba1-prod'),
      email: 'ba1.prod@worksync.com',
      name: 'Đỗ Minh Anh',
      role: 'EMPLOYEE',
      position: 'Chuyên viên Phân tích Nghiệp vụ (BA)',
      departmentId: 'dept-prod',
      avatar: 'https://ui-avatars.com/api/?name=Do+Minh+Anh&background=059669&color=fff',
    },
    {
      id: seedId('user', 'po1-prod'),
      email: 'po1.prod@worksync.com',
      name: 'Trịnh Quang Hưng',
      role: 'EMPLOYEE',
      position: 'Chủ sở hữu Sản phẩm (Product Owner)',
      departmentId: 'dept-prod',
      avatar: 'https://ui-avatars.com/api/?name=Trinh+Quang+Hung&background=10B981&color=fff',
    },
    {
      id: seedId('user', 'ui1-design'),
      email: 'ui1.design@worksync.com',
      name: 'Vũ Quỳnh Chi',
      role: 'EMPLOYEE',
      position: 'Chuyên viên Thiết kế Giao diện (UI)',
      departmentId: 'dept-design',
      avatar: 'https://ui-avatars.com/api/?name=Vu+Quynh+Chi&background=DB2777&color=fff',
    },
    {
      id: seedId('user', 'ux1-design'),
      email: 'ux1.design@worksync.com',
      name: 'Bùi Đức Huy',
      role: 'EMPLOYEE',
      position: 'Chuyên viên Nghiên cứu Trải nghiệm (UX)',
      departmentId: 'dept-design',
      avatar: 'https://ui-avatars.com/api/?name=Bui+Duc+Huy&background=BE185D&color=fff',
    },
    {
      id: seedId('user', 'sales1'),
      email: 'sales1@worksync.com',
      name: 'Hoàng Thúy Nga',
      role: 'EMPLOYEE',
      position: 'Chuyên viên Tư vấn Khách hàng Doanh nghiệp',
      departmentId: 'dept-sales',
      avatar: 'https://ui-avatars.com/api/?name=Hoang+Thuy+Nga&background=D97706&color=fff',
    },
    {
      id: seedId('user', 'sales2'),
      email: 'sales2@worksync.com',
      name: 'Trần Quốc Bảo',
      role: 'EMPLOYEE',
      position: 'Kỹ sư Giải pháp Doanh nghiệp (Pre-sales)',
      departmentId: 'dept-sales',
      avatar: 'https://ui-avatars.com/api/?name=Tran+Quoc+Bao&background=B45309&color=fff',
    },
  ];

  // 3. DANH SÁCH 7 USER HIỆN CHƯA CÓ PHÒNG CẦN GÁN
  const existingUsersDeptUpdate = [
    { email: 'tranvanbao@worksync.internal', departmentId: 'dept-eng' },
    { email: 'nguyenhoanglong@worksync.internal', departmentId: 'dept-prod' },
    { email: 'phamminhduc@worksync.internal', departmentId: 'dept-prod' },
    { email: 'long@worksync.com', departmentId: 'dept-eng' },
    { email: 'vothanhlong.test@gmail.com', departmentId: 'dept-eng' },
    { email: 'hung.nguyen@worksync.com', departmentId: 'dept-sales' },
    { email: 'tuan.nguyen@worksync.com', departmentId: 'dept-sales' },
  ];

  if (DRY_RUN) {
    log('DRY-RUN', `Sẽ gán managerId cho 5 phòng ban:`);
    console.log({
      'dept-eng': headEng.email,
      'dept-design': headDesign?.email || 'Chưa có',
      'dept-sales': headSales?.email || 'Chưa có',
      'dept-prod': 'head.prod@worksync.com (tạo mới)',
      'dept-hr': 'head.hr@worksync.com (tạo mới)',
    });
    log('DRY-RUN', `Sẽ tạo ${newUsers.length} tài khoản mới kèm Personal Project.`);
    log('DRY-RUN', `Sẽ gán phòng ban cho ${existingUsersDeptUpdate.length} user hiện hữu.`);
    log('DRY-RUN', `Sẽ đổi pmId của project p3 -> ${pmUser.email}.`);
    await prisma.$disconnect();
    return;
  }

  // 4. THỰC THI TRONG TRANSACTION
  await prisma.$transaction(async (tx) => {
    // 4.1. Tạo / Cập nhật 10 tài khoản mới
    for (const u of newUsers) {
      const createdUser = await tx.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role as any,
          position: u.position,
          departmentId: u.departmentId,
          avatar: u.avatar,
        },
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          passwordHash: PASSWORD_HASH,
          role: u.role as any,
          position: u.position,
          departmentId: u.departmentId,
          avatar: u.avatar,
        },
      });

      // Tạo Personal Project cho user mới
      await tx.project.upsert({
        where: { personalOwnerId: createdUser.id },
        update: { name: 'Việc cá nhân' },
        create: {
          id: seedId('proj', 'personal', createdUser.id),
          name: 'Việc cá nhân',
          kind: 'PERSONAL',
          workflowType: 'KANBAN',
          personalOwnerId: createdUser.id,
          createdById: createdUser.id,
          status: 'ACTIVE',
        },
      });
    }

    // 4.2. Gán managerId cho 5 phòng ban
    const headProd = await tx.user.findUnique({ where: { email: 'head.prod@worksync.com' } });
    const headHr = await tx.user.findUnique({ where: { email: 'head.hr@worksync.com' } });

    await tx.department.update({
      where: { id: 'dept-eng' },
      data: { managerId: headEng.id },
    });
    if (headDesign) {
      await tx.department.update({
        where: { id: 'dept-design' },
        data: { managerId: headDesign.id },
      });
    }
    if (headSales) {
      await tx.department.update({
        where: { id: 'dept-sales' },
        data: { managerId: headSales.id },
      });
    }
    if (headProd) {
      await tx.department.update({
        where: { id: 'dept-prod' },
        data: { managerId: headProd.id },
      });
    }
    if (headHr) {
      await tx.department.update({
        where: { id: 'dept-hr' },
        data: { managerId: headHr.id },
      });
    }

    // 4.3. Gán phòng ban cho 7 user hiện hữu chưa có phòng
    for (const item of existingUsersDeptUpdate) {
      await tx.user.updateMany({
        where: { email: item.email },
        data: { departmentId: item.departmentId },
      });
    }

    // 4.4. Sửa pmId của project p3 -> pm@worksync.com
    await tx.project.update({
      where: { id: 'p3' },
      data: { pmId: pmUser.id },
    });

    // 4.5. Gán ProjectMember cho các nhân viên mới vào các Team Project phù hợp
    const projectAssignments = [
      { emails: ['dev1.eng@worksync.com', 'dev2.eng@worksync.com'], projectId: 'proj-platform-v3' },
      { emails: ['dev1.eng@worksync.com'], projectId: 'proj-ai-meeting' },
      { emails: ['ba1.prod@worksync.com', 'po1.prod@worksync.com'], projectId: 'p3' },
      { emails: ['ui1.design@worksync.com', 'ux1.design@worksync.com'], projectId: 'proj-mobile-app' },
      { emails: ['sales1@worksync.com', 'sales2@worksync.com'], projectId: 'proj-infra-devops' },
    ];

    for (const assign of projectAssignments) {
      for (const email of assign.emails) {
        const u = await tx.user.findUnique({ where: { email } });
        if (u) {
          await tx.projectMember.upsert({
            where: { projectId_userId: { projectId: assign.projectId, userId: u.id } },
            update: { projectRole: 'MEMBER' },
            create: {
              id: seedId('pmember', assign.projectId, u.id),
              projectId: assign.projectId,
              userId: u.id,
              projectRole: 'MEMBER',
            },
          });
        }
      }
    }
  });

  logSuccess('ORGANIZATIONAL', 'Đã gán 5 managerId, tạo 10 user mới, gán 7 user phòng ban, và cập nhật p3 pmId thành công!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed organizational failed:', e);
  process.exit(1);
});
