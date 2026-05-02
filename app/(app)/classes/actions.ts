'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  generateSessions,
  type RecurrenceFrequency,
  type Weekday,
} from '@/lib/recurrence';

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(2000).optional(),
  instructor_name: z.string().max(120).optional(),
  default_duration_minutes: z.number().int().min(5).max(720),
  location: z.string().max(200).optional(),
  cover_image_url: z
    .string()
    .url('Cover image must be a valid URL')
    .optional()
    .or(z.literal('')),

  // Schedule fields
  starts_at: z.string().min(1, 'Start date and time is required'),
  frequency: z.enum(['none', 'weekly', 'biweekly', 'custom']),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  end_mode: z.enum(['count', 'date', 'never']).default('count'),
  count: z.number().int().min(1).max(200).optional(),
  end_date: z.string().optional(),
  capacity: z.number().int().min(1).max(10000).optional(),
});

export async function createClass(input: z.infer<typeof createSchema>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const data = parsed.data;

  // Insert the class
  const { data: cls, error: classErr } = await supabase
    .from('classes')
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      instructor_name: data.instructor_name || null,
      default_duration_minutes: data.default_duration_minutes,
      location: data.location || null,
      cover_image_url: data.cover_image_url || null,
    })
    .select()
    .single();

  if (classErr || !cls) {
    return { error: classErr?.message ?? 'Failed to create class' };
  }

  // Generate sessions
  let sessions;
  try {
    sessions = generateSessions({
      frequency: data.frequency as RecurrenceFrequency,
      startsAt: data.starts_at,
      durationMinutes: data.default_duration_minutes,
      weekdays: (data.weekdays ?? []) as Weekday[],
      count: data.end_mode === 'count' ? data.count : undefined,
      endDate: data.end_mode === 'date' ? data.end_date : undefined,
    });
  } catch (e) {
    // Roll back the class insert
    await supabase.from('classes').delete().eq('id', cls.id);
    return {
      error: e instanceof Error ? e.message : 'Failed to generate sessions',
    };
  }

  if (sessions.length > 0) {
    const rows = sessions.map((s) => ({
      class_id: cls.id,
      user_id: user.id,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      capacity: data.capacity ?? null,
    }));
    const { error: sessErr } = await supabase
      .from('class_sessions')
      .insert(rows);
    if (sessErr) {
      // Don't roll back the class — just report so the user can fix.
      return {
        error: `Class created, but failed to create sessions: ${sessErr.message}`,
        classId: cls.id,
      };
    }
  }

  revalidatePath('/classes');
  revalidatePath('/dashboard');
  redirect(`/classes/${cls.id}`);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  instructor_name: z.string().max(120).optional(),
  default_duration_minutes: z.number().int().min(5).max(720),
  location: z.string().max(200).optional(),
  cover_image_url: z
    .string()
    .url()
    .optional()
    .or(z.literal('')),
});

export async function updateClass(input: z.infer<typeof updateSchema>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const data = parsed.data;

  const { error } = await supabase
    .from('classes')
    .update({
      title: data.title,
      description: data.description || null,
      instructor_name: data.instructor_name || null,
      default_duration_minutes: data.default_duration_minutes,
      location: data.location || null,
      cover_image_url: data.cover_image_url || null,
    })
    .eq('id', data.id);

  if (error) return { error: error.message };

  revalidatePath('/classes');
  revalidatePath(`/classes/${data.id}`);
  redirect(`/classes/${data.id}`);
}

export async function archiveClass(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('classes')
    .update({ archived: true })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/classes');
  revalidatePath('/dashboard');
  redirect('/classes');
}

export async function unarchiveClass(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('classes')
    .update({ archived: false })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/classes');
  revalidatePath('/dashboard');
  return { success: true };
}
