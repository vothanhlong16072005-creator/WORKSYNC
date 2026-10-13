import { useTranslation } from 'react-i18next';
import { Calendar, Info } from 'lucide-react';
import type { LeaveBalance } from '../types/attendance.types';

interface LeaveBalanceCardProps {
  balance: LeaveBalance | null;
  onOpenLeaveModal: () => void;
}

export function LeaveBalanceCard({ balance, onOpenLeaveModal }: LeaveBalanceCardProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const total = balance?.total ?? 12;
  const used = balance?.used ?? 0;
  const remaining = balance?.remaining ?? 12;
  const usedPercent = Math.min(100, Math.round((used / total) * 100));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-200 relative overflow-hidden">
      {/* Accent left stripe (4px Bauhaus ochre accent) */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {isVi ? 'Quỹ phép năm' : 'Annual Leave Balance'}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {isVi ? 'Năm hiện tại' : 'Current Year'} • {new Date().getFullYear()}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenLeaveModal}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
        >
          {isVi ? '+ Tạo đơn' : '+ New Request'}
        </button>
      </div>

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-3 gap-3 my-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            {isVi ? 'Tổng' : 'Total'}
          </span>
          <span className="text-2xl font-black text-slate-900 block mt-0.5">{total}</span>
          <span className="text-[10px] text-slate-400 font-medium">{isVi ? 'ngày/năm' : 'days/yr'}</span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
            {isVi ? 'Đã nghỉ' : 'Used'}
          </span>
          <span className="text-2xl font-black text-amber-600 block mt-0.5">{used}</span>
          <span className="text-[10px] text-amber-600/80 font-medium">{isVi ? 'ngày' : 'days'}</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
            {isVi ? 'Còn lại' : 'Remaining'}
          </span>
          <span className="text-2xl font-black text-emerald-600 block mt-0.5">{remaining}</span>
          <span className="text-[10px] text-emerald-600/80 font-medium">{isVi ? 'ngày khả dụng' : 'days left'}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span>{isVi ? 'Đã sử dụng' : 'Usage'}: {usedPercent}%</span>
          <span>{remaining} {isVi ? 'ngày trống' : 'days free'}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span>{isVi ? 'Phép năm tính theo tiêu chuẩn 12 ngày/năm theo luật lao động.' : 'Standard 12 annual leave days per calendar year.'}</span>
      </div>
    </div>
  );
}
