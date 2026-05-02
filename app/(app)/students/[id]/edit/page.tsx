import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StudentForm } from '../../new/student-form';

export default async function EditStudentPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: student } = await supabase
    .from('students')
    .select('id, email, name, phone, tags, notes')
    .eq('id', params.id)
    .single();

  if (!student) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={`/students/${student.id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to student
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          Edit student
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          {student.name || student.email}
        </h1>
      </header>

      <StudentForm student={student} />
    </div>
  );
}
