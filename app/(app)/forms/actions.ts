'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkLimit } from '@/lib/limits';

const customFieldSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(120),
  type: z.enum(['text', 'email', 'phone', 'select', 'textarea']),
  required: z.boolean(),
  options: z.array(z.string().max(120)).max(20).optional(),
});

const baseSchema = {
  name: z.string().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, digits, hyphens'),
  class_id: z.string().uuid().optional().or(z.literal('')),
  headline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  custom_fields: z.array(customFieldSchema).max(20).default([]),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal('')),
  button_text: z.string().min(1).max(40).default('Sign up'),
  success_title: z.string().min(1).max(120).default("You're in."),
  success_message: z
    .string()
    .min(1)
    .max(500)
    .default("Thanks for signing up. You'll hear from us soon."),
  active: z.boolean().default(true),
};

const createSchema = z.object(baseSchema);
const updateSchema = z.object({ id: z.string().uuid(), ...baseSchema });

export async function createForm(input: z.infer<typeof createSchema>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Free plan limit (only enforced if creating an active form)
  if (input.active !== false) {
    const limit = await checkLimit(user.id, 'activeForms');
    if (!limit.ok) {
      return { error: limit.message, upgrade: true };
    }
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const { data: created, error } = await supabase
    .from('signup_forms')
    .insert({
      user_id: user.id,
      class_id: d.class_id || null,
      slug: d.slug,
      name: d.name,
      headline: d.headline || null,
      description: d.description || null,
      custom_fields: d.custom_fields,
      primary_color: d.primary_color || null,
      button_text: d.button_text,
      success_title: d.success_title,
      success_message: d.success_message,
      active: d.active,
    })
    .select('id')
    .single();

  if (error || !created) {
    if (error?.code === '23505') {
      return { error: `Slug "${d.slug}" is already taken. Try another.` };
    }
    return { error: error?.message ?? 'Failed' };
  }

  revalidatePath('/forms');
  redirect(`/forms/${created.id}`);
}

export async function updateForm(input: z.infer<typeof updateSchema>) {
  const supabase = createClient();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from('signup_forms')
    .update({
      class_id: d.class_id || null,
      slug: d.slug,
      name: d.name,
      headline: d.headline || null,
      description: d.description || null,
      custom_fields: d.custom_fields,
      primary_color: d.primary_color || null,
      button_text: d.button_text,
      success_title: d.success_title,
      success_message: d.success_message,
      active: d.active,
    })
    .eq('id', d.id);

  if (error) {
    if (error.code === '23505') {
      return { error: `Slug "${d.slug}" is already taken. Try another.` };
    }
    return { error: error.message };
  }

  revalidatePath('/forms');
  revalidatePath(`/forms/${d.id}`);
  redirect(`/forms/${d.id}`);
}

export async function deleteForm(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('signup_forms').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/forms');
  redirect('/forms');
}

export async function setFormActive(id: string, active: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // If activating, check the active forms limit
  if (active) {
    const limit = await checkLimit(user.id, 'activeForms');
    if (!limit.ok) {
      return { error: limit.message, upgrade: true };
    }
  }

  const { error } = await supabase
    .from('signup_forms')
    .update({ active })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/forms');
  revalidatePath(`/forms/${id}`);
  return { success: true };
}
