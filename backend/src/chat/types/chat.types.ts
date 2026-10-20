import { z } from 'zod';
import { ConversationType, ChatMessageType } from '@prisma/client';

export const SendMessageSchema = z.object({
  content: z.string().min(1, 'Nội dung tin nhắn không được để trống').max(5000),
  type: z.nativeEnum(ChatMessageType).default(ChatMessageType.TEXT),
  replyToId: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  fileMime: z.string().optional().nullable(),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;

export const CreateGroupConversationSchema = z.object({
  name: z.string().min(1, 'Tên nhóm không được để trống').max(100),
  memberIds: z.array(z.string()).min(1, 'Phải có ít nhất 1 thành viên'),
});

export type CreateGroupConversationDto = z.infer<typeof CreateGroupConversationSchema>;

export const UpdateConversationSettingsSchema = z.object({
  isPinned: z.boolean().optional(),
  isMuted: z.boolean().optional(),
});

export type UpdateConversationSettingsDto = z.infer<typeof UpdateConversationSettingsSchema>;

export const ToggleReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export type ToggleReactionDto = z.infer<typeof ToggleReactionSchema>;

export const ChatMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ChatMessagesQueryDto = z.infer<typeof ChatMessagesQuerySchema>;

export const ConversationsQuerySchema = z.object({
  type: z.enum(['ALL', 'DIRECT', 'GROUP']).default('ALL'),
  search: z.string().optional(),
});

export type ConversationsQueryDto = z.infer<typeof ConversationsQuerySchema>;

export interface ChatActor {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  departmentId?: string | null;
}
