'use client';

import Link from 'next/link';
import { useState, useTransition, useId } from 'react';
import { Plus, Trash2, GripVertical, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagInput } from '@/components/ui/tag-input';
import type { CustomField } from '@/types/database';
import { createForm, updateForm } from './actions';

interface FormState {
  id?: string;
  slug: string;
  name: string;
  class_id: string;
  headline: string;
  description: string;
  custom_fields: CustomField[];
  primary_color: string;
  button_text: string;
  success_title: string;
  success_message: string;
  active: boolean;
}

function defaultState(): FormState {
  return {
    slug: '',
    name: '',
    class_id: '',
    headline: '',
    description: '',
    custom_fields: [],
    primary_color: '#B85C38',
    button_text: 'Sign up',
    success_title: "You're in.",
    success_message: "Thanks for signing up. You'll hear from us soon.",
    active: true,
  };
}

const FIELD_TYPES: { value: CustomField['type']; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone number' },
  { value: 'select', label: 'Dropdown' },
];

export function FormBuilder({
  classes,
  initial,
}: {
  classes: Array<{ id: string; title: string }>;
  initial?: FormState;
}) {
  const [s, setS] = useState<FormState>(initial ?? defaultState());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function autoSlug() {
    if (s.slug || !s.name) return;
    const slug =
      s.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) + '-' + Math.random().toString(36).slice(2, 8);
    update('slug', slug);
  }

  function addField() {
    const newField: CustomField = {
      key: `field_${s.custom_fields.length + 1}`,
      label: 'New field',
      type: 'text',
      required: false,
    };
    update('custom_fields', [...s.custom_fields, newField]);
  }

  function updateField(i: number, patch: Partial<CustomField>) {
    const next = s.custom_fields.slice();
    next[i] = { ...next[i], ...patch };
    update('custom_fields', next);
  }

  function removeField(i: number) {
    update(
      'custom_fields',
      s.custom_fields.filter((_, idx) => idx !== i)
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        name: s.name,
        slug: s.slug,
        class_id: s.class_id || undefined,
        headline: s.headline || undefined,
        description: s.description || undefined,
        custom_fields: s.custom_fields,
        primary_color: s.primary_color || undefined,
        button_text: s.button_text,
        success_title: s.success_title,
        success_message: s.success_message,
        active: s.active,
      };
      const r = initial?.id
        ? await updateForm({ id: initial.id, ...payload })
        : await createForm(payload);
      if (r?.error) {
        setError(r.error);
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Form name *</Label>
            <Input
              id="name"
              required
              value={s.name}
              onChange={(e) => update('name', e.target.value)}
              onBlur={autoSlug}
              placeholder='e.g. "Spring term signup"'
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL slug *</Label>
            <Input
              id="slug"
              required
              value={s.slug}
              onChange={(e) =>
                update(
                  'slug',
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                )
              }
              placeholder="spring-term"
              maxLength={80}
            />
            <p className="text-xs text-slate-500">
              Public URL: /f/{s.slug || 'your-slug'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">Enrol students in</Label>
            <Select
              id="class"
              value={s.class_id}
              onChange={(e) => update('class_id', e.target.value)}
            >
              <option value="">— None (just collects names + emails) —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What students see</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={s.headline}
              onChange={(e) => update('headline', e.target.value)}
              placeholder='e.g. "Sign up for spring term"'
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={s.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Optional. Set expectations."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {s.custom_fields.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              No custom fields. Name and email are always collected.
            </p>
          ) : (
            <ul className="space-y-3">
              {s.custom_fields.map((f, i) => (
                <li
                  key={i}
                  className="border border-cream-300 rounded-lg p-3 bg-cream-100/50 space-y-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      placeholder="Label"
                      value={f.label}
                      onChange={(e) =>
                        updateField(i, { label: e.target.value })
                      }
                      maxLength={120}
                    />
                    <Select
                      value={f.type}
                      onChange={(e) =>
                        updateField(i, {
                          type: e.target.value as CustomField['type'],
                        })
                      }
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="h-10 w-10 inline-flex items-center justify-center text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {f.type === 'select' ? (
                    <TagInput
                      value={f.options ?? []}
                      onChange={(opts) => updateField(i, { options: opts })}
                      placeholder="Add option, press Enter"
                    />
                  ) : null}
                  <Checkbox
                    checked={f.required}
                    onChange={(e) =>
                      updateField(i, { required: e.target.checked })
                    }
                    label="Required"
                  />
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom field
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-clay-500" />
            Customise appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="color">Primary color</Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={s.primary_color}
                onChange={(e) => update('primary_color', e.target.value)}
                className="h-10 w-14 rounded border border-cream-300 cursor-pointer"
              />
              <Input
                value={s.primary_color}
                onChange={(e) => update('primary_color', e.target.value)}
                placeholder="#B85C38"
                className="max-w-[140px] font-mono"
                maxLength={7}
              />
            </div>
            <p className="text-xs text-slate-500">
              Used as the submit button color.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="button-text">Button text</Label>
            <Input
              id="button-text"
              value={s.button_text}
              onChange={(e) => update('button_text', e.target.value)}
              placeholder="Sign up"
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success-title">Success title</Label>
            <Input
              id="success-title"
              value={s.success_title}
              onChange={(e) => update('success_title', e.target.value)}
              placeholder="You're in."
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success-message">Success message</Label>
            <Textarea
              id="success-message"
              value={s.success_message}
              onChange={(e) => update('success_message', e.target.value)}
              placeholder="Thanks for signing up. You'll hear from us soon."
              rows={2}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Checkbox
            checked={s.active}
            onChange={(e) => update('active', e.target.checked)}
            label="Active (form accepts submissions)"
          />
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-4 border-t border-cream-300">
        <Button type="submit" loading={isPending} variant="primary">
          {initial?.id ? 'Save changes' : 'Create form'}
        </Button>
        <Link
          href={initial?.id ? `/forms/${initial.id}` : '/forms'}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
