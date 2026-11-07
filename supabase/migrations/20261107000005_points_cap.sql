-- Tope de puntos antes del challenge: hasta app_settings.points_cap_until
-- nadie (salvo admins) pasa de app_settings.points_cap. No resta puntos a
-- nadie: solo deja de sumar al llegar al tope. Vacío = sin tope.

INSERT INTO public.app_settings (key, value) VALUES
  ('points_cap', '1600'),
  ('points_cap_until', '2026-11-18T00:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Tope vigente (NULL si no hay).
CREATE OR REPLACE FUNCTION public.current_points_cap()
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_cap   text;
  v_until text;
BEGIN
  SELECT value INTO v_cap   FROM public.app_settings WHERE key = 'points_cap';
  SELECT value INTO v_until FROM public.app_settings WHERE key = 'points_cap_until';
  IF v_cap IS NULL OR v_cap !~ '^\d+$' THEN RETURN NULL; END IF;
  IF v_until IS NOT NULL AND v_until <> '' AND now() >= v_until::timestamptz THEN RETURN NULL; END IF;
  RETURN v_cap::integer;
END;
$$;

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

  IF p_delta > 0 AND v_current >= 10000 THEN
    v_eff := floor(p_delta / 2.0)::integer;
  ELSE
    v_eff := p_delta;
  END IF;

  -- Tope: solo recorta lo que se suma; nunca resta.
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

-- Red de seguridad para cualquier otra vía que actualice total_points.
CREATE OR REPLACE FUNCTION public.enforce_points_cap()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_cap integer;
BEGIN
  IF NEW.total_points > OLD.total_points AND NOT COALESCE(NEW.is_admin, false) THEN
    v_cap := public.current_points_cap();
    IF v_cap IS NOT NULL AND NEW.total_points > v_cap THEN
      NEW.total_points := GREATEST(OLD.total_points, v_cap);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS users_enforce_points_cap ON public.users;
CREATE TRIGGER users_enforce_points_cap
  BEFORE UPDATE OF total_points ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_points_cap();

REVOKE ALL ON FUNCTION public.current_points_cap() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_points_cap() TO authenticated, service_role;
