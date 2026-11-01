-- Nombre de cada clase grabada. En el inicio del dashboard cada grabación muestra
-- "Día N" arriba y el nombre de la clase abajo (pedido de Santo, 31/10).
ALTER TABLE public.class_recordings
  ADD COLUMN IF NOT EXISTS title text;
