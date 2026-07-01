-- Imagen opcional para las misiones ráfaga (se muestra al usuario en el dashboard).
alter table rafaga_missions add column if not exists image_url text;
