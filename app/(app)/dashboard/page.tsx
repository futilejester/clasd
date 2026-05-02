import Link from 'next/link';
import {
  Calendar,
  Users,
  Send,
  Mail,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle2,
  Bell,
  ClipboardList,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, relativeTime } from '@/lib/dates';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single();

  // ---------- Subscriber stats (spec: subscriber counts) ----------
  const [
    { count: totalStudents },
    { count: subscribedStudents },
    { count: classesCount },
    { count: upcomingSessionsCount },
  ] = await Promise.all([
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true),
    supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false),
    supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('starts_at', new Date().toISOString())
      .eq('status', 'scheduled'),
  ]);

  // Students added in last 7 days
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { count: newStudentsCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);

  // ---------- Campaign stats (spec: campaign stats) ----------
  const { data: campaignTotals } = await supabase
    .from('campaigns')
    .select(
      'recipient_count, delivered_count, opened_count, bounced_count, status'
    );
  const campaignStats = (campaignTotals ?? []).reduce(
    (acc, c) => {
      acc.totalCampaigns += 1;
      acc.totalRecipients += c.recipient_count ?? 0;
      acc.totalDelivered += c.delivered_count ?? 0;
      acc.totalOpened += c.opened_count ?? 0;
      acc.totalBounced += c.bounced_count ?? 0;
      if (c.status === 'sent') acc.sent += 1;
      if (c.status === 'draft') acc.draft += 1;
      return acc;
    },
    {
      totalCampaigns: 0,
      totalRecipients: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalBounced: 0,
      sent: 0,
      draft: 0,
    }
  );

  const openRate =
    campaignStats.totalDelivered > 0
      ? Math.round(
          (campaignStats.totalOpened / campaignStats.totalDelivered) * 100
        )
      : 0;

  // ---------- Recent activity (spec: recent activity) ----------
  const [
    { data: recentEnrolments },
    { data: recentCampaigns },
    { data: recentSessions },
    pendingMessages,
  ] = await Promise.all([
    supabase
      .from('enrolments')
      .select(
        'id, joined_at, students(name, email), classes(id, title)'
      )
      .order('joined_at', { ascending: false })
      .limit(5),
    supabase
      .from('campaigns')
      .select('id, name, status, sent_at, delivered_count, recipient_count')
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(5),
    supabase
      .from('class_sessions')
      .select(
        'id, starts_at, status, classes(id, title)'
      )
      .gte('starts_at', new Date().toISOString())
      .eq('status', 'scheduled')
      .order('starts_at', { ascending: true })
      .limit(5),
    supabase
      .from('scheduled_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString()),
  ]);

  const pendingCount = pendingMessages.count ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          Dashboard
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          {greeting()}
          {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-slate-600 mt-1">Here&apos;s your week.</p>
      </header>

      {(totalStudents ?? 0) === 0 && (classesCount ?? 0) === 0 ? (
        <EmptyDashboard />
      ) : (
        <>
          {/* Subscriber counts (spec requirement #1) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Subscribed students"
              value={subscribedStudents ?? 0}
              total={totalStudents ?? 0}
              hint={
                (newStudentsCount ?? 0) > 0
                  ? `+${newStudentsCount} this week`
                  : undefined
              }
              icon={<Users className="h-4 w-4" />}
              href="/students"
            />
            <StatCard
              label="Active classes"
              value={classesCount ?? 0}
              icon={<Calendar className="h-4 w-4" />}
              href="/classes"
            />
            <StatCard
              label="Upcoming sessions"
              value={upcomingSessionsCount ?? 0}
              icon={<Calendar className="h-4 w-4" />}
              href="/classes"
            />
            <StatCard
              label="Campaigns sent"
              value={campaignStats.sent}
              hint={
                campaignStats.draft > 0
                  ? `${campaignStats.draft} drafts`
                  : undefined
              }
              icon={<Send className="h-4 w-4" />}
              href="/campaigns"
            />
          </section>

          {/* Campaign stats (spec requirement #2) */}
          {campaignStats.totalCampaigns > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-clay-500" />
                  Campaign performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <PerfStat
                    label="Total recipients"
                    value={campaignStats.totalRecipients}
                  />
                  <PerfStat
                    label="Delivered"
                    value={campaignStats.totalDelivered}
                  />
                  <PerfStat
                    label="Open rate"
                    value={`${openRate}%`}
                    hint={`${campaignStats.totalOpened} opens`}
                  />
                  <PerfStat
                    label="Bounced"
                    value={campaignStats.totalBounced}
                    tone={
                      campaignStats.totalBounced > 0 ? 'warning' : 'normal'
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {/* Pending queue alert */}
          {pendingCount > 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <Bell className="h-4 w-4" />
                {pendingCount} message
                {pendingCount === 1 ? '' : 's'} ready to send.
              </div>
              <Link href="/campaigns">
                <Button variant="outline" size="sm">
                  Run queue
                </Button>
              </Link>
            </div>
          ) : null}

          {/* Recent activity (spec requirement #3) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-clay-500" />
                  Recent enrolments
                </CardTitle>
                <Link
                  href="/students"
                  className="text-xs text-clay-600 hover:text-clay-700 inline-flex items-center gap-0.5"
                >
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {!recentEnrolments || recentEnrolments.length === 0 ? (
                  <p className="text-sm text-slate-500">No enrolments yet.</p>
                ) : (
                  <ul className="divide-y divide-cream-200">
                    {recentEnrolments.map((e) => {
                      const stu = e.students as unknown as {
                        name: string | null;
                        email: string;
                      } | null;
                      const cls = e.classes as unknown as {
                        id: string;
                        title: string;
                      } | null;
                      return (
                        <li
                          key={e.id}
                          className="py-2 flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-900 truncate">
                              {stu?.name || stu?.email}
                            </p>
                            {cls ? (
                              <p className="text-xs text-slate-500 truncate">
                                joined {cls.title}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500 shrink-0">
                            {relativeTime(e.joined_at)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-clay-500" />
                  Recent campaigns
                </CardTitle>
                <Link
                  href="/campaigns"
                  className="text-xs text-clay-600 hover:text-clay-700 inline-flex items-center gap-0.5"
                >
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {!recentCampaigns || recentCampaigns.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No campaigns sent yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-cream-200">
                    {recentCampaigns.map((c) => (
                      <li key={c.id} className="py-2 text-sm">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="flex items-center justify-between gap-2 hover:text-clay-700"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-900 truncate">{c.name}</p>
                            <p className="text-xs text-slate-500">
                              {c.delivered_count}/{c.recipient_count}{' '}
                              delivered
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 shrink-0">
                            {c.sent_at ? relativeTime(c.sent_at) : '—'}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming sessions */}
          {recentSessions && recentSessions.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-clay-500" />
                  Coming up
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-cream-200">
                  {recentSessions.map((s) => {
                    const cls = s.classes as unknown as {
                      id: string;
                      title: string;
                    } | null;
                    return (
                      <li
                        key={s.id}
                        className="py-2 flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-900 truncate">
                            {cls?.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(s.starts_at)}
                          </p>
                        </div>
                        <Badge tone="info">{relativeTime(s.starts_at)}</Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

function StatCard({
  label,
  value,
  total,
  hint,
  icon,
  href,
}: {
  label: string;
  value: number;
  total?: number;
  hint?: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-cream-300 bg-cream-50 p-4 hover:border-clay-300 hover:shadow-card transition-all"
    >
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="font-display text-3xl tracking-tight mt-2">
        {value}
        {total !== undefined && total !== value ? (
          <span className="text-base text-slate-400 font-sans ml-1">
            / {total}
          </span>
        ) : null}
      </p>
      {hint ? (
        <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
      ) : null}
    </Link>
  );
}

function PerfStat({
  label,
  value,
  hint,
  tone = 'normal',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'normal' | 'warning';
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd
        className={
          'font-display text-2xl tracking-tight mt-0.5 ' +
          (tone === 'warning' ? 'text-amber-700' : '')
        }
      >
        {value}
      </dd>
      {hint ? (
        <p className="text-2xs font-mono uppercase tracking-wider text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <Card className="text-center py-12">
      <CardContent className="space-y-4">
        <div className="h-14 w-14 rounded-full bg-clay-100 text-clay-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl tracking-tight">
          Welcome to Clasd!
        </h2>
        <p className="text-slate-600 max-w-md mx-auto">
          Get started by creating your first class — students, sessions, and
          email campaigns flow from there.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
          <Link href="/classes/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              Create a class
            </Button>
          </Link>
          <Link href="/forms/new">
            <Button variant="outline">
              <ClipboardList className="h-4 w-4" />
              Build a signup form
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
