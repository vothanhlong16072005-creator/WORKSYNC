import { FolderGit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProjectProgress } from '../../types/dashboard.types';

interface Props {
  projects: ProjectProgress[];
}

export function ProjectPortfolioCard({ projects }: Props) {
  const { t } = useTranslation();

  const displayList = projects.length > 0 ? projects : [
    { projectId: 'p1', projectName: 'PLATFORM v3.1', projectColor: '#2563EB', totalTasks: 10, doneTasks: 6, progressPercent: 60, sprints: [] },
    { projectId: 'p2', projectName: 'WorkSync Mobile App', projectColor: '#F59E0B', totalTasks: 8, doneTasks: 3, progressPercent: 38, sprints: [] },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">
            {t('dashboard.project_portfolio', 'Project Portfolio')}
          </h3>
        </div>

        <span className="text-[11px] font-bold text-slate-400">
          {displayList.length} active
        </span>
      </div>

      <div className="space-y-3 py-1">
        {displayList.slice(0, 3).map((prj) => (
          <div key={prj.projectId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 truncate max-w-[180px]">
                {prj.projectName}
              </span>
              <span className="font-mono font-bold text-slate-600">
                {prj.progressPercent}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${prj.progressPercent}%`,
                  backgroundColor: prj.projectColor || '#2563EB',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Portfolio health: Good</span>
        <span className="text-blue-600 font-bold hover:underline cursor-pointer">
          Detailed metrics →
        </span>
      </div>
    </div>
  );
}
