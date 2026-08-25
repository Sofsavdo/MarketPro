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
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
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
  created_at timestamptz not null default now()
);

create index if not exists idx_lessons_course on public.lessons (course_id, order_index);
create index if not exists idx_modules_course on public.modules (course_id, order_index);
create index if not exists idx_progress_user_course on public.user_progress (user_id, course_id);
create index if not exists idx_enrollments_user on public.enrollments (user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.enrollments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_progress enable row level security;
alter table public.payments enable row level security;

create policy "Profiles are self-readable" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are self-updatable" on public.profiles
  for update using (auth.uid() = id);

create policy "Published courses are public" on public.courses
  for select using (is_published = true);
create policy "Modules of published courses are public" on public.modules
  for select using (exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy "Lesson metadata is public, video/content gated in app layer" on public.lessons
  for select using (exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy "Quiz visible to lesson viewers" on public.quiz_questions
  for select using (true);

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

-- Writes to courses/modules/lessons/quiz_questions/enrollments/subscriptions/payments
-- are performed server-side with the service-role key (admin client), bypassing RLS —
-- see lib/supabase/server.ts#createAdminClient and app/api/payments/*.
