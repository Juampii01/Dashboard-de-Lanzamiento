-- Certificados reclamados desde la app. El certificado vive en verify.govbidder.net
-- (número GBC-26X-0001, PDF y verificación pública); acá guardamos cuál le tocó a
-- cada participante para no emitir dos y para que lo pueda volver a descargar.
create table if not exists public.certificate_claims (
  user_id            uuid primary key references public.users(id) on delete cascade,
  certificate_number text not null unique,
  first_name         text,
  last_name          text not null,
  full_name          text not null,
  issue_date         date not null,
  verify_url         text,
  emailed_at         timestamptz,
  created_at         timestamptz not null default now()
);
alter table public.certificate_claims enable row level security;
create policy "certificate_claims: own select" on public.certificate_claims
  for select to authenticated using (user_id = public.effective_uid());
