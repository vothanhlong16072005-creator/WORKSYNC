import axios from 'axios';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth.store';
import {
  BoardTaskSchema,
  ProjectSummarySchema,
  type BoardTask,
  type MoveTaskInput,
  type ProjectSummary,
  type TaskScope,
} from './api-schemas';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  async fetchMyProjects(): Promise<ProjectSummary[]> {
    const res = await apiClient.get('/projects/mine');
    return z.array(ProjectSummarySchema).parse(res.data);
  },

  async fetchBoardTasks(scopeConfig: TaskScope): Promise<BoardTask[]> {
    const params: Record<string, string> = { scope: scopeConfig.scope };
    if (scopeConfig.projectId) {
      params.projectId = scopeConfig.projectId;
    }
    const res = await apiClient.get('/tasks', { params });
    return z.array(BoardTaskSchema).parse(res.data);
  },

  async moveTaskOnBoard(taskId: string, input: MoveTaskInput): Promise<BoardTask> {
    const res = await apiClient.patch(`/tasks/${taskId}/board-position`, input);
    return BoardTaskSchema.parse(res.data);
  },

  async createTask(data: {
    title: string;
    description?: string;
    projectId: string;
    status?: string;
    priority?: string;
    labels?: string[];
  }): Promise<BoardTask> {
    const res = await apiClient.post('/tasks', data);
    return BoardTaskSchema.parse(res.data);
  },
};
