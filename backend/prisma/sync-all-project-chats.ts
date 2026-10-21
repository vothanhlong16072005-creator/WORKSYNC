import { PrismaClient, ConversationType, ChatMessageType, ProjectKind } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('🚀 Starting sync-all-project-chats script...');

  // 1. Sync all TEAM Projects to Project Chat Conversations
  const projects = await prisma.project.findMany({
    where: {
      kind: ProjectKind.TEAM,
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  console.log(`Found ${projects.length} team projects in database.`);
  let createdConvs = 0;
  let updatedMembers = 0;

  for (const project of projects) {
    const allMemberIds = Array.from(
      new Set([
        ...project.members.map((m) => m.userId),
        project.createdById,
        ...(project.pmId ? [project.pmId] : []),
      ]),
    ).filter((id): id is string => Boolean(id));

    let conv = await prisma.conversation.findFirst({
      where: {
        type: ConversationType.PROJECT,
        projectId: project.id,
        deletedAt: null,
      },
      include: {
        members: { select: { userId: true } },
      },
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          type: ConversationType.PROJECT,
          name: `Dự án: ${project.name}`,
          projectId: project.id,
          createdById: project.createdById || allMemberIds[0] || 'system',
          members: {
            create: allMemberIds.map((mId) => ({
              userId: mId,
              unreadCount: 0,
            })),
          },
          messages: {
            create: {
              senderId: project.createdById || allMemberIds[0] || 'system',
              type: ChatMessageType.SYSTEM,
              content: `Nhóm trò chuyện cho dự án "${project.name}" đã được đồng bộ khởi tạo.`,
            },
          },
        },
        include: {
          members: { select: { userId: true } },
        },
      });
      createdConvs++;
      console.log(`✅ Created project chat for "${project.name}" with ${allMemberIds.length} members`);
    } else {
      const existingMemberIds = new Set(conv.members.map((m) => m.userId));
      const missingIds = allMemberIds.filter((id) => !existingMemberIds.has(id));
      if (missingIds.length > 0) {
        await prisma.conversationMember.createMany({
          data: missingIds.map((mId) => ({
            conversationId: conv!.id,
            userId: mId,
            unreadCount: 0,
          })),
          skipDuplicates: true,
        });
        updatedMembers += missingIds.length;
        console.log(`🔄 Added ${missingIds.length} missing members to project chat "${project.name}"`);
      }
    }
  }

  // 2. Sync all Departments to Department Chat Conversations
  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    include: {
      users: { select: { id: true } },
    },
  });

  console.log(`Found ${departments.length} departments in database.`);
  let createdDeptConvs = 0;

  for (const dept of departments) {
    const deptUserIds = dept.users.map((u) => u.id);
    let deptConv = await prisma.conversation.findFirst({
      where: {
        type: ConversationType.DEPARTMENT,
        departmentId: dept.id,
        deletedAt: null,
      },
      include: {
        members: { select: { userId: true } },
      },
    });

    if (!deptConv && deptUserIds.length > 0) {
      await prisma.conversation.create({
        data: {
          type: ConversationType.DEPARTMENT,
          name: `Phòng ban: ${dept.name}`,
          departmentId: dept.id,
          createdById: dept.managerId || deptUserIds[0],
          members: {
            create: deptUserIds.map((uId) => ({
              userId: uId,
              unreadCount: 0,
            })),
          },
          messages: {
            create: {
              senderId: dept.managerId || deptUserIds[0],
              type: ChatMessageType.SYSTEM,
              content: `Phòng trò chuyện cho phòng ban "${dept.name}" đã được khởi tạo.`,
            },
          },
        },
      });
      createdDeptConvs++;
      console.log(`🏢 Created department chat for "${dept.name}" with ${deptUserIds.length} members`);
    }
  }

  console.log('🎉 Project & Department chat sync completed successfully!');
  console.log(`- Project chats created: ${createdConvs}`);
  console.log(`- Missing project members added: ${updatedMembers}`);
  console.log(`- Department chats created: ${createdDeptConvs}`);
}

run()
  .catch((e) => {
    console.error('❌ Error syncing project chats:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
