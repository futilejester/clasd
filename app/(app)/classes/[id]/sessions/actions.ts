'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const sessionSchema = z.object({
  class_id: z.string().uuid(),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  capacity: z.number().int().min(1).max(10000).optional().nullable(),
  notes: z.string().max(2000).optional(),
});

export async function createSession(input: z.infer<typeof sessionSchema>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  if (new Date(d.ends_at) <= new Date(d.starts_at)) {
    return { error: 'End time must be after start time' };
  }

  const { error } = await supabase.from('class_sessions').insert({
    class_id: d.class_id,
    user_id: user.id,
    starts_at: d.starts_at,
    ends_at: d.ends_at,
    capacity: d.capacity ?? null,
    notes: d.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/classes/${d.class_id}`);
  revalidatePath('/dashboard');
  redirect(`/classes/${d.class_id}`);
}

const updateSessionSchema = z.object({
  id: z.string().uuid(),
  class_id: z.string().uuid(),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  capacity: z.number().int().min(1).max(10000).optional().nullable(),
  notes: z.string().max(2000).optional(),
});

export async function updateSession(input: z.infer<typeof updateSessionSchema>) {
  const supabase = createClient();
  const parsed = updateSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  if (new Date(d.ends_at) <= new Date(d.starts_at)) {
    return { error: 'End time must be after start time' };
  }

  const { error } = await supabase
    .from('class_sessions')
    .update({
      starts_at: d.starts_at,
      ends_at: d.ends_at,
      capacity: d.capacity ?? null,
      notes: d.notes || null,
    })
    .eq('id', d.id);

  if (error) return { error: error.message };
  revalidatePath(`/classes/${d.class_id}`);
  redirect(`/classes/${d.class_id}`);
}

export async function cancelSession(id: string, classId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('class_sessions')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/classes/${classId}`);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function uncancelSession(id: string, classId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('class_sessions')
    .update({ status: 'scheduled' })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/classes/${classId}`);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function completeSession(id: string, classId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('class_sessions')
    .update({ status: 'completed' })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/classes/${classId}`);
  return { success: true };
}

export async function deleteSession(id: string, classId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('class_sessions')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/classes/${classId}`);
  revalidatePath('/dashboard');
  return { success: true };
}
