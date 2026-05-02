'use client';

import { useState } from 'react';
import { Copy, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function CalendarSubscribeCard({
  subscribeUrl,
  webcalUrl,
}: {
  subscribeUrl: string;
  webcalUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(subscribeUrl);
      setCopied(true);
      toast.success('Calendar URL copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text manually.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-clay-500" />
          Subscribable calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Share this URL with students. When they subscribe in Google
          Calendar, Apple Calendar, or Outlook, they’ll automatically see
          all upcoming sessions, including any changes you make.
        </p>

        <div className="bg-cream-200 rounded-lg p-2 flex items-center gap-2">
          <code className="flex-1 text-xs text-slate-800 font-mono break-all px-2">
            {subscribeUrl}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href={webcalUrl}
            className="text-clay-600 hover:underline inline-flex items-center gap-1"
          >
            One-click subscribe (webcal://)
          </a>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">
            Works in Apple Calendar, most Outlook clients, and many others.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
