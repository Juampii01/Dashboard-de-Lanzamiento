-- Alumnos (registro gratuito, is_student): usan el dashboard pero NO suman
-- puntos ni compiten. Se corta en la base para cubrir todas las fuentes
-- (add_points, heartbeat, racha, combos, etc.).

-- 1. add_points: para un alumno se comporta como con los puntos en pausa.
CREATE OR REPLACE FUNCTION public.add_points(p_user_id uuid, p_delta integer, p_category text DEFAULT 'other'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current integer;
  v_eff     integer;
  v_total   integer;
  v_paused  boolean;
  v_student boolean;
BEGIN
  SELECT (value = 'true') INTO v_paused FROM public.app_settings WHERE key = 'points_paused';

  SELECT total_points, COALESCE(is_student, false) INTO v_current, v_student FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF COALESCE(v_paused, false) OR v_student THEN
    RETURN v_current; -- pausado o alumno: no toca nada, devuelve el total sin cambios
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
$function$;

-- 2. Red de seguridad para cualquier otra vía que actualice total_points.
CREATE OR REPLACE FUNCTION public.block_student_points()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(NEW.is_student, false) AND NEW.total_points > OLD.total_points THEN
    NEW.total_points := OLD.total_points;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS users_block_student_points ON public.users;
CREATE TRIGGER users_block_student_points
  BEFORE UPDATE OF total_points ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.block_student_points();

CREATE OR REPLACE FUNCTION public.skip_student_point_events()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.delta > 0 AND EXISTS (SELECT 1 FROM public.users WHERE id = NEW.user_id AND COALESCE(is_student, false)) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS point_events_skip_students ON public.point_events;
CREATE TRIGGER point_events_skip_students
  BEFORE INSERT ON public.point_events
  FOR EACH ROW EXECUTE FUNCTION public.skip_student_point_events();
