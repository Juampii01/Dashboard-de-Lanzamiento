-- Add state, legal structure, and existing certifications to company_profiles
-- These are the 3 highest-impact fields missing from the Level 1 profile:
-- 1. us_state → makes all market analysis regional instead of national
-- 2. legal_structure → Sole Proprietors can't receive most federal contracts
-- 3. existing_certifications → avoid recommending certifications they already have

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS us_state             TEXT,
  ADD COLUMN IF NOT EXISTS legal_structure      TEXT,
  ADD COLUMN IF NOT EXISTS existing_certifications TEXT[] DEFAULT '{}';
