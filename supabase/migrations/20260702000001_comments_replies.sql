-- Hilos de respuesta en los comentarios de la comunidad (Inicio).
-- parent_id null = comentario original; parent_id set = es una respuesta.
alter table public.program_comments add column if not exists parent_id uuid references public.program_comments(id) on delete cascade;
create index if not exists program_comments_parent_idx on public.program_comments(parent_id);
