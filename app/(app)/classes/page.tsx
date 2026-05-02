import Link from 'next/link';
import { Plus, GraduationCap, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime } from '@/lib/dates';

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: { archived?: string };
}) {
  const showArchived = searchParams.archived === '1';
  const supabase = createClient();

  const { data: classes } = await supabase
    .from('classes')
    .select(
      'id, title, instructor_name, location, archived, created_at, default_duration_minutes'
    )
    .eq('archived', showArchived)
    .order('created_at', { ascending: false });

  // Fetch upcoming session counts for the visible classes
  const classIds = (classes ?? []).map((c) => c.id);
  const sessionsByClass = new Map<
    string,
    { upcoming: number; nextStartsAt: string | null }
  >();

  if (classIds.length > 0) {
    const { data: sessions } = await supabase
      .from('class_sessions')
      .select('class_id, starts_at, status')
      .in('class_id', classIds)
      .eq('status', 'scheduled')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    for (const s of sessions ?? []) {
      const entry = sessionsByClass.get(s.class_id) ?? {
        upcoming: 0,
        nextStartsAt: null,
      };
      entry.upcoming += 1;
      if (!entry.nextStartsAt) entry.nextStartsAt = s.starts_at;
      sessionsByClass.set(s.class_id, entry);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            {showArchived ? 'Archived' : 'Classes'}
          </p>
          <h1 className="font-display text-4xl tracking-tight">
            {showArchived ? 'Archived classes' : 'Classes'}
          </h1>
          <p className="text-slate-600 mt-1">
            {showArchived
              ? 'Classes you’ve set aside. You can restore them anytime.'
              : 'Each class is a course, workshop, or recurring session.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showArchived ? (
            <Link href="/classes">
              <Button variant="outline">Back to active</Button>
            </Link>
          ) : (
            <>
              <Link href="/classes?archived=1">
                <Button variant="ghost">
                  <Archive className="h-4 w-4" />
                  Archived
                </Button>
              </Link>
              <Link href="/classes/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4" />
                  New class
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {!classes || classes.length === 0 ? (
        showArchived ? (
          <EmptyState
            icon={<Archive className="h-10 w-10" />}
            title="Nothing archived"
            description="Archived classes will appear here. They're hidden from your main list, but their data is kept."
          />
        ) : (
          <EmptyState
            icon={<GraduationCap className="h-10 w-10" />}
            title="Create your first class"
            description="A class is the top-level container for your sessions, students, and communications. You can make it a one-off workshop or a recurring weekly class."
            action={
              <Link href="/classes/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4" />
                  New class
                </Button>
              </Link>
            }
          />
        )
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => {
            const stats = sessionsByClass.get(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/classes/${c.id}`}
                  className="block rounded-lg border border-cream-300 bg-cream-50 p-5 hover:border-clay-300 hover:shadow-card transition-all h-full"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-display text-xl tracking-tight text-slate-900 line-clamp-2">
                      {c.title}
                    </h3>
                    {c.archived ? <Badge tone="neutral">Archived</Badge> : null}
                  </div>
                  {c.instructor_name ? (
                    <p className="text-sm text-slate-500 mb-1">
                      with {c.instructor_name}
                    </p>
                  ) : null}
                  {c.location ? (
                    <p className="text-sm text-slate-500 mb-3">
                      📍 {c.location}
                    </p>
                  ) : null}

                  <div className="pt-3 mt-3 border-t border-cream-200 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {stats?.upcoming ?? 0} upcoming
                    </span>
                    {stats?.nextStartsAt ? (
                      <span className="text-slate-500 text-xs">
                        Next: {formatDateTime(stats.nextStartsAt)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
