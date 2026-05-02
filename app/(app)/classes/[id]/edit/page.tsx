import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ClassEditForm } from './edit-form';

export default async function EditClassPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: cls } = await supabase
    .from('classes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!cls) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={`/classes/${cls.id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to class
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          Edit class
        </p>
        <h1 className="font-display text-4xl tracking-tight">{cls.title}</h1>
        <p className="text-slate-600 mt-1">
          Editing class details only — sessions are managed individually.
        </p>
      </header>

      <ClassEditForm cls={cls} />
    </div>
  );
}
