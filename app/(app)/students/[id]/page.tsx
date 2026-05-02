import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Mail,
  MailOpen,
  MousePointerClick,
  AlertCircle,
  XCircle,
  UserPlus,
  ClipboardCheck,
  BellOff,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, relativeTime } from '@/lib/dates';

interface ActivityEvent {
  id: string;
  kind: string;
  at: string;
  detail: string;
}

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!student) notFound();

  // Pull all activity in parallel
  const [
    { data: enrolments },
    { data: sentMessages },
    { data: events },
  ] = await Promise.all([
    supabase
      .from('enrolments')
      .select('id, joined_at, classes(id, title)')
      .eq('student_id', student.id)
      .order('joined_at', { ascending: false }),
    supabase
      .from('scheduled_messages')
      .select(
        'id, sent_at, rendered_subject, campaign_id, reminder_kind, campaigns(name)'
      )
      .eq('student_id', student.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false }),
    supabase
      .from('delivery_events')
      .select('id, event_type, created_at, scheduled_message_id')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Merge into single timeline, newest first
  const timeline: ActivityEvent[] = [];

  for (const e of enrolments ?? []) {
    const cls = e.classes as unknown as { id: string; title: string } | null;
    timeline.push({
      id: `enr-${e.id}`,
      kind: 'enrolled',
      at: e.joined_at,
      detail: cls ? `Enrolled in ${cls.title}` : 'Enrolled',
    });
  }

  for (const m of sentMessages ?? []) {
    if (!m.sent_at) continue;
    const c = m.campaigns as unknown as { name: string } | null;
    let label: string;
    if (m.reminder_kind === 'session_24h') {
      label = `Reminder: ${m.rendered_subject ?? 'session reminder'}`;
    } else if (c) {
      label = `Campaign: ${c.name}`;
    } else {
      label = m.rendered_subject ?? 'Email sent';
    }
    timeline.push({
      id: `msg-${m.id}`,
      kind: 'sent',
      at: m.sent_at,
      detail: label,
    });
  }

  for (const ev of events ?? []) {
    const map: Record<string, string> = {
      'email.delivered': 'Email delivered',
      'email.opened': 'Email opened',
      'email.clicked': 'Email link clicked',
      'email.bounced': 'Email bounced',
      'email.complained': 'Marked as spam',
    };
    const detail = map[ev.event_type] ?? ev.event_type;
    timeline.push({
      id: `ev-${ev.id}`,
      kind: ev.event_type,
      at: ev.created_at,
      detail,
    });
  }

  if (student.unsubscribed_at) {
    timeline.push({
      id: `unsub-${student.id}`,
      kind: 'unsubscribed',
      at: student.unsubscribed_at,
      detail: 'Unsubscribed',
    });
  }

  timeline.push({
    id: `created-${student.id}`,
    kind: 'created',
    at: student.created_at,
    detail: 'Added to your audience',
  });

  // Sort newest first
  timeline.sort((a, b) => (b.at < a.at ? -1 : b.at > a.at ? 1 : 0));

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/students"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Student
          </p>
          <h1 className="font-display text-4xl tracking-tight break-words">
            {student.name || student.email}
          </h1>
          <p className="text-slate-600 mt-2">{student.email}</p>
          {student.phone ? (
            <p className="text-sm text-slate-500 mt-0.5">{student.phone}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {student.subscribed ? (
              <Badge tone="success">Subscribed</Badge>
            ) : (
              <Badge tone="neutral">Unsubscribed</Badge>
            )}
            {(student.tags ?? []).map((t: string) => (
              <Badge key={t} tone="info">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <Link href={`/students/${student.id}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
      </header>

      {(enrolments ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Enrolled in</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {(enrolments ?? []).map((e) => {
                const cls = e.classes as unknown as {
                  id: string;
                  title: string;
                } | null;
                return cls ? (
                  <li key={e.id}>
                    <Link
                      href={`/classes/${cls.id}`}
                      className="text-clay-600 hover:underline"
                    >
                      {cls.title}
                    </Link>
                    <span className="text-xs text-slate-500 ml-2">
                      since {relativeTime(e.joined_at)}
                    </span>
                  </li>
                ) : null;
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ol className="relative border-l border-cream-300 ml-3 space-y-4 pt-1 pb-1">
              {timeline.map((e) => (
                <li key={e.id} className="ml-6">
                  <span className="absolute -left-[11px] flex items-center justify-center w-[22px] h-[22px] rounded-full bg-cream-50 border border-cream-300">
                    {iconFor(e.kind)}
                  </span>
                  <p className="text-sm text-slate-900">{e.detail}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateTime(e.at)} · {relativeTime(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {student.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {student.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function iconFor(kind: string): React.ReactNode {
  const cls = 'h-3 w-3';
  switch (kind) {
    case 'created':
      return <UserPlus className={cls + ' text-slate-500'} />;
    case 'enrolled':
      return <ClipboardCheck className={cls + ' text-sage-600'} />;
    case 'sent':
      return <Mail className={cls + ' text-clay-500'} />;
    case 'email.delivered':
      return <Mail className={cls + ' text-sage-600'} />;
    case 'email.opened':
      return <MailOpen className={cls + ' text-sage-600'} />;
    case 'email.clicked':
      return <MousePointerClick className={cls + ' text-clay-600'} />;
    case 'email.bounced':
      return <AlertCircle className={cls + ' text-red-600'} />;
    case 'email.complained':
      return <XCircle className={cls + ' text-red-600'} />;
    case 'unsubscribed':
      return <BellOff className={cls + ' text-slate-500'} />;
    default:
      return <Mail className={cls + ' text-slate-400'} />;
  }
}
