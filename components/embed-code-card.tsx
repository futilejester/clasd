'use client';

import { useState } from 'react';
import { Code, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EmbedCodeCard({
  appUrl,
  slug,
}: {
  appUrl: string;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);

  const snippet = `<!-- Clasd signup form -->
<div data-clasd-form="${slug}"></div>
<script src="${appUrl}/embed.js" async></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success('Embed code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text manually.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5 text-clay-500" />
          Embed on your site
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Paste this snippet anywhere on your website. The form mounts
          inline — no popup or redirect.
        </p>
        <pre className="bg-slate-900 text-cream-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
          <code>{snippet}</code>
        </pre>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy snippet
        </Button>
        <p className="text-xs text-slate-500">
          Works on any HTML site — Squarespace, WordPress, Wix, plain HTML.
        </p>
      </CardContent>
    </Card>
  );
}
