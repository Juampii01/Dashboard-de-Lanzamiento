-- Personas que YA pagaron la mentoría "Tu Primer Contrato" / Done For You de
-- $15K por fuera del challenge. Se excluyen del sorteo de GovBidder Expert
-- (ese rango sortea justamente esa misma mentoría) — si ganaran, no tendría
-- sentido: ya la tienen, y pedirían el reembolso del premio en vez de usarlo.
-- No afecta su participación en Elevate/Prime/Legacy (premios distintos).
create table if not exists public.sorteo_mentorship_buyers (
  email      text primary key,
  added_at   timestamptz not null default now()
);

alter table public.sorteo_mentorship_buyers enable row level security;
create policy "service role full access" on public.sorteo_mentorship_buyers
  for all to service_role using (true) with check (true);
