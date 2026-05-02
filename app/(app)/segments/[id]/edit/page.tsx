import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SegmentEditor } from '../../segment-editor';

export default async function EditSegmentPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: segment } = await supabase
    .from('segments')
    .select('id, name, description, target, rules')
    .eq('id', params.id)
    .single();
  if (!segment) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`/segments/${segment.id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to segment
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          Edit segment
        </p>
        <h1 className="font-display text-4xl tracking-tight">{segment.name}</h1>
      </header>

      <SegmentEditor segment={segment} />
    </div>
  );
}
