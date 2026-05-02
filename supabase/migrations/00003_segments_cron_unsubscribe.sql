-- ============================================================================
-- Clasd — Migration 3
-- - Per-student unsubscribe tokens
-- - Per-class auto-reminder toggle and lead time
-- - Track which sessions/campaigns have already had reminders queued
-- ============================================================================

-- 1. Per-student unsubscribe token (unguessable, used by /u/[token] route)
alter table students
  add column if not exists unsubscribe_token text;

create unique index if not exists students_unsubscribe_token_idx
  on students(unsubscribe_token)
  where unsubscribe_token is not null;

-- Backfill existing rows
update students
  set unsubscribe_token = replace(gen_random_uuid()::text, '-', '')
  where unsubscribe_token is null;

-- Make NOT NULL after backfill
alter table students
  alter column unsubscribe_token set not null;

-- 2. Per-class auto-reminder configuration
alter table classes
  add column if not exists auto_remind boolean not null default false;

alter table classes
  add column if not exists auto_remind_lead_minutes int not null default 1440; -- 24h

-- 3. Add useful tracking to scheduled_messages
-- (campaign_id and session_id already exist; reminder_kind too)
-- Add a per-(session, kind) uniqueness so the cron can't double-queue.
create unique index if not exists scheduled_messages_session_kind_idx
  on scheduled_messages(session_id, student_id, reminder_kind)
  where reminder_kind is not null;

-- 4. Useful index for cron polling
create index if not exists scheduled_messages_due_idx
  on scheduled_messages(send_at)
  where status = 'pending';
