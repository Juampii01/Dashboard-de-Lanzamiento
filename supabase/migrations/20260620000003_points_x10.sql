-- ============================================================================
-- Sistema de puntos ×10
-- Multiplica por 10 todas las fuentes de XP que viven en la DB:
--   • RPC award_heartbeat_xp (5 → 50 por heartbeat)
--   • RPC admin_uncomplete_day (resta de XP: 25/50/30 → 250/500/300)
--   • RPC claim_ad_xp (20 → 200)
--   • datos existentes: video_capsules.points_reward, video_quizzes.xp_reward,
--     daily_missions.points_reward (×10) + defaults de columna.
-- Las constantes en código (start/complete/join/podcast/avatar/quiz fallback/
-- referidos/misión) ya se ×10 en el código.
-- ============================================================================

-- 1. Heartbeat: 5 → 50 XP (v_cap = cantidad de heartbeats/día, NO se toca) -----
CREATE OR REPLACE FUNCTION public.award_heartbeat_xp(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_rec          record;
  v_points       constant integer  := 50;
  v_cap          constant integer  := 30;
  v_cooldown     constant interval := interval '10 minutes';
  v_new_count    integer;
  v_new_total    integer;
  v_next_seconds integer;
BEGIN
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
    IF v_rec.last_time_xp_at IS NOT NULL
       AND NOW() - v_rec.last_time_xp_at < v_cooldown THEN
      v_next_seconds := CEIL(
        EXTRACT(EPOCH FROM (v_rec.last_time_xp_at + v_cooldown - NOW()))
      )::integer;
      RETURN jsonb_build_object('awarded', false, 'nextInSeconds', v_next_seconds);
    END IF;

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
    v_new_count := COALESCE(v_rec.heartbeat_count_today, 0) + 1;
  END IF;

  UPDATE public.users
     SET total_points          = total_points + v_points,
         last_time_xp_at       = NOW(),
         heartbeat_count_today = v_new_count,
         heartbeat_count_day   = CURRENT_DATE
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  RETURN jsonb_build_object('awarded', true, 'points', v_points, 'total', v_new_total);
END;
$$;
REVOKE ALL ON FUNCTION public.award_heartbeat_xp(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_heartbeat_xp(uuid) TO authenticated, service_role;

-- 2. admin_uncomplete_day: resta de XP ×10 (25/50/30 → 250/500/300) -----------
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission_denied: admin only' USING ERRCODE = '42501';
  END IF;

  SELECT is_completed, is_unlocked INTO v_progress
    FROM public.day_progress
   WHERE user_id = p_user_id AND day_number = p_day;

  IF v_progress.is_unlocked THEN
    v_start_xp := 250;
  END IF;

  IF v_progress.is_completed THEN
    v_complete_xp := 500;
  END IF;

  SELECT COALESCE(SUM(vc.points_reward), 0) INTO v_video_xp
    FROM public.video_capsule_completions vcc
    JOIN public.video_capsules vc ON vc.id = vcc.capsule_id
   WHERE vcc.user_id = p_user_id AND vc.day_number = p_day;

  IF EXISTS (
    SELECT 1 FROM public.user_events
     WHERE user_id = p_user_id AND event_type = 'call_join_day_' || p_day
  ) THEN
    v_calljoin_xp := 300;
  END IF;

  v_total_xp := v_start_xp + v_complete_xp + v_video_xp + v_calljoin_xp;

  DELETE FROM public.video_capsule_completions
   WHERE user_id = p_user_id
     AND capsule_id IN (SELECT id FROM public.video_capsules WHERE day_number = p_day);

  DELETE FROM public.user_events
   WHERE user_id = p_user_id AND event_type = 'call_join_day_' || p_day;

  UPDATE public.day_progress
     SET is_completed = false, completed_at = null
   WHERE user_id = p_user_id AND day_number = p_day;

  UPDATE public.users
     SET total_points = GREATEST(0, total_points - v_total_xp)
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_points;

  RETURN jsonb_build_object(
    'xp_removed', v_total_xp, 'start_xp', v_start_xp, 'complete_xp', v_complete_xp,
    'video_xp', v_video_xp, 'calljoin_xp', v_calljoin_xp, 'new_total', v_new_points
  );
END;
$$;

-- 3. claim_ad_xp: 20 → 200 ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_ad_xp(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last      timestamptz;
  v_xp        int := 200;
  v_cooldown  interval := interval '10 minutes';
  v_new_total int;
BEGIN
  SELECT last_ad_watched_at INTO v_last FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF v_last IS NOT NULL AND now() - v_last < v_cooldown THEN
    RETURN jsonb_build_object(
      'awarded', false, 'reason', 'cooldown',
      'next_in_seconds', EXTRACT(EPOCH FROM (v_last + v_cooldown - now()))::int
    );
  END IF;

  UPDATE public.users
     SET last_ad_watched_at = now(), total_points = total_points + v_xp
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  RETURN jsonb_build_object('awarded', true, 'xp', v_xp, 'new_total', v_new_total);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_ad_xp FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_ad_xp TO authenticated, service_role;

-- 4. Datos existentes ×10 + defaults de columna ------------------------------
UPDATE public.video_capsules SET points_reward = points_reward * 10;
ALTER TABLE public.video_capsules ALTER COLUMN points_reward SET DEFAULT 100;

UPDATE public.video_quizzes SET xp_reward = xp_reward * 10;
ALTER TABLE public.video_quizzes ALTER COLUMN xp_reward SET DEFAULT 100;

UPDATE public.daily_missions SET points_reward = points_reward * 10;
ALTER TABLE public.daily_missions ALTER COLUMN points_reward SET DEFAULT 200;

-- 5. Totales ya acumulados ×10 (consistencia del leaderboard) -----------------
-- Pre-lanzamiento: la mayoría es 0 o data de prueba. Si preferís NO escalar lo
-- ya acumulado (arrancar de cero), comentá esta línea.
UPDATE public.users SET total_points = total_points * 10 WHERE total_points > 0;
