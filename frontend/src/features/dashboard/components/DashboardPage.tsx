import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboard.store';
import { useAuthStore } from '@/stores/auth.store';
import { EmployeeDashboardLayout } from './layouts/EmployeeDashboardLayout';
import { PmDashboardLayout } from './layouts/PmDashboardLayout';
import { HrDashboardLayout } from './layouts/HrDashboardLayout';
import { AdminDashboardLayout } from './layouts/AdminDashboardLayout';
import type {
  EmployeeDashboardData,
  PmDashboardData,
  HrDashboardData,
  AdminDashboardData,
} from '../types/dashboard.types';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { state, fetchDashboard, reset } = useDashboardStore();

  useEffect(() => {
    fetchDashboard('me');
    return () => reset();
  }, [fetchDashboard, reset]);

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-bold text-slate-500">
          {t('dashboard.loading', 'Loading enterprise dashboard...')}
        </p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50/80 rounded-2xl border border-red-200 shadow-sm my-8">
        <h2 className="text-sm font-bold text-red-800 mb-1">
          {t('dashboard.error_title', 'Lỗi tải dữ liệu')}
        </h2>
        <p className="text-xs text-red-600 mb-4">{state.error}</p>
        <button
          type="button"
          onClick={() => fetchDashboard('me')}
          className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-red-700 transition-colors"
        >
          {t('dashboard.retry', 'Thử lại')}
        </button>
      </div>
    );
  }

  if (state.status !== 'success') {
    return null;
  }

  const { data } = state;
  const userName = user?.name ?? 'Long Võ';
  const role = user?.role;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1520px] mx-auto">
      {role === 'PM' && (
        <PmDashboardLayout data={data as PmDashboardData} userName={userName} />
      )}
      {role === 'HR' && (
        <HrDashboardLayout data={data as HrDashboardData} userName={userName} />
      )}
      {role === 'ADMIN' && (
        <AdminDashboardLayout data={data as AdminDashboardData} userName={userName} />
      )}
      {(!role || role === 'EMPLOYEE') && (
        <EmployeeDashboardLayout data={data as EmployeeDashboardData} userName={userName} />
      )}
    </div>
  );
}
