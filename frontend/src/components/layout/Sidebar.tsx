import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Video,
  FileText,
  Settings,
  X,
  ChevronLeft,
  ChevronDown,
  Layers,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/project.store';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { projects, loadMine } = useProjectStore();
  const [tasksExpanded, setTasksExpanded] = useState(true);

  const otherNavItems = [
    { icon: CalendarClock, label: t('nav.attendance', 'Chấm công'), path: '/attendance' },
    { icon: Video, label: t('nav.meetings'), path: '/meetings' },
    { icon: FileText, label: t('nav.documents'), path: '/documents' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ];

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const isTasksActive =
    location.pathname === '/tasks' || location.pathname.startsWith('/projects/');

  const totalOpenTasks = projects.reduce(
    (acc, p) => acc + (p.openAssignedTaskCount || 0),
    0
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r-2 border-slate-200 bg-white transition-transform duration-300 ease-in-out md:relative md:flex md:translate-x-0",
          !open && "-translate-x-full md:w-20"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b-2 border-slate-200 relative">
          <div className="flex items-center gap-3 font-black text-2xl text-slate-900 uppercase">
            <div className="h-10 w-10 flex items-center justify-center bg-primary text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] relative">
              W
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent border-2 border-slate-900"></div>
            </div>
            {open && (
              <span className="tracking-tight">
                Work<span className="text-primary">Sync</span>
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6 text-slate-900" />
          </Button>

          {/* Desktop Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute -right-4 top-6 h-8 w-8 rounded-none border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100 transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
            onClick={() => setOpen(!open)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 text-slate-900 transition-transform",
                !open && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto mt-2">
          {/* 1. BẢNG ĐIỀU KHIỂN */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all relative overflow-hidden",
                isActive
                  ? "text-primary bg-slate-50"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
                !open && "md:justify-center md:px-0"
              )
            }
            title={!open ? "BẢNG ĐIỀU KHIỂN" : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                )}
                <LayoutDashboard
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )}
                />
                {open && <span className="tracking-widest">{t('nav.dashboard')}</span>}
              </>
            )}
          </NavLink>

          {/* 2. CÔNG VIỆC & DỰ ÁN (Nhóm gộp có cây thư mục phân cấp) */}
          <div className="pt-1">
            <div
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 text-sm font-bold transition-all cursor-pointer relative overflow-hidden",
                isTasksActive
                  ? "text-primary bg-slate-50"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-50",
                !open && "md:justify-center md:px-0"
              )}
              onClick={() => {
                if (open) {
                  setTasksExpanded(!tasksExpanded);
                }
              }}
              title={!open ? t('nav.tasks') : undefined}
            >
              {isTasksActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
              )}
              <div className="flex items-center gap-3">
                <CheckSquare
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform",
                    isTasksActive ? "scale-110" : "group-hover:scale-110"
                  )}
                />
                {open && <span className="tracking-widest">{t('nav.tasks')}</span>}
              </div>

              {open && (
                <div className="flex items-center gap-2">
                  {totalOpenTasks > 0 && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[11px] font-black text-white bg-slate-900 border border-slate-900">
                      {totalOpenTasks}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-500 transition-transform",
                      tasksExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </div>
              )}
            </div>

            {/* Sub-items (Cây phân cấp các mục công việc & dự án) */}
            {open && tasksExpanded && (
              <div className="ml-4 pl-3 my-1 border-l-2 border-slate-200 space-y-1">
                {/* Việc của tôi (All accessible) */}
                <NavLink
                  to="/tasks"
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold transition-colors relative",
                      isActive
                        ? "text-primary font-black bg-slate-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )
                  }
                >
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">{t('nav.all_my_tasks')}</span>
                </NavLink>

                {/* Từng dự án & Việc cá nhân */}
                {projects.map((proj) => {
                  const label =
                    proj.kind === "PERSONAL" ? t('nav.personal_tasks') : proj.name;
                  return (
                    <NavLink
                      key={proj.id}
                      to={`/projects/${proj.id}/tasks`}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold transition-colors relative",
                          isActive
                            ? "text-slate-900 font-black bg-slate-100"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )
                      }
                      title={`${label} (${proj.openAssignedTaskCount})`}
                    >
                      <div
                        className="h-2.5 w-2.5 shrink-0 border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                        style={{ backgroundColor: proj.color || "#3B82F6" }}
                      />
                      <span className="truncate flex-1">{label}</span>
                      {proj.openAssignedTaskCount > 0 && (
                        <span
                          className="ml-auto inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-black text-white bg-red-600 border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                          aria-label={`${proj.openAssignedTaskCount} công việc chưa hoàn thành`}
                        >
                          {proj.openAssignedTaskCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 my-2 border-t-2 border-slate-100" />

          {/* 3. CÁC MENU KHÁC */}
          {otherNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all relative overflow-hidden",
                  isActive
                    ? "text-primary bg-slate-50"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
                  !open && "md:justify-center md:px-0"
                )
              }
              title={!open ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform",
                      isActive ? "scale-110" : "group-hover:scale-110"
                    )}
                  />
                  {open && <span className="tracking-widest">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
