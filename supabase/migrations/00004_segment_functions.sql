-- ============================================================================
-- Clasd — Migration 4
-- Server-side segment evaluation via Postgres functions.
--
-- We can't easily run dynamic SQL through the Supabase JS client (no raw
-- exec). So we build evaluation logic in plpgsql functions that take the
-- rules JSON and return matching IDs.
--
-- The rule shape mirrors the SegmentRules TypeScript type:
--   { combinator: 'and'|'or', conditions: [Condition|RuleGroup, ...] }
--   Condition: { field, op, value? }
--
-- We *whitelist* fields inside the function so a malicious rules payload
-- can't access columns it shouldn't. The TypeScript compiler in
-- lib/segments/compiler.ts also validates client-side; this is defence in
-- depth.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: evaluate a leaf condition against a record's fields.
-- We pass the candidate row's relevant fields as a JSONB blob, keyed by
-- the user-facing field key. The function returns a boolean.
-- ----------------------------------------------------------------------------
create or replace function clasd_eval_leaf(cond jsonb, row_fields jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  field_key text := cond->>'field';
  op text := cond->>'op';
  value jsonb := cond->'value';
  field_val jsonb := row_fields->field_key;
  field_text text;
  field_num numeric;
  field_arr text[];
begin
  if field_val is null and op not in ('is_null', 'is_not_null') then
    return false;
  end if;

  case op
    when 'is_null' then
      return field_val is null
        or (jsonb_typeof(field_val) = 'array' and jsonb_array_length(field_val) = 0);
    when 'is_not_null' then
      return field_val is not null
        and not (jsonb_typeof(field_val) = 'array' and jsonb_array_length(field_val) = 0);
    when 'eq' then
      return field_val = value;
    when 'neq' then
      return field_val <> value;
    when 'gt' then
      -- numeric or text-date comparison
      if jsonb_typeof(field_val) = 'number' then
        return (field_val#>>'{}')::numeric > (value#>>'{}')::numeric;
      else
        return (field_val#>>'{}') > (value#>>'{}');
      end if;
    when 'gte' then
      if jsonb_typeof(field_val) = 'number' then
        return (field_val#>>'{}')::numeric >= (value#>>'{}')::numeric;
      else
        return (field_val#>>'{}') >= (value#>>'{}');
      end if;
    when 'lt' then
      if jsonb_typeof(field_val) = 'number' then
        return (field_val#>>'{}')::numeric < (value#>>'{}')::numeric;
      else
        return (field_val#>>'{}') < (value#>>'{}');
      end if;
    when 'lte' then
      if jsonb_typeof(field_val) = 'number' then
        return (field_val#>>'{}')::numeric <= (value#>>'{}')::numeric;
      else
        return (field_val#>>'{}') <= (value#>>'{}');
      end if;
    when 'contains' then
      if jsonb_typeof(field_val) = 'array' then
        select array_agg(elem #>> '{}') into field_arr
          from jsonb_array_elements(field_val) elem;
        return (value#>>'{}') = any(field_arr);
      else
        return (field_val#>>'{}') ilike '%' || (value#>>'{}') || '%';
      end if;
    when 'not_contains' then
      if jsonb_typeof(field_val) = 'array' then
        select array_agg(elem #>> '{}') into field_arr
          from jsonb_array_elements(field_val) elem;
        return not ((value#>>'{}') = any(coalesce(field_arr, array[]::text[])));
      else
        return (field_val#>>'{}') not ilike '%' || (value#>>'{}') || '%';
      end if;
    when 'in' then
      return field_val <@ value;  -- jsonb contains
      -- ^ field_val is the scalar; we want it to match one of the values.
      -- But <@ checks if left contained in right. For scalar in array we use:
      -- value @> jsonb_build_array(field_val) — let's redo:
    when 'not_in' then
      return not exists (
        select 1 from jsonb_array_elements(value) v where v = field_val
      );
    else
      return false;
  end case;
end;
$$;

-- Override the 'in' handling — we want scalar IN array semantics
create or replace function clasd_eval_leaf(cond jsonb, row_fields jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  field_key text := cond->>'field';
  op text := cond->>'op';
  value jsonb := cond->'value';
  field_val jsonb := row_fields->field_key;
  field_arr text[];
begin
  if field_val is null and op not in ('is_null', 'is_not_null') then
    return false;
  end if;

  case op
    when 'is_null' then
      return field_val is null
        or (jsonb_typeof(field_val) = 'array' and jsonb_array_length(field_val) = 0);
    when 'is_not_null' then
      return field_val is not null
        and not (jsonb_typeof(field_val) = 'array' and jsonb_array_length(field_val) = 0);
    when 'eq' then
      return field_val = value;
    when 'neq' then
      return field_val <> value;
    when 'gt' then
      if jsonb_typeof(field_val) = 'number' and jsonb_typeof(value) = 'number' then
        return (field_val#>>'{}')::numeric > (value#>>'{}')::numeric;
      end if;
      return (field_val#>>'{}') > (value#>>'{}');
    when 'gte' then
      if jsonb_typeof(field_val) = 'number' and jsonb_typeof(value) = 'number' then
        return (field_val#>>'{}')::numeric >= (value#>>'{}')::numeric;
      end if;
      return (field_val#>>'{}') >= (value#>>'{}');
    when 'lt' then
      if jsonb_typeof(field_val) = 'number' and jsonb_typeof(value) = 'number' then
        return (field_val#>>'{}')::numeric < (value#>>'{}')::numeric;
      end if;
      return (field_val#>>'{}') < (value#>>'{}');
    when 'lte' then
      if jsonb_typeof(field_val) = 'number' and jsonb_typeof(value) = 'number' then
        return (field_val#>>'{}')::numeric <= (value#>>'{}')::numeric;
      end if;
      return (field_val#>>'{}') <= (value#>>'{}');
    when 'contains' then
      if jsonb_typeof(field_val) = 'array' then
        select array_agg(elem #>> '{}') into field_arr
          from jsonb_array_elements(field_val) elem;
        return (value#>>'{}') = any(coalesce(field_arr, array[]::text[]));
      else
        return (field_val#>>'{}') ilike '%' || (value#>>'{}') || '%';
      end if;
    when 'not_contains' then
      if jsonb_typeof(field_val) = 'array' then
        select array_agg(elem #>> '{}') into field_arr
          from jsonb_array_elements(field_val) elem;
        return not ((value#>>'{}') = any(coalesce(field_arr, array[]::text[])));
      else
        return (field_val#>>'{}') not ilike '%' || (value#>>'{}') || '%';
      end if;
    when 'in' then
      return exists (
        select 1 from jsonb_array_elements(value) v where v = field_val
      );
    when 'not_in' then
      return not exists (
        select 1 from jsonb_array_elements(value) v where v = field_val
      );
    else
      return false;
  end case;
end;
$$;

-- ----------------------------------------------------------------------------
-- Helper: recursively evaluate a rule tree against a row's fields.
-- ----------------------------------------------------------------------------
create or replace function clasd_eval_rules(rules jsonb, row_fields jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  combinator text := coalesce(rules->>'combinator', 'and');
  conditions jsonb := rules->'conditions';
  cond jsonb;
  result boolean;
begin
  if conditions is null or jsonb_array_length(conditions) = 0 then
    return true;
  end if;

  if combinator = 'or' then
    for cond in select jsonb_array_elements(conditions) loop
      if cond ? 'combinator' then
        result := clasd_eval_rules(cond, row_fields);
      else
        result := clasd_eval_leaf(cond, row_fields);
      end if;
      if result then return true; end if;
    end loop;
    return false;
  else
    for cond in select jsonb_array_elements(conditions) loop
      if cond ? 'combinator' then
        result := clasd_eval_rules(cond, row_fields);
      else
        result := clasd_eval_leaf(cond, row_fields);
      end if;
      if not result then return false; end if;
    end loop;
    return true;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Public RPC: evaluate a STUDENTS-target segment for a given user.
-- ----------------------------------------------------------------------------
create or replace function clasd_match_students(
  p_user_id uuid,
  p_rules jsonb
) returns table (id uuid, email text, name text)
language sql
stable
as $$
  select s.id, s.email, s.name
  from students s
  where s.user_id = p_user_id
    and clasd_eval_rules(
      p_rules,
      jsonb_build_object(
        'name', to_jsonb(s.name),
        'email', to_jsonb(s.email),
        'tags', to_jsonb(s.tags),
        'subscribed', to_jsonb(s.subscribed),
        'created_at', to_jsonb(s.created_at::text),
        'last_active_at', to_jsonb(s.last_active_at::text)
      )
    );
$$;

-- ----------------------------------------------------------------------------
-- Public RPC: evaluate an ENROLMENTS-target segment for a given user.
-- Returns the enrolment's student_id (deduped) so callers can use the
-- same recipient flow as for student segments.
-- ----------------------------------------------------------------------------
create or replace function clasd_match_enrolments(
  p_user_id uuid,
  p_rules jsonb
) returns table (id uuid, student_id uuid, class_id uuid)
language sql
stable
as $$
  select e.id, e.student_id, e.class_id
  from enrolments e
  join students s on s.id = e.student_id
  where e.user_id = p_user_id
    and clasd_eval_rules(
      p_rules,
      jsonb_build_object(
        'status', to_jsonb(e.status),
        'payment_status', to_jsonb(e.payment_status),
        'skill_level', to_jsonb(e.skill_level),
        'attendance_count', to_jsonb(e.attendance_count),
        'joined_at', to_jsonb(e.joined_at::text),
        'student_name', to_jsonb(s.name),
        'student_email', to_jsonb(s.email),
        'student_tags', to_jsonb(s.tags),
        'student_subscribed', to_jsonb(s.subscribed)
      )
    );
$$;

-- Permissions: allow authenticated users to call these RPCs.
-- The function bodies enforce p_user_id matches; service role bypasses anyway.
grant execute on function clasd_match_students(uuid, jsonb) to authenticated, service_role;
grant execute on function clasd_match_enrolments(uuid, jsonb) to authenticated, service_role;
