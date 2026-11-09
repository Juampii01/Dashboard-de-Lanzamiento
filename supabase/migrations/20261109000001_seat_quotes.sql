-- Perfil adicional por cotización (reemplaza el pago directo del segundo participante).
--
-- 1. El participante pide una cotización desde la pestaña "Perfil adicional"
--    (status = 'requested'). No ve ningún precio.
-- 2. El equipo la ve en /admin/perfiles-adicionales y la aprueba con su precio y
--    su link de pago (status = 'approved'), o la rechaza ('rejected').
-- 3. El participante ve el precio y el botón de pago. Al pagar, el webhook de GHL
--    (?seat=1) o el equipo a mano ("Marcar pagado") crea la compra a nombre de la
--    persona adicional y le manda el email de registro (status = 'paid').
ALTER TABLE public.seat_requests
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS message      text,
  ADD COLUMN IF NOT EXISTS price_label  text,
  ADD COLUMN IF NOT EXISTS payment_url  text,
  ADD COLUMN IF NOT EXISTS admin_note   text,
  ADD COLUMN IF NOT EXISTS reviewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by  uuid REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.seat_requests SET status = CASE
  WHEN canceled_at IS NOT NULL THEN 'canceled'
  WHEN paid_at IS NOT NULL THEN 'paid'
  ELSE 'requested' END;

DO $$ BEGIN
  ALTER TABLE public.seat_requests
    ADD CONSTRAINT seat_requests_status_check CHECK (status IN ('requested','approved','rejected','paid','canceled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS seat_requests_status_idx ON public.seat_requests(status);
