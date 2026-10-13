import { Video, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { UpcomingMeeting } from '../../types/dashboard.types';

interface Props {
  meetings?: UpcomingMeeting[];
}

export function UpcomingMeetingsCard({ meetings }: Props) {
  const { t } = useTranslation();
  const currentMeet = meetings?.[0] ?? {
    id: 'm1',
    title: 'Daily Standup at 09:00 AM',
    time: '09:00 AM',
    status: 'SCHEDULED',
  };

  const handleJoin = () => {
    toast.success(t('dashboard.joining_call', 'Đang kết nối phòng họp WebRTC...'));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {t('dashboard.upcoming_meetings', 'Upcoming Meetings')}
          </h3>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Daily Standup
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 py-1">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            {currentMeet.title}
          </h4>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            Google Meet / WebRTC • Room #104
          </p>
        </div>

        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
          <Video className="w-5 h-5" />
        </div>
      </div>

      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-bold text-red-600 animate-pulse">
          ● Starts in 15 mins
        </span>

        <button
          type="button"
          onClick={handleJoin}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 active:scale-95 transition-all shadow-sm"
        >
          <Video className="w-3.5 h-3.5" />
          <span>{t('dashboard.join_call', 'Join Call')}</span>
        </button>
      </div>
    </div>
  );
}
