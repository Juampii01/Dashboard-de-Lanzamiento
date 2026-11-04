-- ============================================================================
-- On Demand — fase 2 y 3
--
--   1. claim_purchase(): crea la fila del Día 1 si no existe (el reset del
--      lanzamiento borra day_progress; sin la fila, el UPDATE no abría nada).
--   2. class_recordings por programa: grabaciones propias de on demand y video
--      introductorio (recording_number = 0).
--   3. Misiones fijas de on demand (sin programación diaria).
--   4. Premios por umbral de puntos: niveles + solicitudes de canje.
--   5. webhook_logs: a qué compra quedó asociado cada webhook.
-- ============================================================================

-- 1) claim_purchase con alta del Día 1 ---------------------------------------
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
         -- On demand no vence: si la cuenta tiene (o reclama) una compra on
         -- demand, el fin de acceso del en vivo no la corta.
         access_expires_at      = CASE
                                    WHEN v_product = 'challenge-ondemand' THEN NULL
                                    WHEN EXISTS (SELECT 1 FROM purchases
                                                  WHERE claimed_by = p_user_id
                                                    AND product = 'challenge-ondemand') THEN NULL
                                    ELSE p_expires_at
                                  END,
         access_status          = NULL,
         verified_by            = p_verified_by,
         verified_at            = CASE WHEN p_verified_by IS NULL THEN verified_at ELSE now() END,
         program                = CASE
                                    WHEN v_product = 'challenge-ondemand' THEN 'ondemand'
                                    WHEN EXISTS (SELECT 1 FROM purchases
                                                  WHERE claimed_by = p_user_id
                                                    AND product = 'challenge-ondemand') THEN 'ondemand'
                                    ELSE 'live'
                                  END
   WHERE id = p_user_id;

  -- Día 1 abierto (crea la fila si el reset la borró).
  INSERT INTO day_progress (user_id, day_number, is_unlocked, is_completed)
  VALUES (p_user_id, 1, true, false)
  ON CONFLICT (user_id, day_number) DO UPDATE SET is_unlocked = true;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_purchase(uuid, uuid, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_purchase(uuid, uuid, timestamptz, uuid) TO service_role;

-- 2) Grabaciones por programa --------------------------------------------------
ALTER TABLE public.class_recordings
  ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'live'
    CHECK (program IN ('live', 'ondemand'));

-- Cambia UNIQUE(recording_number) por UNIQUE(program, recording_number) y deja
-- usar el 0 (video introductorio). Los nombres de los constraints se buscan
-- porque los generó Postgres.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname, con.contype
      FROM pg_constraint con
     WHERE con.conrelid = 'public.class_recordings'::regclass
       AND (
         (con.contype = 'u' AND pg_get_constraintdef(con.oid) = 'UNIQUE (recording_number)')
         OR (con.contype = 'c' AND pg_get_constraintdef(con.oid) ILIKE '%recording_number%')
       )
  LOOP
    EXECUTE format('ALTER TABLE public.class_recordings DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.class_recordings
  ADD CONSTRAINT class_recordings_number_range CHECK (recording_number BETWEEN 0 AND 4),
  ADD CONSTRAINT class_recordings_program_number_key UNIQUE (program, recording_number);

-- 3) Misiones fijas de on demand -------------------------------------------------
-- A diferencia de daily_missions (una activa por vez, programada por el admin),
-- estas son fijas: todas activas a la vez, opcionalmente atadas a un día.
CREATE TABLE IF NOT EXISTS public.ondemand_missions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number    int  CHECK (day_number IS NULL OR day_number BETWEEN 1 AND 4), -- NULL = general
  title         text NOT NULL,
  description   text,
  action_url    text,                                   -- ej. la publicación a comentar
  proof         text NOT NULL DEFAULT 'image' CHECK (proof IN ('image', 'link', 'text', 'none')),
  points_reward int  NOT NULL DEFAULT 100 CHECK (points_reward BETWEEN 0 AND 100000),
  sort_order    int  NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ondemand_mission_submissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id     uuid NOT NULL REFERENCES public.ondemand_missions(id) ON DELETE CASCADE,
  content_type   text NOT NULL CHECK (content_type IN ('image', 'link', 'text', 'none')),
  content_text   text,
  image_url      text,
  storage_path   text,
  status         text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'rejected')),
  points_awarded int  NOT NULL DEFAULT 0,
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS ondemand_mission_submissions_mission_idx
  ON public.ondemand_mission_submissions (mission_id);

-- 4) Premios por umbral de puntos -----------------------------------------------
-- Sin rifa: todo el que llega al umbral puede pedir el premio (una vez por nivel).
CREATE TABLE IF NOT EXISTS public.reward_tiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program     text NOT NULL DEFAULT 'ondemand' CHECK (program IN ('live', 'ondemand')),
  points      int  NOT NULL CHECK (points > 0),
  title       text NOT NULL,                 -- ej. "1 mes gratis de GovBidder Connect"
  description text,
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_claims (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_id           uuid NOT NULL REFERENCES public.reward_tiers(id) ON DELETE CASCADE,
  points_at_request int  NOT NULL,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note              text,                    -- nota del equipo (ej. código entregado)
  reviewed_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier_id)
);

CREATE INDEX IF NOT EXISTS reward_claims_status_idx ON public.reward_claims (status, created_at);

-- RLS: solo el backend (service role). Los participantes nunca leen las tablas
-- directo; todo pasa por las rutas de la API.
ALTER TABLE public.ondemand_missions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ondemand_mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tiers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims                ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ondemand_missions: service role" ON public.ondemand_missions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ondemand_mission_submissions: service role" ON public.ondemand_mission_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "reward_tiers: service role" ON public.reward_tiers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "reward_claims: service role" ON public.reward_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.ondemand_missions, public.ondemand_mission_submissions,
              public.reward_tiers, public.reward_claims FROM anon, authenticated;

-- 5) webhook_logs → compra -------------------------------------------------------
ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS purchase_id  uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email        text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;
