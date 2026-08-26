-- IZDOSH Academy — Supabase schema
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles — one row per auth.users, created via trigger below
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  address text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
  referral_code text unique,
  referred_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Registration is phone + password only (no email): auth.users.phone is set
-- directly by supabase.auth.signUp({ phone, password }), so the trigger
-- copies it straight across instead of relying on request metadata.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, address, referral_code)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.phone,
    new.raw_user_meta_data ->> 'address',
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- courses / modules / lessons — 3-language content, ordered
-- ============================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_uz text not null,
  title_ru text not null,
  title_en text not null,
  description_uz text not null default '',
  description_ru text not null default '',
  description_en text not null default '',
  cover_url text,
  instructor_name text,
  instructor_avatar_url text,
  duration_months int not null default 1,
  price_start int not null default 0,
  price_standard int not null default 0,
  price_pro int not null default 0,
  is_published boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title_uz text not null,
  title_ru text not null,
  title_en text not null,
  order_index int not null default 0
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  title_uz text not null,
  title_ru text not null,
  title_en text not null,
  video_url text not null default '',
  content_uz text,
  content_ru text,
  content_en text,
  order_index int not null default 0,
  is_free_preview boolean not null default false
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  question_uz text not null,
  question_ru text not null,
  question_en text not null,
  options_uz text[] not null,
  options_ru text[] not null,
  options_en text[] not null,
  correct_index int not null,
  order_index int not null default 0
);

-- Not every lesson is a video: a lesson can also (or instead) ship reading
-- material — a PDF slide deck, a PPTX presentation, a doc, or a plain link —
-- listed underneath the player as downloadable resources.
create table if not exists public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title_uz text not null,
  title_ru text not null,
  title_en text not null,
  file_url text not null,
  file_type text not null default 'pdf' check (file_type in ('pdf', 'pptx', 'doc', 'image', 'link')),
  order_index int not null default 0
);

-- ============================================================
-- enrollments — one-time course purchase (per tier)
-- subscriptions — recurring, grants access to every course
-- ============================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  tier text not null check (tier in ('start', 'standard', 'pro')),
  source text not null default 'purchase' check (source in ('purchase', 'subscription')),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'expired', 'canceled', 'trialing')),
  plan text not null check (plan in ('monthly', 'yearly')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- user_progress — sequential lesson completion tracking
-- ============================================================
create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  completed boolean not null default false,
  quiz_passed boolean,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- ============================================================
-- installment_plans / installment_payments — "2 bo'lakka" / "3 bo'lakka"
-- payment plans (business plan §11.3, §9.7). The down payment (50% for a
-- 2-part plan, 40% for a 3-part plan) is paid immediately via Click/Payme
-- and grants course access right away; later installments are paid the
-- same way against their own scheduled row. If an installment's due_date
-- passes while it's still 'pending', getLessonAccess treats the course as
-- locked again until it's paid — see lib/lms/access.ts.
-- ============================================================
create table if not exists public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  tier text not null check (tier in ('start', 'standard', 'pro')),
  total_amount int not null,
  installments_count int not null check (installments_count in (2, 3)),
  created_at timestamptz not null default now()
);

create table if not exists public.installment_payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.installment_plans (id) on delete cascade,
  sequence_number int not null,
  amount int not null,
  due_date timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  unique (plan_id, sequence_number)
);

create index if not exists idx_installment_payments_plan on public.installment_payments (plan_id);

-- ============================================================
-- payments — Click / Payme transaction log + webhook target
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('click', 'payme')),
  provider_transaction_id text,
  amount int not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  course_id uuid references public.courses (id),
  tier text check (tier in ('start', 'standard', 'pro')),
  subscription_plan text check (subscription_plan in ('monthly', 'yearly')),
  installment_payment_id uuid references public.installment_payments (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- waitlist — email/phone capture for not-yet-published courses
-- ============================================================
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- referrals — one row per successfully invited friend. Reward tiers
-- (10/50/100 referrals → 1/6/12 months of Premium) are applied in
-- lib/lms/referral-actions.ts#grantReferralRewards, mirroring the
-- "Targ'ibotchilar" program on comparable platforms.
-- ============================================================
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

create index if not exists idx_referrals_referrer on public.referrals (referrer_id);

-- ============================================================
-- live_sessions — scheduled Standard/Pro group classes (Google Meet)
-- session_questions — live Q&A thread attached to each session
-- ============================================================
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  tier text not null check (tier in ('standard', 'pro')),
  title text not null,
  meet_url text not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  created_at timestamptz not null default now()
);

create table if not exists public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_sessions_course on public.live_sessions (course_id, scheduled_at);
create index if not exists idx_session_questions_session on public.session_questions (session_id, created_at);

