import { apiClient } from '@/lib/api-client';
import type {
  DeptHeadProjectDetail,
  DeptHeadSprintDetail,
  DeptHeadMemberProfile,
  SwapPmRequest,
} from '../types/dashboard.types';

export const deptHeadApi = {
  async getProjectDetail(projectId: string): Promise<DeptHeadProjectDetail> {
    const res = await apiClient.get<{ success: boolean; data: DeptHeadProjectDetail }>(
      `/dashboard/dept-head/project/${projectId}`,
    );
    return res.data.data;
  },

  async getSprintDetail(sprintId: string): Promise<DeptHeadSprintDetail> {
    const res = await apiClient.get<{ success: boolean; data: DeptHeadSprintDetail }>(
      `/dashboard/dept-head/sprint/${sprintId}`,
    );
    return res.data.data;
  },

  async getMemberProfile(memberId: string): Promise<DeptHeadMemberProfile> {
    const res = await apiClient.get<{ success: boolean; data: DeptHeadMemberProfile }>(
      `/dashboard/dept-head/member/${memberId}`,
    );
    return res.data.data;
  },

  async swapPm(projectId: string, payload: SwapPmRequest): Promise<{ id: string; pmId: string }> {
    const res = await apiClient.patch<{ id: string; pmId: string }>(
      `/projects/${projectId}/swap-pm`,
      payload,
    );
    return res.data;
  },

  async getQuickTaskDetail(taskId: string): Promise<any> {
    const res = await apiClient.get(`/quick-tasks/${taskId}`);
    return res.data;
  },
};
