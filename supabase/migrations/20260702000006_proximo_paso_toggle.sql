-- Permite habilitar "Tu Próximo Paso" manualmente desde el admin (igual que
-- Inicio y los 4 días), además del desbloqueo automático al completar el
-- Día 4. Reutiliza admin_toggles con day_number = 5 (sin countdown propio —
-- LaunchScheduleControl solo itera días 0-4 a propósito, esta fila no
-- necesita fecha programada, solo el switch manual).
ALTER TABLE public.admin_toggles DROP CONSTRAINT IF EXISTS admin_toggles_day_number_check;
ALTER TABLE public.admin_toggles
  ADD CONSTRAINT admin_toggles_day_number_check CHECK (day_number >= 0 AND day_number <= 5);

INSERT INTO public.admin_toggles (day_number, is_globally_unlocked, scheduled_unlock_at)
VALUES (5, false, NULL)
ON CONFLICT (day_number) DO NOTHING;
