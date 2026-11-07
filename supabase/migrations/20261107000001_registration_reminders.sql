-- Recordatorios de registro a compradores sin cuenta.
-- Cuenta cuántos recordatorios se mandaron por compra y cuándo, para no
-- repetir el email más de lo necesario (envío manual y automático diario).
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS registration_reminders_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_registration_reminder_at timestamptz;
