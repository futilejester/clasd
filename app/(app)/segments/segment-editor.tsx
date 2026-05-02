'use client';

import Link from 'next/link';
import { useState, useTransition, useEffect, useRef } from 'react';
import { Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RuleBuilder } from '@/components/rule-builder';
import type { SegmentRules } from '@/types/database';
import { createSegment, updateSegment, previewSegment } from './actions';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  target: 'students' | 'enrolments';
  rules: SegmentRules;
}

const DEFAULT_RULES: SegmentRules = {
  combinator: 'and',
  conditions: [],
};

export function SegmentEditor({ segment }: { segment?: Segment }) {
  const [name, setName] = useState(segment?.name ?? '');
  const [description, setDescription] = useState(segment?.description ?? '');
  const [target, setTarget] = useState<'students' | 'enrolments'>(
    segment?.target ?? 'students'
  );
  const [rules, setRules] = useState<SegmentRules>(
    segment?.rules ?? DEFAULT_RULES
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    count: number;
    sample: Array<{ id: string; email: string; name: string | null }>;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live preview, debounced
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      const r = await previewSegment({ target, rules });
      if ('error' in r) {
        setPreviewError(r.error);
        setPreview(null);
      } else {
        setPreviewError(null);
        setPreview(r);
      }
    }, 500);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [target, rules]);

  // Switching target wipes rules to avoid invalid field references
  function onTargetChange(t: 'students' | 'enrolments') {
    setTarget(t);
    setRules(DEFAULT_RULES);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        name,
        description: description || undefined,
        target,
        rules,
      };
      const result = segment
        ? await updateSegment({ id: segment.id, ...payload })
        : await createSegment(payload);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Beginners with paid status"'
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Optional. What's this segment for?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target</Label>
          <Select
            id="target"
            value={target}
            onChange={(e) =>
              onTargetChange(e.target.value as typeof target)
            }
          >
            <option value="students">
              Students — filter the whole student list
            </option>
            <option value="enrolments">
              Enrolments — filter by class-specific attributes
            </option>
          </Select>
          <p className="text-xs text-slate-500">
            Choose &ldquo;Enrolments&rdquo; to filter on attendance, payment
            status, or skill level (these are per-class).
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-tight border-b border-cream-300 pb-2">
          Conditions
        </h2>
        <RuleBuilder target={target} rules={rules} onChange={setRules} />
      </section>

      <section
        className="rounded-lg border border-cream-300 bg-cream-200/40 p-4 space-y-3"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-clay-600" />
          <p className="font-medium text-slate-900">
            {previewError ? (
              <span className="text-red-700 text-sm">{previewError}</span>
            ) : preview ? (
              <>
                {preview.count}{' '}
                {target === 'students' ? 'student' : 'student'}
                {preview.count === 1 ? '' : 's'} match
              </>
            ) : (
              <span className="text-slate-500 text-sm">Evaluating…</span>
            )}
          </p>
        </div>
        {preview && preview.sample.length > 0 ? (
          <ul className="text-sm space-y-1 pl-6">
            {preview.sample.map((s) => (
              <li key={s.id} className="text-slate-700">
                {s.name ? `${s.name} — ` : ''}
                <span className="text-slate-500">{s.email}</span>
              </li>
            ))}
            {preview.count > preview.sample.length ? (
              <li className="text-xs text-slate-500">
                + {preview.count - preview.sample.length} more
              </li>
            ) : null}
          </ul>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          {segment ? 'Save changes' : 'Create segment'}
        </Button>
        <Link
          href={segment ? `/segments/${segment.id}` : '/segments'}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
