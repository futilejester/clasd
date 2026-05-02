import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent';

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-cream-200 text-slate-700 border-cream-300',
  success: 'bg-sage-100 text-sage-500 border-sage-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  accent: 'bg-clay-50 text-clay-700 border-clay-100',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-mono uppercase tracking-wider border',
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
