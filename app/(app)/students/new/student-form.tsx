'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/ui/tag-input';
import type { Student } from '@/types/database';
import { createStudent, updateStudent } from '../actions';

export function StudentForm({
  student,
}: {
  student?: Pick<
    Student,
    'id' | 'email' | 'name' | 'phone' | 'tags' | 'notes'
  >;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(student?.email ?? '');
  const [name, setName] = useState(student?.name ?? '');
  const [phone, setPhone] = useState(student?.phone ?? '');
  const [tags, setTags] = useState<string[]>(student?.tags ?? []);
  const [notes, setNotes] = useState(student?.notes ?? '');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = student
        ? await updateStudent({
            id: student.id,
            email,
            name: name || undefined,
            phone: phone || undefined,
            tags,
            notes: notes || undefined,
          })
        : await createStudent({
            email,
            name: name || undefined,
            phone: phone || undefined,
            tags,
            notes: notes || undefined,
          });

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  const cancelHref = student ? `/students/${student.id}` : '/students';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their full name"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={40}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <TagInput
          id="tags"
          value={tags}
          onChange={setTags}
          placeholder="Add a tag and press enter"
        />
        <p className="text-xs text-slate-500">
          Useful for grouping students later, e.g. <code>vip</code>,{' '}
          <code>monthly-pass</code>.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Internal notes about this student."
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          {student ? 'Save changes' : 'Add student'}
        </Button>
        <Link
          href={cancelHref}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
