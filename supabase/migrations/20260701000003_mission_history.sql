-- ============================================================================
-- Historial de misiones: nunca se borra nada automáticamente (ni al vencer una
-- misión, ni al cerrar/cambiar la misión activa/diaria). Las fotos y respuestas
-- se conservan como historial que el admin puede seguir revisando. La ÚNICA
-- forma de borrar de verdad una respuesta es el botón explícito "Eliminar" en
-- el panel admin (hard-delete puntual, no automático).
-- ============================================================================

-- daily_missions: marcar CÓMO se cerró la última misión, ya que las filas
-- viejas ya no se borran (antes "Volver a Próximamente" borraba TODO en
-- cascada). Sirve para que el lado del usuario siga distinguiendo "caducó" de
-- "Próximamente" sin depender de si existen filas.
alter table public.daily_missions add column if not exists closed_as text; -- 'expired' | 'removed' | null

-- mission_submissions: permitir múltiples filas históricas por usuario+misión.
-- Antes UNIQUE(user_id, mission_id) obligaba a BORRAR la fila al rechazar para
-- que la persona pudiera reintentar. Reemplazo por índice único PARCIAL: solo
-- puede haber UNA fila "viva" (no rechazada) por usuario+misión a la vez; las
-- rechazadas quedan como historial y no bloquean un nuevo intento.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.mission_submissions'::regclass and contype = 'u'
  loop
    execute format('alter table public.mission_submissions drop constraint %I', r.conname);
  end loop;
end $$;
create unique index if not exists mission_submissions_active_uniq
  on public.mission_submissions (user_id, mission_id)
  where status <> 'rejected';

-- rafaga_submissions: agregar status (no existía — reject solo borraba la fila
-- sin dejar rastro) y el mismo esquema de unicidad parcial que arriba.
alter table public.rafaga_submissions add column if not exists status text not null default 'approved'; -- approved | rejected
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.rafaga_submissions'::regclass and contype = 'u'
  loop
    execute format('alter table public.rafaga_submissions drop constraint %I', r.conname);
  end loop;
end $$;
create unique index if not exists rafaga_submissions_active_uniq
  on public.rafaga_submissions (user_id, rafaga_id)
  where status <> 'rejected';
