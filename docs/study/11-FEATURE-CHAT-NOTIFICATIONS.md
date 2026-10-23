# 11 — Feature M9: Chat Nội Bộ & Thông Báo Đẩy (Real-time)

> **Module:** `backend/src/chat/` — 7 file · `backend/src/notifications/` — 14 file
> **Frontend:** `frontend/src/features/chat/` — 15 file · `frontend/src/features/notifications/` — 10 file
> **Mô phỏng:** Slack + FCM/Web Push, dùng **PostgreSQL native** thay vì Redis pub/sub.

---

## 1. Bối Cảnh & Quyết Định Kiến Trúc

Có 3 lựa chọn cho chat real-time:

| Hãy | Độ trễ | Vận hành | Đánh giá |
|-----|--------|-----------|----------|
| Polling (setInterval) | 2–5s | Đơn giản | Tốn tài nguyên, không "real-time" |
| **Socket.IO native** | <100ms | 1 process | ★ Đủ cho quy mô doanh nghiệp nội bộ |
| Redis Pub/Sub + Socket.IO Adapter | <100ms | Cần Redis | Dành cho multi-instance |

**Quyết định:** dùng **Socket.IO native (PostgreSQL adapter)**. Hệ thống đã có Redis cho cache, nhưng chat chưa cần scale multi-node. `ChatGateway` giữ state trong RAM (`Map`), đơn giản và nhanh.

**Hệ quả (trade-off) phải nói rõ khi giáo viên hỏi:** nếu deploy nhiều instance, `onlineUsers` map chỉ chứa user của instance đó → presence sai. Lỗi này đã được ghi nhận trong `docs/` như là hạn chế đã biết, hướng giải phích là Socket.IO Redis Adapter.

---

## 2. Kiến Trúc 3 Namespace

```
┌──────────────────────────────────────────────────┐
│  Frontend SPA                                     │
│  ├─ socket.io-client → /chat                      │
│  ├─ socket.io-client → /meetings                  │
│  └─ socket.io-client → /notifications             │
└──────────────────────────────────────────────────┘
              │
┌─────────────▼────────────────────────────────────┐
│  Backend NestJS                                   │
│  ├─ ChatGateway        namespace '/chat'          │
│  ├─ MeetingsGateway    namespace '/meetings'      │
│  └─ NotificationsGateway namespace '/notifications'│
└──────────────────────────────────────────────────┘
```

**Tách namespace** → mỗi feature có vòng đời độc lập, không block lẫn nhau. Chat lỗi không ảnh hưởng meeting.

---

## 3. Xác Thực WebSocket — JWT trong Handshake

```typescript
// backend/src/chat/chat.gateway.ts
async handleConnection(client: Socket) {
  try {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.query?.token as string | undefined) ||
      client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      client.disconnect();
      return;
    }

    const decoded = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_worksync',
    });

    if (!decoded?.sub) {
      client.disconnect();
      return;
    }

    const userId = decoded.sub;
    client.data.userId = userId;
    client.data.userName = decoded.name || 'Người dùng';

    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(client);

    // ★ Join room cá nhân để nhận notification/update riêng
    client.join(`user:${userId}`);

    this.server.emit('presence:update', { userId, status: 'ONLINE' });
    client.emit('presence:init', { onlineUserIds: this.getOnlineUserIds() });
  } catch (err: unknown) {
    client.disconnect();
  }
}
```

### 3.1 3 Nguồn Token — Tương Thích Mọi Client

| Nguồn | Dùng khi |
|-------|----------|
| `handshake.auth.token` | Socket.IO client chuẩn (`auth` option) |
| `handshake.query.token` | WebSocket thuần, browser không hỗ trợ header |
| `handshake.headers.authorization` | Node.js client / test tool |

**Tại sao cần 3?** WebSocket browser API **không cho set custom header**. Nếu chỉ đọc header, mọi client browser đều fail. `auth` là cách chuẩn của Socket.IO → ưu tiên đầu tiên.

### 3.2 Verify Token — Fail-Closed

```typescript
try {
  const decoded = this.jwtService.verify(token, { secret: ... });
  ...
} catch (err) {
  this.logger.debug(`[ChatSocket] ${client.id} auth error: ${error.message}`);
  client.disconnect();     // ★ Fail-closed: lỗi auth → disconnect, không cho vào
}
```

**Fail-closed** = lỗi → từ chối, không phải lỗi → cho qua. Đây là nguyên tắc bảo mật bắt buộc.

