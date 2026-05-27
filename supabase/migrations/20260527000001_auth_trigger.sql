-- Auth trigger: handle_new_user
-- Crea fila en public.users y day_progress cuando un usuario se registra en auth.users
-- NOTA CRÍTICA: este trigger será modificado en Día 2 para validar hotmart_transaction_id
-- (actualmente cualquier email que se autentique queda con Día 1 desbloqueado — bypass del paywall)

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  
  -- También crear day_progress para los 4 días, día 1 desbloqueado
  INSERT INTO public.day_progress (user_id, day_number, is_unlocked, is_completed)
  VALUES 
    (NEW.id, 1, true,  false),
    (NEW.id, 2, false, false),
    (NEW.id, 3, false, false),
    (NEW.id, 4, false, false)
  ON CONFLICT (user_id, day_number) DO NOTHING;
  
  RETURN NEW;
END;
$function$

;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
;
