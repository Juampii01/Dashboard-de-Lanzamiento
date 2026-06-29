-- ============================================================================
-- Nerf del XP por "estar en el dashboard" (heartbeat).
--   Antes: +50 por latido, tope 30/día  → máx 1.500/día
--   Ahora: +25 por latido, tope 20/día  → máx   500/día
-- Solo cambian v_points y v_cap; el resto (cooldown, cap por día UTC, registro
-- en point_events categoría 'time') queda igual.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.award_heartbeat_xp(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_rec          record;
  v_points       constant integer  := 25;   -- nerf: 50 → 25
  v_cap          constant integer  := 20;   -- nerf: 30 → 20 (máx 500/día)
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

  INSERT INTO public.point_events (user_id, delta, category)
  VALUES (p_user_id, v_points, 'time');

  RETURN jsonb_build_object('awarded', true, 'points', v_points, 'total', v_new_total);
END;
$$;
REVOKE ALL ON FUNCTION public.award_heartbeat_xp(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_heartbeat_xp(uuid) TO authenticated, service_role;
