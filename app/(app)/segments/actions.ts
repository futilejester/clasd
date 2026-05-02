'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { findField } from '@/lib/segments/fields';
import type { SegmentRules } from '@/types/database';
import { checkLimit } from '@/lib/limits';

const conditionSchema: z.ZodType = z.lazy(() =>
  z.union([leafSchema, groupSchema])
);

const leafSchema = z.object({
  field: z.string().min(1),
  op: z.enum([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_null',
    'is_not_null',
  ]),
  value: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.union([z.string(), z.number()])),
    ])
    .optional(),
});

const groupSchema: z.ZodType = z.lazy(() =>
  z.object({
    combinator: z.enum(['and', 'or']),
    conditions: z.array(conditionSchema).max(20),
  })
);

const baseSchema = {
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  target: z.enum(['students', 'enrolments']),
  rules: groupSchema,
};

const createSchema = z.object(baseSchema);
const updateSchema = z.object({ id: z.string().uuid(), ...baseSchema });

function validateFieldsExist(
  rules: SegmentRules,
  target: 'students' | 'enrolments'
): string | null {
  for (const c of rules.conditions) {
    if ('combinator' in c) {
      const err = validateFieldsExist(c, target);
      if (err) return err;
    } else {
      if (!findField(target, c.field)) {
        return `Unknown field "${c.field}" for target "${target}".`;
      }
    }
  }
  return null;
}

export async function createSegment(input: z.infer<typeof createSchema>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const limit = await checkLimit(user.id, 'segments');
  if (!limit.ok) {
    return { error: limit.message };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const fieldErr = validateFieldsExist(d.rules as SegmentRules, d.target);
  if (fieldErr) return { error: fieldErr };

  const { data: created, error } = await supabase
    .from('segments')
    .insert({
      user_id: user.id,
      name: d.name,
      description: d.description || null,
      target: d.target,
      rules: d.rules,
    })
    .select('id')
    .single();

  if (error || !created) return { error: error?.message ?? 'Failed' };

  revalidatePath('/segments');
  redirect(`/segments/${created.id}`);
}

export async function updateSegment(input: z.infer<typeof updateSchema>) {
  const supabase = createClient();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;

  const fieldErr = validateFieldsExist(d.rules as SegmentRules, d.target);
  if (fieldErr) return { error: fieldErr };

  const { error } = await supabase
    .from('segments')
    .update({
      name: d.name,
      description: d.description || null,
      target: d.target,
      rules: d.rules,
    })
    .eq('id', d.id);

  if (error) return { error: error.message };

  revalidatePath('/segments');
  revalidatePath(`/segments/${d.id}`);
  redirect(`/segments/${d.id}`);
}

export async function deleteSegment(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('segments').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/segments');
  redirect('/segments');
}

/**
 * Evaluate a segment and return matching student IDs + a sample preview.
 * Used by the rule builder for live "X students match" feedback.
 *
 * Also persists member_count + last_evaluated_at on the segment if a
 * segmentId is given.
 */
export async function previewSegment(args: {
  target: 'students' | 'enrolments';
  rules: SegmentRules;
  segmentId?: string;
}): Promise<
  | {
      error: string;
    }
  | {
      count: number;
      sample: Array<{ id: string; email: string; name: string | null }>;
    }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const fieldErr = validateFieldsExist(args.rules, args.target);
  if (fieldErr) return { error: fieldErr };

  if (args.target === 'students') {
    const { data, error } = await supabase.rpc('clasd_match_students', {
      p_user_id: user.id,
      p_rules: args.rules,
    });
    if (error) return { error: error.message };
    const rows = data ?? [];
    const sample = rows
      .slice(0, 10)
      .map((r: { id: string; email: string; name: string | null }) => ({
        id: r.id,
        email: r.email,
        name: r.name,
      }));
    if (args.segmentId) {
      await supabase
        .from('segments')
        .update({
          member_count: rows.length,
          last_evaluated_at: new Date().toISOString(),
        })
        .eq('id', args.segmentId);
    }
    return { count: rows.length, sample };
  } else {
    // Enrolments: dedupe by student_id and re-fetch student rows for sample
    const { data, error } = await supabase.rpc('clasd_match_enrolments', {
      p_user_id: user.id,
      p_rules: args.rules,
    });
    if (error) return { error: error.message };
    const rows = data ?? [];
    const studentIds = Array.from(
      new Set(
        rows.map(
          (r: { student_id: string }) => r.student_id
        )
      )
    );
    const count = studentIds.length;

    let sample: Array<{
      id: string;
      email: string;
      name: string | null;
    }> = [];
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('students')
        .select('id, email, name')
        .in('id', studentIds.slice(0, 10));
      sample = students ?? [];
    }
    if (args.segmentId) {
      await supabase
        .from('segments')
        .update({
          member_count: count,
          last_evaluated_at: new Date().toISOString(),
        })
        .eq('id', args.segmentId);
    }
    return { count, sample };
  }
}
