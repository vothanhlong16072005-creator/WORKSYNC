import { CalendarClock, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AttendancePlaceholder() {
  const { t } = useTranslation();

  return (
    <section className="p-5 bg-slate-50/70 border-2 border-dashed border-slate-300 relative overflow-hidden" aria-labelledby="attendance-placeholder-title">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-dashed border-slate-300">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-slate-500" />
          <h2 id="attendance-placeholder-title" className="text-sm font-black uppercase tracking-wider text-slate-500">
            {t('dashboard.attendance', 'Điểm danh & Chấm công (M2)')}
          </h2>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-200 text-slate-600 border border-slate-300">
          {t('dashboard.coming_soon', 'Sắp ra mắt')}
        </span>
      </div>

      <div className="py-4 text-center">
        <div className="inline-flex p-2 mb-2 bg-amber-50 border border-amber-300 text-amber-700">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-slate-600">
          {t('dashboard.attendance_desc', 'Module chấm công GPS/IP và phê duyệt WFH/nghỉ phép sẽ sẵn sàng ở mốc phát triển tiếp theo.')}
        </p>
      </div>
    </section>
  );
}
