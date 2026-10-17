/**
 * Users API client — M3.5
 * Lấy danh sách user có thể giao việc (theo role)
 */
import { apiClient } from '@/lib/api-client';

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  position: string | null;
  role: string;
  departmentId: string | null;
}

export const usersApi = {
  async getAssignable(): Promise<AssignableUser[]> {
    const res = await apiClient.get<AssignableUser[]>('/users/assignable');
    return res.data;
  },
};
