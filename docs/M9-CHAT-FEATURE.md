# M9 Real-time Chat Feature - Firebase Implementation Plan

## 1. Tổng quan Feature

### Mục tiêu
Triển khai tính năng Chat MVP với Firebase Realtime Database / Firestore:
- Chat nhóm tự động theo project/department
- Chat cá nhân (right-click context menu trên avatar)
- Gửi file nhẹ (Firebase Storage)
- Real-time với Firestore listeners
- Email notification khi offline (Firebase Cloud Functions)

### Kiến trúc đề xuất: Firebase-first

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ChatPage.tsx                                                   │
│  ├── ChatSidebar.tsx (conversation list)                        │
│  └── ConversationView.tsx                                       │
│       ├── MessageList.tsx                                       │
│       ├── MessageInput.tsx                                       │
│       └── TypingIndicator.tsx                                    │
├─────────────────────────────────────────────────────────────────┤
│                    Firebase SDK Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Firestore  │  │ Cloud       │  │  Cloud Functions     │  │
│  │   (Messages) │  │ Storage     │  │  (Email triggers)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Firebase Setup Guide (Cần thực hiện trước)

### 2.1 Tạo Firebase Project

1. **Truy cập Firebase Console**: https://console.firebase.google.com/
2. **Tạo Project mới**: "worksync-chat"
3. **Enable các services**:
   - **Firestore Database**: Create database → Start in test mode → Select region (asia-southeast1)
   - **Storage**: Start in test mode → Select region
   - **Authentication**: Enable Email/Password (để sync với existing auth)

### 2.2 Cấu hình Security Rules

#### Firestore Rules (firestore.rules)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Conversations: User chỉ thấy conversations mình tham gia
    match /conversations/{conversationId} {
      allow read: if request.auth != null 
        && request.auth.uid in resource.data.participantIds;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.createdBy;
      
      // Messages trong conversation
      match /messages/{messageId} {
        allow read: if request.auth != null 
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
        allow create: if request.auth != null 
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
        allow update, delete: if request.auth.uid == resource.data.senderId;
      }
    }
    
    // User conversations list
    match /userConversations/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Presence/typing indicators
    match /presence/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### Storage Rules (storage.rules)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat_files/{userId}/{fileId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 10 * 1024 * 1024; // Max 10MB
    }
  }
}
```

### 2.3 Lấy Firebase Config

Trong Firebase Console → Project Settings → General → Your apps → Add app (Web) → Copy config:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "worksync-chat.firebaseapp.com",
  projectId: "worksync-chat",
  storageBucket: "worksync-chat.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123:web:abc..."
};
```

### 2.4 Cài đặt Firebase CLI (Optional - cho Cloud Functions)

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

---

## 3. Database Schema (Firestore)

### 3.1 Collections Structure

```
Firestore/
├── conversations/
│   └── {conversationId}
│       ├── type: "direct" | "project" | "department"
│       ├── name: string (optional, for group chats)
│       ├── avatarUrl: string
│       ├── participantIds: string[]
│       ├── lastMessage: { content, senderId, createdAt }
│       ├── lastActivity: timestamp
│       ├── createdBy: string
│       ├── createdAt: timestamp
│       ├── metadata: { projectId?, departmentId? }
│       │
│       └── messages/
│           └── {messageId}
│               ├── senderId: string
│               ├── senderName: string
│               ├── content: string
│               ├── type: "text" | "file" | "system"
│               ├── fileUrl?: string
│               ├── fileName?: string
│               ├── fileSize?: number
│               ├── reactions: { [emoji]: string[] } // userId array
│               ├── replyTo?: string (messageId)
│               ├── isEdited: boolean
│               ├── createdAt: timestamp
│               └── updatedAt: timestamp
│
├── userConversations/
│   └── {userId}
│       ├── {conversationId}
│       │   ├── conversationId: string
│       │   ├── unreadCount: number
│       │   ├── lastReadAt: timestamp
│       │   ├── isMuted: boolean
│       │   ├── isPinned: boolean
│       │   └── addedAt: timestamp
│       │
│       └── _count: number (for ordering)
│
└── presence/
    └── {userId}
        ├── online: boolean
        ├── lastSeen: timestamp
        └── typingIn: string[] // conversationIds
```

