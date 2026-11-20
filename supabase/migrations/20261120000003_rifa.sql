-- Rifa en vivo (clase final). Quien está en la llamada toca "¡Quiero
-- participar!" mientras el banner está activo; el admin sortea ganador por
-- ganador en /admin/rifa. Separado de sorteo_winners para poder hacer un
-- simulacro y reiniciarlo sin tocar nada más.

CREATE TABLE IF NOT EXISTS public.rifa_participants (
  user_id   uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rifa_winners (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_key  text NOT NULL CHECK (rank_key IN ('elevate','prime','legacy','expert')),
  position  integer NOT NULL CHECK (position > 0),
  user_id   uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  points_at_draw numeric(12,2),
  drawn_at  timestamptz NOT NULL DEFAULT now(),
  drawn_by  uuid,
  UNIQUE (rank_key, position)
);

-- Solo se accede con la service key desde las rutas de la app.
ALTER TABLE public.rifa_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rifa_winners      ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value)
VALUES ('rifa_banner_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
