\set ON_ERROR_STOP on
BEGIN;

-- M7: Remove the duplicate UNIQUE constraint on day_progress(user_id, day_number).
-- The baseline schema added two identical constraints:
--   • day_progress_user_day_unique  (added by an older migration)
--   • day_progress_user_id_day_number_key  (added by the table DDL)
-- Both cover the same columns. PostgreSQL enforces both, but only one is needed.
-- We keep day_progress_user_id_day_number_key (the canonical auto-named constraint)
-- and drop the manually-named duplicate to avoid confusion and index bloat.

ALTER TABLE public.day_progress
  DROP CONSTRAINT IF EXISTS day_progress_user_day_unique;

COMMIT;