---

## 4. Presence Tracking — Xử Lý Multi-Tab

```typescript
private readonly onlineUsers = new Map<string, Set<Socket>>();
```

### 4.1 Vì sao `Map<string, Set<Socket>>` chứ không phải `Map<string, Socket>`?

**Bài toán:** 1 user mở 3 tab (inbox + project + notifications). Mỗi tab = 1 Socket khác nhau.

| Cách lưu | Hậu quả |
|-----------|----------|
| `Map<string, Socket>` | Tab 2 đè tab 1 → disconnect tab 1 làm user bị "offline" nhưng vẫn đang dùng tab 2 |
| **`Map<string, Set<Socket>>`** | ★ Đếm đúng số socket; chỉ offline khi set rỗng |

### 4.2 Logic Disconnect

```typescript
handleDisconnect(client: Socket) {
  const userId = client.data?.userId as string | undefined;
  if (userId && this.onlineUsers.has(userId)) {
    const userSockets = this.onlineUsers.get(userId)!;
    userSockets.delete(client);
    if (userSockets.size === 0) {           // ★ chỉ offline khi KHÔNG còn tab nào
      this.onlineUsers.delete(userId);
      this.server.emit('presence:update', { userId, status: 'OFFLINE' });
    }
  }
}
```

**Điểm hay:** `presence:update` chỉ bắn khi `size === 0`. Đóng 1 tab trong 3 tab → **không** báo offline. Đúng trực giác.

### 4.3 Query Presence

```typescript
@SubscribeMessage('presence:query')
handlePresenceQuery(@ConnectedSocket() client: Socket) {
  client.emit('presence:init', { onlineUserIds: this.getOnlineUserIds() });
}
```

Client mới kết nối nhận ngay danh sách online → không phải chờ các sự kiện `presence:update` khác.

---

## 5. Room Model — 2 Loại Room

```typescript
client.join(`user:${userId}`);                       // room cá nhân
client.join(`conv:${data.conversationId}`);          // room conversation
```

| Room | Mục đích | Emit từ |
|------|----------|---------|
| `user:{id}` | Nhận thông báo riêng (conversation_updated, notification) | `server.to('user:'+id)` |
| `conv:{id}` | Nhận tin nhắn trong phòng chat | `server.to('conv:'+id)` |

**Vì sao cần 2 loại?**
- `conv:` → broadcast tin nhắn cho mọi thành viên phòng
- `user:` → gửi cho **1 người** (vd: conversation list của user A cập nhật khi B nhắn tin)

---

## 6. Typing Indicator

```typescript
@SubscribeMessage('typing_start')
handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
  if (data?.conversationId) {
    client.to(`conv:${data.conversationId}`).emit('user_typing', {
      userId: client.data.userId,
      userName: client.data.userName,
      conversationId: data.conversationId,
      isTyping: true,
    });
  }
}
```

**`client.to(room)`** (có dấu chấm) = gửi cho **tất cả trong room trừ chính người gửi**. Dùng `client.to` thay vì `server.to` để người đang gõ không nhận lại event của mình.

**Client side:**

```typescript
// frontend/src/features/chat/stores/chat.store.ts
typingMap: Record<string, { userId: string; userName: string }>;
```

```typescript
socket.on('user_typing', (data) => {
  const { typingMap } = get();
  if (data.isTyping) {
    set({ typingMap: { ...typingMap, [data.conversationId]: { userId: data.userId, userName: data.userName } } });
  } else {
    const next = { ...typingMap };
    delete next[data.conversationId];
    set({ typingMap: next });
  }
});
```

---

## 7. 4 Loại Conversation

```prisma
enum ConversationType { DIRECT  GROUP  PROJECT  DEPARTMENT }
```

| Type | Cách tạo | Tính chất |
|------|----------|-----------|
| `DIRECT` | `getOrCreateDirectConversation(userId, targetUserId)` | 1-1, duy nhất giữa 2 user |
| `GROUP` | `createGroupConversation()` | nhóm do user tạo |
| `PROJECT` | `getOrCreateProjectConversation(projectId)` | tự động khi vào dự án |
| `DEPARTMENT` | `getOrCreateDepartmentConversation(departmentId)` | tự động cho phòng ban |

### 7.1 Direct Conversation — Idempotent

