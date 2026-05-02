'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { submitPublicForm } from './actions';

interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
}

export function PublicSignupForm({
  slug,
  customFields,
  primaryColor,
}: {
  slug: string;
  customFields: CustomField[];
  primaryColor: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await submitPublicForm(slug, formData);
      if (result?.error) {
        setError(result.error);
      }
      // On success the action redirects, so we don't need to handle that here.
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" placeholder="Jane Doe" maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-red-600">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          maxLength={254}
        />
      </div>

      {customFields.map((field) => (
        <div className="space-y-2" key={field.key}>
          <Label htmlFor={`f_${field.key}`}>
            {field.label}
            {field.required ? (
              <span className="text-red-600 ml-1">*</span>
            ) : null}
          </Label>
          {field.type === 'textarea' ? (
            <Textarea
              id={`f_${field.key}`}
              name={`field_${field.key}`}
              required={field.required}
              maxLength={2000}
              rows={4}
            />
          ) : field.type === 'select' ? (
            <Select
              id={`f_${field.key}`}
              name={`field_${field.key}`}
              required={field.required}
              defaultValue=""
            >
              <option value="" disabled>
                Choose one…
              </option>
              {(field.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={`f_${field.key}`}
              name={`field_${field.key}`}
              type={
                field.type === 'email'
                  ? 'email'
                  : field.type === 'phone'
                    ? 'tel'
                    : 'text'
              }
              required={field.required}
              maxLength={field.type === 'email' ? 254 : 500}
            />
          )}
        </div>
      ))}

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        style={{ backgroundColor: primaryColor }}
        className="w-full h-12 rounded text-cream-100 font-medium text-base transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Sending…' : 'Sign up'}
      </button>
    </form>
  );
}
