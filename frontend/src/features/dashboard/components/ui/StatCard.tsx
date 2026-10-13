import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  variant?: 'default' | 'progress' | 'blocked' | 'done';
  subtitle?: string;
}

const VARIANT_STYLES = {
  default: {
    border: 'border-slate-900',
    bg: 'bg-white',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    iconColor: 'text-slate-900',
    shadow: 'shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]',
  },
  progress: {
    border: 'border-amber-500',
    bg: 'bg-amber-50/40',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    iconColor: 'text-amber-600',
    shadow: 'shadow-[3px_3px_0px_0px_rgba(245,158,11,1)]',
  },
  blocked: {
    border: 'border-red-600',
    bg: 'bg-red-50/40',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-900',
    iconColor: 'text-red-600',
    shadow: 'shadow-[3px_3px_0px_0px_rgba(220,38,38,1)]',
  },
  done: {
    border: 'border-emerald-600',
    bg: 'bg-emerald-50/40',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    iconColor: 'text-emerald-600',
    shadow: 'shadow-[3px_3px_0px_0px_rgba(5,150,105,1)]',
  },
};

export function StatCard({ label, value, icon, variant = 'default', subtitle }: StatCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`relative p-5 border-2 ${styles.border} ${styles.bg} ${styles.shadow} transition-transform hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 border border-slate-900/10 ${styles.badgeBg} ${styles.badgeText}`}>
          {label}
        </span>
        <span className={`p-1.5 border border-slate-900/10 bg-white ${styles.iconColor}`}>
          {icon}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-slate-900 tracking-tight leading-none">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs font-bold text-slate-500">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
