import { apiClient } from '@/lib/api-client';
import type {
  ChatConversation,
  ChatMessage,
  MessagesResponse,
  SendMessagePayload,
} from '../types/chat.types';

export const chatApi = {
  /**
   * Lấy danh sách cuộc trò chuyện
   */
  async getConversations(params?: { type?: 'ALL' | 'DIRECT' | 'GROUP'; search?: string }): Promise<ChatConversation[]> {
    const res = await apiClient.get<ChatConversation[]>('/chat/conversations', {
      params: {
        type: params?.type || 'ALL',
        search: params?.search || undefined,
      },
    });
    return res.data;
  },

  /**
   * Tạo hoặc mở cuộc trò chuyện 1-1
   */
  async getOrCreateDirect(targetUserId: string): Promise<ChatConversation> {
    const res = await apiClient.post<ChatConversation>(`/chat/conversations/direct/${targetUserId}`);
    return res.data;
  },

  /**
   * Tạo hoặc mở nhóm chat dự án
   */
  async getOrCreateProject(projectId: string): Promise<ChatConversation> {
    const res = await apiClient.post<ChatConversation>(`/chat/conversations/project/${projectId}`);
    return res.data;
  },

  /**
   * Tạo hoặc mở nhóm chat phòng ban
   */
  async getOrCreateDepartment(departmentId: string): Promise<ChatConversation> {
    const res = await apiClient.post<ChatConversation>(`/chat/conversations/department/${departmentId}`);
    return res.data;
  },

  /**
   * Tạo nhóm trò chuyện tùy chỉnh
   */
  async createGroup(name: string, memberIds: string[]): Promise<ChatConversation> {
    const res = await apiClient.post<ChatConversation>('/chat/conversations/group', {
      name,
      memberIds,
    });
    return res.data;
  },

  /**
   * Lấy chi tiết cuộc trò chuyện
   */
  async getConversation(id: string): Promise<ChatConversation> {
    const res = await apiClient.get<ChatConversation>(`/chat/conversations/${id}`);
    return res.data;
  },

  /**
   * Lấy danh sách tin nhắn
   */
  async getMessages(conversationId: string, cursor?: string, limit = 50): Promise<MessagesResponse> {
    const res = await apiClient.get<MessagesResponse>(`/chat/conversations/${conversationId}/messages`, {
      params: { cursor, limit },
    });
    return res.data;
  },

  /**
   * Gửi tin nhắn
   */
  async sendMessage(conversationId: string, payload: SendMessagePayload): Promise<ChatMessage> {
    const res = await apiClient.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, payload);
    return res.data;
  },

  /**
   * Tải tệp lên và gửi tin nhắn
   */
  async uploadFile(conversationId: string, file: File, replyToId?: string): Promise<ChatMessage> {
    const formData = new FormData();
    formData.append('file', file);
    if (replyToId) {
      formData.append('replyToId', replyToId);
    }

    const res = await apiClient.post<ChatMessage>(`/chat/conversations/${conversationId}/messages/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Đánh dấu đã đọc
   */
  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>(`/chat/conversations/${conversationId}/read`);
    return res.data;
  },

  /**
   * Ghim / Bỏ ghim
   */
  async togglePin(conversationId: string): Promise<{ isPinned: boolean }> {
    const res = await apiClient.patch<{ isPinned: boolean }>(`/chat/conversations/${conversationId}/pin`);
    return res.data;
  },

  /**
   * Tắt / Bật thông báo
   */
  async toggleMute(conversationId: string): Promise<{ isMuted: boolean }> {
    const res = await apiClient.patch<{ isMuted: boolean }>(`/chat/conversations/${conversationId}/mute`);
    return res.data;
  },

  /**
   * Thả cảm xúc emoji
   */
  async toggleReaction(messageId: string, emoji: string): Promise<{ reactionsGrouped: Record<string, string[]> }> {
    const res = await apiClient.post<{ reactionsGrouped: Record<string, string[]> }>(
      `/chat/messages/${messageId}/reactions`,
      { emoji },
    );
    return res.data;
  },

  /**
   * Xóa tin nhắn
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/chat/messages/${messageId}`);
    return res.data;
  },
};
