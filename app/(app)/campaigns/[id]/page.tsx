import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, relativeTime } from '@/lib/dates';

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, classes(id, title)')
    .eq('id', params.id)
    .single();

  if (!campaign) notFound();

  const cls = campaign.classes as unknown as {
    id: string;
    title: string;
  } | null;

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Campaign
          </p>
          <h1 className="font-display text-4xl tracking-tight break-words flex items-center gap-3 flex-wrap">
            {campaign.name}
            <StatusBadge status={campaign.status} />
          </h1>
          <p className="text-slate-600 mt-2">
            <strong className="text-slate-900">Subject:</strong>{' '}
            {campaign.subject}
          </p>
          {cls ? (
            <p className="text-sm text-slate-600 mt-1">
              Recipients: students in{' '}
              <Link
                href={`/classes/${cls.id}`}
                className="text-clay-600 hover:underline"
              >
                {cls.title}
              </Link>
            </p>
          ) : (
            <p className="text-sm text-slate-600 mt-1">
              Recipients: all subscribed students
            </p>
          )}
        </div>

        {campaign.status === 'draft' ? (
          <Link href={`/campaigns/${campaign.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-3.5 w-3.5" />
              Continue editing
            </Button>
          </Link>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Recipients" value={campaign.recipient_count} />
            <Stat label="Delivered" value={campaign.delivered_count} />
            <Stat label="Opened" value={campaign.opened_count} hint="Chunk 5" />
            <Stat
              label="Bounced"
              value={campaign.bounced_count}
              hint="Chunk 5"
            />
          </dl>
          {campaign.sent_at ? (
            <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-cream-200">
              Sent {formatDateTime(campaign.sent_at)} ·{' '}
              {relativeTime(campaign.sent_at)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none border border-cream-200 rounded-lg p-6 bg-cream-50"
            dangerouslySetInnerHTML={{
              __html: campaign.body_html ?? '',
            }}
          />
          <p className="text-xs text-slate-500 mt-2">
            Merge fields shown as <code>{'{{...}}'}</code> are replaced
            per-recipient at send time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-display text-2xl tracking-tight mt-0.5">{value}</dd>
      {hint ? (
        <p className="text-2xs font-mono uppercase tracking-wider text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
}) {
  switch (status) {
    case 'draft':
      return <Badge tone="neutral">Draft</Badge>;
    case 'scheduled':
      return <Badge tone="info">Scheduled</Badge>;
    case 'sending':
      return <Badge tone="warning">Sending…</Badge>;
    case 'sent':
      return <Badge tone="success">Sent</Badge>;
    case 'failed':
      return <Badge tone="danger">Failed</Badge>;
  }
}
