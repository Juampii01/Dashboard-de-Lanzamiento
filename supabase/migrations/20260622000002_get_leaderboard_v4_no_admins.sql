-- ─── get_leaderboard() v4 ────────────────────────────────────────────────────
-- Igual que v3 (cada usuario se ve a sí mismo) PERO excluye a los ADMINS del
-- ranking: no aparecen en el top, no se cuentan en el total y un admin que mire
-- el ranking no tiene fila propia (no compite).
-- Es CREATE OR REPLACE → reemplaza a v3; correr esta y listo.

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
    WHERE COALESCE(is_admin, false) = false   -- ← admins fuera del ranking
  )
  SELECT json_build_object(
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
    'in_top', COALESCE(
      (SELECT (position <= 20 AND total_points > 0) FROM all_ranked WHERE user_id = auth.uid()),
      false
    ),
    'total', (SELECT COUNT(*)::int FROM all_ranked)
  );
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, service_role;
