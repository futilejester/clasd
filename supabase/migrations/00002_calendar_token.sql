-- ============================================================================
-- Clasd — Migration 2
-- Adds per-class calendar token for unguessable subscribable .ics URLs.
-- ============================================================================

alter table classes
  add column if not exists calendar_token text not null default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists classes_calendar_token_idx on classes(calendar_token);

-- Backfill any existing rows that may have been missed (defensive)
update classes
  set calendar_token = replace(gen_random_uuid()::text, '-', '')
  where calendar_token is null or calendar_token = '';
