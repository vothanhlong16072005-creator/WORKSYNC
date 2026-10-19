import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerGradient?: 'blue' | 'orange' | 'teal' | 'indigo' | 'rose' | 'amber';
  preventBackdropClose?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-7xl',
};

const gradientMap = {
  blue: 'from-blue-600 via-indigo-600 to-blue-700',
  orange: 'from-orange-500 via-amber-500 to-orange-600',
  teal: 'from-teal-600 via-emerald-600 to-teal-700',
  indigo: 'from-indigo-600 via-purple-600 to-indigo-700',
  rose: 'from-rose-600 via-pink-600 to-rose-700',
  amber: 'from-amber-500 via-orange-500 to-amber-600',
};

export function ModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
  headerGradient = 'blue',
  preventBackdropClose = false,
}: ModalShellProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!preventBackdropClose) onClose();
        }}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col z-10`}
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r ${gradientMap[headerGradient]} px-6 py-4.5 text-white shadow-xs shrink-0`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate">{title}</h2>
              {subtitle && (
                <p className="text-xs text-white/85 font-medium mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-slate-800">{children}</div>

        {/* Footer (optional) */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
