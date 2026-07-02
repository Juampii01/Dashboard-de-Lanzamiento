-- Gatea "Regenerar mi web" (Día 3) detrás de aprobación manual del admin.
-- La PRIMERA generación (la que completa el Día 3) sigue siendo libre — es
-- necesaria para avanzar. Cualquier regeneración posterior consume un
-- "permiso" que el admin otorga puntualmente desde el panel de reportes,
-- para no gastar presupuesto de IA en regeneraciones ilimitadas.
alter table public.web_issue_reports
  add column if not exists regen_granted_at timestamptz,
  add column if not exists regen_consumed_at timestamptz;

create index if not exists web_issue_reports_regen_idx
  on public.web_issue_reports(user_id, regen_granted_at, regen_consumed_at);
