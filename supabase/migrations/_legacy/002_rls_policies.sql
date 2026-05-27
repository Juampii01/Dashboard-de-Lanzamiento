-- ============================================================
-- 002_rls_policies.sql — Row Level Security completo
-- ============================================================

-- ─── REVOCAR privilegios de anon en TODAS las tablas ─────────
revoke all on public.users                    from anon, authenticated;
revoke all on public.company_profiles         from anon, authenticated;
revoke all on public.naics_expansions         from anon, authenticated;
revoke all on public.web_previews             from anon, authenticated;
revoke all on public.capability_statements    from anon, authenticated;
revoke all on public.day_progress             from anon, authenticated;
revoke all on public.video_capsule_completions from anon, authenticated;
revoke all on public.sorteo_submissions       from anon, authenticated;
revoke all on public.admin_toggles            from anon, authenticated;

-- ─── HABILITAR RLS en todas las tablas ───────────────────────
alter table public.users                     enable row level security;
alter table public.company_profiles          enable row level security;
alter table public.naics_expansions          enable row level security;
alter table public.web_previews              enable row level security;
alter table public.capability_statements     enable row level security;
alter table public.day_progress              enable row level security;
alter table public.video_capsule_completions enable row level security;
alter table public.sorteo_submissions        enable row level security;
alter table public.admin_toggles             enable row level security;

-- ─── HELPER: función para verificar admin ────────────────────
create or replace function public.is_admin()
returns boolean
language sql security definer stable
as $$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  );
$$;

-- ─── TABLA: users ────────────────────────────────────────────
-- Usuario solo lee/edita su propio registro
create policy "users: select own"
  on public.users for select
  using (auth.uid() = id);

create policy "users: update own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admin lee todos
create policy "users: admin select all"
  on public.users for select
  using (public.is_admin());

-- Service role puede insertar (webhook de Hotmart)
create policy "users: service role insert"
  on public.users for insert
  with check (true);  -- se usa con service_role key que bypasea RLS

-- ─── TABLA: company_profiles ─────────────────────────────────
grant select, insert, update on public.company_profiles to authenticated;

create policy "company_profiles: own"
  on public.company_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "company_profiles: admin select"
  on public.company_profiles for select
  using (public.is_admin());

-- ─── TABLA: naics_expansions ─────────────────────────────────
grant select, insert, update on public.naics_expansions to authenticated;

create policy "naics_expansions: own"
  on public.naics_expansions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "naics_expansions: admin select"
  on public.naics_expansions for select
  using (public.is_admin());

-- ─── TABLA: web_previews ─────────────────────────────────────
grant select, insert, update on public.web_previews to authenticated;

create policy "web_previews: own"
  on public.web_previews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "web_previews: admin select"
  on public.web_previews for select
  using (public.is_admin());

-- ─── TABLA: capability_statements ───────────────────────────
grant select, insert, update on public.capability_statements to authenticated;

create policy "capability_statements: own"
  on public.capability_statements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "capability_statements: admin select"
  on public.capability_statements for select
  using (public.is_admin());

-- ─── TABLA: day_progress ─────────────────────────────────────
grant select, insert, update on public.day_progress to authenticated;

create policy "day_progress: own"
  on public.day_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "day_progress: admin select"
  on public.day_progress for select
  using (public.is_admin());

-- Admin puede actualizar is_unlocked para override por usuario
create policy "day_progress: admin update unlock"
  on public.day_progress for update
  using (public.is_admin());

-- ─── TABLA: video_capsule_completions ────────────────────────
grant select, insert on public.video_capsule_completions to authenticated;

create policy "video_capsule_completions: own"
  on public.video_capsule_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "video_capsule_completions: admin select"
  on public.video_capsule_completions for select
  using (public.is_admin());

-- ─── TABLA: sorteo_submissions ───────────────────────────────
grant select, insert, update on public.sorteo_submissions to authenticated;

create policy "sorteo_submissions: own"
  on public.sorteo_submissions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sorteo_submissions: admin select"
  on public.sorteo_submissions for select
  using (public.is_admin());

-- ─── TABLA: admin_toggles ────────────────────────────────────
grant select on public.admin_toggles to authenticated, anon;
grant update on public.admin_toggles to authenticated;

create policy "admin_toggles: anyone reads"
  on public.admin_toggles for select
  using (true);

create policy "admin_toggles: only admin writes"
  on public.admin_toggles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ─── STORAGE: bucket privado para entregables ────────────────
insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

create policy "deliverables: users upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'deliverables' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "deliverables: users read own"
  on storage.objects for select
  using (
    bucket_id = 'deliverables' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "deliverables: admin read all"
  on storage.objects for select
  using (
    bucket_id = 'deliverables' and
    public.is_admin()
  );
