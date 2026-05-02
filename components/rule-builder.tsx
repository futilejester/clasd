'use client';

import { useState, useEffect, useTransition } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  fieldsFor,
  findField,
  operatorsFor,
  OPERATOR_LABELS,
  type FieldDef,
  type SegmentTarget,
} from '@/lib/segments/fields';
import type {
  SegmentRules,
  SegmentCondition,
} from '@/types/database';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagInput } from '@/components/ui/tag-input';
import { cn } from '@/lib/utils';

interface RuleBuilderProps {
  target: SegmentTarget;
  rules: SegmentRules;
  onChange: (rules: SegmentRules) => void;
}

export function RuleBuilder({ target, rules, onChange }: RuleBuilderProps) {
  return (
    <Group
      target={target}
      group={rules}
      onChange={onChange}
      depth={0}
    />
  );
}

interface GroupProps {
  target: SegmentTarget;
  group: SegmentRules;
  onChange: (g: SegmentRules) => void;
  depth: number;
  onRemove?: () => void;
}

const MAX_DEPTH = 1; // outer + 1 nested level

function Group({ target, group, onChange, depth, onRemove }: GroupProps) {
  function setCombinator(v: 'and' | 'or') {
    onChange({ ...group, combinator: v });
  }

  function setCondAt(i: number, c: SegmentCondition | SegmentRules) {
    const next = group.conditions.slice();
    next[i] = c;
    onChange({ ...group, conditions: next });
  }

  function removeAt(i: number) {
    onChange({
      ...group,
      conditions: group.conditions.filter((_, idx) => idx !== i),
    });
  }

  function addCondition() {
    const fields = fieldsFor(target);
    const first = fields[0];
    const newCond: SegmentCondition = {
      field: first.key,
      op: operatorsFor(first.dataType)[0] as SegmentCondition['op'],
      value: '',
    };
    onChange({
      ...group,
      conditions: [...group.conditions, newCond],
    });
  }

  function addGroup() {
    const newGroup: SegmentRules = {
      combinator: 'and',
      conditions: [],
    };
    onChange({
      ...group,
      conditions: [...group.conditions, newGroup],
    });
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        depth === 0
          ? 'border-cream-300 bg-cream-50'
          : 'border-cream-300 bg-cream-100'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 p-1 bg-cream-200 rounded">
          <button
            type="button"
            onClick={() => setCombinator('and')}
            className={cn(
              'px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded',
              group.combinator === 'and'
                ? 'bg-cream-50 text-slate-900 shadow-sm'
                : 'text-slate-600'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setCombinator('or')}
            className={cn(
              'px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded',
              group.combinator === 'or'
                ? 'bg-cream-50 text-slate-900 shadow-sm'
                : 'text-slate-600'
            )}
          >
            Any
          </button>
        </div>
        <span className="text-xs text-slate-500">
          {group.combinator === 'and'
            ? 'Match ALL conditions'
            : 'Match ANY condition'}
        </span>
        <div className="flex-1" />
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove group"
            className="text-slate-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {group.conditions.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-2">
          No conditions yet. Add one below.
        </p>
      ) : (
        <ul className="space-y-2">
          {group.conditions.map((c, i) => (
            <li key={i}>
              {'combinator' in c ? (
                <Group
                  target={target}
                  group={c}
                  depth={depth + 1}
                  onChange={(g) => setCondAt(i, g)}
                  onRemove={() => removeAt(i)}
                />
              ) : (
                <ConditionRow
                  target={target}
                  condition={c}
                  onChange={(nc) => setCondAt(i, nc)}
                  onRemove={() => removeAt(i)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" size="sm" variant="outline" onClick={addCondition}>
          <Plus className="h-3.5 w-3.5" />
          Add condition
        </Button>
        {depth < MAX_DEPTH ? (
          <Button type="button" size="sm" variant="ghost" onClick={addGroup}>
            <Copy className="h-3.5 w-3.5" />
            Add group
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ConditionRow({
  target,
  condition,
  onChange,
  onRemove,
}: {
  target: SegmentTarget;
  condition: SegmentCondition;
  onChange: (c: SegmentCondition) => void;
  onRemove: () => void;
}) {
  const fields = fieldsFor(target);
  const field = findField(target, condition.field) ?? fields[0];
  const ops = operatorsFor(field.dataType);

  function onFieldChange(key: string) {
    const f = findField(target, key);
    if (!f) return;
    const newOps = operatorsFor(f.dataType);
    const op = newOps.includes(condition.op)
      ? condition.op
      : (newOps[0] as SegmentCondition['op']);
    onChange({
      field: key,
      op,
      value: needsValue(op) ? '' : undefined,
    });
  }

  function onOpChange(op: SegmentCondition['op']) {
    onChange({
      ...condition,
      op,
      value: needsValue(op) ? (condition.value ?? '') : undefined,
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
      <Select
        value={condition.field}
        onChange={(e) => onFieldChange(e.target.value)}
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </Select>

      <Select
        value={condition.op}
        onChange={(e) =>
          onOpChange(e.target.value as SegmentCondition['op'])
        }
      >
        {ops.map((o) => (
          <option key={o} value={o}>
            {OPERATOR_LABELS[o]}
          </option>
        ))}
      </Select>

      <ValueInput
        field={field}
        op={condition.op}
        value={condition.value}
        onChange={(v) => onChange({ ...condition, value: v })}
      />

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove condition"
        className="h-10 w-10 inline-flex items-center justify-center text-slate-400 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ValueInput({
  field,
  op,
  value,
  onChange,
}: {
  field: FieldDef;
  op: string;
  value: SegmentCondition['value'];
  onChange: (v: SegmentCondition['value']) => void;
}) {
  if (!needsValue(op)) {
    return <div />;
  }

  // List operators (in/not_in) — chip input
  if (op === 'in' || op === 'not_in') {
    const arr = Array.isArray(value) ? value.map(String) : [];
    return (
      <TagInput
        value={arr}
        onChange={(tags) => onChange(tags)}
        placeholder="Add and press enter"
      />
    );
  }

  if (field.dataType === 'enum') {
    return (
      <Select
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Choose…
        </option>
        {(field.enumValues ?? []).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </Select>
    );
  }

  if (field.dataType === 'boolean') {
    return (
      <Select
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(e) => onChange(e.target.value === 'true')}
      >
        <option value="" disabled>
          Choose…
        </option>
        <option value="true">true</option>
        <option value="false">false</option>
      </Select>
    );
  }

  if (field.dataType === 'number') {
    return (
      <Input
        type="number"
        value={typeof value === 'number' ? value : (value as string) ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        }
      />
    );
  }

  if (field.dataType === 'date') {
    return (
      <Input
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.dataType === 'array' ? 'Tag value' : 'Value'}
    />
  );
}

function needsValue(op: string): boolean {
  return op !== 'is_null' && op !== 'is_not_null';
}
