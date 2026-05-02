import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/dates';

export default async function SegmentsPage() {
  const supabase = createClient();
  const { data: segments } = await supabase
    .from('segments')
    .select('id, name, description, target, member_count, last_evaluated_at, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Segments
          </p>
          <h1 className="font-display text-4xl tracking-tight">Segments</h1>
          <p className="text-slate-600 mt-1">
            Saved filter rules for targeting campaigns.
          </p>
        </div>

        <Link href="/segments/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New segment
          </Button>
        </Link>
      </header>

      {!segments || segments.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-10 w-10" />}
          title="Build your first segment"
          description="Save a filter like &ldquo;Beginners with paid status&rdquo; or &ldquo;Students who joined this month&rdquo; and reuse it for targeted campaigns."
          action={
            <Link href="/segments/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                New segment
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map((s) => (
            <li key={s.id}>
              <Link
                href={`/segments/${s.id}`}
                className="block rounded-lg border border-cream-300 bg-cream-50 p-5 hover:border-clay-300 hover:shadow-card transition-all h-full"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-xl tracking-tight">
                    {s.name}
                  </h3>
                  <Badge tone={s.target === 'students' ? 'info' : 'accent'}>
                    {s.target === 'students' ? 'Students' : 'Enrolments'}
                  </Badge>
                </div>
                {s.description ? (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                    {s.description}
                  </p>
                ) : null}
                <div className="pt-3 mt-3 border-t border-cream-200 text-xs text-slate-500">
                  <span className="font-mono">
                    {s.member_count} match{s.member_count === 1 ? '' : 'es'}
                  </span>
                  {s.last_evaluated_at ? (
                    <span> · last updated {formatDate(s.last_evaluated_at)}</span>
                  ) : (
                    <span> · never evaluated</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
