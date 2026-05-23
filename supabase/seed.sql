-- ============================================================
-- seed.sql — datos iniciales para desarrollo / staging
-- ============================================================

-- INSTRUCCIONES:
-- 1. Crear el usuario admin desde Supabase Auth (o magic link).
-- 2. Copiar el UUID generado y reemplazar 'ADMIN_USER_UUID_HERE'.
-- 3. Ejecutar este script en el SQL Editor de Supabase.

-- Insertar admin (reemplazar UUID y email según corresponda)
insert into public.users (id, email, full_name, is_admin, access_starts_at, access_expires_at)
values (
  'ADMIN_USER_UUID_HERE',
  'juampiacosta158@gmail.com',
  'Juan Pablo Acosta',
  true,
  now(),
  now() + interval '365 days'
)
on conflict (id) do update
  set is_admin = true,
      updated_at = now();

-- Crear filas de day_progress para el admin (días 1-4 desbloqueados)
insert into public.day_progress (user_id, day_number, is_unlocked, is_completed)
values
  ('ADMIN_USER_UUID_HERE', 1, true, false),
  ('ADMIN_USER_UUID_HERE', 2, true, false),
  ('ADMIN_USER_UUID_HERE', 3, true, false),
  ('ADMIN_USER_UUID_HERE', 4, true, false)
on conflict (user_id, day_number) do nothing;

-- admin_toggles ya se inicializan en la migración 001
-- (Día 1 desbloqueado, 2-4 bloqueados)
