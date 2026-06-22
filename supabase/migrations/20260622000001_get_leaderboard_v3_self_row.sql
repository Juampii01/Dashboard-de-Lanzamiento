-- ─── get_leaderboard() v3 ────────────────────────────────────────────────────
-- Cambio vs v2: el usuario actual SIEMPRE ve su propia fila, aunque tenga 0
-- puntos / esté último. Antes el filtro total_points > 0 lo excluía y "me" venía
-- null → no se podía ver a sí mismo abajo.
--
-- Ahora:
--   • Se rankea a TODOS los usuarios (orden: puntos desc, created_at asc) → cada
--     uno tiene una posición real.
--   • 'top' muestra solo los que tienen puntos (top 20) — no se llena de 0-pts.
--   • 'me' / 'my_rank' siempre vienen para el usuario logueado.
--   • 'in_top' = aparece en el top renderizado (posición ≤ 20 y con puntos).
--   • 'total' = todos los participantes inscriptos.

DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    -- (sin filtro: se rankea a todos para que cada uno tenga su posición)
  )
  SELECT json_build_object(
    -- Top 20 — solo con puntos (no mostrar cientos de 0-pts)
    'top', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'rank',            r.position,
            'display_name',    r.display_name,
            'total_points',    r.total_points,
            'raffle_entries',  r.raffle_entries,
            'is_current_user', r.user_id = auth.uid()
          ) ORDER BY r.position
        )
        FROM all_ranked r
        WHERE r.position <= 20 AND r.total_points > 0
      ),
      '[]'::json
    ),
    -- Fila del usuario actual — SIEMPRE (aunque tenga 0 pts)
    'me', (
      SELECT json_build_object(
        'rank',            m.position,
        'display_name',    m.display_name,
        'total_points',    m.total_points,
        'raffle_entries',  m.raffle_entries,
        'is_current_user', true
      )
      FROM all_ranked m
      WHERE m.user_id = auth.uid()
    ),
    'my_rank', (
      SELECT position FROM all_ranked WHERE user_id = auth.uid()
    ),
    -- in_top: aparece en el top renderizado (≤20 y con puntos)
    'in_top', COALESCE(
      (SELECT (position <= 20 AND total_points > 0) FROM all_ranked WHERE user_id = auth.uid()),
      false
    ),
    -- total de participantes inscriptos
    'total', (SELECT COUNT(*)::int FROM all_ranked)
  );
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, service_role;
