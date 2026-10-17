/**
 * Sprint API Client — M3.5
 */
import { apiClient } from '@/lib/api-client';
import type {
  CreateSprintInput,
  Sprint,
  SprintBurndown,
  UpdateSprintInput,
} from '../types/sprint.types';

export const sprintApi = {
  /**
   * Lấy danh sách sprints của một project
   */
  async getByProject(projectId: string): Promise<Sprint[]> {
    const res = await apiClient.get<Sprint[]>('/sprints', {
      params: { projectId },
    });
    return res.data;
  },

  /**
   * Xem chi tiết 1 sprint
   */
  async getById(id: string): Promise<Sprint> {
    const res = await apiClient.get<Sprint>(`/sprints/${id}`);
    return res.data;
  },

  /**
   * Lấy dữ liệu Burndown Chart
   */
  async getBurndown(id: string): Promise<SprintBurndown> {
    const res = await apiClient.get<SprintBurndown>(`/sprints/${id}/burndown`);
    return res.data;
  },

  /**
   * Tạo sprint mới (PM/Admin)
   */
  async create(input: CreateSprintInput): Promise<Sprint> {
    const res = await apiClient.post<Sprint>('/sprints', input);
    return res.data;
  },

  /**
   * Cập nhật sprint
   */
  async update(id: string, input: UpdateSprintInput): Promise<Sprint> {
    const res = await apiClient.patch<Sprint>(`/sprints/${id}`, input);
    return res.data;
  },

  /**
   * Bắt đầu sprint (PLANNING -> ACTIVE)
   */
  async start(id: string): Promise<Sprint> {
    const res = await apiClient.post<Sprint>(`/sprints/${id}/start`);
    return res.data;
  },

  /**
   * Hoàn thành sprint (ACTIVE -> COMPLETED)
   */
  async complete(id: string): Promise<Sprint> {
    const res = await apiClient.post<Sprint>(`/sprints/${id}/complete`);
    return res.data;
  },

  /**
   * Xóa sprint (Soft-delete)
   */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/sprints/${id}`);
  },
};
