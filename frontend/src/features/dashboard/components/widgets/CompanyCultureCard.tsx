import { useState } from 'react';
import { Cake, Award, Sparkles, Send, Check } from 'lucide-react';
import type { CultureEvent } from '../../types/dashboard.types';
import { toast } from 'sonner';

interface Props {
  events?: CultureEvent[];
}

export function CompanyCultureCard({ events = [] }: Props) {
  const [celebrated, setCelebrated] = useState<Record<string, boolean>>({});

  const handleSendWish = (event: CultureEvent) => {
    setCelebrated((prev) => ({ ...prev, [event.id]: true }));
    toast.success(`Đã gửi thiệp & lời chúc mừng đến ${event.userName}! 🎁🎉`, {
      description: `Sự kiện: ${event.title} - FPT Complex Đà Nẵng`,
    });
  };

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-rose-500 text-white border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Cake className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
              Văn hóa FPT Complex
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">
              Sinh nhật & Kỷ niệm làm việc trong tuần
            </h2>
          </div>
        </div>

        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{events.length} sự kiện tuần này</span>
        </span>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.map((evt) => {
          const isBirthday = evt.type === 'BIRTHDAY';
          const isSent = celebrated[evt.id];

          return (
            <div
              key={evt.id}
              className={`p-3.5 border-2 border-slate-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isBirthday ? 'bg-amber-50/70 hover:bg-amber-50' : 'bg-indigo-50/70 hover:bg-indigo-50'
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
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-900"
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border border-slate-900 ${
                      isBirthday ? 'bg-amber-400 text-slate-950' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {isBirthday ? <Cake className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{evt.userName}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase border border-slate-900 ${
                        isBirthday ? 'bg-amber-300 text-amber-950' : 'bg-indigo-200 text-indigo-950'
                      }`}
                    >
                      {evt.badgeText}
                    </span>
                  </div>

                  <div className="text-xs font-medium text-slate-700 mt-0.5 truncate">
                    {evt.title}
                  </div>

                  <div className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{evt.departmentName}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-700 font-bold">{evt.dateDesc}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleSendWish(evt)}
                  disabled={isSent}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-slate-900 transition-all ${
                    isSent
                      ? 'bg-emerald-500 text-white cursor-default'
                      : isBirthday
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5'
                  }`}
                >
                  {isSent ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Đã gửi thiệp</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi lời chúc mừng</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
