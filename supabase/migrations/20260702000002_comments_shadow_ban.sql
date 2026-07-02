-- Shadow-ban de comentarios que contienen datos de contacto (teléfono, email,
-- link/página web). El autor ve su propio comentario como publicado; para
-- todos los demás queda invisible (así cree que lo vieron y nadie respondió).
alter table public.program_comments add column if not exists hidden boolean not null default false;
