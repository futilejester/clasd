import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border border-dashed border-cream-300 rounded-lg p-12 text-center bg-cream-50',
        className
      )}
    >
      {icon ? (
        <div className="mx-auto h-16 w-16 rounded-full bg-cream-200 flex items-center justify-center text-clay-600 mb-4">
          {icon}
        </div>
      ) : null}
      <h2 className="font-display text-2xl tracking-tight mb-2">{title}</h2>
      {description ? (
        <p className="text-slate-600 max-w-md mx-auto mb-6">{description}</p>
      ) : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}
