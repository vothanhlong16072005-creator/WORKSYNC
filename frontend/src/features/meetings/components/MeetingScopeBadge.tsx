import React from 'react';
import { Briefcase, Building2, MessageSquare } from 'lucide-react';
import type { MeetingScope } from '../types/meeting.types';

interface MeetingScopeBadgeProps {
  scope: MeetingScope;
  className?: string;
}

export const MeetingScopeBadge: React.FC<MeetingScopeBadgeProps> = ({ scope, className = '' }) => {
  switch (scope) {
    case 'PROJECT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-xs ${className}`}
        >
          <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Dự án</span>
        </span>
      );
    case 'DEPARTMENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-xs ${className}`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Phòng ban</span>
        </span>
      );
    case 'ONE_ON_ONE':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 shadow-xs ${className}`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>1-on-1</span>
        </span>
      );
  }
};
