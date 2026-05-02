'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CancelButton() {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        "Cancel your subscription? You'll keep Pro access until your billing period ends."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await fetch('/api/cancel-subscription', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? 'Could not cancel');
        return;
      }
      toast.success(
        'Subscription cancelled. Pro access remains until period ends.'
      );
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      loading={isPending}
      className="text-red-700 hover:bg-red-50"
    >
      Cancel subscription
    </Button>
  );
}
