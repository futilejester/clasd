'use client';

import { useTransition } from 'react';
import { Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { runQueueNow } from './actions';

export function RunQueueButton({ pendingCount }: { pendingCount: number }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await runQueueNow();
      if (r.sent === 0 && r.picked === 0 && r.reminders_created === 0) {
        toast.success('Queue is empty.');
      } else {
        toast.success(
          `Sent ${r.sent}${r.failed ? ` · ${r.failed} failed` : ''}${
            r.reminders_created
              ? ` · ${r.reminders_created} reminders queued`
              : ''
          }`
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      onClick={onClick}
      loading={isPending}
      title="Process pending scheduled messages and refresh reminders"
    >
      <Play className="h-3.5 w-3.5" />
      Run queue
      {pendingCount > 0 ? (
        <span className="ml-1 text-2xs font-mono bg-clay-100 text-clay-700 px-1.5 py-0.5 rounded">
          {pendingCount}
        </span>
      ) : null}
    </Button>
  );
}
