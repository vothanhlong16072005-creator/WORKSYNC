import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Flame,
  Layout,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { ProjectItem } from '../types/project.types';
import { WorkflowTypeBadge } from './WorkflowTypeBadge';

interface ProjectCardProps {
  project: ProjectItem;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const members = project.members || [];
  const memberCount = project.memberCount ?? members.length;
  const progress = project.progress;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Top Accent Strip */}
      <div
        className="h-2 w-full transition-all"
        style={{ backgroundColor: project.color || '#3B82F6' }}
      />

      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Workflow Badge + Kind */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <WorkflowTypeBadge type={project.workflowType} size="sm" />
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                project.kind === 'TEAM'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {project.kind === 'TEAM' ? 'Dự án Team' : 'Cá nhân'}
            </span>
          </div>

          {/* Project Title */}
          <Link
            to={`/projects/${project.id}`}
            className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 block"
          >
            {project.name}
          </Link>

          {/* Description */}
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {project.description || 'Chưa có mô tả mục tiêu cho dự án này.'}
          </p>

          {/* Active Sprint Banner (if exists) */}
          {project.activeSprint && (
            <div className="mt-3.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-200/80 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-amber-800 line-clamp-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                {project.activeSprint.name}
              </span>
              <span className="text-[11px] font-bold text-amber-700 shrink-0 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200">
                Active
              </span>
            </div>
          )}
        </div>

        {/* Middle Section: PM & Team */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
          {/* PM Info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Chủ nhiệm PM:
            </span>
            {project.pm ? (
              <div className="flex items-center gap-1.5">
                {project.pm.avatar ? (
                  <img
                    src={project.pm.avatar}
                    alt={project.pm.name}
                    className="w-5 h-5 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                    {project.pm.name.charAt(0)}
                  </div>
                )}
                <span className="font-semibold text-slate-800">{project.pm.name}</span>
              </div>
            ) : (
              <span className="text-slate-400 italic">Chưa chỉ định</span>
            )}
          </div>

          {/* Members Avatars Row */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Quân số:
            </span>
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1.5 overflow-hidden">
                {members.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    title={m.user.name}
                    className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-slate-100"
                  >
                    {m.user.avatar ? (
                      <img src={m.user.avatar} alt={m.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                        {m.user.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700 ml-1">
                {memberCount} nhân sự
              </span>
            </div>
          </div>

          {/* Progress bar (if stats available) */}
          {progress && (
            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-500">
                  {progress.doneTasks}/{progress.totalTasks} task
                </span>
                <span className="font-bold text-slate-700">{progress.percent}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <Link
            to={`/tasks?project=${project.id}`}
            title="Mở Bảng Kanban nhiệm vụ"
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Bảng việc</span>
          </Link>

          <Link
            to={`/projects/${project.id}`}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-blue-600 text-white shadow-xs active:scale-98 transition-all flex items-center gap-1 group/btn"
          >
            <span>Chi tiết</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
