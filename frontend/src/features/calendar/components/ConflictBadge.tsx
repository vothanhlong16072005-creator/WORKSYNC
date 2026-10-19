import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Conflict } from '../types/calendar.types';

interface ConflictBadgeProps {
  conflicts: Conflict[];
  compact?: boolean;
}

export const ConflictBadge: React.FC<ConflictBadgeProps> = ({ conflicts, compact = false }) => {
  if (!conflicts || conflicts.length === 0) return null;

  const tooltipText = conflicts.map((c) => c.message).join('\n• ');

  if (compact) {
    return (
      <span
        title={`Xung đột:\n• ${tooltipText}`}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-rose-500 text-white shadow-2xs animate-pulse cursor-pointer shrink-0"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      </span>
    );
  }

  return (
    <div
      title={`Xung đột:\n• ${tooltipText}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold shadow-2xs shrink-0 cursor-help"
    >
      <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
      <span>{conflicts.length}</span>
    </div>
  );
};
