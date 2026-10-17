import React from 'react';
import { Calendar, CheckCircle2, Flame } from 'lucide-react';
import type { SprintStatus } from '../types/sprint.types';

interface SprintStatusBadgeProps {
  status: SprintStatus;
  size?: 'sm' | 'md';
}

export const SprintStatusBadge: React.FC<SprintStatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSmall = size === 'sm';

  switch (status) {
    case 'ACTIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs ${
            isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Flame className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ĐANG CHẠY (ACTIVE)
        </span>
      );

    case 'PLANNING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${
            isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          }`}
        >
          <Calendar className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          LẬP KẾ HOẠCH (PLANNING)
        </span>
      );

    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${
            isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          }`}
        >
          <CheckCircle2 className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ĐÃ HOÀN THÀNH
        </span>
      );

    default:
      return null;
  }
};