### 3.2 Firestore Indexes (cần tạo)

Trong Firebase Console → Firestore → Indexes → Composite Indexes:

| Collection | Fields | Query Scope |
|------------|--------|-------------|
| messages | conversationId ASC, createdAt DESC | Collection |
| userConversations | userId ASC, lastActivity DESC | Collection |

---

## 4. Backend Implementation

### 4.1 Thêm Firebase SDK vào Backend

```bash
cd backend
npm install firebase-admin firebase
```

### 4.2 Tạo Firebase Admin Module

**File**: `backend/src/chat/firebase-admin.ts`

```typescript
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App {
  if (app) return app;
  
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  
  return app;
}

export function getFirestore(): admin.firestore.Firestore {
  return initializeFirebase().firestore();
}

export function getStorage(): admin.storage.Storage {
  return initializeFirebase().storage();
}
```

### 4.3 Tạo Chat Service

**File**: `backend/src/chat/chat.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { getFirestore, getStorage } from './firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

@Injectable()
export class ChatService {
  private db: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor() {
    this.db = getFirestore();
    this.storage = getStorage();
  }

  /**
   * Lấy danh sách conversations của user
   */
  async getUserConversations(userId: string) {
    const userConvsSnap = await this.db
      .collection('userConversations')
      .doc(userId)
      .collection('conversations')
      .orderBy('lastActivity', 'desc')
      .get();

    const conversations = await Promise.all(
      userConvsSnap.docs.map(async (doc) => {
        const convData = await this.db.collection('conversations').doc(doc.id).get();
        return { id: doc.id, ...convData.data(), ...doc.data() };
      })
    );

    return conversations;
  }

  /**
   * Tạo/Get direct conversation giữa 2 users
   */
  async getOrCreateDirectConversation(userId1: string, userId2: string) {
    // Check existing direct conversation
    const convsSnap = await this.db
      .collection('conversations')
      .where('type', '==', 'direct')
      .where('participantIds', 'array-contains', userId1)
      .get();

    for (const doc of convsSnap.docs) {
      const data = doc.data();
      if (data.participantIds.includes(userId2)) {
        return { id: doc.id, ...data };
      }
    }

    // Create new direct conversation
    const convRef = this.db.collection('conversations').doc();
    await convRef.set({
      type: 'direct',
      participantIds: [userId1, userId2],
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add to both users' conversation lists
    await Promise.all([
      this.addUserToConversation(convRef.id, userId1),
      this.addUserToConversation(convRef.id, userId2),
    ]);

    return { id: convRef.id, type: 'direct', participantIds: [userId1, userId2] };
  }

  /**
   * Tạo conversation cho project (auto khi tạo project)
   */
  async createProjectConversation(projectId: string, projectName: string, memberIds: string[], creatorId: string) {
    const convRef = this.db.collection('conversations').doc();
    
    await convRef.set({
      type: 'project',
      name: `Dự án: ${projectName}`,
      participantIds: memberIds,
      metadata: { projectId },
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: creatorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add system message
    await convRef.collection('messages').add({
      senderId: 'system',
      senderName: 'System',
      content: `Nhóm chat cho dự án "${projectName}" đã được tạo`,
      type: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add all members to conversation
    await Promise.all(memberIds.map(userId => this.addUserToConversation(convRef.id, userId)));

    return { id: convRef.id };
  }

  /**
   * Tạo conversation cho department
   */
  async createDepartmentConversation(departmentId: string, departmentName: string, memberIds: string[], creatorId: string) {
    const convRef = this.db.collection('conversations').doc();
    
    await convRef.set({
      type: 'department',
      name: `Phòng ban: ${departmentName}`,
      participantIds: memberIds,
      metadata: { departmentId },
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: creatorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add system message
    await convRef.collection('messages').add({
      senderId: 'system',
      senderName: 'System',
      content: `Nhóm chat cho phòng ban "${departmentName}" đã được tạo`,
      type: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await Promise.all(memberIds.map(userId => this.addUserToConversation(convRef.id, userId)));

    return { id: convRef.id };
  }

  /**
   * Gửi message
   */
  async sendMessage(conversationId: string, senderId: string, senderName: string, content: string, type: 'text' | 'file' = 'text', fileData?: any) {
    const messageData: any = {
      senderId,
      senderName,
      content,
      type,
      reactions: {},
      isEdited: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (type === 'file' && fileData) {
      messageData.fileUrl = fileData.url;
      messageData.fileName = fileData.name;
      messageData.fileSize = fileData.size;
      messageData.fileType = fileData.mimeType;
    }

    const messageRef = await this.db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add(messageData);

    // Update conversation lastActivity
    await this.db.collection('conversations').doc(conversationId).update({
      lastMessage: {
        content: type === 'file' ? `[File] ${fileData.name}` : content,
        senderId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update unread count for other participants
    const convDoc = await this.db.collection('conversations').doc(conversationId).get();
    const participantIds: string[] = convDoc.data()?.participantIds || [];
    
    await Promise.all(
      participantIds
        .filter(id => id !== senderId)
        .map(userId => this.incrementUnreadCount(userId, conversationId))
    );

    return { id: messageRef.id, ...messageData };
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(userId: string, file: Buffer, fileName: string, mimeType: string): Promise<{ url: string; name: string; size: number }> {
    const bucket = this.storage.bucket();
    const filePath = `chat_files/${userId}/${uuidv4()}-${fileName}`;
    
    const fileRef = bucket.file(filePath);
    await fileRef.save(file, {
      metadata: { contentType: mimeType },
      public: true,
    });

    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    return {
      url,
      name: fileName,
      size: file.length,
    };
  }

  /**
   * Đánh dấu đã đọc
   */
  async markAsRead(userId: string, conversationId: string) {
    await this.db
      .collection('userConversations')
      .doc(userId)
      .collection('conversations')
      .doc(conversationId)
      .update({
        unreadCount: 0,
        lastReadAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  // Helper methods
  private async addUserToConversation(conversationId: string, userId: string) {
    await this.db
      .collection('userConversations')
      .doc(userId)
      .collection('conversations')
      .doc(conversationId)
      .set({
        conversationId,
        unreadCount: 0,
        lastReadAt: admin.firestore.FieldValue.serverTimestamp(),
        isMuted: false,
        isPinned: false,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  private async incrementUnreadCount(userId: string, conversationId: string) {
    const ref = this.db
      .collection('userConversations')
      .doc(userId)
      .collection('conversations')
      .doc(conversationId);
    
    await ref.update({
      unreadCount: admin.firestore.FieldValue.increment(1),
    });
  }
}
```

