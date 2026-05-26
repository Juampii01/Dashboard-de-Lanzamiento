-- ============================================================
-- Fix 1 (CRÍTICO): GRANT columnas heartbeat al rol authenticated
-- Sin esto, el heartbeat XP falla silenciosamente para usuarios
-- no-admin porque el UPDATE incluye columnas sin permiso.
-- ============================================================
GRANT UPDATE (heartbeat_count_today, heartbeat_count_day)
  ON public.users
  TO authenticated;

-- ============================================================
-- Fix 2 (MEDIO): Convertir video_capsule_completions.capsule_id
-- de TEXT a UUID y agregar FK a video_capsules(id).
-- Solo ejecutar si la tabla está vacía o no hay datos que
-- no sean UUIDs válidos.
-- ============================================================
ALTER TABLE public.video_capsule_completions
  ALTER COLUMN capsule_id TYPE uuid USING capsule_id::uuid;

ALTER TABLE public.video_capsule_completions
  ADD CONSTRAINT vcc_capsule_fk
  FOREIGN KEY (capsule_id)
  REFERENCES public.video_capsules(id)
  ON DELETE CASCADE;

-- ============================================================
-- Fix 3 (BAJO / OPCIONAL): Restringir get_leaderboard() a
-- usuarios autenticados (en lugar de PUBLIC).
-- Descomentar si querés que el leaderboard requiera login.
-- ============================================================
-- REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM PUBLIC;
-- GRANT  EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
