'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).max(100).optional(),
});

export async function signup(formData: FormData) {
  const supabase = createClient();

  const result = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName') || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { email, password, fullName } = result.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is enabled in Supabase, the user needs to confirm
  // before being signed in. If disabled (recommended for dev), the session
  // is set immediately and we can redirect.
  if (data.session) {
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }

  return {
    success:
      'Check your email for a confirmation link to finish signing up.',
  };
}
