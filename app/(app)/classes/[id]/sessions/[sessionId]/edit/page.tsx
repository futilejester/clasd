import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SessionForm } from '../../new/session-form';

export default async function EditSessionPage({
  params,
}: {
  params: { id: string; sessionId: string };
}) {
  const supabase = createClient();
  const [{ data: cls }, { data: session }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, title, default_duration_minutes')
      .eq('id', params.id)
      .single(),
    supabase
      .from('class_sessions')
      .select('id, starts_at, ends_at, capacity, notes, class_id')
      .eq('id', params.sessionId)
      .single(),
  ]);

  if (!cls || !session || session.class_id !== cls.id) notFound();

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
          Edit session
        </p>
        <h1 className="font-display text-4xl tracking-tight">Edit session</h1>
      </header>

      <SessionForm
        classId={cls.id}
        defaultDurationMinutes={cls.default_duration_minutes}
        session={{
          id: session.id,
          starts_at: session.starts_at,
          ends_at: session.ends_at,
          capacity: session.capacity,
          notes: session.notes,
        }}
      />
    </div>
  );
}
