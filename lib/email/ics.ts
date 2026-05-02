import ical, {
  ICalCalendarMethod,
  ICalEventStatus,
  type ICalCalendar,
} from 'ical-generator';

interface IcsSession {
  id: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  notes: string | null;
}

interface IcsClass {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  instructor_name: string | null;
}

interface SenderInfo {
  name: string | null;
  email: string;
}

/**
 * Build a calendar containing one or more sessions.
 *
 * `method` controls how mail clients treat the file:
 *  - 'PUBLISH' for subscribable feeds (read-only)
 *  - 'REQUEST' for invites attached to emails (creates an RSVP-able event)
 *
 * UID format: `session-<id>@clasd.app` — stable per session, so updates to
 * an existing event (e.g. time change, cancellation) overwrite rather than
 * duplicating.
 */
function buildCalendar(args: {
  cls: IcsClass;
  sessions: IcsSession[];
  sender: SenderInfo;
  method: 'PUBLISH' | 'REQUEST';
  appUrl: string;
}): ICalCalendar {
  const { cls, sessions, sender, method, appUrl } = args;

  const calendar = ical({
    name: cls.title,
    description: cls.description ?? undefined,
    prodId: { company: 'Clasd', product: 'Clasd', language: 'EN' },
    method:
      method === 'PUBLISH'
        ? ICalCalendarMethod.PUBLISH
        : ICalCalendarMethod.REQUEST,
    timezone: 'UTC',
    url: `${appUrl}/cal/${cls.id}.ics`,
  });

  for (const s of sessions) {
    const event = calendar.createEvent({
      id: `session-${s.id}@clasd.app`,
      start: new Date(s.starts_at),
      end: new Date(s.ends_at),
      summary: cls.title,
      description: [cls.description, s.notes].filter(Boolean).join('\n\n') || undefined,
      location: cls.location ?? undefined,
      url: `${appUrl}/classes/${cls.id}`,
      status:
        s.status === 'cancelled'
          ? ICalEventStatus.CANCELLED
          : ICalEventStatus.CONFIRMED,
      organizer: {
        name: cls.instructor_name || sender.name || 'Instructor',
        email: sender.email,
      },
    });
    // Cancellations should be visually obvious in subscribed calendars.
    if (s.status === 'cancelled') {
      event.summary(`CANCELLED: ${cls.title}`);
    }
  }

  return calendar;
}

/**
 * Public subscribable calendar feed — all upcoming + recent sessions for a class.
 */
export function buildClassFeed(args: {
  cls: IcsClass;
  sessions: IcsSession[];
  sender: SenderInfo;
  appUrl: string;
}): string {
  return buildCalendar({
    ...args,
    method: 'PUBLISH',
  }).toString();
}

/**
 * Single-session ICS for attaching to a campaign email.
 * Returns a Buffer suitable for the Resend attachment field.
 */
export function buildSessionInvite(args: {
  cls: IcsClass;
  session: IcsSession;
  sender: SenderInfo;
  appUrl: string;
}): { content: string; filename: string } {
  const ics = buildCalendar({
    cls: args.cls,
    sessions: [args.session],
    sender: args.sender,
    method: 'REQUEST',
    appUrl: args.appUrl,
  }).toString();

  // Filename suggestion that mail clients display before downloading
  const filename = `${slugFile(args.cls.title)}-${args.session.id.slice(0, 8)}.ics`;
  return { content: ics, filename };
}

function slugFile(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'session';
}
