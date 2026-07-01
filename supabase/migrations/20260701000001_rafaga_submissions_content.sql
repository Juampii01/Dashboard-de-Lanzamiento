-- Respuestas flexibles (captura / link / texto) + moderación para misiones ráfaga.
-- Espeja el esquema de mission_submissions (misión diaria).
--   content_type: 'image' | 'link' | 'text'
--   content_text: para link/texto (image_url null)
--   storage_path: ruta del archivo en el bucket (para borrarlo en moderación)
--   reviewed_at:  si un admin ya la revisó. null = pendiente.
alter table rafaga_submissions add column if not exists content_type text not null default 'text';
alter table rafaga_submissions add column if not exists content_text text;
alter table rafaga_submissions add column if not exists image_url text;
alter table rafaga_submissions add column if not exists storage_path text;
alter table rafaga_submissions add column if not exists reviewed_at timestamptz;
