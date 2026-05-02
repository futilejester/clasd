import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;
    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'inline-flex items-center gap-2 cursor-pointer select-none',
          props.disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="relative inline-flex h-4 w-4">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={cn(
              'peer h-4 w-4 appearance-none rounded border border-slate-300 bg-cream-50',
              'checked:bg-clay-500 checked:border-clay-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          <Check className="absolute inset-0 h-4 w-4 text-cream-50 opacity-0 peer-checked:opacity-100 pointer-events-none" />
        </span>
        {label ? <span className="text-sm text-slate-700">{label}</span> : null}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