```typescript
async getOrCreateDirectConversation(userId: string, targetUserId: string) {
  if (userId === targetUserId) {
    throw new BadRequestException('Không thể tạo cuộc trò chuyện với chính mình');
  }

  const targetUser = await this.prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, avatar: true, role: true, position: true },
  });
  if (!targetUser) throw new NotFoundException('Người dùng đích không tồn tại');

  // ★ Tìm conversation DIRECT giữa 2 user này
  const existing = await this.prisma.conversation.findFirst({
    where: {
      type: ConversationType.DIRECT,
      deletedAt: null,
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: { members: { include: { user: { select: {...} } } } },
  });

  if (existing) {
    return this.formatConversation(existing, userId);
  }

  // ★ Tạo mới
  const created = await this.prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      createdById: userId,
      members: {
        create: [
          { userId, unreadCount: 0 },
          { userId: targetUserId, unreadCount: 0 },
        ],
      },
    },
    include: { members: { include: { user: { select: {...} } } } },
  });

  return this.formatConversation(created, userId);
}
```

**Điểm hay:** `AND: [{ members: { some: { userId } } }, { members: { some: { userId: targetUserId } } }]` — query "conversation có chứa cả 2 user này". Vì thứ tự thành viên không cố định nên phải dùng `some` thay vì `hasSome` cố định.

**Idempotent** — gọi 100 lần vẫn chỉ có 1 conversation. Không tạo rác.

### 7.2 Project/Department Conversation — Auto-sync

```typescript
async syncUserProjectConversations(userId: string): Promise<void> {
  // Lấy các project user tham gia → tạo conversation nếu chưa có
  ...
  type: ConversationType.PROJECT,
}
```

Khi user được thêm vào project → conversation của project tự động xuất hiện trong sidebar.

---

## 8. `ensureMembership` — Chống Truy Cập Chéo

```typescript
private async ensureMembership(conversationId: string, userId: string) {
  const member = await this.prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member || member.leftAt) {
    throw new ForbiddenException('Bạn không phải là thành viên của cuộc trò chuyện này');
  }
  return member;
}
```

**Đây là chống IDOR quan trọng nhất của module chat.** Mọi method đọc/ghi tin nhắn đều gọi hàm này trước:

```typescript
async getMessages(conversationId: string, userId: string, query) {
  await this.ensureMembership(conversationId, userId);   // ← luôn check trước
  ...
}

async sendMessage(conversationId: string, sender: ChatActor, dto: SendMessageDto) {
  const member = await this.ensureMembership(conversationId, sender.id);
  ...
}
```

**`member.leftAt`** — user đã rời nhóm nhưng record vẫn còn (giữ lịch sử). Kiểm tra `!member || member.leftAt` chặn cả 2 trường hợp.

### 8.1 Tại sao không dùng `@Roles()`?

Vì quyền trong chat phụ thuộc **quan hệ membership**, không phụ thuộc role. Không có role nào "được phép đọc conversation này" — phải là thành viên.

---

## 9. Phân Trang Cursor-Based

```typescript
export const ChatMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
```

```typescript
const messages = await this.prisma.chatMessage.findMany({
  where: { conversationId, deletedAt: null },
  take: limit + 1,                       // ★ lấy dư 1 để biết có more không
  ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  orderBy: { createdAt: 'desc' },
  include: { sender: {...}, replyTo: {...}, reactions: { include: { user: {...} } } },
});

const hasMore = messages.length > limit;
const items = hasMore ? messages.slice(0, limit) : messages;
const nextCursor = hasMore ? items[items.length - 1].id : null;
```

### 9.1 Kỹ Thuật "Lấy Dư 1"

**Mẫu kinh điển** của cursor pagination:
- Lấy `limit + 1` bản ghi
- Nếu thực tế nhận về > `limit` → còn dữ liệu → `hasMore = true`
- `nextCursor` = id của bản ghi cuối cùng **trong page** (không phải bản ghi thừa)

**Tại sao không dùng offset?**
| | Offset | Cursor |
|---|--------|--------|
| Vấn đề | Tin nhắn mới chèn giữa → **duplicate/missing** | Ổn định |
| Hiệu năng | `OFFSET 10000` chậm dần | Index scan không đổi |
| Độ sâu | Tốn công | O(1) |

Chat là nơi **tin nhắn mới đến liên tục** → offset sẽ liên tục nhảy dòng. Cursor là bắt buộc.

### 9.2 Group Reactions Theo Emoji

