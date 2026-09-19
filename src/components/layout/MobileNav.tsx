import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Mic, Package, BarChart3, Settings,
} from 'lucide-react';
import { mobileNavItems } from '@/data/navigation';
import { classNames } from '@/utils/format';

const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard, Mic, Package, BarChart3, Settings,
};

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 flex items-center justify-around">
      {mobileNavItems.map((item) => {
        const Icon = iconMap[item.icon] ?? LayoutDashboard;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              classNames(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400',
              )
            }
          >
            <Icon className="w-[20px] h-[20px]" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
