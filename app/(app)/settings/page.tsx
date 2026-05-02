import { Sparkles, Check, Settings as SettingsIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FREE_LIMITS } from '@/lib/limits';
import { UpgradeButton } from './upgrade-button';
import { CancelButton } from './cancel-button';
import { DangerZone } from './danger-zone';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { upgraded?: string; checkout?: string; msg?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, full_name, polar_subscription_id')
    .eq('id', user!.id)
    .single();

  const isPro = profile?.plan === 'pro';

  const [
    { count: studentsCount },
    { count: formsCount },
    { count: segmentsCount },
  ] = await Promise.all([
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id),
    supabase
      .from('signup_forms')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('active', true),
    supabase
      .from('segments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id),
  ]);

  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count: emailsCount } = await supabase
    .from('scheduled_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('status', 'sent')
    .gte('sent_at', start.toISOString());

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          Settings
        </p>
        <h1 className="font-display text-4xl tracking-tight">Settings</h1>
      </header>

      {searchParams.upgraded === '1' ? (
        <div className="rounded-lg bg-sage-100 border border-sage-200 px-4 py-3 text-sm text-sage-700">
          Welcome to Clasd Pro! Your subscription is active.
        </div>
      ) : null}
      {searchParams.checkout === 'incomplete' ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Checkout was not completed. If you tried to pay and it didn’t go
          through, try again.
        </div>
      ) : null}
      {searchParams.checkout === 'error' && searchParams.msg ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Checkout error: {searchParams.msg}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-clay-500" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Name</dt>
              <dd className="text-slate-900">
                {profile?.full_name || (
                  <span className="italic text-slate-400">Not set</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Plan</dt>
              <dd>
                {isPro ? (
                  <Badge tone="accent">
                    <Sparkles className="h-3 w-3" />
                    Pro
                  </Badge>
                ) : (
                  <Badge tone="neutral">Free</Badge>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <>
              <p className="text-slate-700">
                You’re on the <strong>Pro</strong> plan. Unlimited students,
                emails, forms, and segments.
              </p>
              <CancelButton />
            </>
          ) : (
            <>
              <p className="text-slate-700">
                You’re on the <strong>Free</strong> plan. Upgrade for
                unlimited usage and segment-targeted campaigns.
              </p>

              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-sage-500 mt-0.5 shrink-0" />
                  Unlimited students, emails, forms
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-sage-500 mt-0.5 shrink-0" />
                  Segments — target campaigns by attendance, payment, tags
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-sage-500 mt-0.5 shrink-0" />
                  Embeddable signup forms for your website
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-sage-500 mt-0.5 shrink-0" />
                  Cancel anytime — keeps Pro until period ends
                </li>
              </ul>

              <UpgradeButton />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This month’s usage</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label="Students"
              used={studentsCount ?? 0}
              limit={isPro ? null : FREE_LIMITS.students}
            />
            <Stat
              label="Emails sent"
              used={emailsCount ?? 0}
              limit={isPro ? null : FREE_LIMITS.emailsPerMonth}
            />
            <Stat
              label="Active forms"
              used={formsCount ?? 0}
              limit={isPro ? null : FREE_LIMITS.activeForms}
            />
            <Stat
              label="Segments"
              used={segmentsCount ?? 0}
              limit={isPro ? null : FREE_LIMITS.segments}
            />
          </dl>
          {!isPro ? (
            <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-cream-200">
              Going over a limit doesn’t break existing data — it just blocks
              new additions until you upgrade or remove some.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <DangerZone userEmail={user?.email ?? ''} />
    </div>
  );
}

function Stat({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const overLimit = limit !== null && used >= limit;
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-display text-2xl tracking-tight mt-0.5">
        {used}
        {limit !== null ? (
          <span
            className={
              overLimit
                ? 'text-base text-red-600 font-sans ml-1'
                : 'text-base text-slate-400 font-sans ml-1'
            }
          >
            / {limit}
          </span>
        ) : (
          <span className="text-base text-sage-600 font-sans ml-1">∞</span>
        )}
      </dd>
    </div>
  );
}
