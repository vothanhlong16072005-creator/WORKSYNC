import { PrismaClient, TaskStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Try to find the user created before
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@worksync.com' }
  });

  if (!admin) {
    console.log('No admin user found. Please register an admin first.');
    return;
  }

  // Create Project p1
  const project = await prisma.project.upsert({
    where: { id: 'p1' },
    update: {},
    create: {
      id: 'p1',
      name: 'PLATFORM v3.1',
      description: 'Core platform rewrite',
      createdById: admin.id
    }
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: admin.id,
      },
    },
    update: { projectRole: 'PM' },
    create: {
      projectId: project.id,
      userId: admin.id,
      projectRole: 'PM',
    },
  });

  // Create some tasks
  const tasks = [
    { id: 'T-104', title: 'SETUP CLOUD INFRA', status: TaskStatus.TODO, priority: Priority.HIGH, position: 1000, labels: ['INFRA'], projectId: project.id, createdById: admin.id, assigneeId: admin.id },
    { id: 'T-105', title: 'DESIGN SYSTEM REFACTOR', description: 'Audit and update core UI components, design tokens, and documentation for consistency and accessibility.', status: TaskStatus.IN_PROGRESS, priority: Priority.MEDIUM, position: 1000, labels: ['DESIGN', 'UI', 'SAAS'], projectId: project.id, createdById: admin.id, assigneeId: admin.id },
    { id: 'T-103', title: 'SETUP SYSTEM COMPONENTS', status: TaskStatus.TODO, priority: Priority.HIGH, position: 2000, labels: ['DEV'], projectId: project.id, createdById: admin.id, assigneeId: admin.id },
    { id: 'T-100', title: 'DESIGN UI COMPONENTS', status: TaskStatus.DONE, priority: Priority.MEDIUM, position: 1000, labels: ['UI'], projectId: project.id, createdById: admin.id, assigneeId: admin.id },
  ];

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: t,
      create: t
    });
  }

  // Seed default SystemConfig
  await prisma.systemConfig.upsert({
    where: { id: 'default-system-config' },
    update: {
      companyName: 'FPT Complex Đà Nẵng',
      officeLatitude: 15.968600,
      officeLongitude: 108.260800,
      gpsRadiusMeters: 500,
    },
    create: {
      id: 'default-system-config',
      companyName: 'FPT Complex Đà Nẵng',
      companyLogoUrl: '/logo.png',
      timezone: 'Asia/Ho_Chi_Minh',
      workStartTime: '08:30',
      workEndTime: '17:30',
      checkinStartTime: '06:00',
      checkinEndTime: '12:00',
      allowedIpRanges: ['127.0.0.1', '::1', '192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'],
      officeLatitude: 15.968600,
      officeLongitude: 108.260800,
      gpsRadiusMeters: 500,
      wfhAutoApproveTime: '09:30',
    },
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
