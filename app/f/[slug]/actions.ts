'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
}

export async function submitPublicForm(
  slug: string,
  formData: FormData
): Promise<{ error?: string } | void> {
  const supabase = createServiceClient();

  // Look up the form by slug — must be active
  const { data: form, error: formErr } = await supabase
    .from('signup_forms')
    .select(
      'id, user_id, class_id, custom_fields, active, slug'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (formErr) return { error: formErr.message };
  if (!form) return { error: 'This form is not available.' };
  if (!form.active) {
    return { error: 'This form is no longer accepting submissions.' };
  }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const name = String(formData.get('name') ?? '').trim();

  const baseSchema = z.object({
    email: z.string().email().max(254),
    name: z.string().max(120).optional(),
  });
  const baseParsed = baseSchema.safeParse({
    email,
    name: name || undefined,
  });
  if (!baseParsed.success) {
    return { error: 'Please provide a valid email address.' };
  }

  // Collect and validate custom field answers
  const customFields = (form.custom_fields ?? []) as CustomField[];
  const customAttributes: Record<string, string> = {};

  for (const field of customFields) {
    const raw = formData.get(`field_${field.key}`);
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (field.required && !value) {
      return { error: `“${field.label}” is required.` };
    }
    if (!value) continue;

    if (field.type === 'email') {
      if (!z.string().email().safeParse(value).success) {
        return { error: `“${field.label}” must be a valid email.` };
      }
    }

    if (field.type === 'select' && field.options) {
      if (!field.options.includes(value)) {
        return { error: `“${field.label}” must be one of the listed options.` };
      }
    }

    if (value.length > 2000) {
      return { error: `“${field.label}” is too long.` };
    }

    customAttributes[field.key] = value;
  }

  // Upsert the student. If they already exist (by user_id + email),
  // merge custom_attributes and resubscribe them.
  const { data: existing } = await supabase
    .from('students')
    .select('id, custom_attributes, subscribed, name')
    .eq('user_id', form.user_id)
    .eq('email', email)
    .maybeSingle();

  let studentId: string;

  if (existing) {
    studentId = existing.id;
    const mergedAttrs = {
      ...((existing.custom_attributes as Record<string, unknown>) ?? {}),
      ...customAttributes,
    };
    const { error: updErr } = await supabase
      .from('students')
      .update({
        name: name || existing.name,
        subscribed: true,
        unsubscribed_at: null,
        custom_attributes: mergedAttrs,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (updErr) return { error: updErr.message };
  } else {
    const { data: created, error: insErr } = await supabase
      .from('students')
      .insert({
        user_id: form.user_id,
        email,
        name: name || null,
        custom_attributes: customAttributes,
        last_active_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insErr || !created) {
      return { error: insErr?.message ?? 'Could not save your details.' };
    }
    studentId = created.id;
  }

  // If the form is linked to a class, ensure an enrolment exists.
  if (form.class_id) {
    const { data: existingEnrol } = await supabase
      .from('enrolments')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('class_id', form.class_id)
      .maybeSingle();

    if (existingEnrol) {
      // Re-activate if previously cancelled
      if (existingEnrol.status === 'cancelled') {
        await supabase
          .from('enrolments')
          .update({ status: 'active' })
          .eq('id', existingEnrol.id);
      }
    } else {
      const { error: enrolErr } = await supabase.from('enrolments').insert({
        user_id: form.user_id,
        student_id: studentId,
        class_id: form.class_id,
      });
      if (enrolErr) return { error: enrolErr.message };
    }
  }

  // Increment submission count (best effort — don't fail the whole submission)
  const count = (await currentCount(supabase, form.id)) ?? 0;
  await supabase
    .from('signup_forms')
    .update({ submissions_count: count + 1 })
    .eq('id', form.id);

  redirect(`/f/${slug}/thanks`);
}

async function currentCount(
  supabase: ReturnType<typeof createServiceClient>,
  formId: string
): Promise<number | null> {
  const { data } = await supabase
    .from('signup_forms')
    .select('submissions_count')
    .eq('id', formId)
    .single();
  return data?.submissions_count ?? null;
}
