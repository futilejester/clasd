import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, RefreshCw, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, relativeTime } from '@/lib/dates';
import { SegmentMembers } from './members-client';

export default async function SegmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: segment } = await supabase
    .from('segments')
    .select('*')
    .eq('id', params.id)
    .single();
  if (!segment) notFound();

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/segments"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to segments
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Segment
          </p>
          <h1 className="font-display text-4xl tracking-tight break-words flex items-center gap-3 flex-wrap">
            {segment.name}
            <Badge tone={segment.target === 'students' ? 'info' : 'accent'}>
              {segment.target === 'students' ? 'Students' : 'Enrolments'}
            </Badge>
          </h1>
          {segment.description ? (
            <p className="text-slate-600 mt-2">{segment.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/segments/${segment.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
        </div>
      </header>

      <SegmentMembers
        segmentId={segment.id}
        target={segment.target}
        rules={segment.rules}
      />
    </div>
  );
}
