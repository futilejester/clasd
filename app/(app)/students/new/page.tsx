import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StudentForm } from './student-form';

export default function NewStudentPage() {
  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/students"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          New student
        </p>
        <h1 className="font-display text-4xl tracking-tight">Add a student</h1>
        <p className="text-slate-600 mt-1">
          You can also share a public signup form to let them enrol themselves.
        </p>
      </header>

      <StudentForm />
    </div>
  );
}
