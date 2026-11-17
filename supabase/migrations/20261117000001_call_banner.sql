-- Banner de la llamada en vivo + suma de puntos que no respeta el tope (1.600).

-- El trigger del tope se puede saltar dentro de una transacción con app.skip_points_cap = 'on'.
CREATE OR REPLACE FUNCTION public.enforce_points_cap()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_cap integer;
BEGIN
  IF current_setting('app.skip_points_cap', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.total_points > OLD.total_points AND NOT COALESCE(NEW.is_admin, false) THEN
    v_cap := public.current_points_cap();
    IF v_cap IS NOT NULL AND NEW.total_points > v_cap THEN
      NEW.total_points := GREATEST(OLD.total_points, v_cap);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Igual que add_points (pausa, alumnos, mitad desde 10.000) pero sin el tope.
CREATE OR REPLACE FUNCTION public.add_points_uncapped(p_user_id uuid, p_delta integer, p_category text DEFAULT 'other'::text)
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
  SELECT total_points, COALESCE(is_student, false) INTO v_current, v_student
    FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF COALESCE(v_paused, false) OR v_student THEN RETURN v_current; END IF;

  IF p_delta > 0 AND v_current >= 10000 THEN
    v_eff := floor(p_delta / 2.0)::integer;
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

REVOKE ALL ON FUNCTION public.add_points_uncapped(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_points_uncapped(uuid, integer, text) TO service_role;

INSERT INTO public.app_settings (key, value) VALUES
  ('call_banner_id', 'dia1-2026-11-17'),
  ('call_banner_url', 'https://us06web.zoom.us/j/81040187898'),
  ('call_banner_starts_at', '2026-11-18T00:00:00Z'),
  ('call_banner_ends_at', '2026-11-18T03:00:00Z'),
  ('call_banner_points', '400')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
