import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ChevronDown,
  Plus,
  Sparkles,
  Clock,
  Video,
  FileDown,
  CheckSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Props {
  userName: string;
  subtitle?: string;
}

export function HeroBanner({ userName, subtitle }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    setDropdownOpen(false);
    switch (action) {
      case 'create_task':
        navigate('/tasks');
        break;
      case 'check_in':
        window.scrollTo({ top: 120, behavior: 'smooth' });
        toast.info(t('dashboard.scroll_to_attendance', 'Vui lòng xác nhận điểm danh ở thẻ bên dưới'));
        break;
      case 'meeting':
        toast.success(t('dashboard.schedule_meeting', 'Đang tạo phòng họp nhanh cho nhóm...'));
        break;
      case 'export':
        toast.success(t('dashboard.exporting_report', 'Đang xuất báo cáo tổng quan định dạng PDF/Excel...'));
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 z-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left: Branding & Greeting */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              WorkSync Enterprise • FPT Software Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t('dashboard.welcome', 'Welcome back')}, {userName}!
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Oct 2026</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
            {subtitle ??
              t(
                'dashboard.hero_subtext',
                'Quản lý rủi ro & hiệu suất: Bạn có nhiệm vụ ưu tiên và Sprint đang tăng tốc.',
              )}
          </p>
        </div>

        {/* Center: Pure Bauhaus Character Artwork without clunky inner box, blending seamlessly */}
        <div className="hidden xl:flex items-center gap-4 shrink-0">
          <img
            src="/hero-illustration.png"
            alt="WorkSync Team Balance Artwork"
            className="h-28 sm:h-32 object-contain"
          />
          {/* Subtle Bauhaus geometric accent palette */}
          <div className="flex flex-col gap-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block shadow-2xs" />
              <span className="w-3.5 h-3.5 rounded-xs bg-amber-500 inline-block shadow-2xs" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-red-600 inline-block shadow-2xs" />
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-2xs" />
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 relative" ref={dropdownRef}>
          {/* Direct Create Task Button */}
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dashboard.create_task_btn', 'Tạo việc mới')}</span>
          </button>

          {/* Functional Quick Actions Dropdown */}
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all ${
              dropdownOpen
                ? 'bg-slate-800 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('dashboard.quick_action', 'Thao tác')}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu Modal */}
          {dropdownOpen && (
            <div className="absolute right-0 top-12 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t('dashboard.quick_shortcuts', 'Phím tắt tác vụ nhanh')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAction('create_task')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>{t('dashboard.action_create_task', 'Tạo nhiệm vụ mới')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('check_in')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{t('dashboard.action_check_in', 'Điểm danh ca làm việc')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('meeting')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Video className="w-4 h-4 text-emerald-600" />
                <span>{t('dashboard.action_meeting', 'Tạo cuộc họp nhanh')}</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => handleAction('export')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <FileDown className="w-4 h-4 text-slate-500" />
                <span>{t('dashboard.action_export', 'Xuất báo cáo PDF / Excel')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
