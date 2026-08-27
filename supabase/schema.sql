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
  -- CRM pipeline for the downsell flow: a subscriber ("start" access) who
  -- gets offered a VIP course and either takes it or doesn't. Whether their
  -- subscription is expiring soon is time-sensitive, so it's computed live
  -- from subscriptions.current_period_end (see lib/lms/leads.ts) instead of
  -- stored here — nothing would keep a stored value in sync without a cron.
  lead_status text not null default 'new_lead'
    check (lead_status in ('new_lead', 'vip_offered', 'downsell_subscribed')),
  -- Highest referral-count reward tier already granted (see
  -- lib/lms/referral-actions.ts) — without this, a race between two
  -- friends' signups landing at once, or an admin correcting a fraudulent
  -- referral, can make the referral count skip straight past a threshold
  -- like 10, and the strict "count === 10" check would then never fire for
  -- that referrer. Tracking what's already been granted lets a late check
  -- catch up on any tier that was crossed but never rewarded.
  referral_reward_tier int not null default 0,
  -- Daily-activity streak (audit §6) — bumped by completeLesson
  -- (lib/lms/access.ts) whenever a student finishes a lesson: same day is a
  -- no-op, the very next day extends the streak, any later day resets it.
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

-- RLS's `for update using (auth.uid() = id)` only restricts *which rows* the
-- authenticated role can touch, not *which columns* — without this, any
-- logged-in student could PATCH their own `role` to 'admin' (or rewrite
-- referral_code/referred_by/lead_status) directly through the PostgREST API,
-- bypassing the app's updateProfile server action entirely. Column-level
-- grants close that regardless of what RLS policies exist.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, address, avatar_url) on public.profiles to authenticated;

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
--
-- Access is now Hybrid (see lib/lms/access.ts):
--   - Subscription (lib/pricing.ts) grants "start" access to every published
--     course: pre-recorded video lessons + community Q&A only, no live
--     classes, no mentor feedback.
--   - Buying a specific course (this `price`, one-time) grants "vip" access
--     to that course, for life: everything "start" has, plus its live
--     sessions and mentor feedback. Subscribing later never downgrades a
--     VIP course back to start, and an expired subscription never touches
--     a course bought outright.
-- There's no more per-tier course pricing (old price_start/standard/pro) —
-- one course, one price, one purchase unlocks everything about it.
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
  price int not null default 0,
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
  -- Shown next to the lesson title in the curriculum list (course detail
  -- page) alongside the lock/unlock icon, so a student sees what each
  -- lesson covers before opening it — not just after.
  thumbnail_url text,
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
-- enrollments — one-time course purchase, always grants lifetime VIP
-- access to that one course (see the access-model note on `courses` above)
-- subscriptions — recurring, grants "start" access to every course
-- ============================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  source text not null default 'purchase' check (source in ('purchase', 'downsell_credit')),
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
  -- 'manual' is the operator-triggered downsell credit (see
  -- upgradeToVipWithCredit in lib/lms/admin-actions.ts) — not a real
  -- Click/Payme transaction, so provider_transaction_id stays null for it.
  provider text not null check (provider in ('click', 'payme', 'manual')),
  provider_transaction_id text,
  amount int not null,
  -- For a downsell-credit payment: the subscription payment amount that was
  -- subtracted from the course price to produce `amount`. Zero for a normal
  -- Click/Payme purchase.
  discount_amount int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  course_id uuid references public.courses (id),
  subscription_plan text check (subscription_plan in ('monthly', 'yearly')),
  installment_payment_id uuid references public.installment_payments (id),
  -- The promo code text applied at checkout, if any. `used_count` on
  -- promo_codes is only incremented once this payment actually reaches
  -- 'paid' (see the Click/Payme webhook handlers) — never at checkout time,
  -- so an abandoned or failed checkout doesn't burn a redemption.
  promo_code text,
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
-- live_sessions — scheduled group classes (Google Meet), VIP-only: only
-- someone who bought the course outright (an enrollments row) can join —
-- a bare subscription ("start" access) never unlocks live sessions, see
-- has_live_session_access below.
-- session_questions — live Q&A thread attached to each session
-- ============================================================
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
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

-- ============================================================
-- operator_call_logs — CRM notes: every time a sales operator calls a lead
-- (whether they've bought anything yet or not), they log what was said
-- here. Admin-only — students never see notes about themselves, so there's
-- no student-facing RLS policy; all reads/writes go through the service
-- role from the admin panel (lib/lms/admin-actions.ts).
-- ============================================================
create table if not exists public.operator_call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_call_logs_user on public.operator_call_logs (user_id, created_at);

alter table public.operator_call_logs enable row level security;

create index if not exists idx_lessons_course on public.lessons (course_id, order_index);
create index if not exists idx_modules_course on public.modules (course_id, order_index);
create index if not exists idx_lesson_materials_lesson on public.lesson_materials (lesson_id, order_index);
create index if not exists idx_progress_user_course on public.user_progress (user_id, course_id);
create index if not exists idx_enrollments_user on public.enrollments (user_id);

-- Postgres doesn't auto-index foreign key columns (only primary keys get
-- that), and this exact filter — active subscription for a user, not yet
-- expired — is what has_course_access/getLessonAccess run on nearly every
-- page load (any lesson, the dashboard, /live, every purchase check). Without
-- this it's a sequential scan of the whole subscriptions table on every
-- single request once there's real traffic.
create index if not exists idx_subscriptions_user_status
  on public.subscriptions (user_id, status, current_period_end);
