/**
 * Seed: Chat — Module M9 Real-time Chat
 * Generates initial Direct, Project, and Department conversations with sample messages
 */
import { PrismaClient, ConversationType, ChatMessageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💬 [SEED-CHAT] Khởi tạo dữ liệu mẫu cho Real-time Chat (M9)...');

  const users = await prisma.user.findMany({ take: 6 });
  const projects = await prisma.project.findMany({ take: 2 });
  const departments = await prisma.department.findMany({ take: 2 });

  if (users.length < 2) {
    console.log('⚠️ Cần ít nhất 2 users để seed chat. Vui lòng chạy seed:enterprise trước.');
    return;
  }

  const u0 = users[0]; // Admin / Head
  const u1 = users[1]; // PM
  const u2 = users[2] || u1; // Dev
  const u3 = users[3] || u1;

  // 1. Direct conversation between u0 and u1
  console.log('  → Seeding Direct conversation...');
  let directConv = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.DIRECT,
      AND: [
        { members: { some: { userId: u0.id } } },
        { members: { some: { userId: u1.id } } },
      ],
    },
  });

  if (!directConv) {
    directConv = await prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        createdById: u0.id,
        lastMessageText: 'Tôi đã xem qua tiến độ sprint rồi, mọi thứ rất tốt!',
        lastMessageAt: new Date(),
        lastSenderId: u0.id,
        lastSenderName: u0.name,
        members: {
          create: [
            { userId: u0.id, unreadCount: 0, isPinned: true },
            { userId: u1.id, unreadCount: 1, isPinned: false },
          ],
        },
        messages: {
          create: [
            {
              senderId: u1.id,
              type: ChatMessageType.TEXT,
              content: 'Chào anh, em vừa cập nhật kế hoạch cho tuần tới.',
              createdAt: new Date(Date.now() - 3600000 * 2),
            },
            {
              senderId: u0.id,
              type: ChatMessageType.TEXT,
              content: 'Cảm ơn em. Các tính năng chính đã hoàn thiện đúng deadline chưa?',
              createdAt: new Date(Date.now() - 3600000),
            },
            {
              senderId: u1.id,
              type: ChatMessageType.TEXT,
              content: 'Dạ rồi ạ, toàn bộ unit tests và e2e đã pass 100%.',
              createdAt: new Date(Date.now() - 1800000),
            },
            {
              senderId: u0.id,
              type: ChatMessageType.TEXT,
              content: 'Tôi đã xem qua tiến độ sprint rồi, mọi thứ rất tốt!',
              createdAt: new Date(),
            },
          ],
        },
      },
    });
  }

  // 2. Project conversation
  if (projects.length > 0) {
    console.log('  → Seeding Project conversation...');
    const p = projects[0];
    const projectMemberIds = Array.from(new Set([u0.id, u1.id, u2.id, u3.id]));

    let projConv = await prisma.conversation.findFirst({
      where: { projectId: p.id },
    });

    if (!projConv) {
      await prisma.conversation.create({
        data: {
          type: ConversationType.PROJECT,
          name: `Dự án: ${p.name}`,
          projectId: p.id,
          createdById: u0.id,
          lastMessageText: 'Mọi người nhớ review PR trước 17h nhé.',
          lastMessageAt: new Date(Date.now() - 600000),
          lastSenderId: u1.id,
          lastSenderName: u1.name,
          members: {
            create: projectMemberIds.map((userId) => ({
              userId,
              unreadCount: userId === u0.id ? 2 : 0,
            })),
          },
          messages: {
            create: [
              {
                senderId: u0.id,
                type: ChatMessageType.SYSTEM,
                content: `Nhóm trò chuyện dự án "${p.name}" được kích hoạt.`,
                createdAt: new Date(Date.now() - 86400000),
              },
              {
                senderId: u2.id,
                type: ChatMessageType.TEXT,
                content: 'Em đã đẩy bản vá cho module xác thực lên repo rồi ạ.',
                createdAt: new Date(Date.now() - 3600000 * 3),
              },
              {
                senderId: u1.id,
                type: ChatMessageType.TEXT,
                content: 'Mọi người nhớ review PR trước 17h nhé.',
                createdAt: new Date(Date.now() - 600000),
              },
            ],
          },
        },
      });
    }
  }

  // 3. Department conversation
  if (departments.length > 0) {
    console.log('  → Seeding Department conversation...');
    const d = departments[0];
    const deptMemberIds = Array.from(new Set([u0.id, u1.id, u2.id, u3.id]));

    let deptConv = await prisma.conversation.findFirst({
      where: { departmentId: d.id },
    });

    if (!deptConv) {
      await prisma.conversation.create({
        data: {
          type: ConversationType.DEPARTMENT,
          name: `Phòng ban: ${d.name}`,
          departmentId: d.id,
          createdById: u0.id,
          lastMessageText: 'Thông báo lịch họp giao ban đầu tuần lúc 9:00 sáng Thứ Hai.',
          lastMessageAt: new Date(Date.now() - 86400000 / 2),
          lastSenderId: u0.id,
          lastSenderName: u0.name,
          members: {
            create: deptMemberIds.map((userId) => ({
              userId,
              unreadCount: 0,
            })),
          },
          messages: {
            create: [
              {
                senderId: u0.id,
                type: ChatMessageType.SYSTEM,
                content: `Nhóm trò chuyện phòng ban "${d.name}" đã được tạo.`,
                createdAt: new Date(Date.now() - 86400000 * 2),
              },
              {
                senderId: u0.id,
                type: ChatMessageType.TEXT,
                content: 'Thông báo lịch họp giao ban đầu tuần lúc 9:00 sáng Thứ Hai.',
                createdAt: new Date(Date.now() - 86400000 / 2),
              },
            ],
          },
        },
      });
    }
  }

  console.log('✅ [SEED-CHAT] Đã hoàn thành khởi tạo dữ liệu Chat mẫu!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed chat:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
