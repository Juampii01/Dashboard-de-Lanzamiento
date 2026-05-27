-- ============================================================
-- 001_initial_schema.sql — Govbidder Challenge Dashboard
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── HELPER FUNCTION: updated_at trigger ─────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── USERS ───────────────────────────────────────────────────
create table if not exists public.users (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text not null unique,
  full_name              text,
  hotmart_transaction_id text unique,
  access_starts_at       timestamptz,
  access_expires_at      timestamptz,
  is_admin               boolean not null default false,
  total_points           int     not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger users_updated_at
  before update on public.users
  for each row execute function set_updated_at();

-- ─── COMPANY PROFILES (Día 1) ────────────────────────────────
create table if not exists public.company_profiles (
  id                              uuid primary key default uuid_generate_v4(),
  user_id                         uuid not null references public.users(id) on delete cascade,
  company_name                    text not null,
  year_founded                    int,
  employee_count                  int,
  niche                           text,
  problem_solved                  text,
  target_avatar                   text,
  previous_acquisition_methods    text,
  primary_naics                   text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  unique (user_id)
);

create trigger company_profiles_updated_at
  before update on public.company_profiles
  for each row execute function set_updated_at();

-- ─── NAICS EXPANSIONS (Día 2) ────────────────────────────────
create table if not exists public.naics_expansions (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.users(id) on delete cascade,
  primary_naics      text not null,
  related_codes      jsonb not null default '[]',
  keywords_input     text[] not null default '{}',
  keywords_expanded  text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id)
);

create trigger naics_expansions_updated_at
  before update on public.naics_expansions
  for each row execute function set_updated_at();

-- ─── WEB PREVIEWS (Día 3) ────────────────────────────────────
create table if not exists public.web_previews (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.users(id) on delete cascade,
  generated_html        text,
  generated_css         text,
  portal_list_snapshot  jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)
);

create trigger web_previews_updated_at
  before update on public.web_previews
  for each row execute function set_updated_at();

-- ─── CAPABILITY STATEMENTS (Día 4) ───────────────────────────
create table if not exists public.capability_statements (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  statement_data    jsonb not null default '{}',
  pdf_storage_path  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id)
);

create trigger capability_statements_updated_at
  before update on public.capability_statements
  for each row execute function set_updated_at();

-- ─── DAY PROGRESS ────────────────────────────────────────────
create table if not exists public.day_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  day_number   int  not null check (day_number between 1 and 4),
  is_unlocked  boolean not null default false,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, day_number)
);

create trigger day_progress_updated_at
  before update on public.day_progress
  for each row execute function set_updated_at();

-- ─── VIDEO CAPSULE COMPLETIONS ───────────────────────────────
create table if not exists public.video_capsule_completions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  capsule_id   text not null,
  completed_at timestamptz not null default now(),
  points_earned int not null default 0,
  created_at   timestamptz not null default now(),
  unique (user_id, capsule_id)
);

-- ─── SORTEO SUBMISSIONS ──────────────────────────────────────
create table if not exists public.sorteo_submissions (
  id                         uuid primary key default uuid_generate_v4(),
  user_id                    uuid not null references public.users(id) on delete cascade,
  all_deliverables_uploaded  boolean not null default false,
  submitted_at               timestamptz,
  eligible                   boolean not null default false,
  storage_path               text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (user_id)
);

create trigger sorteo_submissions_updated_at
  before update on public.sorteo_submissions
  for each row execute function set_updated_at();

-- ─── ADMIN TOGGLES ───────────────────────────────────────────
create table if not exists public.admin_toggles (
  day_number           int primary key check (day_number between 1 and 4),
  is_globally_unlocked boolean not null default false,
  unlocked_at          timestamptz,
  updated_at           timestamptz not null default now()
);

create trigger admin_toggles_updated_at
  before update on public.admin_toggles
  for each row execute function set_updated_at();

-- Insertar los 4 días (Día 1 comienza desbloqueado, los demás no)
insert into public.admin_toggles (day_number, is_globally_unlocked) values
  (1, true),
  (2, false),
  (3, false),
  (4, false)
on conflict (day_number) do nothing;
