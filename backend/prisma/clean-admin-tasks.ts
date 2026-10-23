import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'ADMIN' },
        { email: 'admin@worksync.com' },
      ],
    },
  });

  if (!admin) {
    console.log('No admin found');
    return;
  }

  console.log('Admin:', admin.name, admin.email, admin.id);

  // Check all tasks where assigneeId = admin.id OR createdById = admin.id
  const adminTasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: admin.id },
        { createdById: admin.id },
      ],
    },
    select: { id: true, title: true, dueDate: true, assigneeId: true, createdById: true },
  });
  console.log(`Admin tasks count: ${adminTasks.length}`, adminTasks);

  // Check all quickTasks
  const adminQuick = await prisma.quickTask.findMany({
    where: {
      OR: [
        { assigneeId: admin.id },
        { assignedById: admin.id },
      ],
    },
  });
  console.log(`Admin quick tasks: ${adminQuick.length}`, adminQuick);

  // Check all meetings
  const adminMeetings = await prisma.meeting.findMany({
    where: {
      OR: [
        { createdById: admin.id },
        { attendees: { some: { userId: admin.id } } },
      ],
    },
    select: { id: true, title: true, startTime: true },
  });
  console.log(`Admin meetings: ${adminMeetings.length}`);

  // Check all WFH
  const adminWfh = await prisma.wfhRequest.findMany({
    where: { userId: admin.id },
    select: { id: true, date: true, status: true },
  });
  console.log(`Admin WFH: ${adminWfh.length}`);

  // Look for any other users
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  console.log('All users in DB:', allUsers);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
