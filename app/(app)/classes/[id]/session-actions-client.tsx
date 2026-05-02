'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  MoreHorizontal,
  Edit,
  XCircle,
  CheckCircle2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelSession,
  uncancelSession,
  completeSession,
  deleteSession,
} from './sessions/actions';

const MENU_WIDTH = 192; // matches w-48

export function SessionRowActions({
  sessionId,
  classId,
  status,
}: {
  sessionId: string;
  classId: string;
  status: 'scheduled' | 'cancelled' | 'completed';
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-close on scroll / resize so the menu doesn't drift away from its trigger
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

  function toggleMenu() {
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
    fn: () => Promise<{ success?: boolean; error?: string }>
  ) {
    setOpen(false);
    startTransition(async () => {
      const r = await fn();
      if (r?.error) toast.error(r.error);
      else toast.success(label);
    });
  }

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Session actions"
        onClick={toggleMenu}
        className="p-2 rounded hover:bg-cream-200 text-slate-500 hover:text-slate-900"
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
                <Link
                  href={`/classes/${classId}/sessions/${sessionId}/edit`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-cream-200"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Link>

                {status === 'scheduled' ? (
                  <>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-cream-200"
                      onClick={() =>
                        run('Marked completed', () =>
                          completeSession(sessionId, classId)
                        )
                      }
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark completed
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-cream-200"
                      onClick={() =>
                        run('Session cancelled', () =>
                          cancelSession(sessionId, classId)
                        )
                      }
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </>
                ) : status === 'cancelled' ? (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-cream-200"
                    onClick={() =>
                      run('Session restored', () =>
                        uncancelSession(sessionId, classId)
                      )
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                ) : null}

                <div className="my-1 border-t border-cream-300" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (
                      confirm(
                        'Permanently delete this session? This cannot be undone.'
                      )
                    ) {
                      run('Session deleted', () =>
                        deleteSession(sessionId, classId)
                      );
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
    </div>
  );
}