-- Registro de clicks en los botones de "Tu Próximo Paso" (Pagar ahora /
-- Hablar con el equipo por WhatsApp), para que el admin pueda ver quién los
-- usó. Solo tracking — no bloquea ni cambia el flujo del usuario.
create table if not exists public.proximo_paso_clicks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  button     text not null check (button in ('pagar_ahora', 'whatsapp')),
  clicked_at timestamptz not null default now()
);
create index if not exists proximo_paso_clicks_user_idx on public.proximo_paso_clicks(user_id);
create index if not exists proximo_paso_clicks_button_idx on public.proximo_paso_clicks(button);

alter table public.proximo_paso_clicks enable row level security;
create policy "service role full access" on public.proximo_paso_clicks
  for all to service_role using (true) with check (true);
