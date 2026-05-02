import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SessionForm } from './session-form';

export default async function NewSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: cls } = await supabase
    .from('classes')
    .select('id, title, default_duration_minutes')
    .eq('id', params.id)
    .single();

  if (!cls) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={`/classes/${cls.id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {cls.title}
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          Add session
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          One-off session
        </h1>
        <p className="text-slate-600 mt-1">
          Add an extra session to <strong>{cls.title}</strong>.
        </p>
      </header>

      <SessionForm
        classId={cls.id}
        defaultDurationMinutes={cls.default_duration_minutes}
      />
    </div>
  );
}
