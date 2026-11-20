-- Puntos con decimales (hasta 2), para misiones relámpago como "+1,97 pts".
--
-- Cambia a numeric(12,2): users.total_points, point_events.delta,
-- rafaga_missions.points_reward y rafaga_submissions.points_earned.
-- El resto de las tablas de misiones siguen en integer: sus valores entran
-- sin problema en una columna numeric.
--
-- add_points / add_points_uncapped pasan a recibir y devolver numeric. La
-- regla de "a la mitad desde 10.000" se mantiene igual para enteros
-- (floor(p/2)) y para decimales corta a 2 decimales (1,97 → 0,98).

-- Los triggers "UPDATE OF total_points" bloquean el cambio de tipo: se
-- recrean idénticos.
DROP TRIGGER IF EXISTS users_block_student_points ON public.users;
DROP TRIGGER IF EXISTS users_enforce_points_cap ON public.users;

ALTER TABLE public.users              ALTER COLUMN total_points  TYPE numeric(12,2);
ALTER TABLE public.point_events       ALTER COLUMN delta         TYPE numeric(12,2);
ALTER TABLE public.rafaga_missions    ALTER COLUMN points_reward TYPE numeric(12,2);
ALTER TABLE public.rafaga_submissions ALTER COLUMN points_earned TYPE numeric(12,2);

CREATE TRIGGER users_block_student_points BEFORE UPDATE OF total_points ON public.users
  FOR EACH ROW EXECUTE FUNCTION block_student_points();
CREATE TRIGGER users_enforce_points_cap BEFORE UPDATE OF total_points ON public.users
  FOR EACH ROW EXECUTE FUNCTION enforce_points_cap();

-- Mitad de un delta positivo para quien ya pasó los 10.000.
CREATE OR REPLACE FUNCTION public.half_points(p numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p = trunc(p) THEN floor(p / 2.0) ELSE floor(p * 50) / 100.0 END;
$$;

DROP FUNCTION IF EXISTS public.add_points(uuid, integer, text);
CREATE FUNCTION public.add_points(p_user_id uuid, p_delta numeric, p_category text DEFAULT 'other'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current numeric;
  v_eff     numeric;
  v_total   numeric;
  v_paused  boolean;
  v_student boolean;
  v_admin   boolean;
  v_cap     integer;
BEGIN
  SELECT (value = 'true') INTO v_paused FROM public.app_settings WHERE key = 'points_paused';

  SELECT total_points, COALESCE(is_student, false), COALESCE(is_admin, false)
    INTO v_current, v_student, v_admin
    FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF COALESCE(v_paused, false) OR v_student THEN
    RETURN v_current;
  END IF;

  p_delta := round(p_delta, 2);
  IF p_delta > 0 AND v_current >= 10000 THEN
    v_eff := public.half_points(p_delta);
  ELSE
    v_eff := p_delta;
  END IF;

  v_cap := public.current_points_cap();
  IF v_eff > 0 AND v_cap IS NOT NULL AND NOT v_admin THEN
    v_eff := GREATEST(0, LEAST(v_eff, v_cap - v_current));
    IF v_eff = 0 THEN
      RETURN v_current;
    END IF;
  END IF;

  UPDATE public.users
     SET total_points = total_points + v_eff
   WHERE id = p_user_id
  RETURNING total_points INTO v_total;

  INSERT INTO public.point_events (user_id, delta, category)
  VALUES (p_user_id, v_eff, p_category);

  RETURN v_total;
END;
$function$;
REVOKE ALL ON FUNCTION public.add_points(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_points(uuid, numeric, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.add_points_uncapped(uuid, integer, text);
CREATE FUNCTION public.add_points_uncapped(p_user_id uuid, p_delta numeric, p_category text DEFAULT 'other'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current numeric;
  v_eff     numeric;
  v_total   numeric;
  v_paused  boolean;
  v_student boolean;
BEGIN
  SELECT (value = 'true') INTO v_paused FROM public.app_settings WHERE key = 'points_paused';
  SELECT total_points, COALESCE(is_student, false) INTO v_current, v_student
    FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF COALESCE(v_paused, false) OR v_student THEN RETURN v_current; END IF;

  p_delta := round(p_delta, 2);
  IF p_delta > 0 AND v_current >= 10000 THEN
    v_eff := public.half_points(p_delta);
  ELSE
    v_eff := p_delta;
  END IF;

  PERFORM set_config('app.skip_points_cap', 'on', true);
  UPDATE public.users SET total_points = total_points + v_eff
   WHERE id = p_user_id RETURNING total_points INTO v_total;
  PERFORM set_config('app.skip_points_cap', 'off', true);

  INSERT INTO public.point_events (user_id, delta, category) VALUES (p_user_id, v_eff, p_category);
  RETURN v_total;
END;
$function$;
REVOKE ALL ON FUNCTION public.add_points_uncapped(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_points_uncapped(uuid, numeric, text) TO service_role;

-- Ranking: las entradas al sorteo siguen siendo enteras.
CREATE OR REPLACE FUNCTION public.get_leaderboard()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH all_ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC)::int AS position,
      CASE
        WHEN full_name IS NULL OR full_name = '' THEN 'Anónimo'
        WHEN POSITION(' ' IN full_name) = 0      THEN full_name
        ELSE SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.'
      END                                      AS display_name,
      total_points,
      GREATEST(0, floor(total_points / 10))::int AS raffle_entries,
      id                                       AS user_id
    FROM public.users
    WHERE COALESCE(is_admin, false) = false
      AND COALESCE(is_student, false) = false
      AND viewer_of IS NULL
      AND program = 'live'
  ), me AS (SELECT public.effective_uid() AS uid)
  SELECT json_build_object(
    'top', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'rank',            r.position,
            'display_name',    r.display_name,
            'total_points',    r.total_points,
            'raffle_entries',  r.raffle_entries,
            'is_current_user', r.user_id = (SELECT uid FROM me)
          ) ORDER BY r.position
        )
        FROM all_ranked r
        WHERE r.position <= 20 AND r.total_points > 0
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
      WHERE m.user_id = (SELECT uid FROM me)
    ),
    'my_rank', (SELECT position FROM all_ranked WHERE user_id = (SELECT uid FROM me)),
    'in_top', COALESCE(
      (SELECT (position <= 20 AND total_points > 0) FROM all_ranked WHERE user_id = (SELECT uid FROM me)),
      false
    ),
    'total', (SELECT COUNT(*)::int FROM all_ranked)
  );
$function$;
