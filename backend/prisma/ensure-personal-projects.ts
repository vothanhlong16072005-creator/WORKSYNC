import { PrismaClient, ProjectKind } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);
  let created = 0;
  for (const u of users) {
    const pp = await prisma.project.findFirst({
      where: { kind: ProjectKind.PERSONAL, personalOwnerId: u.id, deletedAt: null },
    });
    if (!pp) {
      await prisma.project.create({
        data: {
          name: 'Việc cá nhân',
          kind: ProjectKind.PERSONAL,
          createdById: u.id,
          personalOwnerId: u.id,
          color: '#4D7FC2',
        },
      });
      console.log(`✅ Created personal project for: ${u.email} (${u.name})`);
      created++;
    } else {
      console.log(`ℹ️ User ${u.email} already has personal project: ${pp.id}`);
    }
  }
  console.log(`Finished: ${created} personal projects created.`);
}

run()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
