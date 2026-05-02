import Link from 'next/link';
import { CheckCircle2, BellOff } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { unsubscribeByToken } from './actions';

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { confirm?: string };
}) {
  const supabase = createServiceClient();
  const { data: student } = await supabase
    .from('students')
    .select('id, email, name, subscribed')
    .eq('unsubscribe_token', params.token)
    .maybeSingle();

  const confirmed = searchParams.confirm === '1';

  return (
    <div className="min-h-screen flex flex-col grain">
      <header className="relative z-10 px-6 sm:px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Clasd<span className="text-clay-500">.</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-cream-50 border border-cream-300 rounded-xl shadow-soft p-8 text-center">
            {!student ? (
              <>
                <h1 className="font-display text-2xl tracking-tight">
                  Link not found
                </h1>
                <p className="text-slate-600 mt-3">
                  This unsubscribe link is invalid or has expired.
                </p>
              </>
            ) : confirmed || !student.subscribed ? (
              <>
                <div className="mx-auto h-14 w-14 rounded-full bg-sage-100 flex items-center justify-center text-sage-500 mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h1 className="font-display text-2xl tracking-tight">
                  You&apos;re unsubscribed.
                </h1>
                <p className="text-slate-600 mt-3">
                  We won&apos;t send any more emails to{' '}
                  <strong>{student.email}</strong>.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto h-14 w-14 rounded-full bg-cream-200 flex items-center justify-center text-clay-600 mb-4">
                  <BellOff className="h-8 w-8" />
                </div>
                <h1 className="font-display text-2xl tracking-tight">
                  Unsubscribe?
                </h1>
                <p className="text-slate-600 mt-3 mb-6">
                  Confirm to stop emails to{' '}
                  <strong>{student.email}</strong>.
                </p>
                <form action={unsubscribeByToken}>
                  <input
                    type="hidden"
                    name="token"
                    value={params.token}
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-slate-900 text-cream-100 px-6 py-3 rounded font-medium hover:bg-slate-800"
                  >
                    Unsubscribe
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
