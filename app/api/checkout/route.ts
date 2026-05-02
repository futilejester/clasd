import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProductId } from '@/lib/polar';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const polarBase =
    process.env.POLAR_SERVER === 'sandbox'
      ? 'https://sandbox-api.polar.sh'
      : 'https://api.polar.sh';
  const token = process.env.POLAR_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'POLAR_ACCESS_TOKEN not set' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${polarBase}/v1/checkouts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: [getProductId()],
        success_url: `${appUrl}/api/checkout/success`,
        customer_email: user.email ?? null,
        metadata: { user_id: user.id },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Polar checkout failed:', res.status, text);
      return NextResponse.json(
        { error: `Polar returned ${res.status}: ${text}` },
        { status: 500 }
      );
    }

    const checkout = await res.json();

    await supabase
      .from('profiles')
      .update({ pending_checkout_id: checkout.id })
      .eq('id', user.id);

    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    console.error('=== CHECKOUT ERROR ===');
    console.error(e);
    console.error('=== END ===');
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}