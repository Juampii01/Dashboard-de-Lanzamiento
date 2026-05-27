\set ON_ERROR_STOP on
BEGIN;

-- Tarea 3 (Día 6): Quiz multiple-choice gating XP per video.
-- Two tables:
--   video_quizzes        — one quiz per video capsule (admin-managed)
--   video_quiz_attempts  — user answers; XP awarded once per correct answer
-- A public VIEW hides correct_option_index from non-admin callers.

-- ─── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE public.video_quizzes (
  id                    uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  capsule_id            text        NOT NULL UNIQUE REFERENCES public.video_capsules(id) ON DELETE CASCADE,
  question              text        NOT NULL,
  options               jsonb       NOT NULL,  -- ["Option A","Option B","Option C","Option D"]
  correct_option_index  int         NOT NULL CHECK (correct_option_index >= 0 AND correct_option_index <= 3),
  xp_reward             int         NOT NULL DEFAULT 10,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.video_quizzes IS
  'One quiz per video capsule. correct_option_index is never exposed to non-admin callers.';

CREATE TABLE public.video_quiz_attempts (
  id                    uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id               uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id               uuid        NOT NULL REFERENCES public.video_quizzes(id) ON DELETE CASCADE,
  selected_option_index int         NOT NULL,
  is_correct            boolean     NOT NULL,
  xp_awarded            int         NOT NULL DEFAULT 0,
  attempted_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.video_quiz_attempts IS
  'User answers; xp_awarded = xp_reward only on first correct attempt per quiz.';

CREATE INDEX idx_vqa_user_quiz ON public.video_quiz_attempts (user_id, quiz_id);
CREATE INDEX idx_vqa_quiz      ON public.video_quiz_attempts (quiz_id);

-- ─── Trigger: updated_at on video_quizzes ───────────────────────────────────

CREATE TRIGGER set_updated_at_video_quizzes
  BEFORE UPDATE ON public.video_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.video_quizzes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Admins have full access to both tables
CREATE POLICY "video_quizzes: admin full access"
  ON public.video_quizzes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Users can manage their own attempts
CREATE POLICY "video_quiz_attempts: own rows"
  ON public.video_quiz_attempts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins can SELECT all attempts (for analytics)
CREATE POLICY "video_quiz_attempts: admin select"
  ON public.video_quiz_attempts FOR SELECT
  USING (public.is_admin());

-- ─── Public view (hides answer) ──────────────────────────────────────────────

CREATE OR REPLACE VIEW public.video_quizzes_public AS
  SELECT id, capsule_id, question, options, xp_reward
  FROM public.video_quizzes;

-- ─── Grants ──────────────────────────────────────────────────────────────────

-- Revoke PUBLIC and anon (consistent with Día 2 security posture)
REVOKE ALL ON public.video_quizzes       FROM PUBLIC, anon;
REVOKE ALL ON public.video_quiz_attempts FROM PUBLIC, anon;

-- authenticated users read the safe view; insert their own attempts
GRANT SELECT ON public.video_quizzes_public     TO authenticated;
GRANT SELECT, INSERT ON public.video_quiz_attempts TO authenticated;

-- service_role needs full access (used by /api/quiz/submit)
GRANT ALL ON public.video_quizzes       TO service_role;
GRANT ALL ON public.video_quiz_attempts TO service_role;

-- ─── Seed: 1 dummy quiz per video (8 total) ──────────────────────────────────
-- Questions are PLACEHOLDERS. Replace before go-live using the admin panel
-- or: UPDATE video_quizzes SET question=..., options=..., correct_option_index=...
-- WHERE capsule_id = '...';

INSERT INTO public.video_quizzes
  (capsule_id, question, options, correct_option_index, xp_reward)
VALUES
  ('day1-cap1',
   '¿Cuál es el primer paso para identificar un nicho federal? [DUMMY — REEMPLAZAR]',
   '["Investigar agencias compradoras","Contratar un consultor","Esperar oportunidades","Solicitar un préstamo"]',
   0, 10),

  ('day1-cap2',
   '¿Qué código identifica tu industria en el sistema federal? [DUMMY — REEMPLAZAR]',
   '["EIN","NAICS","DUNS","CAGE"]',
   1, 10),

  ('day2-cap1',
   '¿Cuántos NAICS secundarios se recomiendan registrar? [DUMMY — REEMPLAZAR]',
   '["1-2","3-5","6-10","Todos los relevantes"]',
   1, 10),

  ('day2-cap2',
   '¿Dónde se buscan keywords del gobierno federal? [DUMMY — REEMPLAZAR]',
   '["Google","SAM.gov","LinkedIn","Reddit"]',
   1, 10),

  ('day3-cap1',
   '¿Qué portal es el principal del gobierno federal para licitaciones? [DUMMY — REEMPLAZAR]',
   '["FedBizOpps","SAM.gov","USA.gov","Federal.gov"]',
   1, 10),

  ('day3-cap2',
   '¿Qué demuestra mayor credibilidad ante una agencia compradora? [DUMMY — REEMPLAZAR]',
   '["Un logo profesional","El Capability Statement","Un sitio web","Tarjetas de presentación"]',
   1, 10),

  ('day4-cap1',
   '¿Qué documento es esencial para licitar contratos federales? [DUMMY — REEMPLAZAR]',
   '["Un résumé","El Capability Statement","Un contrato firmado","Un acta notarial"]',
   1, 10),

  ('day4-cap2',
   '¿Cuál es el próximo paso inmediato después de tener el Capability Statement? [DUMMY — REEMPLAZAR]',
   '["Esperar que lleguen contratos","Buscar oportunidades activas en SAM.gov","Lanzar publicidad paga","Hacer networking sin propósito"]',
   1, 10)

ON CONFLICT (capsule_id) DO NOTHING;  -- idempotent if migration runs twice

COMMIT;
