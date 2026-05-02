'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { CustomField } from '@/types/database';
import { submitPublicForm } from './actions';

interface FormData {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  custom_fields: CustomField[];
  primary_color: string | null;
  button_text: string;
  success_title: string;
  success_message: string;
  class_title: string | null;
}

export function PublicFormClient({
  form,
  submitted,
  embed = false,
}: {
  form: FormData;
  submitted: boolean;
  embed?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(submitted);
  const containerRef = useRef<HTMLDivElement>(null);

  // Embed-mode auto-resize
  useEffect(() => {
    if (!embed) return;
    if (typeof window === 'undefined') return;

    function postSize() {
      const h =
        containerRef.current?.getBoundingClientRect().height ??
        document.body.scrollHeight;
      window.parent.postMessage(
        { type: 'clasd-form:resized', height: Math.ceil(h) + 8 },
        '*'
      );
    }

    postSize();
    const ro = new ResizeObserver(postSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [embed, done]);

  useEffect(() => {
    if (embed && done && typeof window !== 'undefined') {
      window.parent.postMessage(
        { type: 'clasd-form:submitted', formId: form.id },
        '*'
      );
    }
  }, [embed, done, form.id]);

function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const r = await submitPublicForm(form.slug, fd);
      if (r?.error) {
        setError(r.error);
      } else if (r && 'success' in r && r.success) {
        setDone(true);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div
        ref={containerRef}
        className="bg-cream-50 border border-cream-300 rounded-xl shadow-soft p-8 text-center"
      >
        <div className="mx-auto h-14 w-14 rounded-full bg-sage-100 flex items-center justify-center text-sage-500 mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl tracking-tight">
          {form.success_title}
        </h2>
        <p className="text-slate-600 mt-3">{form.success_message}</p>
      </div>
    );
  }

  const accent = form.primary_color || '#B85C38';

  return (
    <div
      ref={containerRef}
      className="bg-cream-50 border border-cream-300 rounded-xl shadow-soft p-6 sm:p-8"
      style={{ ['--form-accent' as string]: accent }}
    >
      <header className="mb-5">
        {form.headline ? (
          <h1 className="font-display text-2xl tracking-tight">
            {form.headline}
          </h1>
        ) : (
          <h1 className="font-display text-2xl tracking-tight">{form.name}</h1>
        )}
        {form.description ? (
          <p className="text-slate-600 mt-2">{form.description}</p>
        ) : null}
        {form.class_title ? (
          <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wider">
            For {form.class_title}
          </p>
        ) : null}
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={200}
          />
        </div>

        {form.custom_fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`cf_${f.key}`}>
              {f.label}
              {f.required ? ' *' : ''}
            </Label>
            {f.type === 'textarea' ? (
              <Textarea
                id={`cf_${f.key}`}
                name={`cf_${f.key}`}
                required={f.required}
                maxLength={2000}
                rows={3}
              />
            ) : f.type === 'select' ? (
              <Select
                id={`cf_${f.key}`}
                name={`cf_${f.key}`}
                required={f.required}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose…
                </option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={`cf_${f.key}`}
                name={`cf_${f.key}`}
                type={f.type === 'phone' ? 'tel' : f.type}
                required={f.required}
                maxLength={200}
              />
            )}
          </div>
        ))}

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          loading={isPending}
          size="lg"
          className="w-full"
          style={{ backgroundColor: accent }}
        >
          {form.button_text}
        </Button>
      </form>
    </div>
  );
}
