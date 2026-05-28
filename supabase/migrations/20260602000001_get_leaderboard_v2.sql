\set ON_ERROR_STOP on
BEGIN;

-- ─── get_leaderboard() v2 ────────────────────────────────────────────────────
--
-- Changes from v1:
--   • Returns json (single object) instead of TABLE rows.
--   • Removes the LIMIT 20 from the ranking CTE — ranks ALL users.
--   • Top 20 extracted inside the function.
--   • Adds 'me', 'my_rank', 'in_top', 'total' so callers can show the
--     current user's real position even when they're outside the top 20.
--
-- Return shape:
--   {
--     "top":     [ { rank, display_name, total_points, raffle_entries, is_current_user } … ] (≤20),
--     "me":      { rank, display_name, total_points, raffle_entries } | null,
--     "my_rank": int | null,
--     "in_top":  boolean,
--     "total":   int
--   }
--
-- Security: SECURITY DEFINER, no anon/PUBLIC access.
-- Name masking: same inline logic as v1 ("Juan P.").
-- Admin exclusion: none (same as v1 — only total_points > 0 filter).
--
-- Apply: STAGING first → verify → then PROD.

-- DROP required because we're changing the return type (TABLE → json).
-- Grants are re-applied immediately after.
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
      -- Same masking as v1: "Juan P."
      CASE
        WHEN full_name IS NULL OR full_name = '' THEN 'Anónimo'
        WHEN POSITION(' ' IN full_name) = 0      THEN full_name
        ELSE SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.'
      END                                      AS display_name,
      total_points,
      GREATEST(0, total_points / 10)           AS raffle_entries,
      id                                       AS user_id
    FROM public.users
    WHERE total_points > 0
  )
  SELECT json_build_object(
    -- Top 20 rows (≤ 20)
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
        WHERE r.position <= 20
      ),
      '[]'::json
    ),
    -- Current user's full row (NULL if user has 0 pts or not found)
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
    -- Current user's numeric rank (NULL if 0 pts)
    'my_rank', (
      SELECT position FROM all_ranked WHERE user_id = auth.uid()
    ),
    -- true if user appears in the top 20
    'in_top', COALESCE(
      (SELECT position FROM all_ranked WHERE user_id = auth.uid()) <= 20,
      false
    ),
    -- Total ranked participants
    'total', (SELECT COUNT(*)::int FROM all_ranked)
  );
$$;

-- ─── Security: maintain existing grants exactly ───────────────────────────────

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, service_role;

-- ─── Verify: anon must NOT have access ───────────────────────────────────────

DO $$
DECLARE
  v_anon_count int;
BEGIN
  SELECT COUNT(*) INTO v_anon_count
  FROM information_schema.routine_privileges rp
  JOIN information_schema.routines r ON r.specific_name = rp.specific_name
  WHERE r.routine_name = 'get_leaderboard'
    AND rp.grantee IN ('anon', 'PUBLIC');

  IF v_anon_count > 0 THEN
    RAISE EXCEPTION
      'SECURITY FAIL: get_leaderboard is still accessible to anon/PUBLIC (% grants). Rolling back.',
      v_anon_count;
  END IF;

  RAISE NOTICE 'get_leaderboard v2 applied. Security check passed (0 anon grants).';
END $$;

COMMIT;
