'use client';

import { useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { setAutoRemind } from './auto-remind-actions';

const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 60, label: '1 hour before' },
  { value: 180, label: '3 hours before' },
  { value: 360, label: '6 hours before' },
  { value: 720, label: '12 hours before' },
  { value: 1440, label: '24 hours before' },
  { value: 2880, label: '2 days before' },
  { value: 4320, label: '3 days before' },
  { value: 10080, label: '1 week before' },
];

export function AutoRemindCard({
  classId,
  initialEnabled,
  initialLeadMinutes,
}: {
  classId: string;
  initialEnabled: boolean;
  initialLeadMinutes: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [lead, setLead] = useState(initialLeadMinutes);
  const [isPending, startTransition] = useTransition();

  function update(nextEnabled: boolean, nextLead: number) {
    setEnabled(nextEnabled);
    setLead(nextLead);
    startTransition(async () => {
      const r = await setAutoRemind({
        class_id: classId,
        auto_remind: nextEnabled,
        lead_minutes: nextLead,
      });
      if (r?.error) {
        toast.error(r.error);
        // revert UI
        setEnabled(initialEnabled);
        setLead(initialLeadMinutes);
      } else if (r?.success) {
        if (nextEnabled && r.created > 0) {
          toast.success(
            `Auto-reminders on · ${r.created} reminders queued`
          );
        } else if (nextEnabled) {
          toast.success('Auto-reminders on');
        } else {
          toast.success('Auto-reminders off');
        }
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-clay-500" />
          Auto-reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Checkbox
          checked={enabled}
          disabled={isPending}
          onChange={(e) => update(e.target.checked, lead)}
          label="Automatically email enrolled students before each session"
        />
        {enabled ? (
          <div className="space-y-2 pl-6">
            <Label htmlFor="lead">When to send</Label>
            <Select
              id="lead"
              value={lead}
              onChange={(e) => update(enabled, Number(e.target.value))}
              disabled={isPending}
              className="max-w-xs"
            >
              {LEAD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              Reminders are queued automatically when sessions are added.
              They’re sent when the queue runs (every few minutes in
              production, manually in dev via the Run queue button).
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
