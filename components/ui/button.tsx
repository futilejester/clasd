import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-slate-900 text-cream-100 hover:bg-slate-800 focus-visible:ring-slate-900 disabled:bg-slate-300',
  secondary:
    'bg-clay-500 text-cream-100 hover:bg-clay-600 focus-visible:ring-clay-500 disabled:bg-clay-200',
  ghost:
    'text-slate-700 hover:bg-cream-200 focus-visible:ring-slate-300 disabled:text-slate-300',
  outline:
    'border border-slate-300 bg-transparent text-slate-800 hover:bg-cream-200 focus-visible:ring-slate-300 disabled:text-slate-300 disabled:border-slate-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 disabled:bg-red-300',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded font-medium tracking-tight transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100',
          'disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
