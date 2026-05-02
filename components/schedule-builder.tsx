'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ALL_WEEKDAYS,
  WEEKDAY_LABELS,
  generateSessions,
  type RecurrenceFrequency,
  type Weekday,
} from '@/lib/recurrence';
import { fromLocalInputValue, formatDateTime } from '@/lib/dates';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ScheduleValue {
  starts_at: string; // ISO UTC
  frequency: RecurrenceFrequency;
  weekdays: Weekday[];
  end_mode: 'count' | 'date' | 'never';
  count?: number;
  end_date?: string;
}

export function ScheduleBuilder({
  value,
  onChange,
  durationMinutes,
}: {
  value: ScheduleValue;
  onChange: (v: ScheduleValue) => void;
  durationMinutes: number;
}) {
  // We hold the start time as a datetime-local string so the input
  // can be controlled cleanly. The ISO UTC version flows out via onChange.
  const [localStartsAt, setLocalStartsAt] = useState<string>(() => {
    if (!value.starts_at) return '';
    const d = new Date(value.starts_at);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  function update(patch: Partial<ScheduleValue>) {
    onChange({ ...value, ...patch });
  }

  function onLocalStartsAtChange(v: string) {
    setLocalStartsAt(v);
    if (v) {
      try {
        update({ starts_at: fromLocalInputValue(v) });
      } catch {
        // Invalid intermediate value, ignore
      }
    }
  }

  function toggleWeekday(wd: Weekday) {
    const next = value.weekdays.includes(wd)
      ? value.weekdays.filter((w) => w !== wd)
      : [...value.weekdays, wd];
    update({ weekdays: next });
  }

  // Compute a preview of the first few generated sessions
  const preview = useMemo(() => {
    if (!value.starts_at || durationMinutes <= 0) return null;
    try {
      return generateSessions({
        frequency: value.frequency,
        startsAt: value.starts_at,
        durationMinutes,
        weekdays: value.weekdays,
        count: value.end_mode === 'count' ? value.count : undefined,
        endDate: value.end_mode === 'date' ? value.end_date : undefined,
      });
    } catch {
      return null;
    }
  }, [value, durationMinutes]);

  const showWeekdays =
    value.frequency === 'weekly' ||
    value.frequency === 'biweekly' ||
    value.frequency === 'custom';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">First session</Label>
          <Input
            id="starts_at"
            name="starts_at_local"
            type="datetime-local"
            required
            value={localStartsAt}
            onChange={(e) => onLocalStartsAtChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Repeats</Label>
          <Select
            id="frequency"
            value={value.frequency}
            onChange={(e) =>
              update({ frequency: e.target.value as RecurrenceFrequency })
            }
          >
            <option value="none">Doesn’t repeat</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="custom">Custom days each week</option>
          </Select>
        </div>
      </div>

      {showWeekdays ? (
        <div className="space-y-2">
          <Label>On these days</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_WEEKDAYS.map((wd) => {
              const active = value.weekdays.includes(wd);
              return (
                <button
                  key={wd}
                  type="button"
                  onClick={() => toggleWeekday(wd)}
                  className={cn(
                    'px-3 h-9 rounded text-sm border transition-colors',
                    active
                      ? 'bg-clay-500 text-cream-100 border-clay-500'
                      : 'bg-cream-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {WEEKDAY_LABELS[wd].short}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Defaults to the weekday of the first session if none selected.
          </p>
        </div>
      ) : null}

      {value.frequency !== 'none' ? (
        <div className="space-y-2">
          <Label>Ends</Label>
          <div className="flex flex-wrap gap-3 items-center">
            <Select
              value={value.end_mode}
              onChange={(e) =>
                update({
                  end_mode: e.target.value as ScheduleValue['end_mode'],
                })
              }
              className="max-w-[180px]"
            >
              <option value="count">After</option>
              <option value="date">On a date</option>
              <option value="never">Never (cap at 200)</option>
            </Select>

            {value.end_mode === 'count' ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={value.count ?? ''}
                  onChange={(e) =>
                    update({
                      count: e.target.value
                        ? Math.max(1, Number(e.target.value))
                        : undefined,
                    })
                  }
                  className="w-24"
                  placeholder="8"
                />
                <span className="text-sm text-slate-600">sessions</span>
              </div>
            ) : null}

            {value.end_mode === 'date' ? (
              <Input
                type="date"
                value={value.end_date ?? ''}
                onChange={(e) =>
                  update({ end_date: e.target.value || undefined })
                }
                className="max-w-[200px]"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {preview && preview.length > 0 ? (
        <div className="rounded-lg border border-cream-300 bg-cream-200/40 p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-600 mb-3">
            {preview.length === 1
              ? '1 session will be created'
              : `${preview.length} sessions will be created`}
            {preview.length === 200 ? ' (capped)' : ''}
          </p>
          <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
            {preview.slice(0, 8).map((s, i) => (
              <li key={i} className="text-slate-700 font-mono text-xs">
                {formatDateTime(s.starts_at)}
              </li>
            ))}
            {preview.length > 8 ? (
              <li className="text-slate-500 text-xs">
                + {preview.length - 8} more…
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
