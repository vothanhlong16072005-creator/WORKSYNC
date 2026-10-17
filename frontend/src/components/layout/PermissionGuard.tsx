import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/auth.store';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type { UserRole };

interface PermissionGuardProps {
  allowedRoles: UserRole[];
  /**
   * If true and user lacks permission, redirect to `redirectTo` instead of
   * rendering the fallback UI. Default: `true` — better UX for route guards.
   */
  redirectOnDeny?: boolean;
  /** Route to redirect when access is denied. Default: `/dashboard`. */
  redirectTo?: string;
  /** Custom UI to render when access is denied and `redirectOnDeny` is false. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGuard — RBAC wrapper for routes & components.
 *
 * Usage:
 *   <PermissionGuard allowedRoles={['PM', 'HR', 'ADMIN']}>
 *     <TeamView />
 *   </PermissionGuard>
 *
 * With redirect (for route-level guards):
 *   <PermissionGuard allowedRoles={['ADMIN']} redirectTo="/dashboard">
 *     <SettingsView />
 *   </PermissionGuard>
 *
 * With inline fallback (for embedded widgets):
 *   <PermissionGuard
 *     allowedRoles={['HR']}
 *     redirectOnDeny={false}
 *     fallback={<EmptyState />}
 *   >
 *     <SensitiveStats />
 *   </PermissionGuard>
 */
export function PermissionGuard({
  allowedRoles,
  redirectOnDeny = true,
  redirectTo = '/dashboard',
  fallback,
  children,
}: PermissionGuardProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // Unauthenticated → always redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user.role as UserRole;
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    if (redirectOnDeny) {
      return <Navigate to={redirectTo} state={{ from: location, denied: true }} replace />;
    }

    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-md mx-auto my-12 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          {isVi ? 'Không có quyền truy cập' : 'Access Restricted'}
        </h3>
        <p className="text-xs text-slate-500">
          {isVi
            ? `Tính năng này yêu cầu một trong các quyền: [${allowedRoles.join(', ')}]. Vai trò hiện tại của bạn là ${userRole || 'Khách'}.`
            : `This section requires one of roles: [${allowedRoles.join(', ')}]. Your current role is ${userRole || 'Guest'}.`}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
