\set ON_ERROR_STOP on
BEGIN;

-- ---------------------------------------------------------------------------
-- Tabla de bloqueo global del dashboard (fila única, id = 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboard_lock (
  id            int          PRIMARY KEY DEFAULT 1,
  is_locked     boolean      NOT NULL DEFAULT false,
  locked_at     timestamptz,
  locked_by     uuid         REFERENCES public.users(id) ON DELETE SET NULL,
  call_url      text,
  message       text         NOT NULL DEFAULT 'La llamada en vivo está en curso. Volvé cuando termine.',
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Fila única
INSERT INTO public.dashboard_lock (id, is_locked)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.dashboard_lock ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer el estado de bloqueo
CREATE POLICY "dashboard_lock: read for authenticated"
  ON public.dashboard_lock FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admin puede modificar
CREATE POLICY "dashboard_lock: admin write"
  ON public.dashboard_lock FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.dashboard_lock FROM PUBLIC, anon;
GRANT SELECT ON public.dashboard_lock TO authenticated;
-- service_role bypasea RLS → no necesita grant explícito

COMMIT;
