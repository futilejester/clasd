import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EnrolForm } from './enrol-form';

export default async function EnrolPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: cls }, { data: students }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, title')
      .eq('id', params.id)
      .single(),
    supabase
      .from('students')
      .select('id, name, email')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (!cls) notFound();

  // Filter out students already enrolled in this class
  const { data: existing } = await supabase
    .from('enrolments')
    .select('student_id')
    .eq('class_id', params.id);
  const enrolledIds = new Set((existing ?? []).map((e) => e.student_id));
  const available = (students ?? []).filter((s) => !enrolledIds.has(s.id));

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
          Enrol
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          Enrol a student
        </h1>
        <p className="text-slate-600 mt-1">
          Pick someone you’ve already added, or enrol someone new by email.
        </p>
      </header>

      <EnrolForm classId={cls.id} availableStudents={available} />
    </div>
  );
}
