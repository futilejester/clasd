import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPolar } from '@/lib/polar';

export const dynamic = 'force-dynamic';

/**
 * Cancel the user's Polar subscription at period end.
 *
 * The user keeps Pro access until their billing period ends — we don't
 * flip plan to 'free' immediately. A nightly verify task could re-check
 * subscription status; for now we trust the next checkout-success flow
 * or a manual sync to reconcile.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('polar_subscription_id')
    .eq('id', user.id)
    .single();

  if (!profile?.polar_subscription_id) {
    return NextResponse.json(
      { error: 'No active subscription' },
      { status: 400 }
    );
  }

  try {
    const polar = getPolar();
    await polar.subscriptions.update({
      id: profile.polar_subscription_id,
      subscriptionUpdate: {
        cancelAtPeriodEnd: true,
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Failed to cancel subscription';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
