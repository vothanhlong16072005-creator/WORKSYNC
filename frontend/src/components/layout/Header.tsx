import { useState, useEffect } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n/i18n';
import { QuickTaskButton } from '@/features/quick-tasks/components/QuickTaskButton';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { UserProfileModal } from './UserProfileModal';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';
  const [avatarError, setAvatarError] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b-2 border-slate-200 bg-white px-6">
      <div className="flex items-center gap-6">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden rounded-none border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5 text-slate-900" />
        </Button>

        <GlobalSearch />
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {/* Language Switcher */}
        <div className="flex items-center border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <button
            type="button"
            onClick={() => changeLanguage('vi')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase transition-colors ${
              currentLang.startsWith('vi')
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Tiếng Việt"
          >
            🇻🇳 VI
          </button>
          <button
            type="button"
            onClick={() => changeLanguage('en')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase transition-colors border-l-2 border-slate-900 ${
              currentLang.startsWith('en')
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="English"
          >
            🇬🇧 EN
          </button>
        </div>

        {/* M9: Notification Bell */}
        <NotificationBell />

        {/* M3.5 — Quick Task Button (PM/DEPT_HEAD/Admin only) */}
        <QuickTaskButton />
        
        <div className="flex items-center gap-4 border-l-2 border-slate-200 pl-6">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            title={currentLang.startsWith('en') ? 'Click to edit profile & avatar' : 'Bấm để chỉnh sửa hồ sơ & avatar'}
            className="flex items-center gap-3 group text-left cursor-pointer hover:opacity-85 transition-opacity"
          >
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {user?.name || 'Võ Thanh Long'}
              </span>
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-slate-900 px-2 py-0.5">
                {user?.role || 'ADMIN'}
              </span>
            </div>
            {user?.avatar && !avatarError ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="h-10 w-10 object-cover border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] group-hover:border-blue-600 transition-colors"
              />
            ) : (
              <div className="h-10 w-10 bg-blue-600 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center text-white font-black text-sm group-hover:border-blue-600 transition-colors">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </button>

          <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="hover:bg-destructive hover:text-white rounded-none transition-colors ml-2">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* User Profile Edit Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
}
