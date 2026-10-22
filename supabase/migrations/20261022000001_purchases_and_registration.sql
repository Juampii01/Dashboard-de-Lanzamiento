-- ============================================================================
-- Registro con email y contraseña + compras verificadas
--
-- Antes: el acceso dependía de que el admin (o el webhook de Hotmart) creara la
-- cuenta y le llegara al comprador un magic link por email. Si el email no
-- llegaba o el comprador usaba otro correo, no podía entrar nunca.
--
-- Ahora hay dos registros separados que se cruzan:
--   1. public.purchases  → quién compró (se carga por CSV desde el admin o por
--                          el webhook de Hotmart).
--   2. public.users      → quién se registró (email + contraseña).
--
-- Al registrarse, si el email coincide con una compra libre, la cuenta queda
-- con acceso al instante. Si no coincide, la cuenta queda "en verificación"
-- (users.access_status = 'pending') hasta que el equipo la vincule a mano.
--
-- Regla de negocio: UNA compra = UNA cuenta. purchases.claimed_by es único, así
-- que una compra no puede quedar asociada a dos cuentas, y una cuenta no puede
-- reclamar dos compras.
--
-- Usuarios existentes: no cambian. access_status queda NULL para todos ellos y
-- el acceso se sigue decidiendo como antes (hotmart_transaction_id, is_student,
-- is_admin).
-- ============================================================================

-- 1) Compras -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  full_name    text,
  source       text NOT NULL DEFAULT 'manual'
               CHECK (source IN ('hotmart', 'sem', 'stripe', 'ghl', 'manual')),
  external_ref text,                         -- id de transacción de la plataforma
  product      text NOT NULL DEFAULT 'challenge',
  notes        text,
  claimed_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  claimed_at   timestamptz,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchases_email_lowercase CHECK (email = lower(btrim(email)))
);

-- Un email compra una sola vez por producto (re-importar el mismo CSV no duplica).
CREATE UNIQUE INDEX IF NOT EXISTS purchases_product_email_key
  ON public.purchases (product, email);

-- Una cuenta solo puede tener UNA compra asociada.
CREATE UNIQUE INDEX IF NOT EXISTS purchases_claimed_by_key
  ON public.purchases (claimed_by) WHERE claimed_by IS NOT NULL;

-- La misma transacción no se carga dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS purchases_source_ref_key
  ON public.purchases (source, external_ref) WHERE external_ref IS NOT NULL;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Solo el backend (service role) lee y escribe. Los participantes nunca ven
-- la tabla directamente.
CREATE POLICY "purchases: service role full access" ON public.purchases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.purchases FROM anon, authenticated;

-- 2) Estado de verificación de la cuenta --------------------------------------
--   NULL       → cuenta vieja o con acceso por otra vía (comportamiento anterior)
--   'pending'  → se registró sin compra que coincida; el equipo debe verificar
--   'rejected' → el equipo confirmó que no hay compra
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS access_status text
    CHECK (access_status IS NULL OR access_status IN ('pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS purchase_email_claim text,   -- "compré con este otro email"
  ADD COLUMN IF NOT EXISTS verification_note text,      -- comentario del participante
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Los participantes NO pueden tocar estas columnas (solo existen GRANTs de
-- UPDATE puntuales a authenticated; no se agrega ninguno nuevo). Se deja
-- explícito por si alguien agrega un GRANT amplio en el futuro.
REVOKE UPDATE (access_status, purchase_email_claim, verification_note,
               verification_requested_at, verified_by, verified_at)
  ON public.users FROM authenticated, anon;

CREATE INDEX IF NOT EXISTS users_access_status_idx
  ON public.users (access_status) WHERE access_status IS NOT NULL;

-- 3) Reclamo atómico de una compra ---------------------------------------------
-- Vincula una compra libre a una cuenta y le da acceso, todo en una
-- transacción. Devuelve true si la vinculó, false si la compra ya estaba
-- tomada o la cuenta ya tenía otra compra.
CREATE OR REPLACE FUNCTION public.claim_purchase(
  p_user_id     uuid,
  p_purchase_id uuid,
  p_expires_at  timestamptz,
  p_verified_by uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref text;
BEGIN
  -- La cuenta ya tiene una compra → no se vincula otra.
  IF EXISTS (SELECT 1 FROM purchases WHERE claimed_by = p_user_id) THEN
    RETURN false;
  END IF;

  UPDATE purchases
     SET claimed_by = p_user_id, claimed_at = now()
   WHERE id = p_purchase_id AND claimed_by IS NULL
  RETURNING COALESCE(external_ref, 'PURCHASE-' || id::text) INTO v_ref;

  IF v_ref IS NULL THEN
    RETURN false; -- compra inexistente o ya reclamada por otra cuenta
  END IF;

  -- hotmart_transaction_id es la marca de "tiene compra" que usa el layout del
  -- dashboard. Se prefija para no chocar con el UNIQUE si la referencia ya
  -- existe en otra cuenta vieja.
  UPDATE users
     SET hotmart_transaction_id = 'PUR-' || p_purchase_id::text,
         access_starts_at       = COALESCE(access_starts_at, now()),
         access_expires_at      = p_expires_at,
         access_status          = NULL,
         verified_by            = p_verified_by,
         verified_at            = CASE WHEN p_verified_by IS NULL THEN verified_at ELSE now() END
   WHERE id = p_user_id;

  UPDATE day_progress
     SET is_unlocked = true
   WHERE user_id = p_user_id AND day_number = 1;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_purchase(uuid, uuid, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_purchase(uuid, uuid, timestamptz, uuid) TO service_role;

-- 4) Fecha de fin de acceso del lanzamiento (editable desde el admin) -----------
INSERT INTO public.app_settings (key, value)
VALUES ('launch_access_expires_at', NULL)
ON CONFLICT (key) DO NOTHING;
