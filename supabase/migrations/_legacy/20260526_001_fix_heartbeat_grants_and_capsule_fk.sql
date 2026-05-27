-- ============================================================
-- Fix 1 (CRÍTICO): GRANT columnas heartbeat al rol authenticated
-- Sin esto, el heartbeat XP falla silenciosamente para usuarios
-- no-admin porque el UPDATE incluye columnas sin permiso.
-- ============================================================
GRANT UPDATE (heartbeat_count_today, heartbeat_count_day)
  ON public.users
  TO authenticated;

-- ============================================================
-- Fix 2 (MEDIO): Agregar FK entre video_capsule_completions.capsule_id
-- y video_capsules.id. Ambas columnas son TEXT (los IDs son strings
-- como "day1-cap1"), así que la FK es text → text.
-- ============================================================
-- Si capsule_id fue alterado a uuid previamente, revertir a text:
ALTER TABLE public.video_capsule_completions
  ALTER COLUMN capsule_id TYPE text USING capsule_id::text;

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
