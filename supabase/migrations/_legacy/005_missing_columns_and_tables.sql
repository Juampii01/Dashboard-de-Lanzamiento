-- 005_missing_columns_and_tables.sql
-- Adds columns and tables that were referenced in application code
-- but missing from the initial schema migrations.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE everywhere).

-- ─── 1. Missing columns on users ────────────────────────────────────────────

alter table public.users
  add column if not exists last_time_xp_at   timestamptz,
  add column if not exists last_avatar_xp_at timestamptz,
  add column if not exists has_seen_onboarding boolean not null default false;

-- ─── 2. video_capsules — content authored by admin ──────────────────────────

create table if not exists public.video_capsules (
  id            uuid        primary key default gen_random_uuid(),
  day_number    int         not null check (day_number between 1 and 4),
  title         text        not null,
  description   text,
  youtube_url   text        not null,
  points_reward int         not null default 10,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── 3. video_capsule_completions — one row per user×capsule ────────────────

create table if not exists public.video_capsule_completions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  capsule_id    uuid        not null references public.video_capsules(id) on delete cascade,
  points_earned int         not null default 10,
  completed_at  timestamptz not null default now(),
  -- Prevent double-counting even under concurrent requests
  unique (user_id, capsule_id)
);

create index if not exists vcc_user_idx    on public.video_capsule_completions (user_id);
create index if not exists vcc_capsule_idx on public.video_capsule_completions (capsule_id);

-- ─── 4. get_leaderboard RPC ─────────────────────────────────────────────────
-- Returns top 20 users by total_points, with raffle_entries (every 10 pts = 1 entry)
-- and is_current_user flag for the calling user.
-- Security definer so the function can read users table regardless of RLS.

create or replace function public.get_leaderboard()
returns table (
  rank             bigint,
  display_name     text,
  total_points     int,
  raffle_entries   int,
  is_current_user  boolean
)
language sql
security definer
stable
as $$
  with ranked as (
    select
      row_number() over (order by total_points desc, created_at asc) as rank,
      -- Truncate last name to first initial for privacy: "Juan P."
      case
        when full_name is null or full_name = '' then 'Anónimo'
        when position(' ' in full_name) = 0      then full_name
        else split_part(full_name, ' ', 1) || ' ' || left(split_part(full_name, ' ', 2), 1) || '.'
      end                                    as display_name,
      total_points,
      greatest(0, total_points / 10)        as raffle_entries,
      id                                     as user_id
    from public.users
    where total_points > 0
    order by total_points desc, created_at asc
    limit 20
  )
  select
    r.rank,
    r.display_name,
    r.total_points,
    r.raffle_entries,
    (r.user_id = auth.uid()) as is_current_user
  from ranked r;
$$;

grant execute on function public.get_leaderboard() to authenticated;

-- ─── 5. RLS for new tables ──────────────────────────────────────────────────

alter table public.video_capsules           enable row level security;
alter table public.video_capsule_completions enable row level security;

-- video_capsules: all authenticated users can read; only service role writes
create policy "video_capsules_read" on public.video_capsules
  for select to authenticated using (true);

-- video_capsule_completions: users see only their own rows
create policy "vcc_own_select" on public.video_capsule_completions
  for select to authenticated using (auth.uid() = user_id);

create policy "vcc_own_insert" on public.video_capsule_completions
  for insert to authenticated with check (auth.uid() = user_id);
