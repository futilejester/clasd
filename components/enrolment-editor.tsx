'use client';

import { useState, useTransition } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  updateEnrolment,
  deleteEnrolment,
} from '@/app/(app)/classes/[id]/enrolments/actions';

export function EnrolmentEditor({
  enrolment,
}: {
  enrolment: {
    id: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    payment_status: 'unpaid' | 'paid' | 'comped' | 'refunded';
    skill_level: string | null;
  };
}) {
  const [status, setStatus] = useState(enrolment.status);
  const [payment, setPayment] = useState(enrolment.payment_status);
  const [skill, setSkill] = useState(enrolment.skill_level ?? '');
  const [isPending, startTransition] = useTransition();

  const dirty =
    status !== enrolment.status ||
    payment !== enrolment.payment_status ||
    (skill || null) !== enrolment.skill_level;

  function save() {
    startTransition(async () => {
      const r = await updateEnrolment({
        id: enrolment.id,
        status,
        payment_status: payment,
        skill_level: skill || undefined,
      });
      if (r?.error) toast.error(r.error);
      else toast.success('Enrolment updated');
    });
  }

  function remove() {
    if (!confirm('Remove this enrolment? The student record will be kept.'))
      return;
    startTransition(async () => {
      const r = await deleteEnrolment(enrolment.id);
      if (r?.error) toast.error(r.error);
      else toast.success('Enrolment removed');
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
      <div>
        <label className="text-xs text-slate-500 block mb-1">Status</label>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">Payment</label>
        <Select
          value={payment}
          onChange={(e) => setPayment(e.target.value as typeof payment)}
        >
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="comped">Comped</option>
          <option value="refunded">Refunded</option>
        </Select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">
          Skill level
        </label>
        <Input
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          placeholder="e.g. Beginner"
          maxLength={40}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={!dirty || isPending}
          loading={isPending}
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={remove}
          aria-label="Remove enrolment"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