```typescript
const formattedItems = items.reverse().map((msg) => {
  const reactionsGrouped: Record<string, string[]> = {};
  for (const r of msg.reactions) {
    if (!reactionsGrouped[r.emoji]) reactionsGrouped[r.emoji] = [];
    reactionsGrouped[r.emoji].push(r.userId);
  }
  return { ...msg, reactionsGrouped };
});
```

**Chuyển từ array sang object nhóm theo emoji** → frontend render dễ hơn: `{ '👍': ['u1','u2'], '❤️': ['u3'] }` thay vì phải `filter` lại từng lần.

**`items.reverse()`** — DB trả `desc` (mới nhất trước) → reverse để hiển thị cũ→mới (đúng trực giác chat).

---

## 10. Reaction Toggle — Idempotent

```typescript
async toggleReaction(messageId: string, userId: string, emoji: string) {
  const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message || message.deletedAt) throw new NotFoundException('Tin nhắn không tồn tại');

  await this.ensureMembership(message.conversationId, userId);

  const existing = await this.prisma.chatMessageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });
  // ... nếu có → delete, không có → create
}
```

**Composite unique `@@unique([messageId, userId, emoji])`** đảm bảo 1 user chỉ có 1 reaction cho 1 emoji → toggle an toàn, không tạo trùng.

---

## 11. Read Receipt & Unread Count

```typescript
async markAsRead(conversationId: string, userId: string) {
  const now = new Date();
  await this.prisma.conversationMember.updateMany({
    where: { conversationId, userId },
    data: { unreadCount: 0, lastReadAt: now },
  });

  this.chatGateway.emitReadReceipt(conversationId, userId, now);
  return { success: true };
}
```

**`unreadCount` nằm trên `conversationMember`**, không phải `conversation` → mỗi user có số chưa đọc riêng. Đây là mô hình đúng (giống WhatsApp/Slack).

**`updateMany` thay vì `update`** — không cần biết id member, chỉ cần `where` composite.

---

## 12. Pin / Mute — Cờ Cá Nhân

```typescript
async togglePin(conversationId: string, userId: string) {
  const member = await this.prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new NotFoundException('Không thấy thành viên');

  const updated = await this.prisma.conversationMember.update({
    where: { id: member.id },
    data: { isPinned: !member.isPinned },
  });

  return { isPinned: updated.isPinned };
}
```

**`isPinned` / `isMuted` là tuỳ chọn cá nhân** → 2 user cùng nhìn 1 conversation có thể 1 người ghim, 1 người không. Không đặt ở `Conversation` vì đó là thuộc tính chung.

**Toggle pattern:** đọc → đảo bit → update. Không cần API riêng cho pin/unpin.

---

## 13. `formatConversation` — Chuẩn Hóa Cho Frontend

```typescript
private formatConversation(conv: any, currentUserId: string) {
  let displayName = conv.name;
  let displayAvatar = conv.avatarUrl;
  let otherUser = null;
  let isOnline = false;

  if (conv.type === ConversationType.DIRECT) {
    const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
    if (otherMember) {
      otherUser = otherMember.user;
      displayName = otherMember.user.name;    // ★ hiện tên người kia
      displayAvatar = otherMember.user.avatar;
      isOnline = this.chatGateway.isUserOnline(otherMember.userId);
    }
  }

  const currentMember = conv.members.find((m: any) => m.userId === currentUserId);

  return {
    id: conv.id,
    type: conv.type,
    name: displayName,
    avatarUrl: displayAvatar,
    ...
    unreadCount: currentMember?.unreadCount || 0,
    isPinned: currentMember?.isPinned || false,
    isMuted: currentMember?.isMuted || false,
    members: conv.members.map((m: any) => ({
      userId: m.userId,
      name: m.user?.name,
      isOnline: this.chatGateway.isUserOnline(m.userId),   // ★ gắn presence từng người
    })),
    otherUser,
    isOnline,
  };
}
```

**Chuẩn hóa tại server** → frontend không cần biết logic "DIRECT thì hiện tên ai", "GROUP thì hiện tên nhóm". 1 shape duy nhất cho mọi type.

**Presence được gắn tại đây** vì `onlineUsers` nằm trong Gateway (RAM) → chỉ server mới truy cập được.

---

## 14. Upload File Trong Chat

```typescript
// backend/src/chat/chat-files.controller.ts
// Upload ảnh/file vào MinIO → trả về URL → gửi message type=FILE
```

```typescript
// ChatMessageType enum
export enum ChatMessageType { TEXT  IMAGE  FILE  SYSTEM }
```

