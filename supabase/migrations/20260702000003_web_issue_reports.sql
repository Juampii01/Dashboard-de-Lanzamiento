-- Reportes de "mi página del Día 3 no quedó bien" (imágenes rotas, etc.).
-- El usuario ya puede regenerar libremente (botón "Regenerar mi web", sin
-- restricción); esto es solo el canal para avisar al admin y que se pueda
-- ayudar puntualmente.
create table if not exists public.web_issue_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  message     text not null check (char_length(message) between 1 and 500),
  status      text not null default 'pending', -- pending | resolved
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists web_issue_reports_status_idx on public.web_issue_reports(status);

alter table public.web_issue_reports enable row level security;
create policy "service role full access" on public.web_issue_reports
  for all to service_role using (true) with check (true);
