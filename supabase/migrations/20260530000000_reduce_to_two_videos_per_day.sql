\set ON_ERROR_STOP on
BEGIN;

-- Tarea 2 (Día 6): Reduce video_capsules from 4 per day to 2 per day.
-- Decision: keep the 2 videos with the lowest sort_order per day (sort_order 1 & 2).
-- Uses sort_order rather than id pattern to be robust against non-canonical ids.
--
-- Apply: STAGING first → verify → then PROD.

-- 1. Remove completions that reference capsules we're about to delete
--    (FK: video_capsule_completions.capsule_id → video_capsules.id ON DELETE CASCADE
--     handles this automatically, but being explicit is safer in a migration)
DELETE FROM public.video_capsule_completions
WHERE capsule_id IN (
  SELECT id FROM public.video_capsules
  WHERE sort_order > 2
);

-- 2. Remove the extra video capsules (sort_order 3 and 4)
DELETE FROM public.video_capsules WHERE sort_order > 2;

-- 3. Verify: exactly 2 per day, 8 total
DO $$
DECLARE
  v_total   int;
  v_per_day int;
BEGIN
  SELECT count(*) INTO v_total FROM public.video_capsules;
  IF v_total != 8 THEN
    RAISE EXCEPTION
      'Expected 8 video_capsules (2 per day × 4 days), got %. Rolling back.',
      v_total;
  END IF;

  -- Each day must have exactly 2
  SELECT max(cnt) INTO v_per_day FROM (
    SELECT count(*) AS cnt FROM public.video_capsules GROUP BY day_number
  ) sub;
  IF v_per_day != 2 THEN
    RAISE EXCEPTION
      'At least one day has != 2 capsules. Check sort_order data. Rolling back.';
  END IF;
END $$;

COMMIT;