Message type `FILE` hiển thị `[File] tên.txt` thay vì nội dung text → `emitNewMessage` xử lý riêng:

```typescript
lastMessage: {
  content: message.type === 'FILE' ? `[File] ${message.fileName || 'Tệp đính kèm'}` : message.content,
  ...
}
```

---

## 15. Thông Báo Trong App — `/notifications` Namespace

### 15.1 Gateway

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly onlineUsers = new Map<string, Set<Socket>>();
```

**Cùng pattern xác thực** với ChatGateway — 3 nguồn token, fail-closed.

### 15.2 Emit Theo User (Không Dùng Room)

```typescript
emitNewNotification(notification: { userId: string; [key: string]: unknown }) {
  const sockets = this.onlineUsers.get(notification.userId);
  if (sockets && sockets.size > 0) {
    for (const socket of sockets) {
      socket.emit('notification:new', notification);
    }
  }
}

emitUnreadCount(userId: string, count: number) {
  const sockets = this.onlineUsers.get(userId);
  if (sockets && sockets.size > 0) {
    for (const socket of sockets) {
      socket.emit('notification:unread-count', { unreadCount: count });
    }
  }
}
```

**Khác biệt với Chat:** Chat dùng room `conv:` / `user:` (broadcast theo phòng). Notifications **duyệt trực tiếp `Set<Socket>`** của user → đảm bảo mọi tab đều nhận, kể cả tab không vào room nào.

### 15.3 Đồng Bộ Đọc Giữa Các Tab

```typescript
@SubscribeMessage('notification:read')
handleNotificationRead(@ConnectedSocket() client: Socket, @MessageBody() data: { id: string }) {
  const userId = client.data?.userId as string | undefined;
  if (userId && this.onlineUsers.has(userId)) {
    const sockets = this.onlineUsers.get(userId)!;
    for (const socket of sockets) {
      if (socket.id !== client.id) {       // ★ bỏ qua chính tab gửi
        socket.emit('notification:read-sync', data);
      }
    }
  }
}
```

**Đọc ở tab A → tab B tự xóa badge.** Không cần reload.

---

## 16. Web Push VAPID — Thông Báo Ngoài Trình Duyệt

### 16.1 Vì sao cần Web Push?

| Kênh | Khi app mở | Khi app đóng | Khi máy khóa |
|------|-----------|--------------|--------------|
| Socket.IO | ✅ | ❌ | ❌ |
| **Web Push (VAPID)** | ✅ | ✅ | ✅ |

→ Web Push là kênh **duy nhất** thông báo được khi user không mở app.

### 16.2 Khởi Tạo VAPID — Fail-Safe

```typescript
// backend/src/notifications/web-push.service.ts
constructor(private readonly prisma: PrismaService) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'admin@worksync.com';

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
      this.isConfigured = true;
      this.logger.log('Web Push initialized with Vapid details');
    } catch (err) {
      this.logger.error('Failed to configure VAPID details', err);
    }
  } else {
    this.logger.warn('VAPID keys not configured; Web Push notifications will be skipped');
  }
}
```

**Fail-safe (khác fail-closed):** thiếu key → chỉ **log warn** và bỏ qua push, hệ thống vẫn chạy bình thường. Đây là tính năng **optional** → không được làm sập hệ thống. (Ngược với auth: thiếu JWT secret → chặn.)

### 16.3 Gửi Push — Tự Dọn Subscription Chết

```typescript
async sendToUser(userId: string, payload: WebPushPayload): Promise<void> {
  if (!this.isConfigured) return;

  const subscriptions = await this.prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  });
  if (subscriptions.length === 0) return;

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body ?? undefined,
    icon: payload.icon ?? '/favicon.svg',
    badge: payload.badge ?? '/favicon.svg',
    data: payload.data ?? {},
  });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        jsonPayload,
      );
      await this.prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      this.logger.warn(`Push delivery failed for subscription ${sub.id}: ${error?.message}`);
      // ★ 410 Gone / 404 → subscription đã chết → vô hiệu hóa
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        await this.prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
    }
  });

  await Promise.allSettled(sendPromises);
}
```

### 16.4 4 Điểm Kỹ Thuật Hay

**① `Promise.allSettled` thay vì `Promise.all`**
`Promise.all` → 1 subscription fail là **fail tất cả**, exception propagate ra ngoài. `allSettled` → mỗi cái độc lập, cái fail chỉ log warn. Đúng cho trường hợp gửi fan-out.

**② Tự dọn subscription chết (410/404)**
Browser có thể bị xoá subscription (clear data, uninstall). Server nhận HTTP 410 Gone → đánh dấu `isActive: false` để không gửi lại. **Tự làm sạch** → không cần cron dọn thủ công.

**③ `lastUsedAt`**
Ghi lại lần gửi thành công → biết subscription nào còn "sống", hỗ trợ dọn dẹp định kỳ.

**④ `icon`/`badge` mặc định**
`?? '/favicon.svg'` → luôn có icon khi client không truyền.

### 16.5 Subscribe Phía Client

```typescript
// frontend/src/features/notifications/hooks/usePushSubscription.ts
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

