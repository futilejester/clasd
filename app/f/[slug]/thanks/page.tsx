import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function ThanksPage() {
  return (
    <div className="min-h-screen flex flex-col grain">
      <header className="relative z-10 px-6 sm:px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Clasd<span className="text-clay-500">.</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-cream-50 border border-cream-300 rounded-xl shadow-soft p-8">
            <div className="mx-auto h-14 w-14 rounded-full bg-sage-100 flex items-center justify-center text-sage-500 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="font-display text-3xl tracking-tight text-slate-900">
              You&apos;re in.
            </h1>
            <p className="text-slate-600 mt-3">
              Thanks for signing up — your instructor will be in touch soon.
            </p>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Powered by{' '}
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline"
            >
              Clasd
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