### 4.4 Tạo Chat Controller

**File**: `backend/src/chat/chat.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Lấy danh sách conversations của user
   */
  @Get('conversations')
  async getConversations(@CurrentUser() user: any) {
    return this.chatService.getUserConversations(user.id);
  }

  /**
   * Tạo/Get direct conversation với user khác
   */
  @Post('conversations/direct/:userId')
  async getOrCreateDirectConversation(
    @CurrentUser() user: any,
    @Param('userId') targetUserId: string,
  ) {
    return this.chatService.getOrCreateDirectConversation(user.id, targetUserId);
  }

  /**
   * Lấy tin nhắn trong conversation (cursor-based pagination)
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.chatService.getMessages(conversationId, cursor, limit);
  }

  /**
   * Gửi tin nhắn text
   */
  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return this.chatService.sendMessage(
      conversationId,
      user.id,
      user.name,
      body.content,
      'text',
    );
  }

  /**
   * Upload file
   */
  @Post('conversations/:id/messages/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const fileData = await this.chatService.uploadFile(
      user.id,
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    return this.chatService.sendMessage(
      conversationId,
      user.id,
      user.name,
      `Gửi file: ${file.originalname}`,
      'file',
      fileData,
    );
  }

  /**
   * Đánh dấu đã đọc
   */
  @Post('conversations/:id/read')
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.markAsRead(user.id, conversationId);
  }

  /**
   * Cập nhật trạng thái conversation (mute, pin)
   */
  @Patch('conversations/:id')
  async updateConversation(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Body() body: { isMuted?: boolean; isPinned?: boolean },
  ) {
    return this.chatService.updateConversationSettings(user.id, conversationId, body);
  }
}
```

