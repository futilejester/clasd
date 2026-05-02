'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TagInput({
  value,
  onChange,
  placeholder = 'Add a tag and press enter',
  disabled,
  id,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setDraft('');
  }

  function removeTag(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded border border-slate-200 bg-cream-50 px-2 py-1.5',
        'focus-within:ring-2 focus-within:ring-clay-500 focus-within:border-clay-500',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-clay-50 text-clay-700 text-xs font-medium border border-clay-100"
        >
          {tag}
          {!disabled ? (
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-clay-700 hover:text-clay-900"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) addTag(draft);
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm text-slate-900 placeholder:text-slate-400"
      />
    </div>
  );
}
