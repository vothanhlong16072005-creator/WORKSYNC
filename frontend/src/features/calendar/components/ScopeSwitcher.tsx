import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Lock, User, Building2, Globe } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useCalendarStore } from '../stores/calendar.store';
import type { CalendarScope } from '../types/calendar.types';

export const ScopeSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { scope, setScope } = useCalendarStore();

  const isAdmin = user?.role === 'ADMIN';

  const scopes: { key: CalendarScope; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { key: 'mine', label: t('calendar.scope.mine', 'Của tôi'), icon: User },
    { key: 'department', label: t('calendar.scope.department', 'Phòng ban'), icon: Building2 },
    { key: 'company', label: t('calendar.scope.company', 'Toàn công ty'), icon: Globe, adminOnly: true },
  ];

  const handleSelect = (s: typeof scopes[0]) => {
    if (s.adminOnly && !isAdmin) {
      toast.warning(t('calendar.permission.companyScopeAdminOnly', 'Chỉ Quản trị viên mới có quyền xem toàn công ty.'));
      return;
    }
    setScope(s.key);
  };

  return (
    <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs">
      {scopes.map((s) => {
        const isActive = scope === s.key;
        const Icon = s.icon;
        const isLocked = s.adminOnly && !isAdmin;

        return (
          <button
            key={s.key}
            type="button"
            onClick={() => handleSelect(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
              isActive
                ? 'bg-white text-blue-600 font-semibold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/50'
            } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={isLocked ? t('calendar.permission.companyScopeAdminOnly', 'Chỉ Quản trị viên mới có quyền') : s.label}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>{s.label}</span>
            {isLocked && <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
};
