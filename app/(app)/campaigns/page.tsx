import Link from 'next/link';
import { Plus, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, relativeTime } from '@/lib/dates';
import { RunQueueButton } from './run-queue-button';

export default async function CampaignsPage() {
  const supabase = createClient();

  const [{ data: campaigns }, { count: dueCount }] = await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, name, subject, status, sent_at, recipient_count, delivered_count, opened_count, bounced_count, created_at, class_id, segment_id, classes(title), segments(name)'
      )
      .order('created_at', { ascending: false }),
    // Only count messages that are actually due to fire now
    supabase
      .from('scheduled_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString()),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Campaigns
          </p>
          <h1 className="font-display text-4xl tracking-tight">Campaigns</h1>
          <p className="text-slate-600 mt-1">
            Compose and send emails to your students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RunQueueButton pendingCount={dueCount ?? 0} />
          <Link href="/campaigns/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          </Link>
        </div>
      </header>

      {!campaigns || campaigns.length === 0 ? (
        <EmptyState
          icon={<Send className="h-10 w-10" />}
          title="No campaigns yet"
          description="A campaign is an email you compose, target to a class or segment, and send. Pick from a template or start blank."
          action={
            <Link href="/campaigns/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                New campaign
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-cream-300 border border-cream-300 rounded-lg overflow-hidden bg-cream-50">
          {campaigns.map((c) => {
            const cls = c.classes as unknown as { title: string } | null;
            const seg = c.segments as unknown as { name: string } | null;
            return (
              <li key={c.id}>
                <Link
                  href={
                    c.status === 'draft' || c.status === 'failed'
                      ? `/campaigns/${c.id}/edit`
                      : `/campaigns/${c.id}`
                  }
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-cream-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {c.name}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {c.subject}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                      {seg ? (
                        <span>to segment: {seg.name}</span>
                      ) : cls ? (
                        <span>to {cls.title}</span>
                      ) : null}
                      {c.sent_at ? (
                        <span>
                          · sent {relativeTime(c.sent_at)} ·{' '}
                          {c.delivered_count}/{c.recipient_count}
                        </span>
                      ) : (
                        <span>· created {formatDate(c.created_at)}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
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
