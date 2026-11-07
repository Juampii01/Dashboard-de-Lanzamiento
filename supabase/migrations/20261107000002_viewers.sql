-- Viewers: cuentas de solo lectura que ven la cuenta de quien las invitó.
--
-- users.viewer_of = id del participante que invitó. La app usa ese id para
-- todas las lecturas (el viewer ve exactamente lo mismo que su anfitrión) y
-- el middleware bloquea cualquier escritura. Acá: invitaciones, lectura por
-- RLS de las filas del anfitrión y RPCs que usan el usuario "efectivo".

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS viewer_of uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS users_viewer_of_idx ON public.users(viewer_of) WHERE viewer_of IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.viewer_invites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email            text NOT NULL,
  token            text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz,
  accepted_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at       timestamptz
);
CREATE INDEX IF NOT EXISTS viewer_invites_host_idx ON public.viewer_invites(host_id);
-- Una invitación vigente por email.
CREATE UNIQUE INDEX IF NOT EXISTS viewer_invites_email_active_idx
  ON public.viewer_invites(lower(email)) WHERE revoked_at IS NULL;
ALTER TABLE public.viewer_invites ENABLE ROW LEVEL SECURITY; -- solo service role

-- Anfitrión del usuario actual (null si no es viewer).
CREATE OR REPLACE FUNCTION public.viewer_host()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT viewer_of FROM public.users WHERE id = auth.uid();
$$;

-- Usuario cuyos datos se muestran: el anfitrión si es viewer, si no el propio.
CREATE OR REPLACE FUNCTION public.effective_uid()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT viewer_of FROM public.users WHERE id = auth.uid()), auth.uid());
$$;

-- Lectura (solo SELECT) de las filas del anfitrión en toda tabla con user_id y RLS.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN pg_class k ON k.relname = c.table_name
      JOIN pg_namespace n ON n.oid = k.relnamespace AND n.nspname = 'public'
     WHERE c.table_schema = 'public' AND c.column_name = 'user_id'
       AND k.relkind = 'r' AND k.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ': viewer select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (user_id = public.viewer_host())', t || ': viewer select', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "users: viewer select host" ON public.users;
CREATE POLICY "users: viewer select host" ON public.users FOR SELECT USING (id = public.viewer_host());

-- Puntos: el viewer ve los de su anfitrión.
CREATE OR REPLACE FUNCTION public.get_points_breakdown()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT jsonb_build_object(
    'total',   COALESCE((SELECT total_points FROM public.users WHERE id = public.effective_uid()), 0),
    'tracked', COALESCE((SELECT SUM(delta)    FROM public.point_events WHERE user_id = public.effective_uid()), 0),
    'by_category', COALESCE((
      SELECT jsonb_object_agg(category, sum_delta)
      FROM (
        SELECT category, SUM(delta) AS sum_delta
          FROM public.point_events
         WHERE user_id = public.effective_uid()
         GROUP BY category
      ) g
    ), '{}'::jsonb)
  );
$function$;

-- Ranking: los viewers no compiten; el viewer ve la posición de su anfitrión.
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  WITH all_ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC)::int AS position,
      CASE
        WHEN full_name IS NULL OR full_name = '' THEN 'Anónimo'
        WHEN POSITION(' ' IN full_name) = 0      THEN full_name
        ELSE SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.'
      END                                      AS display_name,
      total_points,
      GREATEST(0, total_points / 10)           AS raffle_entries,
      id                                       AS user_id
    FROM public.users
    WHERE COALESCE(is_admin, false) = false
      AND COALESCE(is_student, false) = false
      AND viewer_of IS NULL
      AND program = 'live'
  ), me AS (SELECT public.effective_uid() AS uid)
  SELECT json_build_object(
    'top', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'rank',            r.position,
            'display_name',    r.display_name,
            'total_points',    r.total_points,
            'raffle_entries',  r.raffle_entries,
            'is_current_user', r.user_id = (SELECT uid FROM me)
          ) ORDER BY r.position
        )
        FROM all_ranked r
        WHERE r.position <= 20 AND r.total_points > 0
      ),
      '[]'::json
    ),
    'me', (
      SELECT json_build_object(
        'rank',            m.position,
        'display_name',    m.display_name,
        'total_points',    m.total_points,
        'raffle_entries',  m.raffle_entries,
        'is_current_user', true
      )
      FROM all_ranked m
      WHERE m.user_id = (SELECT uid FROM me)
    ),
    'my_rank', (SELECT position FROM all_ranked WHERE user_id = (SELECT uid FROM me)),
    'in_top', COALESCE(
      (SELECT (position <= 20 AND total_points > 0) FROM all_ranked WHERE user_id = (SELECT uid FROM me)),
      false
    ),
    'total', (SELECT COUNT(*)::int FROM all_ranked)
  );
$function$;
