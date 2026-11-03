-- ============================================================================
-- Programa On Demand (versión grabada del challenge)
--
-- Una sola plataforma con dos programas que no se mezclan:
--   live     → challenge en vivo (dboard.govbidder.net)
--   ondemand → versión grabada, US$500 (ondemand.govbidder.net)
--
-- El acceso lo decide users.program, no el dominio. El dominio solo decide qué
-- producto se reclama al registrarse (ver lib/program.ts).
--
-- Cambios:
--   1. users.program
--   2. claim_purchase(): el programa de la cuenta sale del producto reclamado
--      (on demand → 'ondemand'; en vivo → 'live' salvo que ya tenga on demand).
--   3. get_leaderboard() / get_full_leaderboard(): solo program = 'live'
--      (los de on demand no compiten en el ranking ni en el sorteo del en vivo).
--   4. webhook_logs: payload crudo de webhooks externos (GoHighLevel).
-- ============================================================================

-- 1) Programa de cada cuenta -------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'live'
    CHECK (program IN ('live', 'ondemand'));

CREATE INDEX IF NOT EXISTS users_program_idx ON public.users (program) WHERE program <> 'live';

-- Los participantes no pueden cambiarse de programa.
REVOKE UPDATE (program) ON public.users FROM authenticated, anon;

-- 2) claim_purchase con programa ---------------------------------------------
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

  -- La cuenta ya tiene una compra de ESTE producto → no se vincula otra.
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
         verified_at            = CASE WHEN p_verified_by IS NULL THEN verified_at ELSE now() END,
         -- El programa sale del producto reclamado, no del dominio por el que
         -- se registró:
         --   · compra on demand → 'ondemand' (una cuenta del en vivo que compra
         --     la grabación conserva su empresa y su progreso)
         --   · compra del en vivo → 'live', salvo que la cuenta ya tenga una
         --     compra on demand (no se le quita el acceso indefinido)
         program                = CASE
                                    WHEN v_product = 'challenge-ondemand' THEN 'ondemand'
                                    WHEN EXISTS (SELECT 1 FROM purchases
                                                  WHERE claimed_by = p_user_id
                                                    AND product = 'challenge-ondemand') THEN 'ondemand'
                                    ELSE 'live'
                                  END
   WHERE id = p_user_id;

  UPDATE day_progress
     SET is_unlocked = true
   WHERE user_id = p_user_id AND day_number = 1;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_purchase(uuid, uuid, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_purchase(uuid, uuid, timestamptz, uuid) TO service_role;

-- 3) Ranking solo del en vivo -------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH all_ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC)::int AS position,
      CASE
        WHEN full_name IS NULL OR full_name = '' THEN 'Anónimo'
        WHEN POSITION(' ' IN full_name) = 0      THEN full_name
        ELSE SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.'
      END                                      AS display_name,
      total_points,
      GREATEST(0, total_points / 10)           AS raffle_entries,
      id                                       AS user_id
    FROM public.users
    WHERE COALESCE(is_admin, false) = false      -- admins fuera
      AND COALESCE(is_student, false) = false    -- alumnos fuera
      AND program = 'live'                       -- on demand fuera
  )
  SELECT json_build_object(
    'top', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'rank',            r.position,
            'display_name',    r.display_name,
            'total_points',    r.total_points,
            'raffle_entries',  r.raffle_entries,
            'is_current_user', r.user_id = auth.uid()
          ) ORDER BY r.position
        )
        FROM all_ranked r
        WHERE r.position <= 20 AND r.total_points > 0
      ),
      '[]'::json
    ),
    'me', (
      SELECT json_build_object(
        'rank',            m.position,
        'display_name',    m.display_name,
        'total_points',    m.total_points,
        'raffle_entries',  m.raffle_entries,
        'is_current_user', true
      )
      FROM all_ranked m
      WHERE m.user_id = auth.uid()
    ),
    'my_rank', (
      SELECT position FROM all_ranked WHERE user_id = auth.uid()
    ),
    'in_top', COALESCE(
      (SELECT (position <= 20 AND total_points > 0) FROM all_ranked WHERE user_id = auth.uid()),
      false
    ),
    'total', (SELECT COUNT(*)::int FROM all_ranked)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_full_leaderboard()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH all_ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC)::int AS position,
      CASE
        WHEN full_name IS NULL OR full_name = '' THEN 'Anónimo'
        WHEN POSITION(' ' IN full_name) = 0      THEN full_name
        ELSE SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.'
      END                                      AS display_name,
      total_points,
      id                                       AS user_id
    FROM public.users
    WHERE COALESCE(is_admin, false) = false
      AND COALESCE(is_student, false) = false
      AND program = 'live'
  )
  SELECT json_build_object(
    'all', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'rank',            r.position,
            'display_name',    r.display_name,
            'total_points',    r.total_points,
            'is_current_user', r.user_id = auth.uid()
          ) ORDER BY r.position
        )
        FROM all_ranked r
        WHERE r.total_points > 0 OR r.user_id = auth.uid()
      ),
      '[]'::json
    ),
    'my_global_rank', (
      SELECT position FROM all_ranked WHERE user_id = auth.uid()
    ),
    'total', (
      SELECT COUNT(*)::int FROM all_ranked WHERE total_points > 0
    )
  );
$$;

-- 4) Log de webhooks externos ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL,             -- 'ghl'
  product      text,                      -- producto indicado en la URL
  headers      jsonb,
  body         jsonb,
  raw_body     text,                      -- por si el body no es JSON
  processed    boolean NOT NULL DEFAULT false,
  error        text,
  received_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_logs_received_idx ON public.webhook_logs (received_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs: service role full access" ON public.webhook_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.webhook_logs FROM anon, authenticated;
