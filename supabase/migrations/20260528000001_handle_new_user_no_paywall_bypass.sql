-- =============================================================================
-- Día 2 — Fix C2 (part 1 of 2): close the trigger paywall bypass.
--
-- BEFORE: handle_new_user creates day_progress with day 1 is_unlocked = true.
--         Any email that authenticates (even without a Hotmart purchase) gets
--         full access to Día 1.
--
-- AFTER:  trigger creates all 4 day_progress rows with is_unlocked = false.
--         Day 1 is only unlocked by the Hotmart webhook after purchase
--         verification (see /api/webhooks/hotmart/route.ts).
--
-- Part 2 of 2 is the layout-level server-side paywall gate in
-- app/dashboard/layout.tsx (code change, not a migration).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Create the public profile row.  email may be null for OAuth sign-ups
  -- where the provider does not surface it at trigger time.
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- Create day_progress placeholders — ALL days locked.
  -- Day 1 will be explicitly unlocked by the Hotmart webhook after the
  -- purchase is verified.  This prevents the paywall bypass where any
  -- authenticated email could reach Día 1 content.
  INSERT INTO public.day_progress (user_id, day_number, is_unlocked, is_completed)
  VALUES
    (NEW.id, 1, false, false),
    (NEW.id, 2, false, false),
    (NEW.id, 3, false, false),
    (NEW.id, 4, false, false)
  ON CONFLICT (user_id, day_number) DO NOTHING;

  RETURN NEW;
END;
$$;
