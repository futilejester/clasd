/**
 * Segment rule compiler.
 *
 * Takes a SegmentRules tree and emits a Postgres `WHERE` clause and
 * positional args, both safe to pass to supabase.rpc or to a raw query.
 *
 * Why hand-rolled and not @supabase/postgrest-js filters?
 *   - We need nested AND/OR groups, which the .or()/.and() chaining can do
 *     but in an awkward stringly-typed way. A real compiler is clearer.
 *   - We're whitelisting field names and operators against the field
 *     definitions, so the resulting SQL fragment can never contain
 *     user-controlled identifiers.
 *
 * Output shape: a Postgres `WHERE` snippet using $1, $2, … placeholders,
 * plus a parallel array of values to bind. Caller wraps in a SELECT.
 */

import type {
  SegmentRules,
  SegmentCondition,
} from '@/types/database';
import {
  findField,
  type SegmentTarget,
  type FieldDef,
} from './fields';

interface CompiledQuery {
  whereSql: string;
  args: unknown[];
}

class CompileError extends Error {}

export function compileSegment(
  target: SegmentTarget,
  rules: SegmentRules
): CompiledQuery {
  const args: unknown[] = [];
  const sql = compileGroup(rules, target, args);
  return { whereSql: sql, args };
}

function compileGroup(
  group: SegmentRules,
  target: SegmentTarget,
  args: unknown[]
): string {
  if (!group.conditions || group.conditions.length === 0) {
    // An empty group matches everything (subject to combinator). We pick
    // a tautology so the parent SQL is well-formed.
    return 'TRUE';
  }
  const joiner = group.combinator === 'or' ? ' OR ' : ' AND ';
  const parts = group.conditions.map((c) => {
    if ('combinator' in c) {
      return `(${compileGroup(c, target, args)})`;
    }
    return compileLeaf(c, target, args);
  });
  return parts.join(joiner);
}

function compileLeaf(
  cond: SegmentCondition,
  target: SegmentTarget,
  args: unknown[]
): string {
  const field = findField(target, cond.field);
  if (!field) {
    throw new CompileError(`Unknown field: ${cond.field}`);
  }

  const col = field.sqlPath; // already validated against whitelist

  switch (cond.op) {
    case 'eq':
      return binary(col, '=', cond.value, args, field);
    case 'neq':
      return binary(col, '<>', cond.value, args, field);
    case 'gt':
      return binary(col, '>', cond.value, args, field);
    case 'gte':
      return binary(col, '>=', cond.value, args, field);
    case 'lt':
      return binary(col, '<', cond.value, args, field);
    case 'lte':
      return binary(col, '<=', cond.value, args, field);
    case 'contains':
      if (field.dataType === 'array') {
        return arrayContains(col, cond.value, args);
      }
      return ilike(col, cond.value, args, false);
    case 'not_contains':
      if (field.dataType === 'array') {
        return `NOT (${arrayContains(col, cond.value, args)})`;
      }
      return ilike(col, cond.value, args, true);
    case 'in':
      return inList(col, cond.value, args);
    case 'not_in':
      return `NOT (${inList(col, cond.value, args)})`;
    case 'is_null':
      return field.dataType === 'array'
        ? `(coalesce(array_length(${col}, 1), 0) = 0)`
        : `${col} IS NULL`;
    case 'is_not_null':
      return field.dataType === 'array'
        ? `(coalesce(array_length(${col}, 1), 0) > 0)`
        : `${col} IS NOT NULL`;
  }
}

function binary(
  col: string,
  op: string,
  value: unknown,
  args: unknown[],
  field: FieldDef
): string {
  const coerced = coerce(value, field);
  args.push(coerced);
  return `${col} ${op} $${args.length}`;
}

function ilike(
  col: string,
  value: unknown,
  args: unknown[],
  negate: boolean
): string {
  if (typeof value !== 'string') {
    throw new CompileError('Expected string for contains/not_contains');
  }
  args.push(`%${value}%`);
  return `${col} ${negate ? 'NOT ILIKE' : 'ILIKE'} $${args.length}`;
}

function arrayContains(
  col: string,
  value: unknown,
  args: unknown[]
): string {
  if (typeof value !== 'string') {
    throw new CompileError('Expected string for array contains');
  }
  args.push(value);
  // text[] @> ARRAY[$n]
  return `${col} @> ARRAY[$${args.length}]::text[]`;
}

function inList(col: string, value: unknown, args: unknown[]): string {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CompileError('Expected non-empty list for in/not_in');
  }
  const placeholders = value.map((v) => {
    args.push(v);
    return `$${args.length}`;
  });
  return `${col} IN (${placeholders.join(', ')})`;
}

function coerce(value: unknown, field: FieldDef): unknown {
  if (value === null || value === undefined) return null;
  switch (field.dataType) {
    case 'number':
      return typeof value === 'number' ? value : Number(value);
    case 'boolean':
      return value === true || value === 'true';
    case 'date':
      // Accept ISO strings; Postgres handles via timestamptz cast.
      return String(value);
    default:
      return value;
  }
}

export class SegmentCompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SegmentCompileError';
  }
}
