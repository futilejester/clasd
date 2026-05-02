'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Class } from '@/types/database';
import { updateClass } from '../../actions';

export function ClassEditForm({ cls }: { cls: Class }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(cls.title);
  const [description, setDescription] = useState(cls.description ?? '');
  const [instructorName, setInstructorName] = useState(
    cls.instructor_name ?? ''
  );
  const [duration, setDuration] = useState(cls.default_duration_minutes);
  const [location, setLocation] = useState(cls.location ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(cls.cover_image_url ?? '');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateClass({
        id: cls.id,
        title,
        description: description || undefined,
        instructor_name: instructorName || undefined,
        default_duration_minutes: duration,
        location: location || undefined,
        cover_image_url: coverImageUrl || undefined,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="instructor">Instructor</Label>
          <Input
            id="instructor"
            value={instructorName}
            onChange={(e) => setInstructorName(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Default duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min={5}
            max={720}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 60)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover">Cover image URL</Label>
          <Input
            id="cover"
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          Save changes
        </Button>
        <Link
          href={`/classes/${cls.id}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
