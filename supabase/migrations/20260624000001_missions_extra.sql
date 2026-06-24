-- Palabras clave de llamadas: admin configura una keyword secreta por día (1-4)
CREATE TABLE IF NOT EXISTS call_keywords (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number   integer     NOT NULL CHECK (day_number BETWEEN 1 AND 4),
  keyword      text        NOT NULL,
  points_reward integer    NOT NULL DEFAULT 1000,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(day_number)
);

-- Usuario reclamó la keyword de un día (una vez por usuario por día)
CREATE TABLE IF NOT EXISTS keyword_submissions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number   integer     NOT NULL CHECK (day_number BETWEEN 1 AND 4),
  points_earned integer    NOT NULL DEFAULT 1000,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_number)
);

-- Historia diaria: una por usuario por día Miami (reset 8AM America/New_York)
CREATE TABLE IF NOT EXISTS story_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url       text,
  storage_path    text,
  points_earned   integer     NOT NULL DEFAULT 500,
  submission_date date        NOT NULL,
  submitted_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, submission_date)
);

-- Misiones ráfaga: admin programa fecha+hora y duración (defecto 120 min)
CREATE TABLE IF NOT EXISTS rafaga_missions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  description      text,
  starts_at        timestamptz NOT NULL,
  duration_minutes integer     NOT NULL DEFAULT 120,
  points_reward    integer     NOT NULL DEFAULT 1000,
  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        REFERENCES users(id),
  created_at       timestamptz DEFAULT now()
);

-- Usuario completó una ráfaga (una vez por misión)
CREATE TABLE IF NOT EXISTS rafaga_submissions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rafaga_id    uuid        NOT NULL REFERENCES rafaga_missions(id) ON DELETE CASCADE,
  points_earned integer    NOT NULL DEFAULT 1000,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rafaga_id)
);

-- RLS: la API usa service_role, que bypasea RLS por defecto.
-- Las políticas permiten acceso al service role (anon key bloqueada).
ALTER TABLE call_keywords     ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rafaga_missions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rafaga_submissions ENABLE ROW LEVEL SECURITY;

-- Policy para que el service role (usado por la API) pueda leer/escribir todo.
CREATE POLICY "api_full_access" ON call_keywords      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "api_full_access" ON keyword_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "api_full_access" ON story_submissions   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "api_full_access" ON rafaga_missions     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "api_full_access" ON rafaga_submissions  FOR ALL TO service_role USING (true) WITH CHECK (true);
