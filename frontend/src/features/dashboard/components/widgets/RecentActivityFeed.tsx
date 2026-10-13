import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { RecentActivity } from '../../types/dashboard.types';

interface Props {
  activities: RecentActivity[];
}

export function RecentActivityFeed({ activities }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const list = activities.length > 0 ? activities : [
    { id: 'a1', title: 'Khắc phục lỗ hổng IDOR trên Task endpoint', status: 'IN_PROGRESS', priority: 'URGENT', projectName: 'PLATFORM v3.1', projectColor: '#2563EB', updatedAt: '4 mins ago' },
    { id: 'a2', title: 'Tối ưu hóa bảng Kanban Board kéo thả', status: 'IN_REVIEW', priority: 'HIGH', projectName: 'PLATFORM v3.1', projectColor: '#2563EB', updatedAt: '2 hours ago' },
    { id: 'a3', title: 'Hoàn thành tích hợp đa ngôn ngữ i18n', status: 'DONE', priority: 'HIGH', projectName: 'PLATFORM v3.1', projectColor: '#2563EB', updatedAt: 'Yesterday' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">
          {t('dashboard.recent_activity', 'Recent Activity')}
        </h3>

        <span className="text-[11px] font-bold text-slate-400">Live stream</span>
      </div>

      <div className="space-y-3 py-1">
        {list.slice(0, 3).map((item, idx) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate('/tasks')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/tasks')}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {/* Avatar badge */}
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {idx === 0 ? 'LV' : idx === 1 ? 'TB' : 'LM'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800 truncate">
                <span className="font-bold text-slate-900">{idx === 0 ? 'Long Võ' : idx === 1 ? 'Trần Văn Bảo' : 'Lê Thị Mai'}</span>{' '}
                updated <span className="text-blue-600 font-bold">{item.title}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                <span>{item.projectName}</span>
                <span>•</span>
                <span>{item.updatedAt.includes('T') ? 'Just now' : item.updatedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Team stream active</span>
        <span className="text-blue-600 font-bold hover:underline cursor-pointer">
          Audit log →
        </span>
      </div>
    </div>
  );
}
