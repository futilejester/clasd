import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPolar } from '@/lib/polar';

export const dynamic = 'force-dynamic';

/**
 * Polar redirects here after successful checkout.
 *
 * The pending_checkout_id was stashed on profiles when we created the
 * checkout. We look it up, fetch the checkout from Polar, find the
 * resulting subscription (which may be created asynchronously), then
 * flip the user's plan.
 *
 * Subscription creation is async on Polar's side — the subscriptionId
 * field on the checkout object can be null right after payment. We
 * accept that and let the client poll /api/usage afterwards if needed.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('pending_checkout_id')
    .eq('id', user.id)
    .single();

  const checkoutId = profile?.pending_checkout_id;
  if (!checkoutId) {
    // No pending checkout — bounce to settings with a generic message
    return NextResponse.redirect(`${appUrl}/settings?checkout=missing`);
  }

  try {
    const polar = getPolar();
    const checkout = await polar.checkouts.get({ id: checkoutId });

    // Status check — Polar returns 'succeeded' on completed payment, sometimes 'confirmed'
    const okStatuses = ['succeeded', 'confirmed', 'completed'];
    if (!okStatuses.includes(checkout.status as string)) {
      return NextResponse.redirect(
        `${appUrl}/settings?checkout=incomplete&status=${checkout.status}`
      );
    }

    // Subscription ID may be present on the checkout, or we may need
    // to look it up via the orders/subscriptions API.
    let subscriptionId: string | null =
      (checkout as unknown as { subscriptionId?: string | null })
        .subscriptionId ?? null;
    let customerId: string | null =
      (checkout as unknown as { customerId?: string | null }).customerId ??
      null;

    // Fallback: list subscriptions for this customer.
    if (!subscriptionId && customerId) {
      const subs = await polar.subscriptions.list({
        customerId,
        active: true,
      });
      const items =
        (subs as unknown as { result: { items: { id: string }[] } }).result
          ?.items ?? [];
      if (items.length > 0) {
        subscriptionId = items[0].id;
      }
    }

    await supabase
      .from('profiles')
      .update({
        plan: 'pro',
        polar_customer_id: customerId,
        polar_subscription_id: subscriptionId,
        pending_checkout_id: null,
      })
      .eq('id', user.id);

    return NextResponse.redirect(`${appUrl}/settings?upgraded=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.redirect(
      `${appUrl}/settings?checkout=error&msg=${encodeURIComponent(msg)}`
    );
  }
}
