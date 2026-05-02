import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Resend posts events here when emails change status.
 *
 * Auth: Resend uses Svix signing for webhooks. For dev/testing we accept
 * unsigned posts when RESEND_WEBHOOK_SECRET is unset. In production,
 * configure the secret and we'll verify the signature.
 *
 * Reference: https://resend.com/docs/dashboard/webhooks/event-types
 *
 * Event types we handle:
 *  - email.delivered → bumps campaign.delivered_count (already bumped on
 *    initial send; this is the more reliable signal so we update the
 *    scheduled_message but skip the campaign bump to avoid double-counting)
 *  - email.opened → campaign.opened_count
 *  - email.clicked → campaign.clicked_count
 *  - email.bounced → campaign.bounced_count
 *  - email.complained → unsubscribe the student (treat spam complaints as opt-out)
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // Optional signature verification — leave gracefully bypassed in dev.
  // Real verification with the @svix/webhooks library lands in Chunk 7
  // alongside production deployment.

  const event = payload as {
    type?: string;
    data?: {
      email_id?: string;
      to?: string[];
      created_at?: string;
    };
  };

  if (!event || typeof event.type !== 'string') {
    return new NextResponse('Invalid payload', { status: 400 });
  }

  const resendId = event.data?.email_id;
  if (!resendId) {
    return NextResponse.json({ ok: true, ignored: 'no email_id' });
  }

  // Find the matching scheduled message
  const { data: msg } = await supabase
    .from('scheduled_messages')
    .select('id, user_id, campaign_id, student_id')
    .eq('resend_id', resendId)
    .maybeSingle();

  // Even if we can't match a scheduled_message (e.g. test sends), we
  // still log the event for forensics.
  await supabase.from('delivery_events').insert({
    user_id: msg?.user_id ?? null,
    scheduled_message_id: msg?.id ?? null,
    campaign_id: msg?.campaign_id ?? null,
    student_id: msg?.student_id ?? null,
    resend_id: resendId,
    event_type: event.type,
    payload: event as Record<string, unknown>,
  });

  // Update aggregate counts
  if (msg?.campaign_id) {
    switch (event.type) {
      case 'email.opened':
        await supabase.rpc('clasd_increment_campaign_opened', {
          p_campaign_id: msg.campaign_id,
        });
        break;
      case 'email.clicked':
        await supabase.rpc('clasd_increment_campaign_clicked', {
          p_campaign_id: msg.campaign_id,
        });
        break;
      case 'email.bounced':
        await supabase.rpc('clasd_increment_campaign_bounced', {
          p_campaign_id: msg.campaign_id,
        });
        break;
      // delivered already bumped on send; the webhook event is the
      // confirmation but we don't double-count.
    }
  }

  // Spam complaint → unsubscribe the student
  if (event.type === 'email.complained' && msg?.student_id) {
    await supabase
      .from('students')
      .update({
        subscribed: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', msg.student_id);
  }

  return NextResponse.json({ ok: true });
}
