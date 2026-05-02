import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FormBuilder } from '../../form-builder';

export default async function EditFormPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [{ data: form }, { data: classes }] = await Promise.all([
    supabase
      .from('signup_forms')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('classes')
      .select('id, title')
      .eq('archived', false)
      .order('title'),
  ]);
  if (!form) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`/forms/${form.id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to form
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          Edit form
        </p>
        <h1 className="font-display text-4xl tracking-tight">{form.name}</h1>
      </header>

      <FormBuilder
        classes={classes ?? []}
        initial={{
          id: form.id,
          slug: form.slug,
          name: form.name,
          class_id: form.class_id ?? '',
          headline: form.headline ?? '',
          description: form.description ?? '',
          custom_fields: form.custom_fields ?? [],
          primary_color: form.primary_color ?? '#B85C38',
          button_text: form.button_text ?? 'Sign up',
          success_title: form.success_title ?? "You're in.",
          success_message:
            form.success_message ??
            "Thanks for signing up. You'll hear from us soon.",
          active: form.active,
        }}
      />
    </div>
  );
}
