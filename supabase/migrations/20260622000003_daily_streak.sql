-- ============================================================================
-- Racha diaria: días consecutivos ingresando al dashboard.
-- El día 1 NO suma; del día 2 en adelante: +300 pts por día consecutivo.
-- Se reclama una vez por día (idempotente por fecha UTC).
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_count int NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_day   date;

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
    -- Ya se contó hoy → no-op.
    RETURN jsonb_build_object('streak', v_rec.streak_count, 'awarded', false);
  ELSIF v_rec.streak_day = CURRENT_DATE - 1 THEN
    -- Día consecutivo (día 2+) → suma.
    v_new_count := v_rec.streak_count + 1;
    v_points    := v_award;
  ELSE
    -- Primer día o racha cortada → reinicia en 1, el día 1 no suma.
    v_new_count := 1;
    v_points    := 0;
  END IF;

  UPDATE public.users
     SET streak_count = v_new_count,
         streak_day   = CURRENT_DATE,
         total_points = total_points + v_points
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

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
