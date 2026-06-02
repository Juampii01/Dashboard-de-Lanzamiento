-- Registration/contact fields for a complete, professional Capability Statement.
-- These are real data a Contracting Officer uses to verify the vendor:
--   uei        — Unique Entity ID (replaced DUNS in SAM.gov, 12 chars)
--   cage_code  — Commercial and Government Entity code (5 chars)
--   phone      — business phone
--   website    — company website
-- Set-asides come from existing_certifications; location from us_state;
-- legal name from company_name; email from auth — all already captured.

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS uei       TEXT,
  ADD COLUMN IF NOT EXISTS cage_code TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT,
  ADD COLUMN IF NOT EXISTS website   TEXT;
