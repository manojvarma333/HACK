import { type ReactNode } from 'react';
import { classNames } from '@/utils/format';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  trend?: { value: string; up: boolean };
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'teal';
}

const iconTones = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
};

export function StatCard({ label, value, icon, trend, tone = 'primary' }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={classNames('w-11 h-11 rounded-xl flex items-center justify-center', iconTones[tone])}>
          {icon}
        </div>
        {trend && (
          <span
            className={classNames(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.up
                ? 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400'
                : 'bg-error-100 text-error-700 dark:bg-error-500/15 dark:text-error-400',
            )}
          >
            {trend.up ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}
