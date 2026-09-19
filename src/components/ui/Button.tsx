import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '@/utils/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm shadow-primary-600/20',
  secondary:
    'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700',
  ghost:
    'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  danger:
    'bg-error-500 text-white hover:bg-error-600 active:bg-error-700 shadow-sm shadow-error-500/20',
  outline:
    'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