### 4.5 Tạo Chat Module

**File**: `backend/src/chat/chat.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
```

### 4.6 Hook vào Project/Department Creation

**File**: `backend/src/projects/projects.service.ts` (sửa)

Thêm vào method `createProject`:

```typescript
// Sau khi tạo project thành công
import { ChatService } from '../chat/chat.service.js';

// Trong createProject method, sau khi tạo project:
const memberIds = members.map(m => m.userId);
await this.chatService.createProjectConversation(
  project.id,
  project.name,
  memberIds,
  userId,
);
```

Tương tự cho Department trong `departments.service.ts`.

---

## 5. Frontend Implementation

### 5.1 Cài đặt Firebase SDK

```bash
cd frontend
npm install firebase
```

### 5.2 Khởi tạo Firebase Config

**File**: `frontend/src/lib/firebase.ts`

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
} else {
  app = getApps()[0];
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
}

export { db, storage, auth };
```

### 5.3 Tạo Chat Store (Zustand)

**File**: `frontend/src/features/chat/stores/chat.store.ts`

```typescript
import { create } from 'zustand';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  increment,
  getDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { toast } from 'sonner';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions: Record<string, string[]>;
  replyTo?: string;
  isEdited: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'project' | 'department';
  name?: string;
  avatarUrl?: string;
  participantIds: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: Timestamp;
  };
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  metadata?: {
    projectId?: string;
    departmentId?: string;
  };
}

interface ChatStoreState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConversations: () => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  subscribeToMessages: (conversationId: string) => () => void;
  sendMessage: (content: string, type?: 'text' | 'file', fileData?: any) => Promise<void>;
  uploadFile: (file: File) => Promise<any>;
  markAsRead: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  startDirectChat: (userId: string) => Promise<string>;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  error: null,

  fetchConversations: async () => {
    const userId = getCurrentUserId(); // From auth store
    if (!userId) return;

    set({ isLoading: true });
    
    try {
      const convsRef = collection(db, 'userConversations', userId, 'conversations');
      const q = query(convsRef, orderBy('lastActivity', 'desc'));
      
      onSnapshot(q, async (snapshot) => {
        const conversations: Conversation[] = [];
        
        for (const docSnap of snapshot.docs) {
          const convData = await getDoc(doc(db, 'conversations', docSnap.id));
          if (convData.exists()) {
            conversations.push({
              id: docSnap.id,
              ...convData.data(),
              unreadCount: docSnap.data().unreadCount || 0,
              isMuted: docSnap.data().isMuted || false,
              isPinned: docSnap.data().isPinned || false,
            } as Conversation);
          }
        }
        
        set({ conversations, isLoading: false });
      });
    } catch (error) {
      set({ error: 'Failed to fetch conversations', isLoading: false });
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, messages: [] });
    if (conv) {
      get().markAsRead(conv.id);
    }
  },

  subscribeToMessages: (conversationId) => {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      
      set({ messages });
    });

    return unsubscribe;
  },

  sendMessage: async (content, type = 'text', fileData) => {
    const { activeConversation } = get();
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
    
    if (!activeConversation || !userId) return;

    try {
      const messagesRef = collection(db, 'conversations', activeConversation.id, 'messages');
      await addDoc(messagesRef, {
        senderId: userId,
        senderName: userName,
        content,
        type,
        reactions: {},
        isEdited: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(fileData && {
          fileUrl: fileData.url,
          fileName: fileData.name,
          fileSize: fileData.size,
        }),
      });

      // Update conversation lastMessage
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: {
          content: type === 'file' ? `[File] ${fileData?.name}` : content,
          senderId: userId,
          createdAt: serverTimestamp(),
        },
        lastActivity: serverTimestamp(),
      });

      // Update unread for other participants
      const otherParticipants = activeConversation.participantIds.filter(id => id !== userId);
      await Promise.all(
        otherParticipants.map(async (participantId) => {
          const convRef = doc(db, 'userConversations', participantId, 'conversations', activeConversation.id);
          const convDoc = await getDoc(convRef);
          if (convDoc.exists() && convDoc.data().lastReadAt) {
            await updateDoc(convRef, {
              unreadCount: increment(1),
            });
          }
        })
      );
    } catch (error) {
      toast.error('Failed to send message');
    }
  },

  uploadFile: async (file: File) => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const storageRef = ref(storage, `chat_files/${userId}/${Date.now()}-${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);

    return {
      url,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };
  },

  markAsRead: async (conversationId) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const convRef = doc(db, 'userConversations', userId, 'conversations', conversationId);
    await updateDoc(convRef, {
      unreadCount: 0,
      lastReadAt: serverTimestamp(),
    });
  },

  toggleMute: async (conversationId) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const convRef = doc(db, 'userConversations', userId, 'conversations', conversationId);
    const convDoc = await getDoc(convRef);
    const isMuted = convDoc.data()?.isMuted || false;

    await updateDoc(convRef, { isMuted: !isMuted });
  },

  togglePin: async (conversationId) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const convRef = doc(db, 'userConversations', userId, 'conversations', conversationId);
    const convDoc = await getDoc(convRef);
    const isPinned = convDoc.data()?.isPinned || false;

    await updateDoc(convRef, { isPinned: !isPinned });
  },

  startDirectChat: async (targetUserId) => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Call backend API to get or create direct conversation
    const response = await fetch(`/api/chat/conversations/direct/${targetUserId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    });

    const convData = await response.json();
    return convData.id;
  },
}));
```

### 5.4 Tạo UI Components

#### ChatSidebar Component

**File**: `frontend/src/features/chat/components/ChatSidebar.tsx`

```tsx
import React, { useEffect } from 'react';
import { MessageSquare, Search, Settings, Plus, Pin, Bell, Users } from 'lucide-react';
import { useChatStore } from '../stores/chat.store';
import { useTranslation } from 'react-i18next';

