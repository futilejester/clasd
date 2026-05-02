import Link from 'next/link';
import { Plus, Users, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/dates';

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const supabase = createClient();
  const search = searchParams.q?.trim() ?? '';
  const status = searchParams.status ?? 'all';

  let query = supabase
    .from('students')
    .select('id, email, name, tags, subscribed, created_at, last_active_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (search) {
    // ILIKE search across name + email; we run two filters via or()
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (status === 'subscribed') {
    query = query.eq('subscribed', true);
  } else if (status === 'unsubscribed') {
    query = query.eq('subscribed', false);
  }

  const { data: students, error } = await query;

  // Total count for empty state distinction
  const { count: totalCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Students
          </p>
          <h1 className="font-display text-4xl tracking-tight">Students</h1>
          <p className="text-slate-600 mt-1">
            Everyone enrolled or signed up across your classes.
          </p>
        </div>

        <Link href="/students/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Add student
          </Button>
        </Link>
      </header>

      {(totalCount ?? 0) === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No students yet"
          description="Add a student manually, or share a public signup form to let people enrol themselves."
          action={
            <div className="flex gap-3">
              <Link href="/students/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4" />
                  Add manually
                </Button>
              </Link>
              <Link href="/forms/new">
                <Button variant="outline">Create a signup form</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <form
            method="get"
            className="flex flex-wrap items-center gap-2 bg-cream-50 border border-cream-300 rounded-lg p-2"
          >
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={search}
                placeholder="Search by name or email…"
                className="w-full h-9 pl-9 pr-3 bg-transparent border-0 outline-none text-sm"
              />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="h-9 px-3 rounded bg-cream-100 border border-cream-300 text-sm text-slate-700"
            >
              <option value="all">All</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
            <Button type="submit" variant="ghost" size="sm">
              Filter
            </Button>
          </form>

          {error ? (
            <p className="text-sm text-red-600">{error.message}</p>
          ) : !students || students.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">
              No students match your filters.
            </p>
          ) : (
            <div className="border border-cream-300 rounded-lg overflow-hidden bg-cream-50">
              <table className="w-full text-sm">
                <thead className="bg-cream-200 border-b border-cream-300">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium text-slate-700">
                      Name
                    </th>
                    <th className="px-4 py-2.5 font-medium text-slate-700 hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-2.5 font-medium text-slate-700 hidden lg:table-cell">
                      Tags
                    </th>
                    <th className="px-4 py-2.5 font-medium text-slate-700 hidden md:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-2.5 font-medium text-slate-700 hidden lg:table-cell">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-cream-200 last:border-0 hover:bg-cream-100"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/students/${s.id}`}
                          className="text-slate-900 hover:text-clay-600 font-medium"
                        >
                          {s.name || (
                            <span className="text-slate-400 italic">
                              No name
                            </span>
                          )}
                        </Link>
                        <p className="text-xs text-slate-500 md:hidden">
                          {s.email}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">
                        {s.email}
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(s.tags ?? []).slice(0, 3).map((t: string) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-cream-200 text-slate-700 text-xs"
                            >
                              {t}
                            </span>
                          ))}
                          {(s.tags ?? []).length > 3 ? (
                            <span className="text-xs text-slate-500">
                              +{(s.tags ?? []).length - 3}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        {s.subscribed ? (
                          <Badge tone="success">Subscribed</Badge>
                        ) : (
                          <Badge tone="neutral">Unsubscribed</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs hidden lg:table-cell">
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
