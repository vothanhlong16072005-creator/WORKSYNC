import { MeetingScope, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingsAccessService } from '../meetings-access.service.js';

describe('MeetingsAccessService', () => {
  let service: MeetingsAccessService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      project: {
        findUnique: vi.fn(),
      },
      meeting: {
        findUnique: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new MeetingsAccessService(prismaMock);
  });

  describe('canCreateMeeting', () => {
    it('1. PM can create PROJECT meeting if they are the PM of that project', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p-1',
        pmId: 'user-pm-1',
        departmentId: 'dept-1',
      });

      const canCreate = await service.canCreateMeeting(
        { id: 'user-pm-1', role: Role.PM, departmentId: 'dept-1' },
        MeetingScope.PROJECT,
        'p-1',
      );

      expect(canCreate).toBe(true);
    });

    it('2. EMPLOYEE cannot create PROJECT meeting', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p-1',
        pmId: 'user-pm-1',
        departmentId: 'dept-1',
      });

      const canCreate = await service.canCreateMeeting(
        { id: 'user-emp-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
        MeetingScope.PROJECT,
        'p-1',
      );

      expect(canCreate).toBe(false);
    });

    it('3. DEPT_HEAD can create DEPARTMENT meeting for their own department', async () => {
      const canCreate = await service.canCreateMeeting(
        { id: 'user-head-1', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-1' },
        MeetingScope.DEPARTMENT,
        undefined,
        'dept-1',
      );

      expect(canCreate).toBe(true);
    });

    it('4. PM cannot create DEPARTMENT meeting', async () => {
      const canCreate = await service.canCreateMeeting(
        { id: 'user-pm-1', role: Role.PM, departmentId: 'dept-1' },
        MeetingScope.DEPARTMENT,
        undefined,
        'dept-1',
      );

      expect(canCreate).toBe(false);
    });
  });

  describe('canViewMeeting', () => {
    it('5. Project member can view PROJECT meeting', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-1',
        scopeType: MeetingScope.PROJECT,
        createdById: 'pm-1',
        deletedAt: null,
        attendees: [],
        project: {
          id: 'proj-1',
          pmId: 'pm-1',
          departmentId: 'dept-1',
          members: [{ userId: 'emp-1' }],
        },
      });

      const canView = await service.canViewMeeting('meet-1', {
        id: 'emp-1',
        role: Role.EMPLOYEE,
        departmentId: 'dept-1',
      });

      expect(canView).toBe(true);
    });

    it('6. Employee in same department but not in project cannot view PROJECT meeting', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-1',
        scopeType: MeetingScope.PROJECT,
        createdById: 'pm-1',
        deletedAt: null,
        attendees: [],
        project: {
          id: 'proj-1',
          pmId: 'pm-1',
          departmentId: 'dept-1',
          members: [{ userId: 'other-emp' }],
        },
      });

      const canView = await service.canViewMeeting('meet-1', {
        id: 'uninvited-emp',
        role: Role.EMPLOYEE,
        departmentId: 'dept-1',
      });

      expect(canView).toBe(false);
    });

    it('7. DEPT_HEAD of another department cannot view PROJECT or DEPARTMENT meeting', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-dept',
        scopeType: MeetingScope.DEPARTMENT,
        departmentId: 'dept-A',
        createdById: 'head-A',
        deletedAt: null,
        attendees: [],
      });

      const canView = await service.canViewMeeting('meet-dept', {
        id: 'head-B',
        role: Role.DEPARTMENT_HEAD,
        departmentId: 'dept-B',
      });

      expect(canView).toBe(false);
    });

    it('8. ADMIN can view any meeting', async () => {
      const canView = await service.canViewMeeting('any-meeting', {
        id: 'admin-1',
        role: Role.ADMIN,
        departmentId: null,
      });

      expect(canView).toBe(true);
    });
  });
});
