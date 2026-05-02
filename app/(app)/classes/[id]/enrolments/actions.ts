'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  class_id: z.string().uuid(),
  // Either pick an existing student by ID, or supply email + name to create
  student_id: z.string().uuid().optional(),
  email: z.string().email().max(254).optional(),
  name: z.string().max(120).optional(),
  skill_level: z.string().max(40).optional(),
  payment_status: z
    .enum(['unpaid', 'paid', 'comped', 'refunded'])
    .default('unpaid'),
});

export async function createEnrolment(input: z.infer<typeof createSchema>) {
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

  let studentId = data.student_id;

  // If no existing student picked, upsert by email
  if (!studentId) {
    if (!data.email) {
      return { error: 'Pick a student or provide an email.' };
    }
    const email = data.email.toLowerCase().trim();
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('email', email)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      studentId = existing.id;
    } else {
      const { data: created, error: studentErr } = await supabase
        .from('students')
        .insert({
          user_id: user.id,
          email,
          name: data.name || null,
        })
        .select('id')
        .single();
      if (studentErr || !created) {
        return { error: studentErr?.message ?? 'Failed to create student.' };
      }
      studentId = created.id;
    }
  }

  // Insert enrolment (unique by student_id, class_id)
  const { error } = await supabase.from('enrolments').insert({
    user_id: user.id,
    student_id: studentId,
    class_id: data.class_id,
    skill_level: data.skill_level || null,
    payment_status: data.payment_status,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'That student is already enrolled in this class.' };
    }
    return { error: error.message };
  }

  revalidatePath(`/classes/${data.class_id}`);
  revalidatePath(`/students/${studentId}`);
  redirect(`/classes/${data.class_id}`);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum(['active', 'paused', 'completed', 'cancelled'])
    .default('active'),
  payment_status: z.enum(['unpaid', 'paid', 'comped', 'refunded']),
  skill_level: z.string().max(40).optional(),
});

export async function updateEnrolment(input: z.infer<typeof updateSchema>) {
  const supabase = createClient();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const data = parsed.data;

  // Need class_id and student_id for revalidation
  const { data: enr } = await supabase
    .from('enrolments')
    .select('class_id, student_id')
    .eq('id', data.id)
    .single();

  const { error } = await supabase
    .from('enrolments')
    .update({
      status: data.status,
      payment_status: data.payment_status,
      skill_level: data.skill_level || null,
    })
    .eq('id', data.id);

  if (error) return { error: error.message };

  if (enr) {
    revalidatePath(`/classes/${enr.class_id}`);
    revalidatePath(`/students/${enr.student_id}`);
  }
  return { success: true };
}

export async function deleteEnrolment(id: string) {
  const supabase = createClient();
  const { data: enr } = await supabase
    .from('enrolments')
    .select('class_id, student_id')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('enrolments').delete().eq('id', id);
  if (error) return { error: error.message };

  if (enr) {
    revalidatePath(`/classes/${enr.class_id}`);
    revalidatePath(`/students/${enr.student_id}`);
  }
  return { success: true };
}
