-- =============================================================================
-- Día 2 — Fix A1 + C1: Revoke EXECUTE from PUBLIC/anon on SECURITY DEFINER
--         functions and reinforce admin_uncomplete_day with internal is_admin()
--         guard as second barrier.
--
-- BEFORE: anon can call get_leaderboard, is_admin, admin_uncomplete_day, etc.
-- AFTER:  only authenticated + service_role can call sensitive functions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. REVOKE ALL from PUBLIC (covers anon and authenticated default grants)
--    then REVOKE from the explicit roles that pg_dump added.
--    Re-GRANT only what each role legitimately needs.
-- ---------------------------------------------------------------------------

-- get_leaderboard — called from /api/leaderboard (authenticated session)
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, service_role;

-- get_day_completion_counts — admin-only stats, called server-side
REVOKE ALL ON FUNCTION public.get_day_completion_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_day_completion_counts() FROM anon;
REVOKE ALL ON FUNCTION public.get_day_completion_counts() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_day_completion_counts() TO service_role;

-- is_admin — helper used internally by other SECURITY DEFINER functions,
--            not meant to be callable by end users
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- admin_uncomplete_day — admin panel only; also gets internal guard below
REVOKE ALL ON FUNCTION public.admin_uncomplete_day(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_uncomplete_day(uuid, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.admin_uncomplete_day(p_user_id uuid, p_day integer) TO authenticated, service_role;

-- check_ai_rate_limit — called server-side via service_role only
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.check_ai_rate_limit(p_user_id uuid, p_endpoint text, p_max_calls integer, p_window_seconds integer) TO service_role;

-- handle_new_user — trigger function, must not be callable by roles directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- set_updated_at — trigger function, same treatment
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

-- ---------------------------------------------------------------------------
-- 2. C1 fix: reinforce admin_uncomplete_day with an internal is_admin() check.
--    Even if someone calls it with an authenticated session, the function itself
--    will refuse to execute unless the caller is an admin.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_uncomplete_day(p_user_id uuid, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_start_xp    int := 0;
  v_complete_xp int := 0;
  v_video_xp    int := 0;
  v_calljoin_xp int := 0;
  v_total_xp    int;
  v_new_points  int;
  v_progress    record;
BEGIN
  -- ── C1 Guard ─────────────────────────────────────────────────────────────
  -- Second barrier: even authenticated callers are rejected unless they are
  -- admins.  is_admin() reads auth.uid() via SECURITY DEFINER so it cannot
  -- be spoofed from the client.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission_denied: admin only'
      USING ERRCODE = '42501';
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

  SELECT is_completed, is_unlocked INTO v_progress
    FROM public.day_progress
   WHERE user_id = p_user_id AND day_number = p_day;

  IF v_progress.is_unlocked THEN
    v_start_xp := 25;
  END IF;

  IF v_progress.is_completed THEN
    v_complete_xp := 50;
  END IF;

  SELECT COALESCE(SUM(vc.points_reward), 0) INTO v_video_xp
    FROM public.video_capsule_completions vcc
    JOIN public.video_capsules vc ON vc.id = vcc.capsule_id
   WHERE vcc.user_id = p_user_id AND vc.day_number = p_day;

  IF EXISTS (
    SELECT 1 FROM public.user_events
     WHERE user_id = p_user_id
       AND event_type = 'call_join_day_' || p_day
  ) THEN
    v_calljoin_xp := 30;
  END IF;

  v_total_xp := v_start_xp + v_complete_xp + v_video_xp + v_calljoin_xp;

  DELETE FROM public.video_capsule_completions
   WHERE user_id = p_user_id
     AND capsule_id IN (
           SELECT id FROM public.video_capsules WHERE day_number = p_day
         );

  DELETE FROM public.user_events
   WHERE user_id = p_user_id
     AND event_type = 'call_join_day_' || p_day;

  -- Desmarca is_completed, mantiene is_unlocked = true
  UPDATE public.day_progress
     SET is_completed = false,
         completed_at = null
   WHERE user_id = p_user_id AND day_number = p_day;

  UPDATE public.users
     SET total_points = GREATEST(0, total_points - v_total_xp)
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_points;

  RETURN jsonb_build_object(
    'xp_removed',   v_total_xp,
    'start_xp',     v_start_xp,
    'complete_xp',  v_complete_xp,
    'video_xp',     v_video_xp,
    'calljoin_xp',  v_calljoin_xp,
    'new_total',    v_new_points
  );
END;
$$;
