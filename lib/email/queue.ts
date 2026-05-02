import { createServiceClient } from '@/lib/supabase/server';
import { renderEmail } from '@/lib/email/render';
import { renderMerge, type MergeContext } from '@/lib/email/merge';
import { getResend, getFromAddress } from '@/lib/email/resend';
import { buildSessionInvite } from '@/lib/email/ics';

interface ProcessResult {
  picked: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Pull due scheduled_messages from the queue and send them.
 *
 * - Picks up to `limit` rows whose `send_at <= now` and status='pending'.
 * - Marks them 'processing' before sending, so a parallel cron run won't
 *   re-pick them. (No row-level locking — at our scale "good enough" is
 *   the timestamp + status check.)
 * - On success, sets status='sent', resend_id, sent_at.
 * - On failure, sets status='failed', error message, increments attempts.
 * - Increments parent campaign's delivered_count when applicable.
 */
export async function processQueue(limit = 25): Promise<ProcessResult> {
  const supabase = createServiceClient();
  const result: ProcessResult = { picked: 0, sent: 0, failed: 0, errors: [] };

  const nowIso = new Date().toISOString();

  // Pull a batch
  const { data: due, error: pickErr } = await supabase
    .from('scheduled_messages')
    .select(
      'id, user_id, campaign_id, student_id, session_id, reminder_kind, send_at'
    )
    .eq('status', 'pending')
    .lte('send_at', nowIso)
    .order('send_at', { ascending: true })
    .limit(limit);

  if (pickErr) {
    result.errors.push(`pick: ${pickErr.message}`);
    return result;
  }
  if (!due || due.length === 0) return result;

  result.picked = due.length;

  // Mark them processing so a concurrent cron doesn't double-fire.
  const ids = due.map((m) => m.id);
  await supabase
    .from('scheduled_messages')
    .update({ status: 'processing' })
    .in('id', ids);

  for (const msg of due) {
    try {
      await sendOne(supabase, msg);
      result.sent += 1;
    } catch (e) {
      result.failed += 1;
      const errMsg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${msg.id}: ${errMsg}`);
      await supabase
        .from('scheduled_messages')
        .update({
          status: 'failed',
          error: errMsg,
          attempts: (msg as { attempts?: number }).attempts ?? 1,
        })
        .eq('id', msg.id);
    }
  }

  return result;
}

async function sendOne(
  supabase: ReturnType<typeof createServiceClient>,
  msg: {
    id: string;
    user_id: string;
    campaign_id: string | null;
    student_id: string;
    session_id: string | null;
    reminder_kind: string | null;
  }
) {
  // Fetch student
  const { data: student } = await supabase
    .from('students')
    .select('id, email, name, subscribed, unsubscribe_token')
    .eq('id', msg.student_id)
    .single();
  if (!student) throw new Error('Student not found');
  if (!student.subscribed) {
    throw new Error('Student is unsubscribed');
  }

  // Fetch sender profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', msg.user_id)
    .single();

  let subject = '';
  let bodyHtml = '';
  let attachIcsSessionId: string | null = null;
  let classCtx: MergeContext['class'] = undefined;

  if (msg.campaign_id) {
    // Sourced from a campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select(
        'subject, body_html, attach_ics, ics_session_id, class_id'
      )
      .eq('id', msg.campaign_id)
      .single();
    if (!campaign) throw new Error('Campaign not found');
    subject = campaign.subject;
    bodyHtml = campaign.body_html ?? '';
    if (campaign.attach_ics) attachIcsSessionId = campaign.ics_session_id;

    if (campaign.class_id) {
      const { data: cls } = await supabase
        .from('classes')
        .select('title, instructor_name, location')
        .eq('id', campaign.class_id)
        .single();
      if (cls) {
        classCtx = {
          title: cls.title,
          instructor: cls.instructor_name,
          location: cls.location,
        };
      }
    }
  } else if (msg.reminder_kind === 'session_24h' && msg.session_id) {
    // Auto-reminder
    const { data: sess } = await supabase
      .from('class_sessions')
      .select(
        'id, starts_at, status, class_id, classes(title, instructor_name, location)'
      )
      .eq('id', msg.session_id)
      .single();
    if (!sess) throw new Error('Session not found');
    if (sess.status === 'cancelled') {
      throw new Error('Session was cancelled — skipping reminder');
    }
    const cls = sess.classes as unknown as {
      title: string;
      instructor_name: string | null;
      location: string | null;
    } | null;
    if (!cls) throw new Error('Class not found');
    classCtx = {
      title: cls.title,
      instructor: cls.instructor_name,
      location: cls.location,
    };
    subject = `Reminder: ${cls.title} tomorrow at {{session.time}}`;
    bodyHtml = `<p>Hi {{student.name}},</p>
<p>Quick reminder that we're on for <strong>{{session.datetime}}</strong>.</p>
<p>Location: ${cls.location ?? '(see your calendar)'}</p>
<p>See you there.</p>
<p>— {{sender.name}}</p>`;
    attachIcsSessionId = sess.id;
  } else {
    throw new Error('Unknown message source');
  }

  // Session context
  let sessionCtx: MergeContext['session'] = undefined;
  if (msg.session_id || attachIcsSessionId) {
    const sid = msg.session_id ?? attachIcsSessionId;
    const { data: s } = await supabase
      .from('class_sessions')
      .select('starts_at')
      .eq('id', sid!)
      .single();
    if (s) {
      const d = new Date(s.starts_at);
      const dateStr = d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      sessionCtx = {
        date: dateStr,
        time: timeStr,
        datetime: `${dateStr}, ${timeStr}`,
      };
    }
  }

  const ctx: MergeContext = {
    sender: { name: profile?.full_name ?? null },
    student: { name: student.name ?? '', email: student.email },
    class: classCtx,
    session: sessionCtx,
  };

  const renderedSubject = renderMerge(subject, ctx);
  const renderedBody = renderMerge(bodyHtml, ctx);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const unsubscribeUrl = `${appUrl}/u/${student.unsubscribe_token}`;

  const { html, text } = await renderEmail({
    bodyHtml: renderedBody,
    senderName: profile?.full_name ?? null,
    unsubscribeUrl,
  });

  // ICS attachment
  let attachments: Array<{ filename: string; content: string }> | undefined;
  if (attachIcsSessionId) {
    const { data: sess } = await supabase
      .from('class_sessions')
      .select(
        'id, starts_at, ends_at, status, notes, classes(id, title, description, location, instructor_name)'
      )
      .eq('id', attachIcsSessionId)
      .single();
    const cls = sess?.classes as unknown as {
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      instructor_name: string | null;
    } | null;
    if (sess && cls) {
      const ics = buildSessionInvite({
        cls: {
          id: cls.id,
          title: cls.title,
          description: cls.description,
          location: cls.location,
          instructor_name: cls.instructor_name,
        },
        session: {
          id: sess.id,
          starts_at: sess.starts_at,
          ends_at: sess.ends_at,
          status: sess.status,
          notes: sess.notes,
        },
        sender: {
          name: profile?.full_name ?? null,
          email:
            process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        },
        appUrl,
      });
      attachments = [{ filename: ics.filename, content: ics.content }];
    }
  }

  // Send
  const resend = getResend();
  const result = await resend.emails.send({
    from: getFromAddress(),
    to: student.email,
    subject: renderedSubject,
    html,
    text,
    attachments,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (result.error) throw new Error(result.error.message);

  await supabase
    .from('scheduled_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      resend_id: result.data?.id ?? null,
      rendered_subject: renderedSubject,
      rendered_body: renderedBody,
    })
    .eq('id', msg.id);

  // Bump campaign delivered_count if applicable
  if (msg.campaign_id) {
    await supabase.rpc('clasd_increment_campaign_delivered', {
      p_campaign_id: msg.campaign_id,
    });
  }
}

/**
 * Generate scheduled reminder rows for any class with auto_remind on
 * whose upcoming sessions don't yet have a reminder queued.
 *
 * Call this when:
 *  - a class toggles auto_remind on
 *  - a new session is created
 *  - a student enrols in an auto-reminder class
 *  - the cron runs (catch-up safety)
 */
export async function ensureRemindersForUpcomingSessions(args: {
  user_id?: string; // if set, only that user's classes
}): Promise<{ created: number }> {
  const supabase = createServiceClient();
  let created = 0;

  // Fetch enabled classes
  let q = supabase
    .from('classes')
    .select('id, user_id, auto_remind, auto_remind_lead_minutes')
    .eq('auto_remind', true)
    .eq('archived', false);
  if (args.user_id) q = q.eq('user_id', args.user_id);
  const { data: classes } = await q;
  if (!classes || classes.length === 0) return { created };

  for (const cls of classes) {
    // Sessions in the future + not cancelled
    const { data: sessions } = await supabase
      .from('class_sessions')
      .select('id, starts_at')
      .eq('class_id', cls.id)
      .eq('status', 'scheduled')
      .gte('starts_at', new Date().toISOString());
    if (!sessions || sessions.length === 0) continue;

    // Active subscribed enrolled students
    const { data: enrolments } = await supabase
      .from('enrolments')
      .select('student_id, students(id, subscribed)')
      .eq('class_id', cls.id)
      .eq('status', 'active');

    const studentIds = (enrolments ?? [])
      .map((e) => {
        const s = e.students as unknown as {
          id: string;
          subscribed: boolean;
        } | null;
        return s && s.subscribed ? s.id : null;
      })
      .filter((id): id is string => id !== null);
    if (studentIds.length === 0) continue;

    for (const sess of sessions) {
      const sendAt = new Date(
        new Date(sess.starts_at).getTime() -
          cls.auto_remind_lead_minutes * 60_000
      ).toISOString();
      // Skip if past
      if (new Date(sendAt) < new Date()) continue;

      const rows = studentIds.map((sid) => ({
        user_id: cls.user_id,
        campaign_id: null,
        student_id: sid,
        session_id: sess.id,
        send_at: sendAt,
        reminder_kind: 'session_24h',
        status: 'pending' as const,
      }));

      // Use upsert via insert + ON CONFLICT — but Supabase JS doesn't
      // expose ON CONFLICT with a partial unique index. We'll insert
      // and ignore unique-violation errors; the unique index in the
      // migration ensures we never double-queue.
      for (const row of rows) {
        const { error } = await supabase
          .from('scheduled_messages')
          .insert(row);
        if (!error) {
          created += 1;
        } else if (error.code !== '23505') {
          // Real error, not duplicate; surface it
          console.error('reminder insert error', error);
        }
      }
    }
  }
  return { created };
}
