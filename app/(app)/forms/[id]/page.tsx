import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, ExternalLink, Eye, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmbedCodeCard } from '@/components/embed-code-card';
import { CopyLinkButton } from '@/components/copy-link-button';

export default async function FormDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: form } = await supabase
    .from('signup_forms')
    .select('*, classes(id, title)')
    .eq('id', params.id)
    .single();
  if (!form) notFound();

  const cls = form.classes as unknown as { id: string; title: string } | null;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const publicUrl = `${appUrl}/f/${form.slug}`;

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/forms"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to forms
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
            Signup form
          </p>
          <h1 className="font-display text-4xl tracking-tight break-words">
            {form.name}
            {!form.active ? (
              <Badge tone="neutral" className="ml-3 align-middle">
                Inactive
              </Badge>
            ) : null}
          </h1>
          {form.headline ? (
            <p className="text-slate-600 mt-2">{form.headline}</p>
          ) : null}
          {cls ? (
            <p className="text-sm text-slate-600 mt-1">
              Enrols students in{' '}
              <Link
                href={`/classes/${cls.id}`}
                className="text-clay-600 hover:underline"
              >
                {cls.title}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/forms/${form.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          {form.active ? (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
            </a>
          ) : null}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Public link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Share this link directly — students sign up here.
          </p>
          <div className="bg-cream-200 rounded-lg p-2 flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-800 font-mono break-all px-2">
              {publicUrl}
            </code>
            <CopyLinkButton url={publicUrl} />
          </div>
        </CardContent>
      </Card>

      <EmbedCodeCard appUrl={appUrl} slug={form.slug} />

      <Card>
        <CardHeader>
          <CardTitle>Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-slate-500">Submissions</dt>
              <dd className="font-display text-2xl tracking-tight mt-0.5">
                {form.submissions_count}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Custom fields</dt>
              <dd className="font-display text-2xl tracking-tight mt-0.5">
                {(form.custom_fields ?? []).length}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