**Chuyển base64url → `Uint8Array`**: VAPID public key ở dạng base64url (`-` thay `+`, `_` thay `/`), cần pad `=` rồi decode → `applicationServerKey` yêu cầu `Uint8Array`.

```typescript
const registration = await navigator.serviceWorker.register('/sw.js');
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,                                   // ★ bắt buộc với Chrome
  applicationServerKey: urlBase64ToUint8Array(vapidKey),
});

const subJson = subscription.toJSON();
if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
  await notificationsApi.subscribePush({
    endpoint: subJson.endpoint,
    keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
    userAgent: navigator.userAgent,
  });
}
```

**`userVisibleOnly: true`** — Chrome bắt buộc: mọi push phải hiển thị notification, không cho push im lặng. Đây là chính sách chống lạm dụng.

---

## 17. Cron Triggers — Thông Báo Tự Động

```typescript
// backend/src/notifications/notifications.cron.ts
@Cron('*/5 * * * *')
async checkMeetingReminders() {
  const now = new Date();
  const in60Min = new Date(now.getTime() + 60 * 60 * 1000);

  const meetings = await this.prisma.meeting.findMany({
    where: {
      status: 'SCHEDULED',
      rsvpReminderSentAt: null,          // ★ cờ chống gửi trùng
      startTime: { gte: now, lte: in60Min },
      deletedAt: null,
    },
  });

  for (const meeting of meetings) {
    await this.triggers.meetingReminder1h(meeting.id);
    await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: { rsvpReminderSentAt: new Date() },
    });
  }
}
```

### 17.1 Cờ Chống Gửi Trùng (Idempotent Cron)

**Cron chạy mỗi 5 phút** → cùng 1 meeting sẽ bị quét nhiều lần trong cửa sổ 60 phút (tức 12 lần). Cờ `rsvpReminderSentAt` đảm bảo chỉ gửi **1 lần duy nhất**.

**Đây là pattern quan trọng:** cron + cờ chống trùng = **exactly-once semantics** (giả lập) cho thông báo.

### 17.2 Task Deadline — 2 Mốc Thời Gian

```typescript
@Cron('*/15 * * * *')
async checkTaskDeadlines() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await this.prisma.task.findMany({
    where: {
      status: { notIn: ['DONE'] },
      assigneeId: { not: null },
      dueDate: { gte: now, lte: in24h },
      deletedAt: null,
    },
  });

  for (const task of tasks) {
    const hoursLeft = (task.dueDate.getTime() - now.getTime()) / (60 * 60 * 1000);

    if (hoursLeft <= 1 && !task.notified1h) {
      await this.triggers.taskDeadlineReminder({ ...task, hoursLeft });
      await this.prisma.task.update({
        where: { id: task.id },
        data: { notified1h: true, notified24h: true },   // ★ set cả 24h
      });
    } else if (hoursLeft > 1 && hoursLeft <= 24 && !task.notified24h) {
      await this.triggers.taskDeadlineReminder({ ...task, hoursLeft });
      await this.prisma.task.update({
        where: { id: task.id },
        data: { notified24h: true },
      });
    }
  }
}
```

**Chi tiết hay:** khi đã gửi cảnh báo 1h thì **set luôn `notified24h = true`** → tránh gửi 2 notification gần nhau. Logic: đã cảnh báo gấp thì không cần cảnh báo nhẹ nữa.

### 17.3 `taskDeadlineReminder` — Sinh Nội Dung

