'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { renderEmail } from '@/lib/email/render';
import { renderMerge, sampleContext, type MergeContext } from '@/lib/email/merge';
import { getResend, getFromAddress } from '@/lib/email/resend';
import { buildSessionInvite } from '@/lib/email/ics';
import {
  processQueue,
  ensureRemindersForUpcomingSessions,
} from '@/lib/email/queue';

const baseSchema = {
  name: z.string().min(1, 'Name is required').max(120),
  subject: z.string().min(1, 'Subject is required').max(200),
  body_html: z.string().max(60000).default(''),
  template_id: z.string().max(40).optional(),
  class_id: z.string().uuid().optional().or(z.literal('')),
  segment_id: z.string().uuid().optional().or(z.literal('')),
  attach_ics: z.boolean().default(false),
  ics_session_id: z.string().uuid().optional().or(z.literal('')),
};

const createSchema = z.object(baseSchema);
const updateSchema = z.object({ id: z.string().uuid(), ...baseSchema });

export async function createCampaign(input: z.infer<typeof createSchema>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const { data: created, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      name: d.name,
      subject: d.subject,
      body_html: d.body_html,
      template_id: d.template_id || null,
      class_id: d.class_id || null,
      segment_id: d.segment_id || null,
      attach_ics: d.attach_ics,
      ics_session_id: d.ics_session_id || null,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !created) {
    return { error: error?.message ?? 'Failed to create campaign' };
  }

  revalidatePath('/campaigns');
  redirect(`/campaigns/${created.id}/edit`);
}

export async function updateCampaign(input: z.infer<typeof updateSchema>) {
  const supabase = createClient();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from('campaigns')
    .update({
      name: d.name,
      subject: d.subject,
      body_html: d.body_html,
      template_id: d.template_id || null,
      class_id: d.class_id || null,
      segment_id: d.segment_id || null,
      attach_ics: d.attach_ics,
      ics_session_id: d.ics_session_id || null,
    })
    .eq('id', d.id);

  if (error) return { error: error.message };

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${d.id}`);
  return { success: true };
}

export async function deleteCampaign(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/campaigns');
  redirect('/campaigns');
}

/**
 * Test send — single email to current user with sample data.
 */
export async function sendTestEmail(args: {
  campaign_id: string;
  to_email: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select(
      'id, name, subject, body_html, attach_ics, ics_session_id, class_id'
    )
    .eq('id', args.campaign_id)
    .single();
  if (!campaign) return { error: 'Campaign not found' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const ctx: MergeContext = sampleContext();
  ctx.sender = { name: profile?.full_name ?? 'You' };
  ctx.student = { name: 'Test Recipient', email: args.to_email };

  if (campaign.class_id) {
    const { data: cls } = await supabase
      .from('classes')
      .select('title, instructor_name, location')
      .eq('id', campaign.class_id)
      .single();
    if (cls) {
      ctx.class = {
        title: cls.title,
        instructor: cls.instructor_name,
        location: cls.location,
      };
    }
  }

  const subject = `[TEST] ${renderMerge(campaign.subject, ctx)}`;
  const bodyHtml = renderMerge(campaign.body_html ?? '', ctx);
  const { html, text } = await renderEmail({
    bodyHtml,
    senderName: profile?.full_name ?? null,
  });

  const attachments = await buildIcsAttachments(supabase, campaign);

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: args.to_email,
      subject,
      html,
      text,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    if (result.error) return { error: result.error.message };
    return { success: true, id: result.data?.id };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Failed to send test email',
    };
  }
}

/**
 * Queue a campaign for sending. Resolves the recipient set from segment
 * (preferred) or class, then inserts scheduled_messages rows. The cron
 * picks them up.
 *
 * For dev convenience we immediately invoke processQueue() so the user
 * gets fast feedback without waiting for the cron interval.
 */
export async function sendCampaign(campaignId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select(
      'id, name, subject, body_html, attach_ics, ics_session_id, class_id, segment_id, status'
    )
    .eq('id', campaignId)
    .single();
  if (!campaign) return { error: 'Campaign not found' };
  if (campaign.status !== 'draft' && campaign.status !== 'failed') {
    return { error: 'This campaign has already been sent or is in progress.' };
  }

  // Resolve recipients — segment_id wins over class_id
  let studentIds: string[] = [];

  if (campaign.segment_id) {
    const { data: segment } = await supabase
      .from('segments')
      .select('target, rules')
      .eq('id', campaign.segment_id)
      .single();
    if (!segment) return { error: 'Segment not found' };

    if (segment.target === 'students') {
      const { data, error } = await supabase.rpc('clasd_match_students', {
        p_user_id: user.id,
        p_rules: segment.rules,
      });
      if (error) return { error: error.message };
      studentIds = (data ?? []).map(
        (r: { id: string }) => r.id
      );
    } else {
      const { data, error } = await supabase.rpc('clasd_match_enrolments', {
        p_user_id: user.id,
        p_rules: segment.rules,
      });
      if (error) return { error: error.message };
      studentIds = Array.from(
        new Set(
          (data ?? []).map(
            (r: { student_id: string }) => r.student_id
          )
        )
      );
    }
  } else if (campaign.class_id) {
    const { data: enrolments } = await supabase
      .from('enrolments')
      .select('student_id, students(subscribed)')
      .eq('class_id', campaign.class_id)
      .eq('status', 'active');
    studentIds = (enrolments ?? [])
      .filter((e) => {
        const s = e.students as unknown as { subscribed: boolean } | null;
        return s?.subscribed === true;
      })
      .map((e) => e.student_id);
  } else {
    const { data: rows } = await supabase
      .from('students')
      .select('id')
      .eq('subscribed', true);
    studentIds = (rows ?? []).map((s) => s.id);
  }

  if (studentIds.length === 0) {
    return { error: 'No recipients matched.' };
  }

  // Mark campaign sending and recipient_count
  await supabase
    .from('campaigns')
    .update({
      status: 'sending',
      recipient_count: studentIds.length,
      delivered_count: 0,
      sent_at: null,
    })
    .eq('id', campaign.id);

  // Insert scheduled_messages — send_at = now (immediate)
  const nowIso = new Date().toISOString();
  const rows = studentIds.map((sid) => ({
    user_id: user.id,
    campaign_id: campaign.id,
    student_id: sid,
    send_at: nowIso,
    status: 'pending' as const,
  }));
  const { error: insErr } = await supabase
    .from('scheduled_messages')
    .insert(rows);
  if (insErr) {
    await supabase
      .from('campaigns')
      .update({ status: 'failed' })
      .eq('id', campaign.id);
    return { error: insErr.message };
  }

  // Inline-process for fast dev feedback
  const result = await processQueue(Math.min(studentIds.length, 50));

  // After processing, if all queued rows are 'sent', mark campaign sent
  const { count: stillPending } = await supabase
    .from('scheduled_messages')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .in('status', ['pending', 'processing']);

  if ((stillPending ?? 0) === 0) {
    await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);
  }

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaign.id}`);
  revalidatePath('/dashboard');

  return {
    success: true,
    queued: studentIds.length,
    sent: result.sent,
    failed: result.failed,
  };
}

