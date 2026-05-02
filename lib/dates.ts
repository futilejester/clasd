/**
 * Date and time formatting helpers. All take ISO strings (UTC) and format
 * them in the browser's local time zone.
 */

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateLongFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateLong(iso: string): string {
  return dateLongFormatter.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/**
 * Convert an ISO string to the value format expected by a
 * <input type="datetime-local"> control. The control wants
 * local time without a timezone suffix, e.g. "2026-05-12T18:00".
 */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert a datetime-local input value (in user's local time) back to an
 * ISO string in UTC for storage.
 */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/**
 * Friendly relative-time string for things like "starts in 2 hours".
 */
export function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const future = diff > 0;

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return future ? 'in a moment' : 'just now';
  if (abs < hour) {
    const m = Math.round(abs / minute);
    return future ? `in ${m}m` : `${m}m ago`;
  }
  if (abs < day) {
    const h = Math.round(abs / hour);
    return future ? `in ${h}h` : `${h}h ago`;
  }
  if (abs < 7 * day) {
    const d = Math.round(abs / day);
    return future ? `in ${d}d` : `${d}d ago`;
  }
  return formatDate(iso);
}
