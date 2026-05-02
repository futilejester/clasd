'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ScheduleBuilder,
  type ScheduleValue,
} from '@/components/schedule-builder';
import { createClass } from '../actions';

export default function NewClassPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [capacity, setCapacity] = useState<string>('');

  const [schedule, setSchedule] = useState<ScheduleValue>({
    starts_at: '',
    frequency: 'weekly',
    weekdays: [],
    end_mode: 'count',
    count: 8,
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schedule.starts_at) {
      setError('Please pick a date and time for the first session.');
      return;
    }

    startTransition(async () => {
      const result = await createClass({
        title,
        description: description || undefined,
        instructor_name: instructorName || undefined,
        default_duration_minutes: duration,
        location: location || undefined,
        cover_image_url: coverImageUrl || undefined,
        starts_at: schedule.starts_at,
        frequency: schedule.frequency,
        weekdays: schedule.weekdays,
        end_mode: schedule.end_mode,
        count: schedule.count,
        end_date: schedule.end_date,
        capacity: capacity ? Number(capacity) : undefined,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/classes"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to classes
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          New class
        </p>
        <h1 className="font-display text-4xl tracking-tight">Create a class</h1>
        <p className="text-slate-600 mt-1">
          Define what you’re teaching and when. We’ll generate the individual
          sessions for you.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-8">
        <section className="space-y-5">
          <h2 className="font-display text-xl tracking-tight border-b border-cream-300 pb-2">
            About this class
          </h2>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tuesday evening yoga"
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
              placeholder="A brief description for your students."
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
                placeholder="Your name"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Studio address or Zoom link"
                maxLength={200}
              />
            </div>
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
            <p className="text-xs text-slate-500">
              Optional. Paste any public image URL.
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-xl tracking-tight border-b border-cream-300 pb-2">
            Schedule
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Session length (minutes)</Label>
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
              <Label htmlFor="capacity">Capacity per session</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={10000}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <ScheduleBuilder
            value={schedule}
            onChange={setSchedule}
            durationMinutes={duration}
          />
        </section>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={isPending}>
            Create class
          </Button>
          <Link
            href="/classes"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
