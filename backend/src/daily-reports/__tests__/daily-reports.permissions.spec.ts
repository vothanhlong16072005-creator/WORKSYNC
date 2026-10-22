import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import {
  canViewReportsOf,
  canSubmitOnBehalf,
  canEditReport,
} from '../daily-reports.permissions.js';

describe('DailyReports Permissions', () => {
  const adminActor = { id: 'u-admin', role: Role.ADMIN, departmentId: 'dept-1' };
  const hrActor = { id: 'u-hr', role: Role.HR, departmentId: 'dept-1' };
  const deptHeadActor = { id: 'u-dh', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-1' };
  const pmActor = { id: 'u-pm', role: Role.PM, departmentId: 'dept-1' };
  const employeeActor = { id: 'u-emp', role: Role.EMPLOYEE, departmentId: 'dept-1' };

  describe('canViewReportsOf', () => {
    it('1. User can always view their own report', () => {
      expect(
        canViewReportsOf(employeeActor, 'u-emp', { sameDepartment: false, isProjectMember: false }),
      ).toBe(true);
    });

    it('2. ADMIN and HR can view anyone report', () => {
      expect(
        canViewReportsOf(adminActor, 'u-target', { sameDepartment: false, isProjectMember: false }),
      ).toBe(true);
      expect(
        canViewReportsOf(hrActor, 'u-target', { sameDepartment: false, isProjectMember: false }),
      ).toBe(true);
    });

    it('3. DEPARTMENT_HEAD can view report if in same department', () => {
      expect(
        canViewReportsOf(deptHeadActor, 'u-target', { sameDepartment: true, isProjectMember: false }),
      ).toBe(true);
      expect(
        canViewReportsOf(deptHeadActor, 'u-target', { sameDepartment: false, isProjectMember: false }),
      ).toBe(false);
    });

    it('4. PM can view report if user is in their project', () => {
      expect(
        canViewReportsOf(pmActor, 'u-target', { sameDepartment: false, isProjectMember: true }),
      ).toBe(true);
      expect(
        canViewReportsOf(pmActor, 'u-target', { sameDepartment: false, isProjectMember: false }),
      ).toBe(false);
    });

    it('5. Regular EMPLOYEE cannot view others report', () => {
      expect(
        canViewReportsOf(employeeActor, 'u-other', { sameDepartment: true, isProjectMember: true }),
      ).toBe(false);
    });
  });

  describe('canSubmitOnBehalf', () => {
    it('1. ADMIN can submit on behalf of any user', () => {
      expect(
        canSubmitOnBehalf(adminActor, { sameDepartment: false, isProjectMember: false }),
      ).toBe(true);
    });

    it('2. DEPARTMENT_HEAD can submit on behalf of dept member', () => {
      expect(
        canSubmitOnBehalf(deptHeadActor, { sameDepartment: true, isProjectMember: false }),
      ).toBe(true);
      expect(
        canSubmitOnBehalf(deptHeadActor, { sameDepartment: false, isProjectMember: false }),
      ).toBe(false);
    });

    it('3. PM can submit on behalf of project member', () => {
      expect(
        canSubmitOnBehalf(pmActor, { sameDepartment: false, isProjectMember: true }),
      ).toBe(true);
      expect(
        canSubmitOnBehalf(pmActor, { sameDepartment: false, isProjectMember: false }),
      ).toBe(false);
    });

    it('4. EMPLOYEE cannot submit on behalf of others', () => {
      expect(
        canSubmitOnBehalf(employeeActor, { sameDepartment: true, isProjectMember: true }),
      ).toBe(false);
    });
  });

  describe('canEditReport', () => {
    it('1. Cannot edit if report is locked after midnight', () => {
      expect(canEditReport(employeeActor, { userId: 'u-emp', isLocked: true })).toBe(false);
      expect(canEditReport(adminActor, { userId: 'u-emp', isLocked: true })).toBe(false);
    });

    it('2. Author can edit unlocked report', () => {
      expect(canEditReport(employeeActor, { userId: 'u-emp', isLocked: false })).toBe(true);
    });

    it('3. ADMIN can edit unlocked report of other user', () => {
      expect(canEditReport(adminActor, { userId: 'u-other', isLocked: false })).toBe(true);
    });

    it('4. Other users cannot edit unlocked report', () => {
      expect(canEditReport(employeeActor, { userId: 'u-other', isLocked: false })).toBe(false);
    });
  });
});
