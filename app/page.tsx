import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  Mail,
  Filter,
  Bell,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col grain">
      <header className="relative z-10 px-6 sm:px-8 py-6 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Clasd<span className="text-clay-500">.</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-700 hover:text-slate-900 px-3 py-1.5"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-slate-900 text-cream-100 hover:bg-slate-800 px-4 py-1.5 rounded-md"
          >
            Try free
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="px-6 sm:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-4">
              For instructors who teach the same students every week
            </p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.05]">
              Class communications,
              <br />
              <span className="text-clay-500">that know your class.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-700 mt-6 max-w-2xl mx-auto">
              Manage students and sessions in one place. Send reminders that
              attach a calendar invite. Filter your list by attendance,
              payment, or skill level. Without the newsletter-platform
              awkwardness.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-slate-900 text-cream-100 hover:bg-slate-800 px-6 py-3 rounded-md font-medium"
              >
                Try free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="text-sm text-slate-700 hover:text-slate-900 px-3 py-3"
              >
                See how it works
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              50 students free — no card needed.
            </p>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="px-6 sm:px-8 py-16 border-t border-cream-300 bg-cream-50/60"
        >
          <div className="max-w-5xl mx-auto">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-3 text-center">
              Built for teachers, not marketers
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-center max-w-2xl mx-auto">
              Newsletters know your subscribers. We know your class.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <FeatureCard
                icon={<Calendar className="h-6 w-6" />}
                title="Real calendar"
                body="Each class has its own subscribable calendar feed. Students subscribe once and see every session in their phone calendar."
              />
              <FeatureCard
                icon={<Bell className="h-6 w-6" />}
                title="Auto-reminders"
                body="Toggle on, pick a lead time, walk away. Every session gets a reminder email at the right moment, with a calendar attachment."
              />
              <FeatureCard
                icon={<Filter className="h-6 w-6" />}
                title="Real segments"
                body="Filter your students by attendance, payment status, skill level, or anything else. Email just the people who need it."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 sm:px-8 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-center">
              Up and running in five minutes
            </h2>

            <ol className="mt-12 space-y-8">
              <Step
                n={1}
                title="Set up your class"
                body="Add your class details and create a recurring schedule. Sessions get individual rows so you can cancel one without breaking the rest."
              />
              <Step
                n={2}
                title="Get students in"
                body="Add them yourself, share a public signup link, or embed the form on your existing website. Resubmissions update existing records — no duplicates."
              />
              <Step
                n={3}
                title="Send things that work"
                body="Compose with merge fields, attach calendar invites, target by class or segment. Or just toggle auto-reminders on and forget about it."
              />
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-6 sm:px-8 py-16 border-t border-cream-300 bg-cream-50/60">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-center">
              Simple pricing
            </h2>
            <p className="text-slate-600 text-center mt-2">
              Try free. Upgrade when your class outgrows the free plan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
              <div className="rounded-xl border border-cream-300 bg-cream-50 p-6">
                <h3 className="font-display text-2xl tracking-tight">Free</h3>
                <p className="text-3xl font-display tracking-tight mt-2">
                  £0
                  <span className="text-base text-slate-500 font-sans">
                    {' '}/ forever
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-700">
                  <Bullet>Up to 50 students</Bullet>
                  <Bullet>100 emails / month</Bullet>
                  <Bullet>1 active signup form</Bullet>
                  <Bullet>Subscribable calendar</Bullet>
                  <Bullet>Auto-reminders</Bullet>
                </ul>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex items-center justify-center w-full border border-slate-300 hover:bg-cream-200 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Get started
                </Link>
              </div>

              <div className="rounded-xl border-2 border-clay-500 bg-cream-50 p-6 relative">
                <div className="absolute -top-3 right-4 bg-clay-500 text-cream-50 text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded">
                  <Sparkles className="h-3 w-3 inline mr-0.5" />
                  Pro
                </div>
                <h3 className="font-display text-2xl tracking-tight">Pro</h3>
                <p className="text-3xl font-display tracking-tight mt-2">
                  £9
                  <span className="text-base text-slate-500 font-sans">
                    {' '}/ month
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-700">
                  <Bullet>Unlimited students &amp; emails</Bullet>
                  <Bullet>Unlimited signup forms</Bullet>
                  <Bullet>Segment-targeted campaigns</Bullet>
                  <Bullet>Embeddable widgets</Bullet>
                  <Bullet>Cancel anytime</Bullet>
                </ul>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex items-center justify-center w-full bg-slate-900 text-cream-100 hover:bg-slate-800 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Start free, upgrade later
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-6 sm:px-8 py-8 border-t border-cream-300 mt-16">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
          <p>
            <span className="font-display text-base tracking-tight">
              Clasd<span className="text-clay-500">.</span>
            </span>
            {' '}— class communications.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-slate-900">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 p-6">
      <div className="h-10 w-10 rounded-lg bg-clay-100 text-clay-600 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      <p className="text-sm text-slate-600 mt-2">{body}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5">
      <span className="font-display text-3xl tracking-tight text-clay-500 w-10 shrink-0">
        {n}.
      </span>
      <div>
        <h3 className="font-display text-xl tracking-tight">{title}</h3>
        <p className="text-slate-600 mt-1">{body}</p>
      </div>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 text-sage-500 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
