-- 006_fix_users_grants.sql
-- CRITICAL FIX: migration 002 did REVOKE ALL on users but never re-granted
-- privileges to authenticated. This silently broke all XP updates from API routes
-- (heartbeat, avatar, watch-capsule) which use createClient() with user sessions.
--
-- The RLS policies in 002 are correct — they restrict rows to auth.uid() = id.
-- But RLS policies have no effect without the underlying table-level GRANT.
-- service_role bypasses both grants and RLS (works fine in Server Components),
-- but authenticated client calls need explicit grants.

-- Allow authenticated users to SELECT their own row (RLS enforces row-level restriction)
grant select on public.users to authenticated;

-- Allow updating only the specific columns that XP/onboarding API routes need.
-- Column-level grant + RLS (auth.uid() = id) means users can only update their own
-- row and only these specific fields — is_admin, email, etc. stay protected.
grant update (
  total_points,
  last_time_xp_at,
  last_avatar_xp_at,
  has_seen_onboarding
) on public.users to authenticated;

-- Defensive: also grant select on video_capsules so the capsules API route
-- (which uses createClient) can read it under authenticated RLS policy
grant select on public.video_capsules to authenticated;

-- ─── Repair existing user points ────────────────────────────────────────────
-- Recalculate total_points from actual video_capsule_completions rows.
-- This corrects any user whose points were lost due to the missing grant.
UPDATE public.users u
SET total_points = (
  SELECT COALESCE(SUM(vc.points_earned), 0)
  FROM public.video_capsule_completions vc
  WHERE vc.user_id = u.id
)
WHERE EXISTS (
  SELECT 1 FROM public.video_capsule_completions vc WHERE vc.user_id = u.id
);