create index if not exists idx_quiz_questions_lesson on public.quiz_questions (lesson_id);
create index if not exists idx_payments_user on public.payments (user_id, created_at);
create index if not exists idx_installment_plans_user_course
  on public.installment_plans (user_id, course_id);

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

drop policy if exists "Users see their own referrals" on public.referrals;
create policy "Users see their own referrals" on public.referrals
  for select using (auth.uid() = referrer_id);

drop policy if exists "Users see their own installment plans" on public.installment_plans;
create policy "Users see their own installment plans" on public.installment_plans
  for select using (auth.uid() = user_id);
drop policy if exists "Users see their own installment payments" on public.installment_payments;
create policy "Users see their own installment payments" on public.installment_payments
  for select using (
    exists (
      select 1 from public.installment_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Profiles are self-readable" on public.profiles;
create policy "Profiles are self-readable" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Profiles are self-updatable" on public.profiles;
create policy "Profiles are self-updatable" on public.profiles
  for update using (auth.uid() = id);

-- Course metadata (title, price, is_published) has no sensitive data, so it's
-- readable regardless of publish state — unpublished rows power the "coming
-- soon" catalog cards and waitlist pages. Modules/lessons/quiz content stay
-- gated to published courses, since that's the actual curriculum.
drop policy if exists "Course metadata is public" on public.courses;
create policy "Course metadata is public" on public.courses
  for select using (true);
drop policy if exists "Modules of published courses are public" on public.modules;
create policy "Modules of published courses are public" on public.modules
  for select using (exists (select 1 from public.courses c where c.id = course_id and c.is_published));
drop policy if exists "Lesson metadata is public, video/content gated in app layer" on public.lessons;
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

drop policy if exists "Quiz answers require course access" on public.quiz_questions;
create policy "Quiz answers require course access" on public.quiz_questions
  for select using (public.has_quiz_access(lesson_id));

drop policy if exists "Lesson materials require course access" on public.lesson_materials;
create policy "Lesson materials require course access" on public.lesson_materials
  for select using (public.has_quiz_access(lesson_id));

drop policy if exists "Users see their own enrollments" on public.enrollments;
create policy "Users see their own enrollments" on public.enrollments
  for select using (auth.uid() = user_id);
drop policy if exists "Users see their own subscriptions" on public.subscriptions;
create policy "Users see their own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "Users see their own progress" on public.user_progress;
create policy "Users see their own progress" on public.user_progress
  for select using (auth.uid() = user_id);
drop policy if exists "Users can upsert their own progress" on public.user_progress;
create policy "Users can upsert their own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own progress" on public.user_progress;
create policy "Users can update their own progress" on public.user_progress
  for update using (auth.uid() = user_id);
drop policy if exists "Users see their own payments" on public.payments;
create policy "Users see their own payments" on public.payments
  for select using (auth.uid() = user_id);

alter table public.waitlist enable row level security;
drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist" on public.waitlist
  for insert with check (true);

-- ============================================================
-- Live session access — VIP (bought the course) only. Deliberately does NOT
-- check subscriptions: a subscription is "start" access (video + community)
-- everywhere, and must never unlock live classes or mentor time — that's
-- the whole point of the hybrid model (subscription is the low-commitment
-- tier, buying the course outright is what earns live + mentor access).
-- ============================================================
create or replace function public.has_live_session_access(p_session_id uuid)
returns boolean as $$
declare
  v_course_id uuid;
begin
  select course_id into v_course_id
  from public.live_sessions where id = p_session_id;

  if v_course_id is null then
    return false;
  end if;

  return exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id = v_course_id
  );
end;
$$ language plpgsql security definer set search_path = public;

alter table public.live_sessions enable row level security;
alter table public.session_questions enable row level security;

drop policy if exists "Users can view sessions they have access to" on public.live_sessions;
create policy "Users can view sessions they have access to" on public.live_sessions
  for select using (public.has_live_session_access(id));

drop policy if exists "Users can view questions for accessible sessions" on public.session_questions;
create policy "Users can view questions for accessible sessions" on public.session_questions
  for select using (public.has_live_session_access(session_id));
drop policy if exists "Users can post questions on accessible sessions" on public.session_questions;
create policy "Users can post questions on accessible sessions" on public.session_questions
  for insert with check (auth.uid() = user_id and public.has_live_session_access(session_id));

-- Required for the live Q&A board (components/live/session-qa.tsx) to receive
-- new questions and instructor answers via supabase-js .channel(...).on("postgres_changes", ...)
-- without the student having to refresh the page. `alter publication ... add
-- table` has no `if not exists` form, so re-running this file against a
-- database that already has it would fail — guarded the same way the
-- policies above are.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_questions'
  ) then
    alter publication supabase_realtime add table public.session_questions;
  end if;
