\set ON_ERROR_STOP on
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columnas en users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS combo_progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combo_claims   int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.combo_progress IS 'Progreso 0-100 de la barra de combo. Al llegar a 100 el usuario puede cobrar el bonus.';
COMMENT ON COLUMN public.users.combo_claims   IS 'Cuántas veces cobró el bonus de combo (para tracking).';

-- ---------------------------------------------------------------------------
-- 2. RPC: incrementar combo (sin bajar de 0 ni superar 100)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_combo_progress(
  p_user_id uuid,
  p_delta   int
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new int;
BEGIN
  UPDATE public.users
  SET combo_progress = LEAST(100, GREATEST(0, combo_progress + p_delta))
  WHERE id = p_user_id
  RETURNING combo_progress INTO v_new;

  RETURN COALESCE(v_new, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. RPC: cobrar bonus de combo (idempotente — falla silenciosamente si < 100)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_combo(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress int;
  v_bonus    int := 50;
  v_new_total int;
BEGIN
  -- Row lock to avoid race conditions
  SELECT combo_progress INTO v_progress
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_progress IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'user_not_found');
  END IF;

  IF v_progress < 100 THEN
    RETURN jsonb_build_object(
      'claimed',   false,
      'reason',    'not_full',
      'progress',  v_progress
    );
  END IF;

  -- Reset combo, award bonus, increment claim counter
  UPDATE public.users
  SET combo_progress = 0,
      combo_claims   = combo_claims + 1,
      total_points   = total_points + v_bonus
  WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  RETURN jsonb_build_object(
    'claimed',    true,
    'bonus',      v_bonus,
    'new_total',  v_new_total
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Permisos
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.add_combo_progress FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_combo        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.add_combo_progress TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_combo        TO authenticated, service_role;

COMMIT;
