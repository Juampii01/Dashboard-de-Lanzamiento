-- Comentarios: archivo por lanzamiento + destacados.
--
-- Para el lanzamiento de noviembre 2026 los comentarios del lanzamiento
-- anterior NO se borran: se archivan (archived_at) y el equipo elige los
-- mejores (featured) desde /admin/comentarios. En el dashboard se ven solo los
-- comentarios actuales + los destacados del lanzamiento anterior, en una
-- sección aparte.

alter table public.program_comments
  add column if not exists archived_at timestamptz,
  add column if not exists featured boolean not null default false;

create index if not exists program_comments_archived_idx
  on public.program_comments (archived_at);
