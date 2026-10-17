import React from 'react';
import { Trophy, Kanban, Calendar, CheckSquare } from 'lucide-react';
import type { ProjectWorkflowType } from '../types/project.types';

interface WorkflowTypeBadgeProps {
  type: ProjectWorkflowType;
  size?: 'sm' | 'md';
}

export const WorkflowTypeBadge: React.FC<WorkflowTypeBadgeProps> = ({ type, size = 'md' }) => {
  const isSmall = size === 'sm';

  switch (type) {
    case 'SCRUM':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 ${
            isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          }`}
        >
          <Trophy className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          SCRUM / SPRINT
        </span>
      );

    case 'KANBAN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${
            isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          }`}
        >
          <Kanban className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          KANBAN BOARD
        </span>
      );

    case 'DAILY':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 ${
            isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          }`}
        >
          <Calendar className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          DAILY FLOW
        </span>
      );

    case 'SIMPLE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 ${
            isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          }`}
        >
          <CheckSquare className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          SIMPLE LIST
        </span>
      );

    default:
      return null;
  }
};
