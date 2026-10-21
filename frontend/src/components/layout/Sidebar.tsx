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
  FolderKanban,
  CalendarClock,
  CalendarRange,
  Zap,
  Bell,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/project.store';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '@/features/notifications/stores/notifications.store';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { projects, loadMine } = useProjectStore();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const [tasksExpanded, setTasksExpanded] = useState(true);

  const role = user?.role;

  const otherNavItems = [
    { icon: FolderKanban, label: t('nav.projects', 'Dự án & Sprints'), path: '/projects' },
    { icon: CalendarClock, label: t('nav.attendance', 'Chấm công'), path: '/attendance' },
    {
      icon: Zap,
      label: t('nav.quick_tasks', 'Giao việc nhanh'),
      path: '/quick-tasks',
      // Chỉ PM/DEPT_HEAD/Admin mới thấy menu này (EMPLOYEE vẫn xem được task mình nhận nhưng mặc định ẩn)
      roles: ['PM', 'DEPARTMENT_HEAD', 'ADMIN', 'EMPLOYEE'],
    },
    { icon: Video, label: t('nav.meetings'), path: '/meetings' },
    { icon: CalendarRange, label: t('nav.calendar', 'Lịch làm việc'), path: '/calendar' },
    { icon: MessageSquare, label: t('nav.chat', 'Tin nhắn'), path: '/chat' },
    {
      icon: Bell,
      label: t('nav.notifications', 'Thông báo'),
      path: '/notifications',
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { icon: FileText, label: t('nav.documents'), path: '/documents' },
    {
      icon: ShieldCheck,
      label: t('nav.admin_center', 'Trung tâm Quản trị'),
      path: '/admin',
      roles: ['ADMIN'],
    },
    {
      icon: Settings,
      label: t('nav.settings', 'Cài đặt hệ thống'),
      path: '/settings',
      roles: ['ADMIN', 'HR'], // Hidden for EMPLOYEE, PM, and DEPARTMENT_HEAD
    },
  ];

  const visibleOtherNavItems = otherNavItems.filter((item) => {
    if (!item.roles) return true;
    return role ? item.roles.includes(role) : false;
  });

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
            <img src="/logo.svg" alt="WorkSync" className="h-10 w-10 object-contain drop-shadow-xs" />
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
              <div className="ml-4 pl-3 my-1 border-l-2 border-slate-100 space-y-2">
                {/* 1. MỤC CÁ NHÂN (VIỆC CỦA BẠN) */}
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('nav.personal_section', 'Việc cá nhân')}
                  </div>
                  <div className="space-y-0.5">
                    <NavLink
                      to="/tasks"
                      end
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors relative",
                          isActive
                            ? "text-primary font-bold bg-primary/10"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )
                      }
                    >
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate">{t('nav.all_my_tasks', 'Tất cả việc của tôi')}</span>
                    </NavLink>

                    {projects
                      .filter((p) => p.kind === 'PERSONAL')
                      .map((proj) => (
                        <NavLink
                          key={proj.id}
                          to={`/projects/${proj.id}/tasks`}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors relative",
                              isActive
                                ? "text-primary font-bold bg-primary/10"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            )
                          }
                          title={`${t('nav.personal_tasks', 'Việc riêng tư')} (${proj.openAssignedTaskCount})`}
                        >
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color || "#3B82F6" }}
                          />
                          <span className="truncate flex-1">{t('nav.personal_tasks', 'Việc riêng tư')}</span>
                          {proj.openAssignedTaskCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-full">
                              {proj.openAssignedTaskCount}
                            </span>
                          )}
                        </NavLink>
                      ))}
                  </div>
                </div>

                {/* 2. MỤC DỰ ÁN NHÓM (CÁC DỰ ÁN ĐANG THAM GIA) */}
                {projects.some((p) => p.kind !== 'PERSONAL') && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('nav.team_projects_section', 'Dự án tham gia')}
                    </div>
                    <div className="space-y-0.5">
                      {projects
                        .filter((p) => p.kind !== 'PERSONAL')
                        .map((proj) => (
                          <NavLink
                            key={proj.id}
                            to={`/projects/${proj.id}/tasks`}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors relative",
                                isActive
                                  ? "text-slate-900 font-bold bg-slate-100"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                              )
                            }
                            title={`${proj.name} (${proj.openAssignedTaskCount})`}
                          >
                            <div
                              className="h-2 w-2 rounded-sm shrink-0"
                              style={{ backgroundColor: proj.color || "#3B82F6" }}
                            />
                            <span className="truncate flex-1">{proj.name}</span>
                            {proj.openAssignedTaskCount > 0 && (
                              <span
                                className="ml-auto inline-flex items-center justify-center min-w-4 h-4 px-1.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-full"
                                aria-label={`${proj.openAssignedTaskCount} công việc chưa hoàn thành`}
                              >
                                {proj.openAssignedTaskCount}
                              </span>
                            )}
                          </NavLink>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 my-2 border-t-2 border-slate-100" />

          {/* 3. CÁC MENU KHÁC (Phân quyền theo Role) */}
          {visibleOtherNavItems.map((item) => (
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
                  {open && <span className="tracking-widest flex-1">{item.label}</span>}
                  {open && item.badge !== undefined && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-black text-white bg-rose-600 border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
