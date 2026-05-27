-- =============================================================================
-- Día 3 — Fix A3 + A5: Atomic XP RPCs + heartbeat race/UTC fixes
--
-- BEFORE: All XP endpoints do: SELECT total_points → compute new → UPDATE.
--         Two concurrent requests read the same value → one award is lost.
--
-- AFTER:
--   • add_points(uuid, integer)
--       Single atomic UPDATE total_points = total_points + delta.
--       Used by: avatar, watch-capsule, complete-day, start-day, join-call.
--
--   • award_heartbeat_xp(uuid)
--       Full heartbeat logic in one transaction with FOR UPDATE row lock.
--       Eliminates the heartbeat race and the UTC calendar-day cap bypass.
--       Cap now resets when UTC date changes (CURRENT_DATE comparison),
--       closing the window where users near UTC boundary could get 2× daily cap.
--
-- Also: re-grant check_ai_rate_limit to authenticated so the rate-limit lib
-- can continue to use createClient() (Día 2 accidentally over-revoked this).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. add_points — lightweight atomic XP increment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_points(p_user_id uuid, p_delta integer)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  UPDATE public.users
     SET total_points = total_points + p_delta
   WHERE id = p_user_id
  RETURNING total_points;
$$;

REVOKE ALL ON FUNCTION public.add_points(uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_points(uuid, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. award_heartbeat_xp — atomic heartbeat: lock → check → award in one txn
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_heartbeat_xp(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_rec          record;
  v_points       constant integer  := 5;
  v_cap          constant integer  := 30;
  v_cooldown     constant interval := interval '10 minutes';
  v_new_count    integer;
  v_new_total    integer;
  v_next_seconds integer;
BEGIN
  -- Serialize concurrent requests: FOR UPDATE prevents two heartbeat calls
  -- from both reading count = N and both incrementing to N+1.
  SELECT total_points, last_time_xp_at, is_admin,
         heartbeat_count_today, heartbeat_count_day
    INTO v_rec
    FROM public.users
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'error', 'user_not_found');
  END IF;

  IF NOT v_rec.is_admin THEN
    -- ── Cooldown check ────────────────────────────────────────────────────
    IF v_rec.last_time_xp_at IS NOT NULL
       AND NOW() - v_rec.last_time_xp_at < v_cooldown THEN
      v_next_seconds := CEIL(
        EXTRACT(EPOCH FROM (v_rec.last_time_xp_at + v_cooldown - NOW()))
      )::integer;
      RETURN jsonb_build_object('awarded', false, 'nextInSeconds', v_next_seconds);
    END IF;

    -- ── Daily cap (UTC-boundary safe) ─────────────────────────────────────
    -- Use CURRENT_DATE (UTC) so the reset happens exactly at midnight UTC,
    -- not at different local times per user.  If heartbeat_count_day is null
    -- or is a previous UTC date, reset count to 1 for the new day.
    IF v_rec.heartbeat_count_day IS NULL
       OR v_rec.heartbeat_count_day < CURRENT_DATE THEN
      v_new_count := 1;
    ELSE
      v_new_count := COALESCE(v_rec.heartbeat_count_today, 0) + 1;
    END IF;

    IF v_new_count > v_cap THEN
      RETURN jsonb_build_object('awarded', false, 'capped', true);
    END IF;
  ELSE
    -- Admin path: no cooldown, no cap
    v_new_count := COALESCE(v_rec.heartbeat_count_today, 0) + 1;
  END IF;

  -- ── Atomic update ─────────────────────────────────────────────────────
  UPDATE public.users
     SET total_points          = total_points + v_points,
         last_time_xp_at       = NOW(),
         heartbeat_count_today = v_new_count,
         heartbeat_count_day   = CURRENT_DATE
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  RETURN jsonb_build_object(
    'awarded', true,
    'points',  v_points,
    'total',   v_new_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_heartbeat_xp(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_heartbeat_xp(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Fix Día 2 regression: re-grant check_ai_rate_limit to authenticated.
--    The rate-limit lib calls this via createClient() (authenticated session)
--    from server-side API routes — not from the browser.  Revoking authenticated
--    silently broke all AI rate limiting.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(
  p_user_id       uuid,
  p_endpoint      text,
  p_max_calls     integer,
  p_window_seconds integer
) TO authenticated;
