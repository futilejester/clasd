/**
 * Segment fields available per target type.
 *
 * The compiler in lib/segments/compiler.ts uses this to validate input
 * and to know how to translate a field name into a SQL column.
 */

export type SegmentTarget = 'students' | 'enrolments';

export type FieldDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'enum';

export interface FieldDef {
  key: string; // user-visible identifier, e.g. "attendance_count"
  label: string; // human label, e.g. "Sessions attended"
  /** SQL column the field maps to. May include a relation prefix like "students.tags". */
  sqlPath: string;
  dataType: FieldDataType;
  /** Allowed enum values, when dataType is 'enum'. */
  enumValues?: string[];
}

export const STUDENT_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', sqlPath: 'name', dataType: 'string' },
  { key: 'email', label: 'Email', sqlPath: 'email', dataType: 'string' },
  { key: 'tags', label: 'Tags', sqlPath: 'tags', dataType: 'array' },
  {
    key: 'subscribed',
    label: 'Subscribed',
    sqlPath: 'subscribed',
    dataType: 'boolean',
  },
  {
    key: 'created_at',
    label: 'Joined date',
    sqlPath: 'created_at',
    dataType: 'date',
  },
  {
    key: 'last_active_at',
    label: 'Last active',
    sqlPath: 'last_active_at',
    dataType: 'date',
  },
];

export const ENROLMENT_FIELDS: FieldDef[] = [
  // Enrolment-level fields
  {
    key: 'status',
    label: 'Enrolment status',
    sqlPath: 'enrolments.status',
    dataType: 'enum',
    enumValues: ['active', 'paused', 'completed', 'cancelled'],
  },
  {
    key: 'payment_status',
    label: 'Payment status',
    sqlPath: 'enrolments.payment_status',
    dataType: 'enum',
    enumValues: ['unpaid', 'paid', 'comped', 'refunded'],
  },
  {
    key: 'skill_level',
    label: 'Skill level',
    sqlPath: 'enrolments.skill_level',
    dataType: 'string',
  },
  {
    key: 'attendance_count',
    label: 'Sessions attended',
    sqlPath: 'enrolments.attendance_count',
    dataType: 'number',
  },
  {
    key: 'joined_at',
    label: 'Joined class',
    sqlPath: 'enrolments.joined_at',
    dataType: 'date',
  },
  // Joined student fields
  {
    key: 'student_name',
    label: 'Student name',
    sqlPath: 'students.name',
    dataType: 'string',
  },
  {
    key: 'student_email',
    label: 'Student email',
    sqlPath: 'students.email',
    dataType: 'string',
  },
  {
    key: 'student_tags',
    label: 'Student tags',
    sqlPath: 'students.tags',
    dataType: 'array',
  },
  {
    key: 'student_subscribed',
    label: 'Student subscribed',
    sqlPath: 'students.subscribed',
    dataType: 'boolean',
  },
];

export function fieldsFor(target: SegmentTarget): FieldDef[] {
  return target === 'enrolments' ? ENROLMENT_FIELDS : STUDENT_FIELDS;
}

export function findField(
  target: SegmentTarget,
  key: string
): FieldDef | undefined {
  return fieldsFor(target).find((f) => f.key === key);
}

/** Operator labels for the UI. */
export const OPERATOR_LABELS: Record<string, string> = {
  eq: 'is',
  neq: 'is not',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  contains: 'contains',
  not_contains: "doesn't contain",
  in: 'is one of',
  not_in: 'is none of',
  is_null: 'is empty',
  is_not_null: 'is set',
};

/** Which operators apply to which data types. */
export function operatorsFor(t: FieldDataType): string[] {
  switch (t) {
    case 'string':
      return ['eq', 'neq', 'contains', 'not_contains', 'is_null', 'is_not_null'];
    case 'number':
    case 'date':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_null', 'is_not_null'];
    case 'boolean':
      return ['eq', 'neq'];
    case 'array':
      return ['contains', 'not_contains', 'is_null', 'is_not_null'];
    case 'enum':
      return ['eq', 'neq', 'in', 'not_in'];
  }
}