/**
 * Manual run-queue button — useful in dev where we don't have Vercel Cron.
 */
export async function runQueueNow() {
  const reminders = await ensureRemindersForUpcomingSessions({});
  const queue = await processQueue(50);
  revalidatePath('/campaigns');
  revalidatePath('/dashboard');
  return {
    reminders_created: reminders.created,
    ...queue,
  };
}

// ----- helpers -----

async function buildIcsAttachments(
  supabase: ReturnType<typeof createClient>,
  campaign: {
    attach_ics: boolean;
    ics_session_id: string | null;
    class_id: string | null;
  }
): Promise<Array<{ filename: string; content: string }>> {
  if (!campaign.attach_ics || !campaign.ics_session_id || !campaign.class_id) {
    return [];
  }
  const [{ data: cls }, { data: session }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, title, description, location, instructor_name')
      .eq('id', campaign.class_id)
      .single(),
    supabase
      .from('class_sessions')
      .select('id, starts_at, ends_at, status, notes')
      .eq('id', campaign.ics_session_id)
      .single(),
  ]);
  if (!cls || !session) return [];

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const ics = buildSessionInvite({
    cls: {
      id: cls.id,
      title: cls.title,
      description: cls.description,
      location: cls.location,
      instructor_name: cls.instructor_name,
    },
    session: {
      id: session.id,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      status: session.status,
      notes: session.notes,
    },
    sender: {
      name: null,
      email: process.env.RESEND_FROM_EMAIL ?? 'noreply@clasd.app',
    },
    appUrl,
  });

  return [{ filename: ics.filename, content: ics.content }];
}
