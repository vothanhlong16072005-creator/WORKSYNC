import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cake, Award, Sparkles, Send, Check } from 'lucide-react';
import type { CultureEvent } from '../../types/dashboard.types';
import { chatApi } from '@/features/chat/api/chat.api';
import { toast } from 'sonner';

interface Props {
  events?: CultureEvent[];
}

export function CompanyCultureCard({ events = [] }: Props) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const navigate = useNavigate();

  const [celebrated, setCelebrated] = useState<Record<string, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const handleSendWish = async (event: CultureEvent) => {
    const isBirthday = event.type === 'BIRTHDAY';
    setLoadingMap((prev) => ({ ...prev, [event.id]: true }));

    try {
      await chatApi.sendCultureWish({
        recipientUserId: event.userId,
        type: isBirthday ? 'BIRTHDAY' : 'WORK_ANNIVERSARY',
      });

      setCelebrated((prev) => ({ ...prev, [event.id]: true }));
      toast.success(
        isVi
          ? `Đã gửi lời chúc mừng đến ${event.userName} qua tin nhắn riêng!`
          : `Sent congratulations direct message to ${event.userName}!`,
        {
          description: isVi
            ? `Sự kiện: ${event.title} • FPT Complex Đà Nẵng`
            : `Event: ${event.title} • FPT Complex Da Nang`,
          action: {
            label: isVi ? 'Mở tin nhắn' : 'Open Chat',
            onClick: () => navigate('/chat'),
          },
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isVi ? 'Không thể gửi tin nhắn chúc mừng' : 'Failed to send wish message');
      toast.error(msg);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [event.id]: false }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 transition-all hover:border-slate-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shadow-xs">
            <Cake className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
              {isVi ? 'Văn hóa FPT Complex' : 'FPT Complex Culture'}
            </span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {isVi ? 'Sinh nhật & Kỷ niệm làm việc trong tuần' : 'Birthdays & Work Anniversaries This Week'}
            </h2>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {events.length} {isVi ? 'sự kiện tuần này' : 'events this week'}
          </span>
        </span>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isVi ? 'Không có sự kiện kỷ niệm nào trong tuần này.' : 'No celebration events scheduled for this week.'}
          </div>
        ) : (
          events.map((evt) => {
            const isBirthday = evt.type === 'BIRTHDAY';
            const isSent = celebrated[evt.id];
            const isLoading = loadingMap[evt.id];

            return (
              <div
                key={evt.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isBirthday
                    ? 'border-amber-200/70 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-300'
                    : 'border-indigo-200/70 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        evt.userAvatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(evt.userName)}&background=0F172A&color=fff`
                      }
                      alt={evt.userName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white border border-white text-[10px] ${
                        isBirthday ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                    >
                      {isBirthday ? <Cake className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {evt.userName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          isBirthday
                            ? 'bg-amber-100 text-amber-800 border-amber-300/80'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-300/80'
                        }`}
                      >
                        {evt.title}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {evt.departmentName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] font-mono font-medium text-slate-500 text-right">
                    {evt.dateDesc}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSendWish(evt)}
                    disabled={isSent || isLoading}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                      isSent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : isBirthday
                        ? 'bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isVi ? 'Đã gửi thiệp' : 'Wish Sent'}</span>
                      </>
                    ) : isLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                        <span>{isVi ? 'Đang gửi...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Gửi lời chúc' : 'Send Wishes'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
