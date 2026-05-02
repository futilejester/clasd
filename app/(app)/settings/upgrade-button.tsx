'use client';

import { useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function UpgradeButton() {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const r = await fetch('/api/checkout', { method: 'POST' });
        const data = await r.json();
        if (!r.ok || !data.url) {
          toast.error(data.error ?? 'Could not start checkout');
          return;
        }
        // Redirect to Polar's hosted checkout
        window.location.href = data.url;
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : 'Could not start checkout'
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      onClick={onClick}
      loading={isPending}
    >
      <Sparkles className="h-4 w-4" />
      Upgrade to Pro
    </Button>
  );
}
