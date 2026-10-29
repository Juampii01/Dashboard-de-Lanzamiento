-- ════════════════════════════════════════════════════════════════════════════
-- Reset para el lanzamiento de noviembre 2026
-- ════════════════════════════════════════════════════════════════════════════
--
-- NO es una migración: se corre UNA vez, a mano, en el SQL Editor de Supabase
-- (proyecto "Govbidder Lanzamiento Dashboard"), cuando el equipo lo decida.
--
-- Qué hace:
--   1. Copia TODO lo que se va a tocar al esquema archive_2026_10 (backup).
--   2. Deja en cero el progreso, puntos y entregables de los participantes
--      (no admins), para que el ranking y los días arranquen limpios.
--   3. NO borra cuentas: los participantes anteriores pueden volver a comprar
--      y entrar con su misma cuenta (el acceso se vincula solo al iniciar
--      sesión; ver app/dashboard/layout.tsx y CURRENT_PRODUCT).
--   4. NO toca comentarios: se archivan desde /admin/comentarios después de
--      que el equipo marque los destacados.
--
-- Requisitos: haber aplicado las migraciones 20261029000001 y 20261029000002.
-- Todo corre en una transacción: si algo falla, no se aplica nada.
--
-- Para revertir: los datos originales quedan en archive_2026_10.<tabla>.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE SCHEMA IF NOT EXISTS archive_2026_10;

-- 1) Backup completo de cada tabla afectada --------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 'day_progress', 'video_capsule_completions', 'user_events',
    'naics_expansions', 'web_previews', 'capability_statements',
    'sorteo_submissions', 'video_quiz_attempts', 'podcast_xp_claims',
    'company_profiles', 'point_events', 'referral_leads',
    'mission_submissions', 'keyword_submissions', 'rafaga_submissions',
    'story_submissions', 'web_issue_reports', 'proximo_paso_clicks',
    'sorteo_winners', 'sorteo_confirmed_payers', 'sorteo_mentorship_buyers'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TABLE IF EXISTS archive_2026_10.%I', t);
      EXECUTE format('CREATE TABLE archive_2026_10.%I AS TABLE public.%I', t, t);
    END IF;
  END LOOP;
END $$;

-- 2) Limpiar datos del lanzamiento anterior (solo participantes, no admins) --
CREATE TEMP TABLE _participants ON COMMIT DROP AS
  SELECT id FROM public.users WHERE NOT COALESCE(is_admin, false);

DO $$
DECLARE
  t text;
  per_user text[] := ARRAY[
    'day_progress', 'video_capsule_completions', 'user_events',
    'naics_expansions', 'web_previews', 'capability_statements',
    'sorteo_submissions', 'video_quiz_attempts', 'podcast_xp_claims',
    'company_profiles', 'point_events', 'mission_submissions',
    'keyword_submissions', 'rafaga_submissions', 'story_submissions',
    'web_issue_reports', 'proximo_paso_clicks'
  ];
BEGIN
  FOREACH t IN ARRAY per_user LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE user_id IN (SELECT id FROM _participants)', t);
    END IF;
  END LOOP;
END $$;

-- Referidos y sorteos del lanzamiento anterior (tablas globales).
DELETE FROM public.referral_leads;
DO $$
BEGIN
  IF to_regclass('public.sorteo_winners') IS NOT NULL THEN DELETE FROM public.sorteo_winners; END IF;
  IF to_regclass('public.sorteo_confirmed_payers') IS NOT NULL THEN DELETE FROM public.sorteo_confirmed_payers; END IF;
  IF to_regclass('public.sorteo_mentorship_buyers') IS NOT NULL THEN DELETE FROM public.sorteo_mentorship_buyers; END IF;
END $$;

-- Puntos, racha, tutorial y contadores en cero. El acceso NO se toca: ya está
-- vencido para los participantes anteriores y se reactiva al vincular una
-- compra nueva.
UPDATE public.users
   SET total_points          = 0,
       last_time_xp_at       = NULL,
       last_avatar_xp_at     = NULL,
       has_seen_onboarding   = false,
       heartbeat_count_today = 0,
       heartbeat_count_day   = NULL,
       streak_count          = 0,
       streak_day            = NULL
 WHERE id IN (SELECT id FROM _participants);

-- Revisión antes de confirmar: debería dar 0 en todo.
SELECT
  (SELECT count(*) FROM public.users WHERE id IN (SELECT id FROM _participants) AND total_points > 0) AS con_puntos,
  (SELECT count(*) FROM public.day_progress WHERE user_id IN (SELECT id FROM _participants))         AS progreso,
  (SELECT count(*) FROM public.referral_leads)                                                     AS referidos;

-- Si los números de arriba están bien:
COMMIT;
-- Si algo no cierra, en lugar de COMMIT ejecuta: ROLLBACK;
