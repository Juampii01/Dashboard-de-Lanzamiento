-- ============================================================================
-- app_settings: tabla genérica clave/valor para configs editables desde el admin
-- (ej. tutorial_youtube). Reutilizable para futuros settings de un solo valor.
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- La app accede siempre con service role (igual que el resto).
CREATE POLICY "api_full_access" ON app_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Semilla: el video de tutorial actual (YouTube ID). No pisa si ya existe.
INSERT INTO app_settings (key, value) VALUES ('tutorial_youtube', '2A6EB_cDk-A')
  ON CONFLICT (key) DO NOTHING;
