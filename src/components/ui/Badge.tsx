import { type ReactNode } from 'react';
import { classNames } from '@/utils/format';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

const tones: Record<Tone, string> = {
  success: 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  error: 'bg-error-100 text-error-700 dark:bg-error-500/15 dark:text-error-400',
  info: 'bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  primary: 'bg-primary-600 text-white',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
