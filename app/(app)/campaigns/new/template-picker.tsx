'use client';

import { useState, useTransition } from 'react';
import { Mail, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  EMAIL_TEMPLATES,
  BLANK_TEMPLATE,
  type EmailTemplate,
} from '@/lib/email/templates';
import { cn } from '@/lib/utils';
import { createCampaign } from '../actions';

const all = [BLANK_TEMPLATE, ...EMAIL_TEMPLATES];

export function TemplatePicker({
  classes,
}: {
  classes: Array<{ id: string; title: string }>;
}) {
  const [selectedId, setSelectedId] = useState<string>(BLANK_TEMPLATE.id);
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selected: EmailTemplate =
    all.find((t) => t.id === selectedId) ?? BLANK_TEMPLATE;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCampaign({
        name: name || selected.name,
        subject: selected.defaultSubject,
        body_html: selected.defaultBodyHtml,
        template_id: selectedId === 'blank' ? undefined : selectedId,
        class_id: classId || undefined,
        attach_ics: false,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label className="mb-3 block">Template</Label>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {all.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  'w-full text-left rounded-lg border p-4 transition-all',
                  selectedId === t.id
                    ? 'border-clay-500 bg-clay-50 shadow-card'
                    : 'border-cream-300 bg-cream-50 hover:border-clay-300'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {t.id === 'blank' ? (
                    <Plus className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Mail className="h-4 w-4 text-clay-500" />
                  )}
                  <p className="font-medium text-slate-900">{t.name}</p>
                </div>
                <p className="text-xs text-slate-600">{t.description}</p>
                {t.suggestIcs ? (
                  <p className="text-2xs font-mono uppercase tracking-wider text-clay-600 mt-2">
                    Suggests calendar attachment
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 border-t border-cream-300 pt-6">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. "${selected.name}"`}
            maxLength={120}
          />
          <p className="text-xs text-slate-500">
            Internal name. Recipients see the subject line, not this.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="class">Send to students enrolled in</Label>
          <Select
            id="class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">All my subscribed students</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-500">
            You can change this later, and segment-targeted sends arrive in
            Chunk 5.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={isPending} size="lg">
        Continue to editor
      </Button>
    </form>
  );
}
