-- ============================================================================
-- Ledger de puntos: registra cada award con su CATEGORÍA, para poder mostrar
-- un desglose ("por tiempo en el dashboard: X pts", "por videos: Y", etc.)
-- sin guardar una fila por cada +50 — el desglose se obtiene sumando por
-- categoría (SUM(delta) GROUP BY category).
--
-- Arranca limpio con el reset del miércoles. Reset debe hacer también:
--   DELETE FROM public.point_events;
-- ============================================================================

-- 1. Tabla ledger ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.point_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta       integer NOT NULL,
  category    text NOT NULL DEFAULT 'other',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS point_events_user_cat_idx
  ON public.point_events (user_id, category);

-- Solo las funciones SECURITY DEFINER y el service_role escriben; los usuarios
-- nunca tocan esta tabla directo.
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

-- 2. add_points: ahora ADEMÁS de sumar, loguea la categoría ------------------
-- Se agrega un 3er parámetro con default 'other' → todos los callers de 2 args
-- siguen funcionando sin cambios (loguean como 'other').
DROP FUNCTION IF EXISTS public.add_points(uuid, integer);
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
  v_total integer;
BEGIN
  UPDATE public.users
     SET total_points = total_points + p_delta
   WHERE id = p_user_id
  RETURNING total_points INTO v_total;

  -- Solo logueamos si el usuario existe (UPDATE afectó una fila).
  IF FOUND THEN
    INSERT INTO public.point_events (user_id, delta, category)
    VALUES (p_user_id, p_delta, p_category);
  END IF;

  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.add_points(uuid, integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_points(uuid, integer, text) TO authenticated, service_role;

-- 3. award_heartbeat_xp: loguea el tiempo dentro del dashboard ('time') ------
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

  INSERT INTO public.point_events (user_id, delta, category)
  VALUES (p_user_id, v_points, 'time');

  RETURN jsonb_build_object('awarded', true, 'points', v_points, 'total', v_new_total);
END;
$$;
REVOKE ALL ON FUNCTION public.award_heartbeat_xp(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_heartbeat_xp(uuid) TO authenticated, service_role;

-- 4. claim_daily_streak: loguea la racha ('streak') -------------------------
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

-- 5. claim_ad_xp: loguea anuncios ('ad') ------------------------------------
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

  INSERT INTO public.point_events (user_id, delta, category)
  VALUES (p_user_id, v_xp, 'ad');

  RETURN jsonb_build_object('awarded', true, 'xp', v_xp, 'new_total', v_new_total);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_ad_xp FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_ad_xp TO authenticated, service_role;

-- 6. get_points_breakdown — desglose del usuario AUTENTICADO -----------------
-- Sin parámetro: usa auth.uid() → un usuario solo ve su propio desglose.
-- Devuelve: { total (fuente de verdad), tracked (suma del ledger),
--             by_category: { time: N, video: N, ... } }
CREATE OR REPLACE FUNCTION public.get_points_breakdown()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total',   COALESCE((SELECT total_points FROM public.users WHERE id = auth.uid()), 0),
    'tracked', COALESCE((SELECT SUM(delta)    FROM public.point_events WHERE user_id = auth.uid()), 0),
    'by_category', COALESCE((
      SELECT jsonb_object_agg(category, sum_delta)
      FROM (
        SELECT category, SUM(delta) AS sum_delta
          FROM public.point_events
         WHERE user_id = auth.uid()
         GROUP BY category
      ) g
    ), '{}'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_points_breakdown() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_points_breakdown() TO authenticated, service_role;
