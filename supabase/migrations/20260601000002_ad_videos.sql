\set ON_ERROR_STOP on
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Pool de videos publicitarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ad_videos (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_url        text        NOT NULL,
  title            text,
  duration_seconds int,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_videos ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer los activos
CREATE POLICY "ad_videos: read active for authenticated"
  ON public.ad_videos FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Solo admins pueden escribir
CREATE POLICY "ad_videos: admin all"
  ON public.ad_videos FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON public.ad_videos FROM PUBLIC, anon;
GRANT SELECT ON public.ad_videos TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Timestamp de último anuncio visto en users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_ad_watched_at timestamptz;

COMMENT ON COLUMN public.users.last_ad_watched_at IS 'Última vez que el usuario reclamó XP por ver un anuncio. Cooldown de 10 min.';

-- ---------------------------------------------------------------------------
-- 3. RPC: reclamar XP de anuncio (cooldown server-side con row lock)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_ad_xp(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last     timestamptz;
  v_xp       int := 20;
  v_cooldown interval := interval '10 minutes';
  v_new_total int;
BEGIN
  SELECT last_ad_watched_at INTO v_last
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_last IS NOT NULL AND now() - v_last < v_cooldown THEN
    RETURN jsonb_build_object(
      'awarded',         false,
      'reason',          'cooldown',
      'next_in_seconds', EXTRACT(EPOCH FROM (v_last + v_cooldown - now()))::int
    );
  END IF;

  UPDATE public.users
  SET last_ad_watched_at = now(),
      total_points       = total_points + v_xp
  WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;

  RETURN jsonb_build_object(
    'awarded',    true,
    'xp',         v_xp,
    'new_total',  v_new_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ad_xp FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_ad_xp TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Seed — placeholders (reemplazar con URLs reales antes del lanzamiento)
-- ---------------------------------------------------------------------------
INSERT INTO public.ad_videos (video_url, title, duration_seconds) VALUES
  ('https://www.w3schools.com/html/mov_bbb.mp4', 'Demo de producto — REEMPLAZAR con reel real', 10),
  ('https://www.w3schools.com/html/mov_bbb.mp4', 'Testimonio de cliente — REEMPLAZAR',           10),
  ('https://www.w3schools.com/html/mov_bbb.mp4', 'Oferta especial — REEMPLAZAR',                  10);

COMMIT;
