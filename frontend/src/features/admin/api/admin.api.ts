import { apiClient } from '@/lib/api-client';
import type {
  AdminOverviewData,
  AdminUserItem,
  AdminDepartmentItem,
  AdminProjectItem,
  AdminDocumentItem,
  AdminMeetingItem,
} from '../types/admin.types';

export const adminApi = {
  async getOverview(): Promise<AdminOverviewData> {
    const res = await apiClient.get<{ success?: boolean; data: AdminOverviewData }>('/admin/overview');
    return res.data?.data ?? (res.data as unknown as AdminOverviewData);
  },

  async getAllUsers(): Promise<AdminUserItem[]> {
    const res = await apiClient.get<{ success?: boolean; data: AdminUserItem[] }>('/admin/users');
    return res.data?.data ?? (res.data as unknown as AdminUserItem[]);
  },

  async updateUserRole(userId: string, role: string): Promise<any> {
    const res = await apiClient.patch(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async updateUserStatus(userId: string, status: string): Promise<any> {
    const res = await apiClient.patch(`/admin/users/${userId}/status`, { status });
    return res.data;
  },

  async getAllDepartments(): Promise<AdminDepartmentItem[]> {
    const res = await apiClient.get<{ success?: boolean; data: AdminDepartmentItem[] }>('/admin/departments');
    return res.data?.data ?? (res.data as unknown as AdminDepartmentItem[]);
  },

  async createDepartment(payload: {
    name: string;
    code: string;
    description?: string;
    managerId?: string;
  }): Promise<any> {
    const res = await apiClient.post('/admin/departments', payload);
    return res.data;
  },

  async getAllProjects(): Promise<AdminProjectItem[]> {
    const res = await apiClient.get<{ success?: boolean; data: AdminProjectItem[] }>('/admin/projects');
    return res.data?.data ?? (res.data as unknown as AdminProjectItem[]);
  },

  async getAllDocuments(): Promise<AdminDocumentItem[]> {
    const res = await apiClient.get<{ success?: boolean; data: AdminDocumentItem[] }>('/admin/documents');
    return res.data?.data ?? (res.data as unknown as AdminDocumentItem[]);
  },

  async getAllMeetings(): Promise<AdminMeetingItem[]> {
    const res = await apiClient.get<{ success?: boolean; data: AdminMeetingItem[] }>('/admin/meetings');
    return res.data?.data ?? (res.data as unknown as AdminMeetingItem[]);
  },
};
