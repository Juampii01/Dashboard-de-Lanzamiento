-- Nuevo flujo de referidos: el lead se guarda al enviar el formulario público,
-- y la XP al referidor se acredita recién cuando se CREA el usuario (= pagó).
-- credited_at marca si ya se acreditó (evita doble crédito).
ALTER TABLE public.referral_leads ADD COLUMN IF NOT EXISTS credited_at timestamptz;
