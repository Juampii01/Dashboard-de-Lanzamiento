-- ─── get_full_leaderboard() ──────────────────────────────────────────────────
-- Devuelve TODOS los participantes (no solo el top 20 global) para que la página
-- de ranking pueda armar una tabla por rango (Elevate/Prime/Legacy/Expert) con
-- top 20 por rango. El bucketeo por rango se hace en el cliente usando los
-- umbrales de lib/ranks.ts (única fuente de verdad de los umbrales).
--
-- Excluye admins. Incluye usuarios con total_points > 0 y SIEMPRE al usuario
-- actual (aunque tenga 0 pts) para que pueda verse a sí mismo.

DROP FUNCTION IF EXISTS public.get_full_leaderboard();

CREATE FUNCTION public.get_full_leaderboard()
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
      id                                       AS user_id
    FROM public.users
    WHERE COALESCE(is_admin, false) = false
  )
  SELECT json_build_object(
    'all', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'rank',            r.position,
            'display_name',    r.display_name,
            'total_points',    r.total_points,
            'is_current_user', r.user_id = auth.uid()
          ) ORDER BY r.position
        )
        FROM all_ranked r
        WHERE r.total_points > 0 OR r.user_id = auth.uid()
      ),
      '[]'::json
    ),
    'my_global_rank', (
      SELECT position FROM all_ranked WHERE user_id = auth.uid()
    ),
    'total', (
      SELECT COUNT(*)::int FROM all_ranked WHERE total_points > 0
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_full_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_full_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_full_leaderboard() TO authenticated, service_role;
