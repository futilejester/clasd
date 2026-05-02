-- ============================================================================
-- Clasd — Initial schema
-- All tables scoped to user_id with Row Level Security.
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- Helper: updated_at trigger function
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- profiles — extends auth.users with plan + billing info
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  polar_customer_id text,
  polar_subscription_id text,
  sending_domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create profile row when a new auth user is created
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- classes — top-level entity (a course, workshop, weekly class, etc.)
-- ============================================================================
create table classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  instructor_name text,
  default_duration_minutes int not null default 60,
  location text,
  cover_image_url text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classes_user_id_idx on classes(user_id);
create index classes_archived_idx on classes(user_id, archived);

create trigger classes_updated_at
  before update on classes
  for each row execute function set_updated_at();

-- ============================================================================
-- class_sessions — individual instances of a class
-- ============================================================================
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  capacity int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index class_sessions_class_id_idx on class_sessions(class_id);
create index class_sessions_user_id_idx on class_sessions(user_id);
create index class_sessions_starts_at_idx on class_sessions(starts_at);
create index class_sessions_status_idx on class_sessions(user_id, status, starts_at);

create trigger class_sessions_updated_at
  before update on class_sessions
  for each row execute function set_updated_at();

-- ============================================================================
-- students — people enrolled or potentially enrolled
-- ============================================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  name text,
  phone text,
  tags text[] not null default '{}',
  custom_attributes jsonb not null default '{}',
  subscribed boolean not null default true,
  unsubscribed_at timestamptz,
  last_active_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);

create index students_user_id_idx on students(user_id);
create index students_email_idx on students(email);
create index students_subscribed_idx on students(user_id, subscribed);
create index students_tags_idx on students using gin(tags);

create trigger students_updated_at
  before update on students
  for each row execute function set_updated_at();

-- ============================================================================
-- enrolments — student belongs to a class with class-specific attributes
-- ============================================================================
create table enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'comped', 'refunded')),
  skill_level text,
  attendance_count int not null default 0,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, class_id)
);

create index enrolments_user_id_idx on enrolments(user_id);
create index enrolments_class_id_idx on enrolments(class_id);
create index enrolments_student_id_idx on enrolments(student_id);
create index enrolments_status_idx on enrolments(class_id, status);

create trigger enrolments_updated_at
  before update on enrolments
  for each row execute function set_updated_at();

-- ============================================================================
-- attendance — per-session attendance record
-- ============================================================================
create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enrolment_id uuid not null references enrolments(id) on delete cascade,
  session_id uuid not null references class_sessions(id) on delete cascade,
  status text not null check (status in ('attended', 'absent', 'excused')),
  recorded_at timestamptz not null default now(),
  unique (enrolment_id, session_id)
);

create index attendance_session_idx on attendance(session_id);
create index attendance_enrolment_idx on attendance(enrolment_id);

-- ============================================================================
-- signup_forms — public enrolment forms with shareable URLs
-- ============================================================================
create table signup_forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  slug text not null unique,
  name text not null,
  headline text,
  description text,
  custom_fields jsonb not null default '[]',
  primary_color text default '#B85C38',
  active boolean not null default true,
  submissions_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index signup_forms_user_id_idx on signup_forms(user_id);
create index signup_forms_slug_idx on signup_forms(slug);
create index signup_forms_active_idx on signup_forms(active);

create trigger signup_forms_updated_at
  before update on signup_forms
  for each row execute function set_updated_at();

-- ============================================================================
-- segments — saved filter rules for targeting students or enrolments
-- ============================================================================
create table segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  rules jsonb not null,
  target text not null check (target in ('students', 'enrolments')),
  member_count int not null default 0,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index segments_user_id_idx on segments(user_id);

create trigger segments_updated_at
  before update on segments
  for each row execute function set_updated_at();

-- ============================================================================
-- campaigns — composed messages
-- ============================================================================
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null,
  body_html text,
  body_json jsonb,
  template_id text,
  segment_id uuid references segments(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  attach_ics boolean not null default false,
  ics_session_id uuid references class_sessions(id) on delete set null,
  recipient_count int not null default 0,
  delivered_count int not null default 0,
  opened_count int not null default 0,
  clicked_count int not null default 0,
  bounced_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_user_id_idx on campaigns(user_id);
create index campaigns_status_idx on campaigns(user_id, status);

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

-- ============================================================================
-- scheduled_messages — cron queue for both campaigns and auto-reminders
-- ============================================================================
create table scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  send_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  reminder_kind text,
  session_id uuid references class_sessions(id) on delete cascade,
  rendered_subject text,
  rendered_body text,
  resend_id text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index scheduled_messages_pending_idx on scheduled_messages(send_at) where status = 'pending';
create index scheduled_messages_user_idx on scheduled_messages(user_id);
create index scheduled_messages_resend_id_idx on scheduled_messages(resend_id);
create index scheduled_messages_session_idx on scheduled_messages(session_id);

-- ============================================================================
-- delivery_events — webhook log from Resend
-- ============================================================================
create table delivery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_message_id uuid references scheduled_messages(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  student_id uuid references students(id) on delete set null,
  resend_id text,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index delivery_events_user_idx on delivery_events(user_id);
create index delivery_events_resend_id_idx on delivery_events(resend_id);
create index delivery_events_campaign_idx on delivery_events(campaign_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table classes enable row level security;
alter table class_sessions enable row level security;
alter table students enable row level security;
alter table enrolments enable row level security;
alter table attendance enable row level security;
alter table signup_forms enable row level security;
alter table segments enable row level security;
alter table campaigns enable row level security;
alter table scheduled_messages enable row level security;
alter table delivery_events enable row level security;

-- profiles: users can see and update their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Standard owner-only policies for the rest. Service role bypasses RLS,
-- which is what we use for public form submissions and webhook handlers.
create policy "Owner full access" on classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on class_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on students
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on enrolments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on attendance
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on signup_forms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on segments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on scheduled_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner full access" on delivery_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read access for active signup forms (anonymous users browsing public URLs)
create policy "Public can view active signup forms" on signup_forms
  for select to anon using (active = true);
