'use server';

import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';

export async function unsubscribeByToken(formData: FormData) {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) redirect('/');

  const supabase = createServiceClient();
  await supabase
    .from('students')
    .update({
      subscribed: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('unsubscribe_token', token);

  redirect(`/u/${token}?confirm=1`);
}
