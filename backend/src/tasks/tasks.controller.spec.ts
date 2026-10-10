import { describe, expect, it, vi } from 'vitest';
import { TasksController } from './tasks.controller.js';
import { TaskScope } from './dto/task-query.dto.js';
import { Role, TaskStatus } from '@prisma/client';
import type { TasksService } from './tasks.service.js';

describe('TasksController', () => {
  it('delegates findAll to tasksService with query and actor', async () => {
    const mockTasks = [{ id: 'task-1', title: 'Test Task' }];
    const tasksService = {
      findAll: vi.fn().mockResolvedValue(mockTasks),
    } as unknown as TasksService;

    const controller = new TasksController(tasksService);
    const actor = { id: 'user-1', role: Role.EMPLOYEE };

    const result = await controller.findAll({ scope: TaskScope.MINE }, actor);
    expect(result).toEqual(mockTasks);
    expect(tasksService.findAll).toHaveBeenCalledWith({ scope: TaskScope.MINE }, actor);
  });

  it('delegates moveOnBoard to tasksService with id, actor, and body', async () => {
    const movedTask = { id: 'task-1', status: TaskStatus.DONE, position: 1024 };
    const tasksService = {
      moveOnBoard: vi.fn().mockResolvedValue(movedTask),
    } as unknown as TasksService;

    const controller = new TasksController(tasksService);
    const actor = { id: 'user-1', role: Role.EMPLOYEE };
    const dto = { status: TaskStatus.DONE, destinationIndex: 1 };

    const result = await controller.moveOnBoard('task-1', actor, dto);
    expect(result).toEqual(movedTask);
    expect(tasksService.moveOnBoard).toHaveBeenCalledWith('task-1', actor, dto);
  });
});
