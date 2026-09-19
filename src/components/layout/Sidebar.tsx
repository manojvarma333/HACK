import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Mic, Package, BarChart3,
  Bell, History, ShoppingCart, Settings,
  AudioLines, X,
} from 'lucide-react';
import { navItems } from '@/data/navigation';
import { classNames } from '@/utils/format';

const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard, Mic, Package, BarChart3,
  Bell, History, ShoppingCart, Settings,
};

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex-shrink-0',
          'bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800',
          'flex flex-col transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <AudioLines className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">VoiceStock AI</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Smart Kirana Inventory</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  classNames(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                  )
                }
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
