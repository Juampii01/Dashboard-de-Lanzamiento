-- ============================================================================
-- Misiones: respuestas flexibles (captura / link / texto) + limpieza de la DB.
-- - content_type: 'image' | 'link' | 'text'
-- - content_text: para link/texto (image_url queda null)
-- - storage_path: ruta del archivo en el bucket (para borrarlo en moderación)
-- - reviewed_at: si un admin ya la revisó (aceptó/rechazó). null = pendiente.
-- ============================================================================

ALTER TABLE public.mission_submissions ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.mission_submissions ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.mission_submissions ADD COLUMN IF NOT EXISTS content_text text;
ALTER TABLE public.mission_submissions ADD COLUMN IF NOT EXISTS storage_path  text;