export const ChatSidebar: React.FC = () => {
  const { t } = useTranslation();
  const { conversations, activeConversation, setActiveConversation, fetchConversations, toggleMute, togglePin } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'direct': return <Users className="w-4 h-4" />;
      case 'project': return <MessageSquare className="w-4 h-4" />;
      case 'department': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="w-80 flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">{t('chat.title', 'Tin nhắn')}</h2>
          <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('chat.search', 'Tìm kiếm cuộc trò chuyện...')}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button className="flex-1 px-4 py-2.5 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">
          Tất cả
        </button>
        <button className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          Riêng tư
        </button>
        <button className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          Nhóm
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setActiveConversation(conv)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
              activeConversation?.id === conv.id
                ? 'bg-blue-50 border-l-2 border-blue-600'
                : 'hover:bg-slate-50 border-l-2 border-transparent'
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              {conv.type === 'direct' ? (
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                  <Users className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                  {getConversationIcon(conv.type)}
                </div>
              )}
              {conv.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {conv.name || conv.participantIds.join(', ')}
                </span>
                {conv.lastMessage?.createdAt && (
                  <span className="text-[10px] text-slate-400 ml-2 shrink-0">
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {conv.lastMessage.content}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {conv.isPinned && <Pin className="w-3.5 h-3.5 text-blue-500" />}
              {conv.isMuted && <Bell className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </div>
        ))}

        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Chưa có cuộc trò chuyện nào</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

#### MessageList Component

**File**: `frontend/src/features/chat/components/MessageList.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import { useChatStore, Message } from '../stores/chat.store';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const MessageList: React.FC = () => {
  const { messages, activeConversation, subscribeToMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    if (!activeConversation) return;
    
    const unsubscribe = subscribeToMessages(activeConversation.id);
    return () => unsubscribe();
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm', { locale: vi });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach((msg) => {
      const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
      const key = format(date, 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  const renderMessage = (message: Message) => {
    const isOwn = message.senderId === currentUserId;
    const isSystem = message.type === 'system';

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">
            {message.content}
          </span>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-slate-600">
              {message.senderName?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          {!isOwn && (
            <span className="text-[11px] text-slate-500 mb-1 ml-1">{message.senderName}</span>
          )}
          
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm ${
              isOwn
                ? 'bg-blue-600 text-white rounded-tr-md'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-md'
            }`}
          >
            {message.type === 'file' ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold opacity-70">FILE</span>
                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {message.fileName}
                </a>
                {message.fileSize && (
                  <span className="text-[10px] opacity-70">
                    ({(message.fileSize / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          
          <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-400 ${isOwn ? 'mr-1' : 'ml-1'}`}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {message.isEdited && <span>(đã sửa)</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date}>
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">
              {format(new Date(date), 'EEEE, d MMMM', { locale: vi })}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          {msgs.map(renderMessage)}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
```

#### MessageInput Component

**File**: `frontend/src/features/chat/components/MessageInput.tsx`

```tsx
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, X, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '../stores/chat.store';

export const MessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, uploadFile } = useChatStore();

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendMessage(message.trim(), 'text');
    setMessage('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      const fileData = await uploadFile(file);
      await sendMessage(`Gửi file: ${file.name}`, 'file', fileData);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-slate-200 bg-white">
      <div className="flex items-end gap-2">
        {/* Actions */}
        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer disabled:opacity-50"
            title="Đính kèm file"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>
          
          <button
            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            title="Biểu tượng cảm xúc"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            rows={1}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-h-32"
            style={{ minHeight: '48px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
```

#### ChatContextMenu Component

**File**: `frontend/src/features/chat/components/ChatContextMenu.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import { MessageSquare, User, X } from 'lucide-react';

interface ChatContextMenuProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  position: { x: number; y: number };
  onClose: () => void;
  onStartChat: (userId: string) => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  user,
  position,
  onClose,
  onStartChat,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 120),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-slate-600">{user.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="p-2">
        <button
          onClick={() => {
            onStartChat(user.id);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-medium">Bắt đầu chat</span>
        </button>
        
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">Xem hồ sơ</span>
        </button>
      </div>
    </div>
  );
};
```

#### UserAvatar với Context Menu

**File**: `frontend/src/components/common/UserAvatar.tsx` (Tạo mới hoặc sửa existing)

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/features/chat/stores/chat.store';
import { ChatContextMenu } from '@/features/chat/components/ChatContextMenu';

interface UserAvatarProps {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  size?: 'sm' | 'md' | 'lg';
  showContextMenu?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showContextMenu = true,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const navigate = useNavigate();
  const { startDirectChat } = useChatStore();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!showContextMenu) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleStartChat = async (userId: string) => {
    try {
      const conversationId = await startDirectChat(userId);
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all`}
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <span>{user.name?.charAt(0).toUpperCase()}</span>
        )}
      </div>

      {contextMenu && (
        <ChatContextMenu
          user={user}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onStartChat={handleStartChat}
        />
      )}
    </>
  );
};
```

### 5.5 Chat Page (Main Layout)

**File**: `frontend/src/features/chat/pages/ChatPage.tsx`

```tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useChatStore } from '../stores/chat.store';
import { ChatSidebar } from '../components/ChatSidebar';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { useTranslation } from 'react-i18next';

export const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { activeConversation, setActiveConversation, conversations } = useChatStore();

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) setActiveConversation(conv);
      else navigate('/chat');
    }
  }, [conversationId, conversations]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Sidebar */}
      <ChatSidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/chat')}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {activeConversation.name || 'Cuộc trò chuyện'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeConversation.participantIds.length} thành viên
                  </p>
                </div>
              </div>

              <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <MessageList />

            {/* Input */}
            <MessageInput />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t('chat.select_conversation', 'Chọn cuộc trò chuyện')}
            </h3>
            <p className="text-sm text-slate-500 max-w-md">
              Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới bằng cách nhấp chuột phải vào avatar của ai đó.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 5.6 Cập nhật Routes

**File**: `frontend/src/App.tsx`

```tsx
// Thêm import
import { ChatPage } from '@/features/chat/pages/ChatPage';

// Thêm routes trong DashboardLayout
<Route path="/chat" element={<ChatPage />} />
<Route path="/chat/:conversationId" element={<ChatPage />} />
```

### 5.7 Cập nhật Sidebar

**File**: `frontend/src/components/layout/Sidebar.tsx`

```tsx
// Thêm menu Tin nhắn
{ icon: MessageSquare, label: t('nav.chat', 'Tin nhắn'), path: '/chat' }
```

---

## 6. Environment Variables Setup

### Backend (.env)

```bash
# Firebase Admin
FIREBASE_PROJECT_ID=worksync-chat
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@worksync-chat.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=worksync-chat.appspot.com
```

### Frontend (.env)

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=worksync-chat.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=worksync-chat
VITE_FIREBASE_STORAGE_BUCKET=worksync-chat.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 7. Cloud Functions cho Email Notification (Optional)

**File**: `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const onNewMessage = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const conversationId = context.params.conversationId;
    
    // Get conversation to find other participants
    const convDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
    const convData = convDoc.data();
    
    if (!convData) return;
    
    // Find offline users and send email notification
    const offlineUsers = convData.participantIds.filter(
      (id: string) => id !== message.senderId
    );
    
    // Call your backend API to send email
    for (const userId of offlineUsers) {
      await fetch(`${process.env.API_URL}/api/notifications/chat-email`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          conversationName: convData.name || 'Cuộc trò chuyện',
          senderName: message.senderName,
          message: message.content,
        }),
      });
    }
  });
```

---

## 8. Testing Checklist

### Backend Tests
- [ ] `npm run test -- --testPathPattern=chat` - All chat service tests pass
- [ ] Create conversation - Verify participants added
- [ ] Send message - Verify message saved and conversation updated
- [ ] File upload - Verify S3/Storage upload works
- [ ] Mark as read - Verify unread count reset

### Frontend Tests
- [ ] `npm run test -- --testPathPattern=chat` - All chat component tests pass
- [ ] Conversation list renders correctly
- [ ] Messages load and display in real-time
- [ ] File upload shows progress and preview
- [ ] Context menu appears on right-click avatar
- [ ] Navigation between conversations works

### E2E Tests
- [ ] User A sends message to User B → User B receives instantly
- [ ] User creates project → Chat group auto-created
- [ ] User right-clicks avatar → "Bắt đầu chat" → Direct chat created
- [ ] Upload file → File appears in chat

---

## 9. File Structure Summary

```
backend/
├── src/
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   ├── firebase-admin.ts
│   │   └── __tests__/
│   │       └── chat.service.spec.ts
│   └── app.module.ts (update)
└── prisma/
    └── schema.prisma (no changes needed - using Firestore)

frontend/
├── src/
│   ├── features/
│   │   └── chat/
│   │       ├── pages/
│   │       │   └── ChatPage.tsx
│   │       ├── components/
│   │       │   ├── ChatSidebar.tsx
│   │       │   ├── MessageList.tsx
│   │       │   ├── MessageInput.tsx
│   │       │   ├── ChatContextMenu.tsx
│   │       │   └── TypingIndicator.tsx
│   │       ├── stores/
│   │       │   └── chat.store.ts
│   │       └── __tests__/
│   │           ├── chat.store.spec.ts
│   │           └── ChatPage.spec.tsx
│   ├── lib/
│   │   └── firebase.ts
│   ├── components/
│   │   └── common/
│   │       └── UserAvatar.tsx (update)
│   └── App.tsx (update)
├── .env.example (update)
└── package.json (add firebase)

docs/
└── M9-CHAT-FEATURE.md (this file)
```

---

## 10. Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Firebase Setup (Console + Config) | 1-2 hours |
| 2 | Backend: Chat Service + Controller | 1 day |
| 3 | Frontend: Firebase SDK + Store | 0.5 day |
| 4 | Frontend: UI Components | 1.5 days |
| 5 | Context Menu Integration | 0.5 day |
| 6 | Auto-create Group Chats | 0.5 day |
| 7 | Testing + Bug Fixes | 1 day |

**Total: ~5-6 working days**

---

## 11. Next Steps

1. **Firebase Console Setup**: Tạo project, enable Firestore + Storage
2. **Get Firebase Config**: Copy credentials vào .env files
3. **Backend Implementation**: Tạo Chat module theo plan
4. **Frontend Implementation**: Tạo components theo plan
5. **Integration**: Hook auto-create conversations vào Project/Department creation
6. **Testing**: Chạy tests và fix bugs
7. **Deploy**: Deploy Cloud Functions (optional cho email notification)