```typescript
async taskDeadlineReminder(task: {
  id: string; title: string; projectId: string; assigneeId: string; hoursLeft: number;
}) {
  const hours = Math.max(1, Math.round(task.hoursLeft));
  const isUrgent = hours <= 1;

  await this.notificationsService.create({
    userId: task.assigneeId,
    type: NotificationType.TASK,
    category: isUrgent ? 'task.deadline.1h' : 'task.deadline.24h',   // ★ category phân loại
    title: `Hạn chót công việc sắp đến: ${task.title}`,
    body: `Công việc chỉ còn khoảng ${hours} giờ nữa là đến hạn chót!`,
    data: {
      taskId: task.id,
      projectId: task.projectId,
      url: task.projectId ? `/projects/${task.projectId}/tasks?taskId=${task.id}` : `/tasks?taskId=${task.id}`,
    },
  });
}
```

**`category` vs `type`:**
- `type` = nhóm lớn (TASK, MEETING, MENTION, ATTENDANCE_APPROVAL, QUICK_TASK) → quy tắc hiển thị/icon
- `category` = mã chi tiết (`task.deadline.1h`) → lọc, phân tích, i18n

**`data.url`** → deep-link: bấm notification → mở đúng task trong đúng project. UX quan trọng.

---

## 18. 9 Loại Trigger

```typescript
// backend/src/notifications/notification-triggers.service.ts
async meetingCreated(meeting: {...})              // Lời mời họp
async meetingStarted(meetingId: string)           // Họp bắt đầu
async meetingReminder1h(meetingId: string)        // Nhắc trước 1h
async attendanceRequestCreated(request: {...})    // Gửi đơn xin phép
async attendanceRequestReviewed(request: {...})   // HR duyệt/từ chối
async quickTaskAssigned(task: {...})              // QuickTask ⚡
async mentionInContent(...)                       // @mention trong nội dung
async taskAssigned(task: {...})                   // Giao task
async taskStatusChanged(task: {...})              // Đổi trạng thái
async taskDeadlineReminder(task: {...})           // Nhắc hạn chót
```

**Tách `Trigger` khỏi `Service`:**
- `NotificationTriggersService` = **nghiệp vụ** ("khi nào thông báo gì")
- `NotificationsService` = **lưu trữ** (tạo, list, đánh dấu đọc)
- `NotificationsCronService` = **hẹn giờ** (quét DB, gọi trigger)

→ Thêm loại thông báo mới = thêm 1 method trong Trigger, không đụng vào service lưu trữ.

---

## 19. Endpoint Chat & Notifications

```
# Chat
GET    /api/chat/conversations?type&search          ALL
POST   /api/chat/conversations/direct                ALL → getOrCreate
POST   /api/chat/conversations/group                 ALL
GET    /api/chat/conversations/:id                   ALL (ensureMembership)
GET    /api/chat/conversations/:id/messages?cursor   ALL (cursor pagination)
POST   /api/chat/conversations/:id/messages          ALL (ensureMembership)
POST   /api/chat/conversations/:id/read              ALL
PATCH  /api/chat/conversations/:id/pin               ALL
PATCH  /api/chat/conversations/:id/mute              ALL
POST   /api/chat/messages/:id/reactions             ALL (toggle)
DELETE /api/chat/messages/:id                       Sender hoặc ADMIN
POST   /api/chat/upload                              ALL (file)

# Notifications
GET    /api/notifications?page&limit&unreadOnly      ALL
GET    /api/notifications/unread-count               ALL
PATCH  /api/notifications/:id/read                   ALL
PATCH  /api/notifications/read-all                   ALL
DELETE /api/notifications/:id                        ALL
DELETE  /api/notifications/read                      ALL
POST   /api/notifications/push/subscribe              ALL
DELETE /api/notifications/push/subscribe              ALL
```

---

## 20. Component Tree Frontend

```
ChatPage.tsx
├── ChatSidebar.tsx
│   ├── filter tabs: ALL / DIRECT / GROUP
│   ├── search input
│   └── conversation list (avatar + online dot + unread badge)
└── ConversationView.tsx
    ├── ChatContextMenu.tsx        ← menu khi bấm chuột phải vào avatar
    ├── MessageList.tsx
    │   ├── message bubbles
    │   ├── reactions
    │   └── reply preview
    ├── TypingIndicator.tsx
    └── MessageInput.tsx           ← textarea + emoji + file + reply

NotificationsPage.tsx
├── NotificationBell.tsx           ← badge số chưa đọc (real-time)
└── NotificationItem.tsx
```

---

## 21. Câu Hỏi Thường Gặp

