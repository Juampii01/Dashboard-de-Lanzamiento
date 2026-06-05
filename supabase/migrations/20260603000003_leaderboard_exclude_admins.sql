\set ON_ERROR_STOP on
BEGIN;

-- ─── get_leaderboard() v3 — exclude admins ───────────────────────────────────
--
-- Change from v2: adds `AND is_admin = false` to the WHERE clause of all_ranked.
-- Admins are excluded from the ranking entirely so test activity doesn't pollute
-- the real leaderboard that decides prize allocation.
--
-- The current-user self-row (me / my_rank / in_top) is derived from all_ranked,
-- so admins will get me=null and my_rank=null — correct behaviour.
--
-- All security grants are unchanged: authenticated + service_role only.

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
    WHERE total_points > 0
      AND is_admin = false          -- ← v3: exclude admins
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
        WHERE r.position <= 20
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
      (SELECT position FROM all_ranked WHERE user_id = auth.uid()) <= 20,
      false
    ),
    'total', (SELECT COUNT(*)::int FROM all_ranked)
  );
$$;

-- ─── Security: same grants as v2 ─────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, service_role;

-- ─── Verify: anon must NOT have access ───────────────────────────────────────
DO $$
DECLARE v_anon_count int;
BEGIN
  SELECT COUNT(*) INTO v_anon_count
  FROM information_schema.routine_privileges rp
  JOIN information_schema.routines r ON r.specific_name = rp.specific_name
  WHERE r.routine_name = 'get_leaderboard'
    AND rp.grantee IN ('anon', 'PUBLIC');

  IF v_anon_count > 0 THEN
    RAISE EXCEPTION
      'SECURITY FAIL: get_leaderboard is still accessible to anon/PUBLIC (% grants).',
      v_anon_count;
  END IF;

  RAISE NOTICE 'get_leaderboard v3 applied. Admins excluded. Security check passed.';
END $$;

COMMIT;
