-- Compras por lanzamiento.
--
-- Problema: claim_purchase() rechaza vincular una compra si la cuenta YA tiene
-- una. Un participante de un lanzamiento anterior que vuelve a comprar para el
-- de noviembre quedaba bloqueado (su compra vieja contaba como "ya tiene una").
--
-- Solución: cada lanzamiento usa su propio valor de purchases.product
-- (CURRENT_PRODUCT en lib/access/purchases.ts, "challenge-2026-11" desde
-- noviembre) y la regla "una compra = una cuenta" se aplica POR PRODUCTO.
-- El índice único (product, email) ya permite que el mismo email compre en
-- lanzamientos distintos.

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
  v_ref     text;
  v_product text;
BEGIN
  SELECT product INTO v_product FROM purchases WHERE id = p_purchase_id;
  IF v_product IS NULL THEN
    RETURN false;
  END IF;

  -- La cuenta ya tiene una compra de ESTE lanzamiento → no se vincula otra.
  IF EXISTS (SELECT 1 FROM purchases WHERE claimed_by = p_user_id AND product = v_product) THEN
    RETURN false;
  END IF;

  UPDATE purchases
     SET claimed_by = p_user_id, claimed_at = now()
   WHERE id = p_purchase_id AND claimed_by IS NULL
  RETURNING COALESCE(external_ref, 'PURCHASE-' || id::text) INTO v_ref;

  IF v_ref IS NULL THEN
    RETURN false; -- compra inexistente o ya reclamada por otra cuenta
  END IF;

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
