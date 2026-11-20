-- Personas que pueden tocar "¡Quiero participar!" pero nunca ganan la rifa
-- (0% de probabilidad). Se cargan por email desde /admin/sorteo. El
-- participante no ve ninguna diferencia.
CREATE TABLE IF NOT EXISTS public.rifa_excluded (
  email      text PRIMARY KEY,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.rifa_excluded ENABLE ROW LEVEL SECURITY;
