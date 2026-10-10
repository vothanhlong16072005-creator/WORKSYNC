import { describe, expect, it, vi } from 'vitest';
import { ProjectsService } from './projects.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('ProjectsService.findMine', () => {
  it('returns accessible projects with the signed-in user’s open task count', async () => {
    const prisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'team-1',
            name: 'Team delivery',
            kind: 'TEAM',
            color: '#4D7FC2',
            _count: { tasks: 3 },
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new ProjectsService(prisma);

    await expect(service.findMine({ id: 'member-1', role: 'EMPLOYEE' })).resolves.toEqual([
      {
        id: 'team-1',
        name: 'Team delivery',
        kind: 'TEAM',
        color: '#4D7FC2',
        openAssignedTaskCount: 3,
      },
    ]);
  });
});
