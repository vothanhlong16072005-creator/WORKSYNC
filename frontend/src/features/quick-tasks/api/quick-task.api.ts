/**
 * QuickTask API client — M3.5
 * Giao việc nhanh cho nhân viên (không qua sprint).
 */
import { apiClient } from '@/lib/api-client';
import type {
  QuickTask,
  QuickTaskStats,
  CreateQuickTaskPayload,
  UpdateQuickTaskPayload,
  TaskStatus,
} from '../types/quick-task.types';

export const quickTaskApi = {
  async create(payload: CreateQuickTaskPayload): Promise<QuickTask> {
    const res = await apiClient.post<QuickTask>('/quick-tasks', payload);
    return res.data;
  },

  async getAll(params?: { status?: TaskStatus; assigneeId?: string }): Promise<QuickTask[]> {
    const res = await apiClient.get<QuickTask[]>('/quick-tasks', { params });
    return res.data;
  },

  async getOne(id: string): Promise<QuickTask> {
    const res = await apiClient.get<QuickTask>(`/quick-tasks/${id}`);
    return res.data;
  },

  async update(id: string, payload: UpdateQuickTaskPayload): Promise<QuickTask> {
    const res = await apiClient.patch<QuickTask>(`/quick-tasks/${id}`, payload);
    return res.data;
  },

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    const res = await apiClient.delete<{ id: string; deleted: boolean }>(`/quick-tasks/${id}`);
    return res.data;
  },

  async getStats(): Promise<QuickTaskStats> {
    const res = await apiClient.get<QuickTaskStats>('/quick-tasks/stats');
    return res.data;
  },
};
