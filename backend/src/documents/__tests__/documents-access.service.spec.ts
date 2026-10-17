import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentsAccessService, CurrentActor } from '../documents-access.service.js';
import { DocumentScope, DocumentType, Role } from '@prisma/client';

describe('DocumentsAccessService (RBAC)', () => {
  let accessService: DocumentsAccessService;
  let mockPrisma: any;

  const adminActor: CurrentActor = { id: 'admin-1', role: Role.ADMIN, departmentId: null };
  const pmActor: CurrentActor = { id: 'pm-1', role: Role.PM, departmentId: 'dept-eng' };
  const deptHeadActor: CurrentActor = { id: 'head-1', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-eng' };
  const employeeActor: CurrentActor = { id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' };
  const otherDeptEmp: CurrentActor = { id: 'emp-2', role: Role.EMPLOYEE, departmentId: 'dept-hr' };

  beforeEach(() => {
    mockPrisma = {
      task: { findUnique: vi.fn() },
      project: { findUnique: vi.fn() },
      documentPermission: { findUnique: vi.fn() },
      meetingAttendee: { findUnique: vi.fn() },
      meeting: { findUnique: vi.fn() },
    };
    accessService = new DocumentsAccessService(mockPrisma);
  });

  describe('canCreateDocument', () => {
    it('1. Admin can create document in any scope', async () => {
      const canCompany = await accessService.canCreateDocument(adminActor, DocumentScope.COMPANY, DocumentType.STANDARD);
      expect(canCompany).toBe(true);

      const canDept = await accessService.canCreateDocument(adminActor, DocumentScope.DEPARTMENT, DocumentType.STANDARD, null, 'dept-eng');
      expect(canDept).toBe(true);
    });

    it('2. Non-admin cannot create COMPANY documents (U5)', async () => {
      const pmCan = await accessService.canCreateDocument(pmActor, DocumentScope.COMPANY, DocumentType.STANDARD);
      expect(pmCan).toBe(false);

      const headCan = await accessService.canCreateDocument(deptHeadActor, DocumentScope.COMPANY, DocumentType.STANDARD);
      expect(headCan).toBe(false);

      const empCan = await accessService.canCreateDocument(employeeActor, DocumentScope.COMPANY, DocumentType.STANDARD);
      expect(empCan).toBe(false);
    });

    it('3. DEPARTMENT_HEAD can create DEPARTMENT documents for their own department', async () => {
      const canOwnDept = await accessService.canCreateDocument(deptHeadActor, DocumentScope.DEPARTMENT, DocumentType.STANDARD, null, 'dept-eng');
      expect(canOwnDept).toBe(true);

      const canOtherDept = await accessService.canCreateDocument(deptHeadActor, DocumentScope.DEPARTMENT, DocumentType.STANDARD, null, 'dept-hr');
      expect(canOtherDept).toBe(false);
    });

    it('4. Employee assignee can create TASK_SUBMISSION document (U2)', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        assigneeId: 'emp-1',
        deletedAt: null,
      });

      const canSubmit = await accessService.canCreateDocument(
        employeeActor,
        DocumentScope.PROJECT,
        DocumentType.TASK_SUBMISSION,
        'proj-1',
        null,
        'task-1',
      );
      expect(canSubmit).toBe(true);
    });

    it('5. Non-assignee employee cannot create TASK_SUBMISSION for another task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        assigneeId: 'emp-other',
        deletedAt: null,
      });

      const canSubmit = await accessService.canCreateDocument(
        employeeActor,
        DocumentScope.PROJECT,
        DocumentType.TASK_SUBMISSION,
        'proj-1',
        null,
        'task-1',
      );
      expect(canSubmit).toBe(false);
    });
  });

  describe('canViewDocument', () => {
    it('6. All users can view COMPANY documents (U5)', async () => {
      const companyDoc: any = {
        id: 'doc-company',
        scope: DocumentScope.COMPANY,
        ownerId: 'admin-1',
        deletedAt: null,
      };

      const empCanView = await accessService.canViewDocument(companyDoc, employeeActor);
      expect(empCanView).toBe(true);
    });

    it('7. Owner can always view their personal document', async () => {
      const personalDoc: any = {
        id: 'doc-personal',
        scope: DocumentScope.PERSONAL,
        ownerId: 'emp-1',
        createdById: 'emp-1',
        deletedAt: null,
      };

      const ownerCan = await accessService.canViewDocument(personalDoc, employeeActor);
      expect(ownerCan).toBe(true);

      const otherCan = await accessService.canViewDocument(personalDoc, otherDeptEmp);
      expect(otherCan).toBe(false);
    });

    it('8. User with direct permission can view personal document', async () => {
      const personalDoc: any = {
        id: 'doc-personal-shared',
        scope: DocumentScope.PERSONAL,
        ownerId: 'emp-1',
        createdById: 'emp-1',
        deletedAt: null,
      };

      mockPrisma.documentPermission.findUnique.mockResolvedValue({
        documentId: 'doc-personal-shared',
        userId: 'emp-2',
        canEdit: false,
      });

      const sharedUserCan = await accessService.canViewDocument(personalDoc, otherDeptEmp);
      expect(sharedUserCan).toBe(true);
    });

    it('9. Project member can view PROJECT documents (U3)', async () => {
      const projectDoc: any = {
        id: 'doc-proj',
        scope: DocumentScope.PROJECT,
        projectId: 'proj-1',
        ownerId: 'pm-1',
        deletedAt: null,
      };

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        pmId: 'pm-1',
        departmentId: 'dept-eng',
        members: [{ userId: 'emp-1' }],
      });

      const memberCan = await accessService.canViewDocument(projectDoc, employeeActor);
      expect(memberCan).toBe(true);
    });
  });

  describe('canEditDocument', () => {
    it('10. Only Admin can edit COMPANY documents (U5)', async () => {
      const companyDoc: any = {
        id: 'doc-company',
        scope: DocumentScope.COMPANY,
        ownerId: 'admin-1',
        deletedAt: null,
      };

      expect(await accessService.canEditDocument(companyDoc, adminActor)).toBe(true);
      expect(await accessService.canEditDocument(companyDoc, deptHeadActor)).toBe(false);
      expect(await accessService.canEditDocument(companyDoc, employeeActor)).toBe(false);
    });

    it('11. Owner can always edit their own document', async () => {
      const myDoc: any = {
        id: 'doc-my',
        scope: DocumentScope.PERSONAL,
        ownerId: 'emp-1',
        deletedAt: null,
      };

      expect(await accessService.canEditDocument(myDoc, employeeActor)).toBe(true);
      expect(await accessService.canEditDocument(myDoc, otherDeptEmp)).toBe(false);
    });
  });
});
