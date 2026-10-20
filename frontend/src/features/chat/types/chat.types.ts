export type ConversationType = 'DIRECT' | 'PROJECT' | 'DEPARTMENT';
export type ChatMessageType = 'TEXT' | 'FILE' | 'SYSTEM';

export interface ChatUserSummary {
  id: string;
  name: string;
  avatar: string | null;
  role?: string;
  position?: string | null;
  isOnline?: boolean;
}

export interface ChatReaction {
  id: string;
  emoji: string;
  userId: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface ChatMessageReply {
  id: string;
  content: string;
  type: ChatMessageType;
  fileName?: string | null;
  sender?: {
    id: string;
    name: string;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: ChatUserSummary;
  type: ChatMessageType;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMime?: string | null;
  replyToId?: string | null;
  replyTo?: ChatMessageReply | null;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  reactions?: ChatReaction[];
  reactionsGrouped?: Record<string, string[]>;
}

export interface ChatConversation {
  id: string;
  type: ConversationType;
  name: string;
  avatarUrl?: string | null;
  projectId?: string | null;
  departmentId?: string | null;
  createdById: string;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  lastSenderId?: string | null;
  lastSenderName?: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastReadAt?: string | null;
  isPinned: boolean;
  isMuted: boolean;
  participantCount: number;
  participantIds: string[];
  members?: Array<{
    userId: string;
    name: string;
    avatar?: string | null;
    role?: string;
    position?: string | null;
    isOnline?: boolean;
  }>;
  otherUser?: ChatUserSummary | null;
  isOnline?: boolean;
}

export interface SendMessagePayload {
  content: string;
  type?: ChatMessageType;
  replyToId?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMime?: string | null;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}
