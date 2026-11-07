-- Segundo participante pago: un participante le compra el acceso a su socio.
--
-- 1. El participante carga nombre y email del socio en su perfil → fila aquí.
-- 2. Paga con el link de Stripe (app_settings.seat_payment_url).
-- 3. GHL llama a /api/webhooks/ghl?product=live&seat=1 → se crea la compra a
--    nombre del socio (aunque el pago venga con el email de quien pagó) y se
--    le manda el email de registro.
CREATE TABLE IF NOT EXISTS public.seat_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product       text NOT NULL,
  partner_name  text NOT NULL,
  partner_email text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  paid_at       timestamptz,
  purchase_id   uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  canceled_at   timestamptz
);
CREATE INDEX IF NOT EXISTS seat_requests_host_idx ON public.seat_requests(host_id);
CREATE INDEX IF NOT EXISTS seat_requests_partner_idx ON public.seat_requests(lower(partner_email));
ALTER TABLE public.seat_requests ENABLE ROW LEVEL SECURITY; -- solo service role
REVOKE ALL ON public.seat_requests FROM anon, authenticated;
