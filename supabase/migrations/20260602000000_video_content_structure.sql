\set ON_ERROR_STOP on
BEGIN;

-- ─── Part A.1: Video content system ─────────────────────────────────────────
-- 1. Extend video_capsules with type / orientation / podcast metadata
-- 2. Allow multiple quiz questions per capsule (drop UNIQUE on capsule_id)
-- 3. Expand correct_option_index to support 5 options (0-4)
-- 4. New table: podcast_xp_claims (idempotent +30 XP for listening full podcast)
-- 5. Rebuild video_quizzes_public view to expose question_order
--
-- Apply: STAGING first → verify → then PROD.

-- ─── 1. video_capsules — new columns ─────────────────────────────────────────

ALTER TABLE public.video_capsules
  ADD COLUMN IF NOT EXISTS video_type        text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS orientation       text NOT NULL DEFAULT 'horizontal',
  ADD COLUMN IF NOT EXISTS duration_seconds  int,
  ADD COLUMN IF NOT EXISTS podcast_url       text;

-- Constraints (IF NOT EXISTS guard via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'video_capsules_video_type_check'
  ) THEN
    ALTER TABLE public.video_capsules
      ADD CONSTRAINT video_capsules_video_type_check
      CHECK (video_type IN ('normal', 'podcast'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'video_capsules_orientation_check'
  ) THEN
    ALTER TABLE public.video_capsules
      ADD CONSTRAINT video_capsules_orientation_check
      CHECK (orientation IN ('horizontal', 'vertical'));
  END IF;
END $$;

-- Mark first capsule of each day as podcast (sort_order = 1),
-- second as normal video (sort_order = 2).
UPDATE public.video_capsules SET video_type = 'podcast' WHERE sort_order = 1;
UPDATE public.video_capsules SET video_type = 'normal'  WHERE sort_order = 2;

-- ─── 2. video_quizzes — drop UNIQUE constraint to allow N questions / capsule ─

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name        = 'video_quizzes'
      AND constraint_name   = 'video_quizzes_capsule_id_key'
      AND constraint_type   = 'UNIQUE'
  ) THEN
    ALTER TABLE public.video_quizzes
      DROP CONSTRAINT video_quizzes_capsule_id_key;
  END IF;
END $$;

-- Ordering column for multi-question sequences
ALTER TABLE public.video_quizzes
  ADD COLUMN IF NOT EXISTS question_order int NOT NULL DEFAULT 1;

-- Composite index for ordered fetching: all questions for a capsule, in order
CREATE INDEX IF NOT EXISTS idx_vq_capsule_order
  ON public.video_quizzes (capsule_id, question_order);

-- ─── 3. Expand correct_option_index check to 5 options (0-4) ─────────────────

DO $$
BEGIN
  -- Drop the old check that caps at 3
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'video_quizzes_correct_option_index_check'
  ) THEN
    ALTER TABLE public.video_quizzes
      DROP CONSTRAINT video_quizzes_correct_option_index_check;
  END IF;

  -- Add the new check allowing 0-4
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'video_quizzes_correct_option_index_check'
  ) THEN
    ALTER TABLE public.video_quizzes
      ADD CONSTRAINT video_quizzes_correct_option_index_check
      CHECK (correct_option_index >= 0 AND correct_option_index <= 4);
  END IF;
END $$;

-- ─── 4. Rebuild video_quizzes_public view (add question_order, ordered) ────────

DROP VIEW IF EXISTS public.video_quizzes_public;

CREATE VIEW public.video_quizzes_public AS
  SELECT id, capsule_id, question, options, xp_reward, question_order
  FROM public.video_quizzes
  ORDER BY capsule_id, question_order;

-- Re-grant since DROP VIEW removes grants
GRANT SELECT ON public.video_quizzes_public TO authenticated;

-- ─── 5. podcast_xp_claims — idempotent claim for listening a full podcast ────

CREATE TABLE IF NOT EXISTS public.podcast_xp_claims (
  id          uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES public.users(id)         ON DELETE CASCADE,
  capsule_id  text        NOT NULL REFERENCES public.video_capsules(id) ON DELETE CASCADE,
  xp_awarded  int         NOT NULL DEFAULT 30,
  claimed_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT podcast_xp_claims_user_capsule_key UNIQUE (user_id, capsule_id)
);

COMMENT ON TABLE public.podcast_xp_claims IS
  'Tracks one-time +30 XP claim per user per podcast capsule. UNIQUE prevents double-dip.';

ALTER TABLE public.podcast_xp_claims ENABLE ROW LEVEL SECURITY;

-- Users can see and insert their own claims
CREATE POLICY "podcast_xp_claims: own rows"
  ON public.podcast_xp_claims FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can SELECT all (analytics)
CREATE POLICY "podcast_xp_claims: admin select"
  ON public.podcast_xp_claims FOR SELECT
  USING (public.is_admin());

-- Grants
REVOKE ALL ON public.podcast_xp_claims FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.podcast_xp_claims TO authenticated;
GRANT ALL ON public.podcast_xp_claims TO service_role;

-- ─── Verify ───────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_type_ok    boolean;
  v_orient_ok  boolean;
  v_unique_gone boolean;
  v_order_col  boolean;
  v_claim_tbl  boolean;
BEGIN
  -- video_capsules has new columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'video_capsules'
      AND column_name = 'video_type'
  ) INTO v_type_ok;
  IF NOT v_type_ok THEN
    RAISE EXCEPTION 'video_capsules.video_type column missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'video_capsules'
      AND column_name = 'orientation'
  ) INTO v_orient_ok;
  IF NOT v_orient_ok THEN
    RAISE EXCEPTION 'video_capsules.orientation column missing';
  END IF;

  -- UNIQUE constraint on capsule_id is gone
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name        = 'video_quizzes'
      AND constraint_name   = 'video_quizzes_capsule_id_key'
      AND constraint_type   = 'UNIQUE'
  ) INTO v_unique_gone;
  IF NOT v_unique_gone THEN
    RAISE EXCEPTION 'video_quizzes.capsule_id UNIQUE constraint still exists — expected it dropped';
  END IF;

  -- question_order column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'video_quizzes'
      AND column_name = 'question_order'
  ) INTO v_order_col;
  IF NOT v_order_col THEN
    RAISE EXCEPTION 'video_quizzes.question_order column missing';
  END IF;

  -- podcast_xp_claims table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'podcast_xp_claims'
  ) INTO v_claim_tbl;
  IF NOT v_claim_tbl THEN
    RAISE EXCEPTION 'podcast_xp_claims table missing';
  END IF;

  RAISE NOTICE 'Migration 20260602000000 verified OK.';
END $$;

COMMIT;
