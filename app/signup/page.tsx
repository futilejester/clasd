'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signup } from './actions';
export const dynamic = 'force-dynamic';

export default function SignupPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
        toast.success('Almost there — check your email.');
      }
    });
  }

  return (
    <div className="grain min-h-screen flex flex-col">
      <header className="relative z-10 px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Clasd<span className="text-clay-500">.</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-display text-4xl tracking-tight mb-2">
              Start your workspace.
            </h1>
            <p className="text-slate-600">
              Free to start — no card needed.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jane Instructor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="text-sm text-sage-500 bg-sage-100 border border-sage-200 px-3 py-2 rounded">
                {success}
              </p>
            ) : null}

            <Button
              type="submit"
              loading={isPending}
              className="w-full"
              size="lg"
            >
              Create account
            </Button>
          </form>

          <p className="mt-8 text-sm text-slate-600 text-center">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-clay-600 hover:text-clay-700 font-medium underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
