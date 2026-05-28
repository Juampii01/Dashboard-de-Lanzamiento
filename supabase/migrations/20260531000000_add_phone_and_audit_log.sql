-- ============================================================================
-- Día 7: Phone column + admin user creation audit log
-- ============================================================================

BEGIN;

-- Phone column en users (metadata, no para login)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
COMMENT ON COLUMN public.users.phone IS
  'Phone number captured at user creation. Stored for future SMS auth; not used for login currently.';

CREATE INDEX IF NOT EXISTS idx_users_phone
  ON public.users(phone) WHERE phone IS NOT NULL;

-- Audit log de creación manual de usuarios
CREATE TABLE IF NOT EXISTS public.admin_user_creation_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_email text NOT NULL,
  source text NOT NULL CHECK (source IN ('single', 'bulk_csv')),
  status text NOT NULL CHECK (status IN ('ok', 'error')),
  error_message text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.admin_user_creation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_by
  ON public.admin_user_creation_log(created_by);

-- RLS
ALTER TABLE public.admin_user_creation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_user_creation_log: admin only"
  ON public.admin_user_creation_log FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON public.admin_user_creation_log FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.admin_user_creation_log TO authenticated;
GRANT ALL ON public.admin_user_creation_log TO service_role;

COMMIT;
