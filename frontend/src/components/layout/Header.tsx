import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n/i18n';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

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

        <div className="hidden md:flex relative w-96 group">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input 
            type="search" 
            placeholder={currentLang.startsWith('en') ? "SEARCH TASKS, DOCUMENTS..." : "TÌM KIẾM CÔNG VIỆC, TÀI LIỆU..."} 
            className="w-full h-11 bg-white border-2 border-slate-200 rounded-none pl-10 text-xs font-bold tracking-widest placeholder:text-slate-400 focus:border-primary focus:ring-0 focus-visible:ring-0"
          />
        </div>
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

        <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-none">
          <Bell className="h-5 w-5 text-slate-900" />
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-destructive" />
        </Button>
        
        <div className="flex items-center gap-4 border-l-2 border-slate-200 pl-6">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-sm font-bold text-slate-900">{user?.name || 'Võ Thanh Long'}</span>
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-slate-900 px-2 py-0.5">{user?.role || 'ADMIN'}</span>
          </div>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'User'}
              className="h-10 w-10 object-cover border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            />
          ) : (
            <div className="h-10 w-10 rounded-none bg-primary border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center text-white font-black text-lg">
              {user?.name?.charAt(0) || 'A'}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="hover:bg-destructive hover:text-white rounded-none transition-colors ml-2">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