**Q: Vì sao dùng PostgreSQL thay vì Redis cho chat?**
> Redis pub/sub chỉ là **transport**, không lưu tin nhắn. Tin nhắn phải lưu lâu dài → PostgreSQL là nguồn chân lý. Redis sẽ là lớp scale-out (pub/sub đồng bộ giữa nhiều instance) khi hệ thống lớn lên, nhưng ở quy mô hiện tại 1 instance thì thêm Redis chỉ tăng độ phức tạp vận hành mà không mang lại lợi ích.

**Q: Xác thực WebSocket khác REST như thế nào?**
> REST: token ở header `Authorization` mỗi request. WebSocket: chỉ có **1** handshake, sau đó connection mở. Nên token phải được xác thực **1 lần lúc connect**, và server giữ `client.data.userId` xuyên suốt. Browser không cho set header trong WebSocket → phải dùng `handshake.auth` (Socket.IO) hoặc query param.

**Q: `Map<string, Set<Socket>>` giải quyết vấn đề gì?**
> Multi-tab. Nếu lưu `Map<string, Socket>`, tab mới sẽ ghi đè tab cũ → đóng tab cũ làm hệ thống báo offline dù user vẫn đang dùng tab mới. Với `Set`, chỉ khi `size === 0` mới báo offline.

**Q: Vì sao `ensureMembership` lại quan trọng?**
> Đây là chống IDOR. Nếu không check, user A có thể gọi `GET /api/chat/conversations/{id của B}/messages` và đọc tin nhắn riêng của B. Check membership ở **service layer** (không chỉ controller) để mọi đường vào đều an toàn — kể cả WebSocket emit.

**Q: Cursor pagination vì sao không dùng offset?**
> Trong chat, tin nhắn mới đến liên tục. Offset pagination sẽ liên tục **nhảy dòng** khi có tin mới chèn vào → duplicate hoặc mất tin. Cursor dựa trên id cố định → ổn định tuyệt đối. Thêm kỹ thuật "lấy dư 1" để biết có trang tiếp.

**Q: `Promise.allSettled` tại sao quan trọng ở Web Push?**
> Một user có thể đăng ký nhiều thiết bị (mobile, laptop). Nếu 1 subscription fail (điện thoại offline) mà dùng `Promise.all` → toàn bộ lỗi, các thiết bị khác không nhận được. `allSettled` để mỗi thiết bị độc lập.

**Q: HTTP 410/404 khi gửi push nghĩa là gì?**
> Subscription đã bị browser huỷ (user xoá dữ liệu, gỡ app, hoặc browser tự dọn). HTTP 410 Gone = "đừng gửi nữa". Server đánh dấu `isActive: false` → không gửi lại → tránh gọi thừa. Đây là **auto-cleanup**.

**Q: Cron chạy mỗi 5 phút, làm sao không gửi trùng notification?**
> Dùng cờ `rsvpReminderSentAt` (null = chưa gửi). Sau khi gửi thì set = now. Lần quét sau bỏ qua vì cờ đã khác null. Tương tự `notified1h` / `notified24h` cho task. Đây là pattern chung: **cron + cờ chống trùng**.

**Q: Socket.IO có tự reconnect không?**
> Có, mặc định. Code đã cấu hình `reconnectionAttempts: 5`, `reconnectionDelay: 1500`, `transports: ['websocket', 'polling']`. Khi reconnect, socket `on('connect')` sẽ **re-join** conversation đang active:

```typescript
socket.on('connect', () => {
  const active = get().activeConversation;
  if (active) {
    socket.emit('join_conversation', { conversationId: active.id });
  }
});
```

**Q: `type` và `category` trong notification khác nhau thế nào?**
> `type` = nhóm hiển thị (TASK/MEETING/MENTION) quyết định icon + màu. `category` = mã chi tiết (`task.deadline.1h`) dùng để lọc và phân tích. Tách 2 chiều giúp thêm biến thể mà không nhân bản enum.

**Q: Đọc notification ở 1 tab thì tab khác có cập nhật không?**
> Có. Client emit `notification:read` → server loop qua **tất cả socket của user trừ chính socket gửi** → emit `notification:read-sync`. Các tab khác tự xoá badge.

**Q: Vì sao `emitNewNotification` duyệt Set<Socket> thay vì dùng room `user:`?**
> Vì `/notifications` namespace không dùng room pattern như `/chat`. Duyệt trực tiếp `Set<Socket>` là cách chắc chắn mọi tab nhận được (kể cả tab chưa join room nào) và logic đơn giản hơn cho 1 loại event này.
