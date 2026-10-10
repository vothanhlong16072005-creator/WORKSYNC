import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { useProjectStore } from './project.store';
import type {
  BoardTask,
  MoveTaskInput,
  TaskScope,
  TaskStatus,
} from '@/lib/api-schemas';

export type { BoardTask, BoardTask as Task, TaskStatus };

interface TaskStoreState {
  tasks: BoardTask[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  currentScope: TaskScope | null;
  loadBoard: (scope: TaskScope) => Promise<void>;
  moveTask: (taskId: string, input: MoveTaskInput) => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    projectId: string;
    status?: TaskStatus;
    priority?: string;
    labels?: string[];
    dueDate?: string;
    storyPoints?: number;
    timeEstimate?: number;
    assigneeId?: string;
  }) => Promise<BoardTask>;
  retry: () => Promise<void>;
}

let activeRequestId = 0;

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  status: 'idle',
  error: null,
  currentScope: null,

  loadBoard: async (scope: TaskScope) => {
    const requestId = ++activeRequestId;
    set({ status: 'loading', currentScope: scope, error: null });

    try {
      const tasks = await api.fetchBoardTasks(scope);
      if (requestId === activeRequestId) {
        set({ tasks, status: 'ready', error: null });
      }
    } catch (err) {
      if (requestId === activeRequestId) {
        const message = err instanceof Error ? err.message : 'Failed to load tasks';
        set({ status: 'error', error: message });
      }
    }
  },

  moveTask: async (taskId: string, input: MoveTaskInput) => {
    const previousTasks = get().tasks;
    const movingTask = previousTasks.find((t) => t.id === taskId);
    if (!movingTask) return;

    // Optimistic reordering
    const updatedTask: BoardTask = { ...movingTask, status: input.status };
    const targetCol = previousTasks.filter((t) => t.id !== taskId && t.status === input.status);
    const insertIdx = Math.min(Math.max(0, input.destinationIndex), targetCol.length);
    targetCol.splice(insertIdx, 0, updatedTask);

    const otherTasks = previousTasks.filter((t) => t.id !== taskId && t.status !== input.status);
    set({ tasks: [...otherTasks, ...targetCol] });

    try {
      const savedTask = await api.moveTaskOnBoard(taskId, input);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? savedTask : t)),
      }));
      // Silently refresh sidebar badge counts
      useProjectStore.getState().refreshTaskCounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to move task';
      set({ tasks: previousTasks, error: message });
      throw err;
    }
  },

  createTask: async (data) => {
    const newTask = await api.createTask(data);
    set((state) => ({
      tasks: [...state.tasks, newTask],
    }));
    useProjectStore.getState().refreshTaskCounts();
    return newTask;
  },

  retry: async () => {
    const scope = get().currentScope;
    if (scope) {
      await get().loadBoard(scope);
    }
  },
}));
