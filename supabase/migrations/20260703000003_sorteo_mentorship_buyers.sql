-- Personas que YA pagaron la mentoría "Tu Primer Contrato" / Done For You de
-- $2,997 por fuera del challenge. Se excluyen de TODO el sorteo (los 4 rangos)
-- de forma silenciosa — sin ninguna marca visible en el panel que indique
-- por qué no aparecen en el pool de elegibles.
create table if not exists public.sorteo_mentorship_buyers (
  email      text primary key,
  added_at   timestamptz not null default now()
);

alter table public.sorteo_mentorship_buyers enable row level security;
create policy "service role full access" on public.sorteo_mentorship_buyers
  for all to service_role using (true) with check (true);
