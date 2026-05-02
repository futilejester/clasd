'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFormActive, deleteForm } from '../actions';

const MENU_WIDTH = 192;

export function FormActions({
  formId,
  active,
}: {
  formId: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - MENU_WIDTH,
      });
    }
    setOpen((o) => !o);
  }

  function run(
    label: string,
    fn: () => Promise<{ success?: boolean; error?: string } | void>
  ) {
    setOpen(false);
    startTransition(async () => {
      const r = await fn();
      if (r && 'error' in r && r.error) toast.error(r.error);
      else toast.success(label);
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Form actions"
        onClick={toggle}
        className="inline-flex items-center justify-center h-8 w-8 rounded border border-slate-200 bg-cream-50 hover:bg-cream-200 text-slate-600 hover:text-slate-900"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && mounted
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div
                role="menu"
                style={{ top: coords.top, left: coords.left }}
                className="absolute w-48 rounded-lg border border-cream-300 bg-cream-50 shadow-soft z-50 py-1"
              >
                {active ? (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-cream-200"
                    onClick={() =>
                      run('Form paused', () => toggleFormActive(formId, false))
                    }
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause form
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-cream-200"
                    onClick={() =>
                      run('Form is live', () => toggleFormActive(formId, true))
                    }
                  >
                    <Play className="h-3.5 w-3.5" />
                    Make live
                  </button>
                )}

                <div className="my-1 border-t border-cream-300" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (
                      confirm(
                        'Permanently delete this form? Submissions already received are kept as students.'
                      )
                    ) {
                      run('Form deleted', () => deleteForm(formId));
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
