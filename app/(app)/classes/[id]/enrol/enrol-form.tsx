'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createEnrolment } from '../enrolments/actions';

type Student = { id: string; name: string | null; email: string };

export function EnrolForm({
  classId,
  availableStudents,
}: {
  classId: string;
  availableStudents: Student[];
}) {
  const [mode, setMode] = useState<'existing' | 'new'>(
    availableStudents.length > 0 ? 'existing' : 'new'
  );
  const [studentId, setStudentId] = useState(
    availableStudents[0]?.id ?? ''
  );
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [skill, setSkill] = useState('');
  const [payment, setPayment] = useState<
    'unpaid' | 'paid' | 'comped' | 'refunded'
  >('unpaid');

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createEnrolment({
        class_id: classId,
        ...(mode === 'existing'
          ? { student_id: studentId }
          : { email, name: name || undefined }),
        skill_level: skill || undefined,
        payment_status: payment,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center gap-2 p-1 bg-cream-200 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('existing')}
          disabled={availableStudents.length === 0}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === 'existing'
              ? 'bg-cream-50 text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          Existing student
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === 'new'
              ? 'bg-cream-50 text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          New student
        </button>
      </div>

      {mode === 'existing' ? (
        availableStudents.length === 0 ? (
          <p className="text-sm text-slate-600 bg-cream-200 px-3 py-2 rounded">
            All your existing students are already enrolled in this class.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="student">Student</Label>
            <Select
              id="student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ? `${s.name} — ${s.email}` : s.email}
                </option>
              ))}
            </Select>
          </div>
        )
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required={mode === 'new'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />
            <p className="text-xs text-slate-500">
              If a student with this email already exists, they’ll be enrolled.
              Otherwise we’ll create a new student record.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              maxLength={120}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="skill">Skill level</Label>
          <Input
            id="skill"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="e.g. Beginner"
            maxLength={40}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment">Payment status</Label>
          <Select
            id="payment"
            value={payment}
            onChange={(e) => setPayment(e.target.value as typeof payment)}
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="comped">Comped</option>
            <option value="refunded">Refunded</option>
          </Select>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          Enrol student
        </Button>
        <Link
          href={`/classes/${classId}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
