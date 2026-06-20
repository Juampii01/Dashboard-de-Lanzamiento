-- ============================================================================
-- Sistema de referidos
-- - users.referral_code: código único por usuario (su link de referido)
-- - referral_leads: 1 fila por lead referido (UNIQUE por email → idempotencia)
-- La XP se acredita por la RPC atómica add_points (no se toca total_points).
-- ============================================================================

-- 1. Código de referido en users -------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_key
  ON public.users (referral_code);

-- 2. Generador de códigos (8 chars, sin caracteres ambiguos: 0/O, 1/I/L) ----
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result   text := '';
  i        int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Backfill de los usuarios existentes (reintenta ante colisión) ----------
DO $$
DECLARE
  r record;
  c text;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE referral_code IS NULL LOOP
    LOOP
      c := public.gen_referral_code();
      BEGIN
        UPDATE public.users SET referral_code = c WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- código repetido → probar otro
      END;
    END LOOP;
  END LOOP;
END $$;

-- 4. Tabla de leads referidos ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_email  text NOT NULL UNIQUE,           -- idempotencia: 1 premio por email
  ghl_contact_id  text,
  xp_awarded      int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_leads_referrer_idx
  ON public.referral_leads (referrer_id);

-- RLS: solo service_role escribe/lee (bypassa RLS). Nada para anon/authenticated.
ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;
