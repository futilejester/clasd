-- ============================================================================
-- Clasd — Migration 7
-- Customizable form appearance — button text and success message.
-- ============================================================================

alter table signup_forms
  add column if not exists button_text text not null default 'Sign up';

alter table signup_forms
  add column if not exists success_title text not null default 'You''re in.';

alter table signup_forms
  add column if not exists success_message text not null default 'Thanks for signing up. You''ll hear from us soon.';
