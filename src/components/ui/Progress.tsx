import { classNames } from '@/utils/format';

export function Progress({
  value,
  max = 100,
  tone = 'primary',
  className,
}: {
  value: number;
  max?: number;
  tone?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const colors = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  };
  return (
    <div className={classNames('w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden', className)}>
      <div
        className={classNames('h-full rounded-full transition-all duration-500', colors[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
