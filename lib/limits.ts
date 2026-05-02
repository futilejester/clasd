/**
 * Plan limits and enforcement helpers.
 *
 * Limits are checked at the action layer so they apply consistently to
 * web app, public form submissions, and any future API access.
 *
 * Free tier:
 *   - 50 students max
 *   - 100 emails sent per calendar month
 *   - 1 active signup form
 *   - segments: not allowed (Pro feature)
 *
 * Pro tier:
 *   - Unlimited everything
 *
 * Limits are calculated from current state, not stored. This avoids drift
 * (e.g. a user manually deletes 10 students; our cached count would be wrong).
 *
 * The helpers return a result object rather than throwing — server actions
 * can decide whether to surface an upgrade prompt vs return an error.
 */

import { createClient } from '@/lib/supabase/server';

export const FREE_LIMITS = {
  students: 50,
  emailsPerMonth: 100,
  activeForms: 1,
  segments: 0,
} as const;

export type LimitKind = keyof typeof FREE_LIMITS;

export interface LimitCheck {
  ok: boolean;
  plan: 'free' | 'pro';
  limit: number | null; // null means unlimited
  used: number;
  remaining: number | null;
  message?: string;
}

/**
 * Get the user's current plan. Cheap — single column read.
 */
export async function getUserPlan(
  userId: string
): Promise<'free' | 'pro'> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();
  return (data?.plan as 'free' | 'pro') ?? 'free';
}

/**
 * Check whether a user can perform an action that increments `kind`.
 * Returns ok=true if Pro or under limit; ok=false with upgrade message otherwise.
 */
export async function checkLimit(
  userId: string,
  kind: LimitKind
): Promise<LimitCheck> {
  const plan = await getUserPlan(userId);

  if (plan === 'pro') {
    return {
      ok: true,
      plan: 'pro',
      limit: null,
      used: 0,
      remaining: null,
    };
  }

  const limit = FREE_LIMITS[kind];
  const used = await countUsage(userId, kind);
  const remaining = Math.max(0, limit - used);
  const ok = used < limit;

  return {
    ok,
    plan: 'free',
    limit,
    used,
    remaining,
    message: ok
      ? undefined
      : freeOveragesMessage(kind, limit),
  };
}

async function countUsage(userId: string, kind: LimitKind): Promise<number> {
  const supabase = createClient();
  switch (kind) {
    case 'students': {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count ?? 0;
    }
    case 'emailsPerMonth': {
      const start = new Date();
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'sent')
        .gte('sent_at', start.toISOString());
      return count ?? 0;
    }
    case 'activeForms': {
      const { count } = await supabase
        .from('signup_forms')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('active', true);
      return count ?? 0;
    }
    case 'segments': {
      const { count } = await supabase
        .from('segments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count ?? 0;
    }
  }
}

function freeOveragesMessage(kind: LimitKind, limit: number): string {
  switch (kind) {
    case 'students':
      return `You've reached the free plan limit of ${limit} students. Upgrade to Pro for unlimited.`;
    case 'emailsPerMonth':
      return `You've sent ${limit} emails this month — the free plan limit. Upgrade to Pro for unlimited.`;
    case 'activeForms':
      return `Free plan is limited to ${limit} active signup form. Upgrade to Pro for unlimited, or deactivate an existing form.`;
    case 'segments':
      return `Segments are a Pro feature. Upgrade to start building targeted lists.`;
  }
}

/**
 * Convenience for callers that just want to throw on exceeded.
 */
export async function assertLimit(
  userId: string,
  kind: LimitKind
): Promise<void> {
  const r = await checkLimit(userId, kind);
  if (!r.ok) {
    throw new LimitExceededError(
      r.message ?? `Free plan limit reached for ${kind}.`
    );
  }
}

export class LimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LimitExceededError';
  }
}
