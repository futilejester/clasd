/**
 * Recurring session generation.
 *
 * Given a recurrence spec, produce concrete (starts_at, ends_at) pairs.
 * No external dependencies, no DB access — easy to test and reason about.
 *
 * Design: rows in DB, not RRULE expansion at read time. When you create
 * a "weekly Tuesday 6pm for 8 weeks" class, this generates 8 dated rows
 * up front. Editing/cancelling an individual session is then a single-row
 * operation, no recurrence-exception bookkeeping.
 *
 * Time zones: this code does its arithmetic in *local* time (the JS
 * runtime's local zone) because that matches how a user thinks about
 * "every Tuesday at 6pm" — they mean wall-clock time, not absolute UTC.
 * The Date objects round-trip through ISO/UTC at the input/output edges.
 * One known edge case: a DST boundary inside a recurrence will shift the
 * UTC instant by an hour for sessions on the other side of the boundary.
 * That's fine; the user still sees "6pm" in their local zone.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0, Mon=1, ... Sat=6

export type RecurrenceFrequency = 'none' | 'weekly' | 'biweekly' | 'custom';

export interface RecurrenceSpec {
  frequency: RecurrenceFrequency;
  // ISO datetime string (UTC) — the FIRST session's start time
  startsAt: string;
  // Duration in minutes
  durationMinutes: number;
  // For 'weekly' / 'biweekly' / 'custom': which weekdays (in the user's
  // local zone) to recur on. Ignored for 'none'. If empty, the start
  // date's local weekday is used.
  weekdays?: Weekday[];
  // Either a count of total sessions OR an end date (inclusive).
  // If both provided, count wins. If neither, defaults to 1.
  count?: number;
  endDate?: string; // ISO date string (yyyy-mm-dd) — interpreted as end of that day local
}

export interface GeneratedSession {
  starts_at: string; // ISO UTC
  ends_at: string; // ISO UTC
}

const MAX_SESSIONS = 200;

export function generateSessions(spec: RecurrenceSpec): GeneratedSession[] {
  const start = new Date(spec.startsAt);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid startsAt date');
  }
  if (spec.durationMinutes <= 0) {
    throw new Error('Duration must be positive');
  }

  if (spec.frequency === 'none') {
    return [makeSession(start, spec.durationMinutes)];
  }

  const startWeekday = start.getDay() as Weekday;
  const weekdays = (spec.weekdays && spec.weekdays.length > 0
    ? spec.weekdays
    : [startWeekday]
  )
    .slice()
    .sort((a, b) => a - b);

  const stride = spec.frequency === 'biweekly' ? 14 : 7;
  const limit = resolveLimit(spec);
  const endBoundary = spec.endDate ? endOfDayLocal(spec.endDate) : null;

  const sessions: GeneratedSession[] = [];
  let weekIndex = 0;

  outer: while (sessions.length < limit) {
    for (const wd of weekdays) {
      // First week: skip weekdays earlier in the week than the start day.
      if (weekIndex === 0 && wd < startWeekday) continue;

      const offsetDays = weekIndex * stride + (wd - startWeekday);
      const sessionStart = addDaysLocal(start, offsetDays);

      if (endBoundary && sessionStart > endBoundary) break outer;

      sessions.push(makeSession(sessionStart, spec.durationMinutes));
      if (sessions.length >= limit) break outer;
    }
    weekIndex += 1;
    if (weekIndex > MAX_SESSIONS) break;
  }

  return sessions;
}

function resolveLimit(spec: RecurrenceSpec): number {
  if (typeof spec.count === 'number' && spec.count > 0) {
    return Math.min(spec.count, MAX_SESSIONS);
  }
  if (spec.endDate) return MAX_SESSIONS;
  return 1;
}

function makeSession(start: Date, durationMinutes: number): GeneratedSession {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  };
}

function addDaysLocal(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function endOfDayLocal(isoDate: string): Date {
  const [y, m, day] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, day, 23, 59, 59, 999);
}

export const WEEKDAY_LABELS: Record<Weekday, { short: string; long: string }> =
  {
    0: { short: 'Sun', long: 'Sunday' },
    1: { short: 'Mon', long: 'Monday' },
    2: { short: 'Tue', long: 'Tuesday' },
    3: { short: 'Wed', long: 'Wednesday' },
    4: { short: 'Thu', long: 'Thursday' },
    5: { short: 'Fri', long: 'Friday' },
    6: { short: 'Sat', long: 'Saturday' },
  };

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0]; // Mon-first display order
