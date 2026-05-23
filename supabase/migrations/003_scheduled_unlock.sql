-- 003_scheduled_unlock.sql
-- Adds scheduled_unlock_at to admin_toggles so the countdown timer can show
-- when the next day will be globally unlocked.
--
-- Run this via: supabase db push  (or paste in the Supabase SQL editor)

alter table public.admin_toggles
  add column if not exists scheduled_unlock_at timestamptz;

comment on column public.admin_toggles.scheduled_unlock_at is
  'Optional future timestamp when this day will be auto-unlocked. Shown as a live countdown in the dashboard.';
