'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ensureRemindersForUpcomingSessions } from '@/lib/email/queue';

const schema = z.object({
  class_id: z.string().uuid(),
  auto_remind: z.boolean(),
  lead_minutes: z.number().int().min(15).max(20160).optional(),
});

export async function setAutoRemind(input: z.infer<typeof schema>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const update: { auto_remind: boolean; auto_remind_lead_minutes?: number } = {
    auto_remind: d.auto_remind,
  };
  if (d.lead_minutes) update.auto_remind_lead_minutes = d.lead_minutes;

  const { error } = await supabase
    .from('classes')
    .update(update)
    .eq('id', d.class_id);
  if (error) return { error: error.message };

  let created = 0;
  if (d.auto_remind) {
    const r = await ensureRemindersForUpcomingSessions({
      user_id: user.id,
    });
    created = r.created;
  } else {
    // DELETE pending reminders for this class — not just mark cancelled.
    // The unique index on (session_id, student_id, reminder_kind) would
    // otherwise prevent re-enabling from generating fresh rows.
    const { data: sessions } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('class_id', d.class_id);
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length > 0) {
      await supabase
        .from('scheduled_messages')
        .delete()
        .eq('reminder_kind', 'session_24h')
        .eq('status', 'pending')
        .in('session_id', sessionIds);
    }
  }

  revalidatePath(`/classes/${d.class_id}`);
  return { success: true, created };
}
