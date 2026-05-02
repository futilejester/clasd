/**
 * Merge fields available in campaign emails.
 *
 * The body the user composes is plain HTML with double-curly placeholders
 * like {{student.name}} or {{class.title}}. At send time we substitute
 * these per-recipient.
 *
 * Design choice: keep the variable namespace small and explicit. Don't
 * allow arbitrary expressions or filters — this isn't a full templating
 * language, and it shouldn't be. If we need formatting, we do it server-side
 * before the substitution (e.g. session.starts_at is pre-formatted to a
 * human-readable string).
 */

export interface MergeFieldDef {
  key: string; // e.g. "student.name"
  label: string; // human-readable for the UI picker
  example: string; // shown in the picker preview
  group: 'Student' | 'Class' | 'Session' | 'Sender';
}

export const MERGE_FIELDS: MergeFieldDef[] = [
  {
    key: 'student.name',
    label: 'Student name',
    example: 'Jane',
    group: 'Student',
  },
  {
    key: 'student.email',
    label: 'Student email',
    example: 'jane@example.com',
    group: 'Student',
  },
  {
    key: 'class.title',
    label: 'Class title',
    example: 'Tuesday Yoga',
    group: 'Class',
  },
  {
    key: 'class.instructor',
    label: 'Instructor name',
    example: 'Alex',
    group: 'Class',
  },
  {
    key: 'class.location',
    label: 'Class location',
    example: 'The Studio, 14 High St',
    group: 'Class',
  },
  {
    key: 'session.date',
    label: 'Session date',
    example: 'Tue, 12 May 2026',
    group: 'Session',
  },
  {
    key: 'session.time',
    label: 'Session time',
    example: '18:00',
    group: 'Session',
  },
  {
    key: 'session.datetime',
    label: 'Session date and time',
    example: 'Tue, 12 May 2026, 18:00',
    group: 'Session',
  },
  {
    key: 'sender.name',
    label: 'Your name',
    example: 'Alex',
    group: 'Sender',
  },
];

export interface MergeContext {
  student?: {
    name?: string | null;
    email?: string;
  };
  class?: {
    title?: string | null;
    instructor?: string | null;
    location?: string | null;
  };
  session?: {
    date?: string | null;
    time?: string | null;
    datetime?: string | null;
  };
  sender?: {
    name?: string | null;
  };
}

/**
 * Render a body containing {{key}} placeholders against a merge context.
 * Unknown keys are left untouched (so users can spot typos visually).
 */
export function renderMerge(body: string, ctx: MergeContext): string {
  return body.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}/g, (_, path) => {
    const parts = path.split('.');
    let cursor: unknown = ctx;
    for (const p of parts) {
      if (cursor && typeof cursor === 'object' && p in cursor) {
        cursor = (cursor as Record<string, unknown>)[p];
      } else {
        return `{{${path}}}`;
      }
    }
    if (cursor === null || cursor === undefined) return '';
    return String(cursor);
  });
}

/**
 * Build a default sample context for previewing templates in the editor.
 */
export function sampleContext(): MergeContext {
  return {
    student: { name: 'Jane', email: 'jane@example.com' },
    class: {
      title: 'Tuesday Yoga',
      instructor: 'Alex',
      location: 'The Studio, 14 High St',
    },
    session: {
      date: 'Tue, 12 May 2026',
      time: '18:00',
      datetime: 'Tue, 12 May 2026, 18:00',
    },
    sender: { name: 'Alex' },
  };
}
