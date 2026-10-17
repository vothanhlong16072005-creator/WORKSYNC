/**
 * Project API Client — M3.5
 */
import { apiClient } from '@/lib/api-client';
import type { ProjectItem } from '../types/project.types';

export const projectApi = {
  /**
   * Lấy danh sách dự án có quyền xem
   */
  async getAll(): Promise<ProjectItem[]> {
    const res = await apiClient.get<ProjectItem[]>('/projects');
    return res.data;
  },

  /**
   * Xem chi tiết một dự án
   */
  async getById(id: string): Promise<ProjectItem> {
    const res = await apiClient.get<ProjectItem>(`/projects/${id}`);
    return res.data;
  },

  /**
   * Cập nhật thông tin dự án
   */
  async update(id: string, data: Partial<ProjectItem>): Promise<ProjectItem> {
    const res = await apiClient.patch<ProjectItem>(`/projects/${id}`, data);
    return res.data;
  },

  /**
   * Xóa dự án (Soft delete)
   */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  /**
   * Thêm thành viên vào dự án
   */
  async addMember(projectId: string, userId: string, projectRole = 'MEMBER'): Promise<void> {
    await apiClient.post(`/projects/${projectId}/members`, { userId, projectRole });
  },

  /**
   * Xóa thành viên khỏi dự án
   */
  async removeMember(projectId: string, userId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },

  /**
   * Đổi role thành viên trong dự án
   */
  async changeMemberRole(projectId: string, userId: string, projectRole: string): Promise<void> {
    await apiClient.patch(`/projects/${projectId}/members/${userId}/role`, { projectRole });
  },
};