end $$;

-- ============================================================
-- course_reviews — public star rating + comment, one per (course, user),
-- only from someone who actually has access (audit §3: "eng katta bo'shliq"
-- — social proof is the single cheapest trust/conversion lever the catalog
-- was missing).
-- ============================================================
create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create index if not exists idx_course_reviews_course on public.course_reviews (course_id, created_at desc);

alter table public.course_reviews enable row level security;

drop policy if exists "Course reviews are public" on public.course_reviews;
create policy "Course reviews are public" on public.course_reviews
  for select using (true);
drop policy if exists "Only course-access holders can review" on public.course_reviews;
create policy "Only course-access holders can review" on public.course_reviews
  for insert with check (auth.uid() = user_id and public.has_course_access(course_id));
drop policy if exists "Users can update their own review" on public.course_reviews;
create policy "Users can update their own review" on public.course_reviews
  for update using (auth.uid() = user_id);

-- ============================================================
-- lesson_comments — a discussion thread under each lesson, separate from
-- the live-session Q&A: for asking about the actual lesson content, on your
-- own time, not just during a scheduled class.
-- ============================================================
create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_comments_lesson on public.lesson_comments (lesson_id, created_at);

alter table public.lesson_comments enable row level security;

drop policy if exists "Lesson comments require course access" on public.lesson_comments;
create policy "Lesson comments require course access" on public.lesson_comments
  for select using (public.has_quiz_access(lesson_id));
drop policy if exists "Users can post comments if they have access" on public.lesson_comments;
create policy "Users can post comments if they have access" on public.lesson_comments
  for insert with check (auth.uid() = user_id and public.has_quiz_access(lesson_id));

-- ============================================================
-- certificates — issued once a student's user_progress shows every lesson
-- in the course completed (checked in lib/lms/certificate.ts). The row is
-- just a stable record (id doubles as the verification code) — the actual
-- PDF is generated on demand from it, never stored as a file.
-- ============================================================
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  issued_at timestamptz not null default now(),
  unique (course_id, user_id)
);

alter table public.certificates enable row level security;

drop policy if exists "Users see their own certificates" on public.certificates;
create policy "Users see their own certificates" on public.certificates
  for select using (auth.uid() = user_id);

-- ============================================================
-- promo_codes — admin-issued discount codes (audit §5), applied in
-- lib/payments/resolve-amount.ts. No student-facing RLS policy: a code's
-- discount is only ever validated server-side with the service-role
-- client, so a browsable "which codes exist" table is never exposed.
-- ============================================================
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent int not null check (discount_percent between 1 and 100),
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

create index if not exists idx_certificates_user on public.certificates (user_id);

-- ============================================================
-- installment_leads — a student who chose "muddatli to'lov" (12-month
-- installment) at checkout instead of paying Click/Payme/Atmos in full.
-- No payment happens here — this just queues them for an operator to call
-- and formalize the deal (nasiya) by phone, same shape as the CRM
-- lead_status flow on `profiles`. `monthly_amount`/`total_amount` are
-- captured server-side at submit time (course price × 1.43 ÷ 12) so the
-- number an operator sees can't drift from what the student was actually
-- shown, even if the course price changes later.
-- ============================================================
create table if not exists public.installment_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  monthly_amount int not null,
  total_amount int not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists idx_installment_leads_status
  on public.installment_leads (status, created_at desc);

alter table public.installment_leads enable row level security;

drop policy if exists "Users can create their own installment lead" on public.installment_leads;
create policy "Users can create their own installment lead" on public.installment_leads
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users see their own installment leads" on public.installment_leads;
create policy "Users see their own installment leads" on public.installment_leads
  for select using (auth.uid() = user_id);

-- Writes to courses/modules/lessons/quiz_questions/enrollments/subscriptions/payments/
-- installment_plans/installment_payments/live_sessions, instructor answers on
-- session_questions, and all admin reads (including unpublished courses and the
-- waitlist) are performed server-side with the service-role key (admin client),
-- bypassing RLS — see lib/supabase/server.ts#createAdminClient, app/[locale]/admin/*,
-- and app/api/payments/*.

-- ============================================================
-- Storage — course cover images and lesson thumbnails, uploaded from the
-- admin panel (lib/supabase/storage.ts) instead of pasting an external URL.
-- Both buckets are public-read (covers/thumbnails aren't sensitive — they're
-- shown on the public catalog) but writes only ever happen through the
-- service-role admin client, so no INSERT/UPDATE/DELETE policy is needed;
-- the SELECT policy below just lets the anon/authenticated roles read them
-- back via the public bucket URL.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('lesson-thumbnails', 'lesson-thumbnails', true)
on conflict (id) do nothing;

drop policy if exists "Course covers are publicly readable" on storage.objects;
create policy "Course covers are publicly readable" on storage.objects
  for select using (bucket_id = 'course-covers');

drop policy if exists "Lesson thumbnails are publicly readable" on storage.objects;
create policy "Lesson thumbnails are publicly readable" on storage.objects
  for select using (bucket_id = 'lesson-thumbnails');
