import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TeamMemberWorkload } from '../../types/dashboard.types';

interface Props {
  workload: TeamMemberWorkload[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? 'U').toUpperCase();
}

export function TeamWorkloadWidget({ workload }: Props) {
  const { t } = useTranslation();
  const maxOpen = Math.max(...workload.map((w) => w.openTaskCount), 1);

  return (
    <section className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]" aria-labelledby="team-workload-title">
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1 text-white bg-slate-900 border border-slate-900">
            <Users className="w-4 h-4" />
          </span>
          <h2 id="team-workload-title" className="text-sm font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.team_workload', 'Phân bổ công việc thành viên')}
          </h2>
        </div>
        <span className="px-2 py-0.5 text-xs font-black bg-slate-900 text-white">
          {workload.length} {t('dashboard.members', 'thành viên')}
        </span>
      </div>

      {workload.length === 0 ? (
        <p className="py-6 text-center text-slate-400 font-medium italic">
          {t('dashboard.no_workload_data', 'Chưa có dữ liệu phân bổ công việc.')}
        </p>
      ) : (
        <div className="space-y-3">
          {workload
            .slice()
            .sort((a, b) => b.openTaskCount - a.openTaskCount)
            .map((member) => {
              const percent = Math.round((member.openTaskCount / maxOpen) * 100);
              const isHeavy = member.openTaskCount >= 6;

              return (
                <div key={member.userId} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-none border-2 border-slate-900 bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.userName} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(member.userName)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-bold text-slate-900 truncate">{member.userName}</span>
                      <div className="flex items-center gap-2">
                        {member.totalStoryPoints != null && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 font-mono text-[10px] font-black border border-amber-300">
                            {member.totalStoryPoints} SP
                          </span>
                        )}
                        <span className={`font-mono font-black ${isHeavy ? 'text-red-600' : 'text-slate-700'}`}>
                          {member.openTaskCount} {t('dashboard.tasks_open', 'việc mở')}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-white border border-slate-400 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isHeavy ? 'bg-red-500' : percent > 50 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
