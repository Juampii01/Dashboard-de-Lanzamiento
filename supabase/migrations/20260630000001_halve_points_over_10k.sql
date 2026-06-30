-- ============================================================================
-- "A partir de los 10.000 puntos, cada punto POSITIVO vale la mitad" (redondeo
-- hacia abajo). Frena la subida rápida hacia Legacy (10k+).
--
-- Se aplica en LAS 4 funciones que otorgan puntos, porque heartbeat / streak /
-- ad NO pasan por add_points (suman directo):
--   1. add_points         (misiones, keywords, referidos, videos, quiz, call, community, story, rafaga…)
--   2. award_heartbeat_xp (permanencia · 'time')
--   3. claim_daily_streak (racha · 'streak')
--   4. claim_ad_xp        (anuncios · 'ad')
-- Los deltas NEGATIVOS (rechazos, ajustes) nunca se halvan.
-- ============================================================================

-- 1. add_points -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_points(
  p_user_id  uuid,
  p_delta    integer,
  p_category text DEFAULT 'other'
)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_current integer;
  v_eff     integer;
  v_total   integer;
BEGIN
  SELECT total_points INTO v_current FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_delta > 0 AND v_current >= 10000 THEN
    v_eff := floor(p_delta / 2.0)::integer;
  ELSE
    v_eff := p_delta;
  END IF;

  UPDATE public.users
     SET total_points = total_points + v_eff
   WHERE id = p_user_id
  RETURNING total_points INTO v_total;

  INSERT INTO public.point_events (user_id, delta, category)
  VALUES (p_user_id, v_eff, p_category);

  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.add_points(uuid, integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_points(uuid, integer, text) TO authenticated, service_role;

-- 2. award_heartbeat_xp (mantiene el nerf 25/20; halva sobre 10k) -----------
CREATE OR REPLACE FUNCTION public.award_heartbeat_xp(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_rec          record;
  v_points       integer  := 25;   -- nerf 50→25
  v_cap          constant integer  := 20;   -- nerf 30→20 (máx 500/día)
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

  -- A partir de 10.000 pts, la mitad.
  IF v_rec.total_points >= 10000 THEN
    v_points := floor(v_points / 2.0)::integer;
  END IF;

  UPDATE public.users
     SET total_points          = total_points + v_points,
         last_time_xp_at       = NOW(),
         heartbeat_count_today = v_new_count,
         heartbeat_count_day   = CURRENT_DATE
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  INSERT INTO public.point_events (user_id, delta, category)
  VALUES (p_user_id, v_points, 'time');

  RETURN jsonb_build_object('awarded', true, 'points', v_points, 'total', v_new_total);
END;
$$;
REVOKE ALL ON FUNCTION public.award_heartbeat_xp(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_heartbeat_xp(uuid) TO authenticated, service_role;

-- 3. claim_daily_streak (halva la racha sobre 10k) --------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec       record;
  v_award     constant int := 300;
  v_new_count int;
  v_points    int := 0;
  v_new_total int;
BEGIN
  SELECT total_points, streak_count, streak_day
    INTO v_rec
    FROM public.users
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  IF v_rec.streak_day = CURRENT_DATE THEN
    RETURN jsonb_build_object('streak', v_rec.streak_count, 'awarded', false);
  ELSIF v_rec.streak_day = CURRENT_DATE - 1 THEN
    v_new_count := v_rec.streak_count + 1;
    v_points    := v_award;
  ELSE
    v_new_count := 1;
    v_points    := 0;
  END IF;

  IF v_points > 0 AND v_rec.total_points >= 10000 THEN
    v_points := floor(v_points / 2.0)::integer;
  END IF;

  UPDATE public.users
     SET streak_count = v_new_count,
         streak_day   = CURRENT_DATE,
         total_points = total_points + v_points
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  IF v_points > 0 THEN
    INSERT INTO public.point_events (user_id, delta, category)
    VALUES (p_user_id, v_points, 'streak');
  END IF;

  RETURN jsonb_build_object(
    'streak', v_new_count,
    'awarded', v_points > 0,
    'points', v_points,
    'total', v_new_total
  );
END;
$$;
REVOKE ALL ON FUNCTION public.claim_daily_streak(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_daily_streak(uuid) TO authenticated, service_role;

-- 4. claim_ad_xp (halva anuncios sobre 10k) ---------------------------------
CREATE OR REPLACE FUNCTION public.claim_ad_xp(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last      timestamptz;
  v_cur_total int;
  v_xp        int := 200;
  v_cooldown  interval := interval '10 minutes';
  v_new_total int;
BEGIN
  SELECT last_ad_watched_at, total_points INTO v_last, v_cur_total
    FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF v_last IS NOT NULL AND now() - v_last < v_cooldown THEN
    RETURN jsonb_build_object(
      'awarded', false, 'reason', 'cooldown',
      'next_in_seconds', EXTRACT(EPOCH FROM (v_last + v_cooldown - now()))::int
    );
  END IF;

  IF v_cur_total >= 10000 THEN
    v_xp := floor(v_xp / 2.0)::integer;
  END IF;

  UPDATE public.users
     SET last_ad_watched_at = now(), total_points = total_points + v_xp
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  INSERT INTO public.point_events (user_id, delta, category)
  VALUES (p_user_id, v_xp, 'ad');

  RETURN jsonb_build_object('awarded', true, 'xp', v_xp, 'new_total', v_new_total);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_ad_xp FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_ad_xp TO authenticated, service_role;
