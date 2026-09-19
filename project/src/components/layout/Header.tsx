import { Menu, Search, Bell, Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('')
    : '?';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search products, transactions..."
            className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-3.5 py-2 pl-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
        </Button>
        <button className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-gray-200 dark:border-gray-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{user?.name ?? 'Guest'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{user?.shop_name ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-gray-500 dark:text-gray-400 hover:text-error-500 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
