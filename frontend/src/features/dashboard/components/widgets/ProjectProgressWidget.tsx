import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { FolderGit2, CheckCircle2 } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import type { ProjectProgress } from '../../types/dashboard.types';

interface Props {
  projects: ProjectProgress[];
}

export function ProjectProgressWidget({ projects }: Props) {
  const { t } = useTranslation();

  if (!projects || projects.length === 0) {
    return (
      <section className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]" aria-labelledby="project-progress-title">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b-2 border-slate-900">
          <FolderGit2 className="w-5 h-5 text-slate-900" />
          <h2 id="project-progress-title" className="text-sm font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.project_progress', 'Tiến độ dự án')}
          </h2>
        </div>
        <p className="py-8 text-center text-slate-400 font-medium italic">
          {t('dashboard.no_projects', 'Bạn chưa tham gia dự án nào.')}
        </p>
      </section>
    );
  }

  const chartData = projects.map((p) => ({
    name: p.projectName.length > 14 ? p.projectName.slice(0, 14) + '…' : p.projectName,
    fullName: p.projectName,
    done: p.doneTasks,
    remaining: Math.max(0, p.totalTasks - p.doneTasks),
  }));

  return (
    <section className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]" aria-labelledby="project-progress-title">
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1 text-white bg-blue-600 border border-slate-900">
            <FolderGit2 className="w-4 h-4" />
          </span>
          <h2 id="project-progress-title" className="text-sm font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.project_progress', 'Tiến độ dự án')}
          </h2>
        </div>
        <span className="px-2 py-0.5 text-xs font-black bg-slate-900 text-white">
          {projects.length} {t('dashboard.projects_count', 'dự án')}
        </span>
      </div>

      {/* Recharts Stacked Bar Chart */}
      <div className="h-44 w-full mb-6 p-2 bg-slate-50 border border-slate-300">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#0f172a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '2px solid #0f172a',
                borderRadius: '0px',
                boxShadow: '3px 3px 0px 0px rgba(15,23,42,1)',
                fontWeight: 700,
                fontSize: '12px',
              }}
              formatter={(val, name) => [
                val,
                name === 'done'
                  ? t('dashboard.chart_done', 'Đã xong')
                  : t('dashboard.chart_remaining', 'Còn lại'),
              ]}
              labelFormatter={(label) => chartData.find((d) => d.name === label)?.fullName ?? label}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
              formatter={(value) =>
                value === 'done'
                  ? t('dashboard.chart_done', 'Hoàn thành')
                  : t('dashboard.chart_remaining', 'Chưa xong')
              }
            />
            <Bar dataKey="done" stackId="a" fill="#059669" />
            <Bar dataKey="remaining" stackId="a" fill="#cbd5e1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Project list with progress bars and sprints */}
      <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
        {projects.map((project) => (
          <div key={project.projectId} className="p-3 border-2 border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 border-2 border-slate-900 shrink-0"
                  style={{ backgroundColor: project.projectColor }}
                />
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">
                  {project.projectName}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {project.doneTasks}/{project.totalTasks} {t('dashboard.tasks', 'tasks')}
                </span>
              </div>
            </div>

            <ProgressBar
              value={project.progressPercent}
              color={project.projectColor}
              height="sm"
              showPercent
            />

            {/* Sprints list */}
            {project.sprints.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                {project.sprints.map((sprint) => (
                  <div key={sprint.id} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 ${
                          sprint.status === 'ACTIVE'
                            ? 'bg-emerald-500'
                            : sprint.status === 'COMPLETED'
                              ? 'bg-blue-500'
                              : 'bg-slate-300'
                        }`}
                      />
                      <span className="font-bold text-slate-700">{sprint.name}</span>
                    </div>
                    <span className="font-mono font-black text-slate-800">
                      {sprint.doneTasks}/{sprint.totalTasks} ({sprint.progressPercent}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
