-- Misiones ráfaga: el admin decide cuándo las ve el participante (botón
-- "Mostrar / Ocultar" en el panel), independiente de su fecha de apertura.
ALTER TABLE public.rafaga_missions
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- Las que ya estaban programadas quedan ocultas: Santo las va soltando por día.
UPDATE public.rafaga_missions SET is_visible = false
 WHERE is_active AND starts_at > now();