create index if not exists idx_lessons_course on public.lessons (course_id, order_index);
create index if not exists idx_modules_course on public.modules (course_id, order_index);
create index if not exists idx_lesson_materials_lesson on public.lesson_materials (lesson_id, order_index);
create index if not exists idx_progress_user_course on public.user_progress (user_id, course_id);
create index if not exists idx_enrollments_user on public.enrollments (user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.enrollments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_progress enable row level security;
alter table public.payments enable row level security;
alter table public.referrals enable row level security;
alter table public.installment_plans enable row level security;
alter table public.installment_payments enable row level security;

create policy "Users see their own referrals" on public.referrals
  for select using (auth.uid() = referrer_id);

create policy "Users see their own installment plans" on public.installment_plans
  for select using (auth.uid() = user_id);
create policy "Users see their own installment payments" on public.installment_payments
  for select using (
    exists (
      select 1 from public.installment_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

create policy "Profiles are self-readable" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are self-updatable" on public.profiles
  for update using (auth.uid() = id);

-- Course metadata (title, price, is_published) has no sensitive data, so it's
-- readable regardless of publish state — unpublished rows power the "coming
-- soon" catalog cards and waitlist pages. Modules/lessons/quiz content stay
-- gated to published courses, since that's the actual curriculum.
create policy "Course metadata is public" on public.courses
  for select using (true);
create policy "Modules of published courses are public" on public.modules
  for select using (exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy "Lesson metadata is public, video/content gated in app layer" on public.lessons
  for select using (exists (select 1 from public.courses c where c.id = course_id and c.is_published));

-- Quiz *answers* (correct_index) are only fetchable by someone who actually
-- has access to the course — this used to be `using (true)`, which meant
-- anyone holding the public anon key could read every quiz's correct
-- answers directly from Postgrest, regardless of purchase state.
create or replace function public.has_course_access(p_course_id uuid)
returns boolean as $$
begin
  if exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid() and s.status = 'active' and s.current_period_end > now()
  ) then
    return true;
  end if;

  return exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id = p_course_id
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.has_quiz_access(p_lesson_id uuid)
returns boolean as $$
declare
  v_course_id uuid;
  v_is_free_preview boolean;
begin
  select course_id, is_free_preview into v_course_id, v_is_free_preview
  from public.lessons where id = p_lesson_id;

  if v_course_id is null then
    return false;
  end if;

  return v_is_free_preview or public.has_course_access(v_course_id);
end;
$$ language plpgsql security definer set search_path = public;

create policy "Quiz answers require course access" on public.quiz_questions
  for select using (public.has_quiz_access(lesson_id));

create policy "Lesson materials require course access" on public.lesson_materials
  for select using (public.has_quiz_access(lesson_id));

create policy "Users see their own enrollments" on public.enrollments
  for select using (auth.uid() = user_id);
create policy "Users see their own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "Users see their own progress" on public.user_progress
  for select using (auth.uid() = user_id);
create policy "Users can upsert their own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own progress" on public.user_progress
  for update using (auth.uid() = user_id);
create policy "Users see their own payments" on public.payments
  for select using (auth.uid() = user_id);

alter table public.waitlist enable row level security;
create policy "Anyone can join the waitlist" on public.waitlist
  for insert with check (true);

-- ============================================================
-- Live session access — Pro enrollment/subscription unlocks both Standard
-- and Pro sessions; Standard enrollment unlocks only Standard sessions.
-- ============================================================
create or replace function public.has_live_session_access(p_session_id uuid)
returns boolean as $$
declare
  v_course_id uuid;
  v_tier text;
begin
  select course_id, tier into v_course_id, v_tier
  from public.live_sessions where id = p_session_id;

  if v_course_id is null then
    return false;
  end if;

  if exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid() and s.status = 'active' and s.current_period_end > now()
  ) then
    return true;
  end if;

  return exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id = v_course_id
      and (e.tier = 'pro' or (e.tier = 'standard' and v_tier = 'standard'))
  );
end;
$$ language plpgsql security definer set search_path = public;

alter table public.live_sessions enable row level security;
alter table public.session_questions enable row level security;

create policy "Users can view sessions they have access to" on public.live_sessions
  for select using (public.has_live_session_access(id));

create policy "Users can view questions for accessible sessions" on public.session_questions
  for select using (public.has_live_session_access(session_id));
create policy "Users can post questions on accessible sessions" on public.session_questions
  for insert with check (auth.uid() = user_id and public.has_live_session_access(session_id));

-- Required for the live Q&A board (components/live/session-qa.tsx) to receive
-- new questions and instructor answers via supabase-js .channel(...).on("postgres_changes", ...)
-- without the student having to refresh the page.
alter publication supabase_realtime add table public.session_questions;

-- Writes to courses/modules/lessons/quiz_questions/enrollments/subscriptions/payments/
-- installment_plans/installment_payments/live_sessions, instructor answers on
-- session_questions, and all admin reads (including unpublished courses and the
-- waitlist) are performed server-side with the service-role key (admin client),
-- bypassing RLS — see lib/supabase/server.ts#createAdminClient, app/[locale]/admin/*,
-- and app/api/payments/*.
