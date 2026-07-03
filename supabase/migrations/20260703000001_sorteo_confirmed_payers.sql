-- Lista maestra de "pago 100% confirmado" para el sorteo de premios, cruzando
-- las 3 plataformas de pago (Hotmart, SEM/"Sell", Stripe). Reemplaza el
-- criterio anterior (sorteo_submissions.eligible / completar 4 días) — ahora
-- la elegibilidad al sorteo es: email en esta tabla + haber ingresado al
-- menos una vez al dashboard (users.last_seen_at not null).
--
-- Se puede seguir agregando filas a mano (o por script) a medida que lleguen
-- más CSVs de pago, sin tocar código.
create table if not exists public.sorteo_confirmed_payers (
  email      text primary key,
  source     text not null check (source in ('hotmart', 'sem', 'stripe')),
  added_at   timestamptz not null default now()
);

alter table public.sorteo_confirmed_payers enable row level security;
create policy "service role full access" on public.sorteo_confirmed_payers
  for all to service_role using (true) with check (true);
