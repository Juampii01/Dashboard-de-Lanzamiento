-- Ganadores del sorteo de premios, por rango (Elevate/Prime/Legacy/Expert).
-- Se corre desde /admin/sorteo (página oculta, solo accesible por URL directa
-- con sesión de admin — no está en el menú). Guarda el resultado para que no
-- se pierda al recargar y para no volver a sortear a alguien que ya ganó.
create table if not exists public.sorteo_winners (
  id         uuid primary key default gen_random_uuid(),
  rank_key   text not null check (rank_key in ('elevate', 'prime', 'legacy', 'expert')),
  user_id    uuid not null references public.users(id) on delete cascade,
  drawn_at   timestamptz not null default now(),
  drawn_by   uuid references public.users(id)
);
create index if not exists sorteo_winners_rank_idx on public.sorteo_winners(rank_key);
create unique index if not exists sorteo_winners_user_rank_uidx on public.sorteo_winners(user_id, rank_key);

alter table public.sorteo_winners enable row level security;
create policy "service role full access" on public.sorteo_winners
  for all to service_role using (true) with check (true);
