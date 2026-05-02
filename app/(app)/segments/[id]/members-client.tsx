'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Users, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SegmentRules } from '@/types/database';
import { previewSegment, deleteSegment } from '../actions';

interface Props {
  segmentId: string;
  target: 'students' | 'enrolments';
  rules: SegmentRules;
}

export function SegmentMembers({ segmentId, target, rules }: Props) {
  const [data, setData] = useState<{
    count: number;
    sample: Array<{ id: string; email: string; name: string | null }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setError(null);
    const r = await previewSegment({ target, rules, segmentId });
    if ('error' in r) setError(r.error);
    else setData(r);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDelete() {
    if (
      !confirm(
        'Permanently delete this segment? Existing campaigns linked to it will lose their target.'
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteSegment(segmentId);
      if (r?.error) toast.error(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-clay-500" />
            Matching {target === 'students' ? 'students' : 'students (via enrolments)'}
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={isPending}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
              {error}
            </p>
          ) : !data ? (
            <p className="text-sm text-slate-500">Evaluating…</p>
          ) : data.count === 0 ? (
            <p className="text-sm text-slate-600">
              No one matches these conditions yet.
            </p>
          ) : (
            <>
              <p className="font-display text-3xl tracking-tight mb-3">
                {data.count}{' '}
                <span className="text-base font-sans text-slate-500">
                  match{data.count === 1 ? '' : 'es'}
                </span>
              </p>
              <ul className="divide-y divide-cream-200 border border-cream-200 rounded-lg overflow-hidden">
                {data.sample.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/students/${s.id}`}
                      className="flex items-center justify-between px-3 py-2 hover:bg-cream-100"
                    >
                      <span className="text-sm text-slate-900">
                        {s.name || (
                          <span className="italic text-slate-400">
                            No name
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500">
                        {s.email}
                      </span>
                    </Link>
                  </li>
                ))}
                {data.count > data.sample.length ? (
                  <li className="px-3 py-2 text-xs text-slate-500">
                    + {data.count - data.sample.length} more
                  </li>
                ) : null}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <div className="pt-4 border-t border-cream-300 flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={onDelete}
          className="text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete segment
        </Button>
      </div>
    </div>
  );
}
