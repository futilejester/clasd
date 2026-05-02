import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarPlus,
  Edit,
  Archive,
  ArchiveRestore,
  MapPin,
  User,
  Clock,
  UserPlus,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarSubscribeCard } from '@/components/calendar-subscribe-card';
import { formatDateTime, formatTime, isPast, relativeTime } from '@/lib/dates';
import { archiveClass, unarchiveClass } from '../actions';
import { SessionRowActions } from './session-actions-client';
import { AutoRemindCard } from './auto-remind-card';

export default async function ClassDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: cls } = await supabase
    .from('classes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!cls) notFound();

  const [{ data: sessions }, { data: enrolments }] = await Promise.all([
    supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', params.id)
      .order('starts_at', { ascending: true }),
    supabase
      .from('enrolments')
      .select(
        'id, status, payment_status, skill_level, attendance_count, joined_at, student_id, students(id, name, email, subscribed)'
      )
      .eq('class_id', params.id)
      .order('joined_at', { ascending: false }),
  ]);

  const upcoming = (sessions ?? []).filter(
    (s) => s.status !== 'completed' && !isPast(s.starts_at)
  );
  const past = (sessions ?? []).filter(
    (s) => s.status === 'completed' || isPast(s.starts_at)
  );

  const activeEnrolments = (enrolments ?? []).filter(
    (e) => e.status === 'active' || e.status === 'paused'
  );

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const subscribeUrl = `${appUrl}/cal/${cls.id}/calendar.ics?token=${cls.calendar_token}`;
  const webcalUrl = subscribeUrl.replace(/^https?:\/\//, 'webcal://');

  return (
    <div className="space-y-8 max-w-4xl">
      <Link
        href="/classes"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to classes
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Class
          </p>
          <h1 className="font-display text-4xl tracking-tight break-words">
            {cls.title}
            {cls.archived ? (
              <Badge tone="neutral" className="ml-3 align-middle">
                Archived
              </Badge>
            ) : null}
          </h1>
          {cls.description ? (
            <p className="text-slate-600 mt-2 whitespace-pre-wrap">
              {cls.description}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-slate-600">
            {cls.instructor_name ? (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {cls.instructor_name}
              </span>
            ) : null}
            {cls.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {cls.location}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {cls.default_duration_minutes} min default
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {activeEnrolments.length} enrolled
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/classes/${cls.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          {cls.archived ? (
            <form
              action={async () => {
                'use server';
                await unarchiveClass(cls.id);
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                <ArchiveRestore className="h-3.5 w-3.5" />
                Restore
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                'use server';
                await archiveClass(cls.id);
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            </form>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CalendarSubscribeCard
          subscribeUrl={subscribeUrl}
          webcalUrl={webcalUrl}
        />
        <AutoRemindCard
          classId={cls.id}
          initialEnabled={cls.auto_remind}
          initialLeadMinutes={cls.auto_remind_lead_minutes}
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-tight">
            Enrolled students{' '}
            <span className="text-slate-400 font-sans text-base">
              ({enrolments?.length ?? 0})
            </span>
          </h2>
          <Link href={`/classes/${cls.id}/enrol`}>
            <Button variant="outline" size="sm">
              <UserPlus className="h-3.5 w-3.5" />
              Enrol student
            </Button>
          </Link>
        </div>

        {!enrolments || enrolments.length === 0 ? (
          <EmptyState
            title="No students enrolled yet"
            description="Add a student manually, or share a public signup form so people can enrol themselves."
            action={
              <div className="flex gap-2">
                <Link href={`/classes/${cls.id}/enrol`}>
                  <Button variant="primary">
                    <UserPlus className="h-4 w-4" />
                    Enrol student
                  </Button>
                </Link>
                <Link href="/forms/new">
                  <Button variant="outline">Create signup form</Button>
                </Link>
              </div>
            }
          />
        ) : (
          <ul className="divide-y divide-cream-300 border border-cream-300 rounded-lg overflow-hidden bg-cream-50">
            {enrolments.map((e) => {
              const stu = e.students as unknown as {
                id: string;
                name: string | null;
                email: string;
                subscribed: boolean;
              } | null;
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-cream-100 transition-colors"
                >
                  <Link
                    href={`/students/${e.student_id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="font-medium text-slate-900 truncate">
                      {stu?.name || stu?.email || 'Student'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stu?.email}
                      {stu && !stu.subscribed ? ' · unsubscribed' : ''}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 text-xs">
                    {e.skill_level ? (
                      <Badge tone="info">{e.skill_level}</Badge>
                    ) : null}
                    {e.payment_status === 'paid' ? (
                      <Badge tone="success">Paid</Badge>
                    ) : e.payment_status === 'unpaid' ? (
                      <Badge tone="warning">Unpaid</Badge>
                    ) : (
                      <Badge tone="neutral">{e.payment_status}</Badge>
                    )}
                    {e.status !== 'active' ? (
                      <Badge tone="neutral">{e.status}</Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-tight">
            Upcoming sessions{' '}
            <span className="text-slate-400 font-sans text-base">
              ({upcoming.length})
            </span>
          </h2>
          <Link href={`/classes/${cls.id}/sessions/new`}>
            <Button variant="outline" size="sm">
              <CalendarPlus className="h-3.5 w-3.5" />
              Add session
            </Button>
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming sessions"
            description="Add a one-off session to get started, or archive this class if you’re done with it."
            action={
              <Link href={`/classes/${cls.id}/sessions/new`}>
                <Button variant="primary">
                  <CalendarPlus className="h-4 w-4" />
                  Add session
                </Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-cream-300 border border-cream-300 rounded-lg overflow-hidden bg-cream-50">
            {upcoming.map((s) => (
              <SessionRow key={s.id} session={s} classId={cls.id} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">
            Past sessions{' '}
            <span className="text-slate-400 font-sans text-base">
              ({past.length})
            </span>
          </h2>
          <ul className="divide-y divide-cream-300 border border-cream-300 rounded-lg overflow-hidden bg-cream-50">
            {past
              .slice()
              .reverse()
              .map((s) => (
                <SessionRow key={s.id} session={s} classId={cls.id} />
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SessionRow({
  session,
  classId,
}: {
  session: {
    id: string;
    starts_at: string;
    ends_at: string;
    status: 'scheduled' | 'cancelled' | 'completed';
    capacity: number | null;
    notes: string | null;
  };
  classId: string;
}) {
  const past = isPast(session.starts_at);

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-cream-100 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-900">
            {formatDateTime(session.starts_at)}
          </span>
          <span className="text-sm text-slate-500">
            – {formatTime(session.ends_at)}
          </span>
          {session.status === 'cancelled' ? (
            <Badge tone="danger">Cancelled</Badge>
          ) : session.status === 'completed' ? (
            <Badge tone="success">Completed</Badge>
          ) : past ? (
            <Badge tone="warning">Awaiting</Badge>
          ) : (
            <Badge tone="info">{relativeTime(session.starts_at)}</Badge>
          )}
        </div>
        {session.capacity ? (
          <p className="text-xs text-slate-500 mt-0.5">
            Capacity: {session.capacity}
          </p>
        ) : null}
        {session.notes ? (
          <p className="text-sm text-slate-600 mt-1 line-clamp-1">
            {session.notes}
          </p>
        ) : null}
      </div>
      <SessionRowActions
        sessionId={session.id}
        classId={classId}
        status={session.status}
      />
    </li>
  );
}
