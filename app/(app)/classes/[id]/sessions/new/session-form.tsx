'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  fromLocalInputValue,
  toLocalInputValue,
} from '@/lib/dates';
import { createSession, updateSession } from '../actions';

export function SessionForm({
  classId,
  defaultDurationMinutes,
  session,
}: {
  classId: string;
  defaultDurationMinutes: number;
  session?: {
    id: string;
    starts_at: string;
    ends_at: string;
    capacity: number | null;
    notes: string | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    session ? toLocalInputValue(session.starts_at) : ''
  );
  const [endsAtLocal, setEndsAtLocal] = useState(() =>
    session ? toLocalInputValue(session.ends_at) : ''
  );
  const [capacity, setCapacity] = useState<string>(
    session?.capacity ? String(session.capacity) : ''
  );
  const [notes, setNotes] = useState(session?.notes ?? '');

  // When user picks a start time and end time is empty, auto-fill end time
  // using the class default duration.
  function onStartChange(v: string) {
    setStartsAtLocal(v);
    if (v && !endsAtLocal && defaultDurationMinutes > 0) {
      const startMs = new Date(v).getTime();
      if (!Number.isNaN(startMs)) {
        const end = new Date(startMs + defaultDurationMinutes * 60_000);
        setEndsAtLocal(toLocalInputValue(end.toISOString()));
      }
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startsAtLocal || !endsAtLocal) {
      setError('Please set both start and end times.');
      return;
    }

    const starts_at = fromLocalInputValue(startsAtLocal);
    const ends_at = fromLocalInputValue(endsAtLocal);

    startTransition(async () => {
      const action = session
        ? updateSession({
            id: session.id,
            class_id: classId,
            starts_at,
            ends_at,
            capacity: capacity ? Number(capacity) : null,
            notes: notes || undefined,
          })
        : createSession({
            class_id: classId,
            starts_at,
            ends_at,
            capacity: capacity ? Number(capacity) : null,
            notes: notes || undefined,
          });

      const result = await action;
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Starts</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            required
            value={startsAtLocal}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">Ends</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            required
            value={endsAtLocal}
            onChange={(e) => setEndsAtLocal(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity">Capacity</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          max={10000}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Internal notes (not sent to students)."
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          {session ? 'Save changes' : 'Add session'}
        </Button>
        <Link
          href={`/classes/${classId}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
