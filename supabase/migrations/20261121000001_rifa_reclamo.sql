-- Rifa: el ganador tiene que reclamar el premio en la llamada.
-- claimed_at = cuándo el equipo marcó "Reclamó". Si no reclama, la fila del
-- ganador se borra (el lugar se vuelve a sortear) y queda en rifa_forfeits,
-- que lo saca del resto de la rifa.
alter table public.rifa_winners add column if not exists claimed_at timestamptz;

create table if not exists public.rifa_forfeits (
  id          uuid primary key default gen_random_uuid(),
  rank_key    text not null,
  position    integer not null,
  user_id     uuid not null references public.users(id) on delete cascade,
  points_at_draw numeric,
  drawn_at    timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid
);
alter table public.rifa_forfeits enable row level security;
create policy "service role full access" on public.rifa_forfeits
  for all to service_role using (true) with check (true);
