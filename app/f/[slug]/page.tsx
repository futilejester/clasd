import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { PublicFormClient } from './form-client';

export const dynamic = 'force-dynamic';

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { submitted?: string; embed?: string };
}) {
  const supabase = createServiceClient();
  const { data: form } = await supabase
    .from('signup_forms')
    .select(
      'id, slug, name, headline, description, custom_fields, primary_color, button_text, success_title, success_message, active, class_id, classes(title)'
    )
    .eq('slug', params.slug)
    .eq('active', true)
    .maybeSingle();

  if (!form) notFound();

  const embed = searchParams.embed === '1';
  const submitted = searchParams.submitted === '1';
  const cls = form.classes as unknown as { title: string } | null;

  const formProps = {
    id: form.id,
    slug: form.slug,
    name: form.name,
    headline: form.headline,
    description: form.description,
    custom_fields: form.custom_fields ?? [],
    primary_color: form.primary_color,
    button_text: form.button_text,
    success_title: form.success_title,
    success_message: form.success_message,
    class_title: cls?.title ?? null,
  };

  if (embed) {
    return (
      <div className="bg-cream-50 px-4 py-6">
        <PublicFormClient form={formProps} submitted={submitted} embed />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col grain">
      <header className="relative z-10 px-6 sm:px-8 py-6">
        <a href="/" className="font-display text-2xl tracking-tight">
          Clasd<span className="text-clay-500">.</span>
        </a>
      </header>

      <main className="relative z-10 flex-1 flex items-start justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-lg">
          <PublicFormClient form={formProps} submitted={submitted} />
        </div>
      </main>
    </div>
  );
}
