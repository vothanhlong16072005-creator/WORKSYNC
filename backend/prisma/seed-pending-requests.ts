import { PrismaClient, RequestStatus, LeaveType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [SEED] Thêm dữ liệu WFH và Leave thực tế đang chờ duyệt (Pending)...');

  const nam = await prisma.user.findUnique({ where: { email: 'nam.hoang@worksync.com' } });
  const ngan = await prisma.user.findUnique({ where: { email: 'ngan.trinh@worksync.com' } });
  const bao = await prisma.user.findUnique({ where: { email: 'bao.dang@worksync.com' } });

  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const dayAfterTomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 2));

  if (nam) {
    await prisma.wfhRequest.create({
      data: {
        userId: nam.id,
        date: tomorrow,
        expectedStart: '08:30',
        expectedEnd: '17:30',
        reason: 'Khu vực nhà bị cắt điện bảo trì lưới điện buổi sáng, xin WFH để đảm bảo hoàn thành API NestJS đúng hạn.',
        status: RequestStatus.PENDING,
      },
    });
    console.log('✅ Đã tạo WFH Pending cho Hoàng Văn Nam');
  }

  if (ngan) {
    await prisma.leaveRequest.create({
      data: {
        userId: ngan.id,
        startDate: tomorrow,
        endDate: tomorrow,
        leaveType: LeaveType.ANNUAL,
        dayCount: 1.0,
        reason: 'Xin nghỉ phép 1 ngày để đưa người thân đi khám sức khỏe định kỳ tại Bệnh viện Đa khoa Đà Nẵng.',
        status: RequestStatus.PENDING,
      },
    });
    console.log('✅ Đã tạo Leave Pending cho Trịnh Kim Ngân');
  }

  if (bao) {
    await prisma.wfhRequest.create({
      data: {
        userId: bao.id,
        date: dayAfterTomorrow,
        expectedStart: '08:00',
        expectedEnd: '17:00',
        reason: 'Thực hiện bảo trì cụm server Kubernetes & Docker Registry từ 05:00 sáng, xin WFH trong ngày.',
        status: RequestStatus.PENDING,
      },
    });
    console.log('✅ Đã tạo WFH Pending cho Đặng Quốc Bảo');
  }

  console.log('🎉 [DONE] Hoàn tất nạp dữ liệu chờ duyệt thực tế.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
