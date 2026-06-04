-- Add logo_url to company_profiles so users can upload their company logo once
-- and have it appear in all PDF templates (Day 1, Day 2, Capability Statement).
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
