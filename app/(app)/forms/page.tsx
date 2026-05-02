import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/dates';

export default async function FormsPage() {
  const supabase = createClient();

  const { data: forms } = await supabase
    .from('signup_forms')
    .select(
      'id, name, slug, active, submissions_count, created_at, class_id, classes(title)'
    )
    .order('created_at', { ascending: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Signup forms
          </p>
          <h1 className="font-display text-4xl tracking-tight">Forms</h1>
          <p className="text-slate-600 mt-1">
            Public pages where people can sign up to your classes.
          </p>
        </div>

        <Link href="/forms/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New form
          </Button>
        </Link>
      </header>

      {!forms || forms.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="Create your first signup form"
          description="A signup form has its own public URL you can share. People who submit it become students automatically."
          action={
            <Link href="/forms/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                New form
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((f) => {
            const cls = f.classes as unknown as { title: string } | null;
            const url = `${appUrl}/f/${f.slug}`;
            return (
              <li key={f.id}>
                <Link
                  href={`/forms/${f.id}`}
                  className="block rounded-lg border border-cream-300 bg-cream-50 p-5 hover:border-clay-300 hover:shadow-card transition-all h-full"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-display text-xl tracking-tight text-slate-900">
                      {f.name}
                    </h3>
                    {f.active ? (
                      <Badge tone="success">Live</Badge>
                    ) : (
                      <Badge tone="neutral">Paused</Badge>
                    )}
                  </div>

                  {cls ? (
                    <p className="text-sm text-slate-500 mb-2">
                      Enrols into:{' '}
                      <span className="text-slate-700">{cls.title}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 mb-2 italic">
                      No class linked
                    </p>
                  )}

                  <p className="text-xs text-slate-500 font-mono break-all">
                    {url}
                  </p>

                  <div className="pt-3 mt-3 border-t border-cream-200 flex items-center justify-between text-sm text-slate-600">
                    <span>{f.submissions_count} submissions</span>
                    <span className="text-xs">
                      Created {formatDate(f.created_at)}
                    </span>
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
