-- ===========================================================================
-- Desbloqueo MANUAL del challenge + gate de "Inicio" (day 0) + horas de clase.
--
-- Qué hace:
--   1. Permite day_number = 0 en admin_toggles (fila "Inicio" del dashboard).
--   2. Crea la fila Inicio: bloqueada, con contador a 29/06 00:00 hora Miami.
--   3. Pone el contador de los 4 días a las 7:00 PM Miami (23:00 UTC).
--   4. "Bloquear todo ya": is_globally_unlocked = false en Inicio + 4 días, para
--      que en la previa todos vean el contador hasta que el admin abra cada uno.
--
-- El desbloqueo real es 100% manual desde el panel admin (switch por día/Inicio).
-- El contador es solo cosmético: al llegar a 0, el contenido sigue bloqueado.
-- ===========================================================================

-- 1. Permitir day_number = 0 (Inicio)
ALTER TABLE public.admin_toggles DROP CONSTRAINT IF EXISTS admin_toggles_day_number_check;
ALTER TABLE public.admin_toggles
  ADD CONSTRAINT admin_toggles_day_number_check CHECK (day_number >= 0 AND day_number <= 4);

-- 2. Fila Inicio (day 0): bloqueada, contador a 29/06 00:00 Miami (04:00 UTC)
INSERT INTO public.admin_toggles (day_number, is_globally_unlocked, scheduled_unlock_at)
VALUES (0, false, '2026-06-29T04:00:00Z')
ON CONFLICT (day_number) DO UPDATE
  SET is_globally_unlocked = EXCLUDED.is_globally_unlocked,
      scheduled_unlock_at  = EXCLUDED.scheduled_unlock_at,
      unlocked_at          = NULL;

-- 3 + 4. Días 1-4: contador a 7pm Miami (23:00 UTC) y TODO bloqueado para la previa
UPDATE public.admin_toggles SET scheduled_unlock_at = '2026-06-29T23:00:00Z', is_globally_unlocked = false, unlocked_at = NULL WHERE day_number = 1;
UPDATE public.admin_toggles SET scheduled_unlock_at = '2026-06-30T23:00:00Z', is_globally_unlocked = false, unlocked_at = NULL WHERE day_number = 2;
UPDATE public.admin_toggles SET scheduled_unlock_at = '2026-07-01T23:00:00Z', is_globally_unlocked = false, unlocked_at = NULL WHERE day_number = 3;
UPDATE public.admin_toggles SET scheduled_unlock_at = '2026-07-02T23:00:00Z', is_globally_unlocked = false, unlocked_at = NULL WHERE day_number = 4;
