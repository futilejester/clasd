'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkLimit, LimitExceededError } from '@/lib/limits';

const baseSchema = {
  email: z.string().email('Valid email required').max(200),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
};

const createSchema = z.object(baseSchema);
const updateSchema = z.object({ id: z.string().uuid(), ...baseSchema });

export async function createStudent(input: z.infer<typeof createSchema>) {
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

  // Free plan limit
  const limit = await checkLimit(user.id, 'students');
  if (!limit.ok) {
    return { error: limit.message, upgrade: true };
  }

  // Dedupe by (user_id, email) — same email = update existing record
  const { data: existing } = await supabase
    .from('students')
    .select('id')
    .eq('email', d.email.toLowerCase())
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('students')
      .update({
        name: d.name || null,
        phone: d.phone || null,
        notes: d.notes || null,
        tags: d.tags ?? [],
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };

    revalidatePath('/students');
    redirect(`/students/${existing.id}`);
  }

  const { data: created, error } = await supabase
    .from('students')
    .insert({
      user_id: user.id,
      email: d.email.toLowerCase(),
      name: d.name || null,
      phone: d.phone || null,
      notes: d.notes || null,
      tags: d.tags ?? [],
    })
    .select('id')
    .single();

  if (error || !created) return { error: error?.message ?? 'Failed' };

  revalidatePath('/students');
  redirect(`/students/${created.id}`);
}

export async function updateStudent(input: z.infer<typeof updateSchema>) {
  const supabase = createClient();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from('students')
    .update({
      email: d.email.toLowerCase(),
      name: d.name || null,
      phone: d.phone || null,
      notes: d.notes || null,
      tags: d.tags ?? [],
    })
    .eq('id', d.id);

  if (error) return { error: error.message };

  revalidatePath('/students');
  revalidatePath(`/students/${d.id}`);
  return { success: true };
}

export async function deleteStudent(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/students');
  redirect('/students');
}

export async function setSubscribed(id: string, subscribed: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from('students')
    .update({
      subscribed,
      unsubscribed_at: subscribed ? null : new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/students/${id}`);
  revalidatePath('/students');
  return { success: true };
}
