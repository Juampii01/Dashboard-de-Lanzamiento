-- ============================================================================
-- Misión diaria con captura
-- - daily_missions: la misión que setea el admin (Santo). Una activa a la vez.
-- - mission_submissions: 1 captura por usuario por misión (UNIQUE).
-- La XP se acredita por la RPC atómica add_points (immediate + admin puede
-- rechazar = descuenta).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_missions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  points_reward int  NOT NULL DEFAULT 20,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- Solo una misión activa a la vez (lo garantiza la app: al activar una, apaga las otras).
CREATE UNIQUE INDEX IF NOT EXISTS daily_missions_one_active
  ON public.daily_missions (is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.mission_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id      uuid NOT NULL REFERENCES public.daily_missions(id) ON DELETE CASCADE,
  image_url       text NOT NULL,
  status          text NOT NULL DEFAULT 'approved',  -- approved | rejected
  points_awarded  int  NOT NULL DEFAULT 0,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);
CREATE INDEX IF NOT EXISTS mission_submissions_mission_idx
  ON public.mission_submissions (mission_id);

-- RLS: solo service_role escribe/lee (la app rinde server-side con service role).
ALTER TABLE public.daily_missions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;
