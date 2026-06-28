-- Grabaciones de las clases: el admin configura hasta 4 links de YouTube (1-4).
-- Aparecen como 4 botones (2x2) al lado de los puntos en el dashboard; cada uno
-- abre su grabación en YouTube en una pestaña nueva.
CREATE TABLE IF NOT EXISTS class_recordings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_number integer     NOT NULL CHECK (recording_number BETWEEN 1 AND 4),
  youtube_url      text,
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(recording_number)
);

ALTER TABLE class_recordings ENABLE ROW LEVEL SECURITY;

-- La app accede siempre con service role (igual que call_keywords, etc.).
CREATE POLICY "api_full_access" ON class_recordings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
