import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { TemplatePicker } from './template-picker';

export default async function NewCampaignPage() {
  const supabase = createClient();
  const { data: classes } = await supabase
    .from('classes')
    .select('id, title')
    .eq('archived', false)
    .order('title');

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          New campaign
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          Pick a starting point
        </h1>
        <p className="text-slate-600 mt-1">
          You can edit everything in the next step.
        </p>
      </header>

      <TemplatePicker classes={classes ?? []} />
    </div>
  );
}
