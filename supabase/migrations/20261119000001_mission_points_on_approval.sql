-- ============================================================================
-- Puntos de misiones revisadas por el equipo: se suman AL APROBAR, no al enviar.
--
-- Aplica a las misiones que revisa el equipo:
--   - rafaga_submissions  (misiones relámpago)
--   - mission_submissions (misión del día)
--
-- Antes: el envío sumaba los puntos al instante y rechazar los descontaba
-- (el participante veía que "le sacaban puntos").
-- Ahora: el envío queda 'pending' (puntos "en revisión"); aprobar los suma;
-- rechazar no descuenta nada si nunca se sumaron.
--
-- credited_points: cuántos puntos se sumaron de verdad por este envío
--   (NULL = no se sumaron). Guarda el valor real (sobre 10.000 pts se suma la
--   mitad), así que un rechazo posterior descuenta exactamente lo sumado.
-- seen_at: cuándo vio el participante el resultado de la revisión (para
--   mostrarle una sola vez "se te acreditaron X pts").
--
-- Datos existentes: no se toca el saldo de nadie. Lo aprobado ya se había
-- acreditado al enviar → credited_points = points_*; lo rechazado ya se
-- había descontado → NULL. Todo lo viejo queda como "visto".
--
-- Orden de despliegue seguro: esta migración puede correr ANTES del deploy.
-- El default de status sigue siendo 'approved' (el código nuevo inserta
-- 'pending' explícitamente). Si entre la migración y el deploy el código viejo
-- inserta una fila 'approved' sin credited_points, la función de revisión la
-- trata como ya acreditada (así lo hacía el código viejo), así que nunca se
-- suma dos veces.
-- ============================================================================

-- ── rafaga_submissions ──────────────────────────────────────────────────────
alter table public.rafaga_submissions add column if not exists credited_points integer;
alter table public.rafaga_submissions add column if not exists seen_at timestamptz;

update public.rafaga_submissions
   set credited_points = points_earned
 where status = 'approved' and credited_points is null;

update public.rafaga_submissions set seen_at = coalesce(reviewed_at, now()) where seen_at is null;

alter table public.rafaga_submissions drop constraint if exists rafaga_submissions_status_check;
alter table public.rafaga_submissions
  add constraint rafaga_submissions_status_check check (status in ('pending', 'approved', 'rejected'));

create index if not exists rafaga_submissions_user_status_idx
  on public.rafaga_submissions (user_id, status);

-- ── mission_submissions ─────────────────────────────────────────────────────
alter table public.mission_submissions add column if not exists credited_points integer;
alter table public.mission_submissions add column if not exists seen_at timestamptz;

update public.mission_submissions
   set credited_points = points_awarded
 where status = 'approved' and credited_points is null;

update public.mission_submissions set seen_at = coalesce(reviewed_at, now()) where seen_at is null;

alter table public.mission_submissions drop constraint if exists mission_submissions_status_check;
alter table public.mission_submissions
  add constraint mission_submissions_status_check check (status in ('pending', 'approved', 'rejected'));

create index if not exists mission_submissions_user_status_idx
  on public.mission_submissions (user_id, status);

-- ── Revisión atómica ────────────────────────────────────────────────────────
-- review_mission_submissions(kind, ids, action)
--   kind:   'rafaga' | 'mission'
--   action: 'approve' | 'reject'
-- Aprobar suma los puntos solo si todavía no se sumaron (idempotente: aprobar
-- dos veces o desde dos pestañas no suma dos veces). Rechazar descuenta solo
-- lo que se había sumado. Todo en una transacción, con la fila bloqueada.
-- Devuelve una fila por envío procesado con el delta aplicado.
create or replace function public.review_mission_submissions(
  p_kind   text,
  p_ids    uuid[],
  p_action text
)
returns table (submission_id uuid, user_id uuid, status text, delta integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  v_before integer;
  v_after  integer;
  v_delta  integer;
begin
  if p_kind not in ('rafaga', 'mission') then
    raise exception 'invalid kind %', p_kind;
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action %', p_action;
  end if;
  -- Con los puntos pausados (cierre del challenge) no se aprueba: add_points
  -- no sumaría nada y la misión quedaría aprobada sin puntos.
  if p_action = 'approve'
     and exists (select 1 from public.app_settings where key = 'points_paused' and value = 'true') then
    raise exception 'points_paused' using errcode = 'P0001';
  end if;

  for r in
    execute format(
      'select id, user_id, status, %I as reward, credited_points
         from public.%I
        where id = any($1)
        for update',
      case p_kind when 'rafaga' then 'points_earned' else 'points_awarded' end,
      case p_kind when 'rafaga' then 'rafaga_submissions' else 'mission_submissions' end
    )
    using p_ids
  loop
    v_delta := 0;

    if p_action = 'approve' then
      -- Solo se suma si nunca se sumó: pendiente o rechazada antes. Una fila
      -- 'approved' sin credited_points es del flujo viejo (sumó al enviar).
      if r.credited_points is null and r.status <> 'approved' and coalesce(r.reward, 0) > 0 then
        select total_points into v_before from public.users where id = r.user_id;
        v_after := public.add_points(r.user_id, r.reward, p_kind);
        v_delta := coalesce(v_after, v_before) - coalesce(v_before, 0);
      end if;

      execute format(
        'update public.%I
            set status = ''approved'',
                reviewed_at = now(),
                seen_at = null,
                credited_points = coalesce(credited_points, $2)
          where id = $1',
        case p_kind when 'rafaga' then 'rafaga_submissions' else 'mission_submissions' end
      )
      using r.id, case when r.status = 'approved' then r.reward else v_delta end;

    else -- reject
      -- Se descuenta solo lo que se había sumado: credited_points, o el premio
      -- completo si es una fila 'approved' del flujo viejo (sumó al enviar).
      if coalesce(r.credited_points, case when r.status = 'approved' then r.reward end, 0) > 0 then
        select total_points into v_before from public.users where id = r.user_id;
        v_after := public.add_points(r.user_id, -coalesce(r.credited_points, r.reward), p_kind);
        v_delta := coalesce(v_after, v_before) - coalesce(v_before, 0);
      end if;

      execute format(
        'update public.%I
            set status = ''rejected'',
                reviewed_at = now(),
                seen_at = null,
                credited_points = null
          where id = $1',
        case p_kind when 'rafaga' then 'rafaga_submissions' else 'mission_submissions' end
      )
      using r.id;
    end if;

    submission_id := r.id;
    user_id := r.user_id;
    status := case p_action when 'approve' then 'approved' else 'rejected' end;
    delta := v_delta;
    return next;
  end loop;
end;
$$;

revoke all on function public.review_mission_submissions(text, uuid[], text) from public, anon, authenticated;
grant execute on function public.review_mission_submissions(text, uuid[], text) to service_role;
