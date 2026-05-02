'use client';

import { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function FormShareCard({ publicUrl }: { publicUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text manually.');
    }
  }

  const embedSnippet = `<iframe src="${publicUrl}" width="100%" height="640" frameborder="0" style="border:0;border-radius:8px;"></iframe>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share this form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Public URL</p>
          <div className="flex items-center gap-2 bg-cream-200 rounded-lg p-2">
            <code className="flex-1 text-sm text-slate-800 font-mono break-all px-2">
              {publicUrl}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copy(publicUrl, 'URL')}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1.5 inline-flex items-center gap-1">
            <Code className="h-3 w-3" /> Embed snippet (basic — full embeddable
            widget arrives in Chunk 6)
          </p>
          <div className="bg-cream-200 rounded-lg p-2">
            <pre className="text-xs text-slate-800 font-mono overflow-x-auto whitespace-pre-wrap break-all px-2 py-1">
              {embedSnippet}
            </pre>
            <div className="mt-2 px-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => copy(embedSnippet, 'Embed snippet')}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy snippet
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
