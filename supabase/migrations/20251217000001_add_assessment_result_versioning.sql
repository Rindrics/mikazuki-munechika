-- Add versioning support to assessment_results (ADR 0018)

-- Add fiscal_year and version columns
ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add stock_group_id if not exists (some records may have stock_name instead)
ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS stock_group_id UUID REFERENCES public.stock_groups(id) ON DELETE CASCADE;

-- Add parameters column for reproducibility (ADR 0018 Section 3)
ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS parameters JSONB;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_assessment_results_version
  ON public.assessment_results(stock_group_id, fiscal_year, version);

-- Helper function to create a stable hash for JSONB
-- PostgreSQL's JSONB internally stores keys in sorted order, so the same logical
-- JSONB value always produces the same binary representation.
-- This function uses digest() from pgcrypto for a stable hash of the binary JSONB.
-- Falls back to md5 of text if pgcrypto is not available.
CREATE OR REPLACE FUNCTION public.stable_jsonb_hash(p_jsonb JSONB)
RETURNS TEXT AS $$
BEGIN
  -- JSONB's binary representation is deterministic (keys are sorted internally)
  -- We hash the JSONB directly, not its text representation
  RETURN encode(digest(p_jsonb::TEXT::BYTEA, 'sha256'), 'hex');
EXCEPTION
  WHEN undefined_function THEN
    -- pgcrypto not available, fall back to md5
    -- JSONB::TEXT is still deterministic because JSONB stores keys in sorted order
    RETURN md5(p_jsonb::TEXT);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Unique constraint to prevent duplicate parameter sets per stock/fiscal_year
-- Uses stable JSONB hash for order-independent comparison
-- Note: PostgreSQL JSONB internally normalizes key order, so this is deterministic
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_results_unique_params
  ON public.assessment_results(stock_group_id, fiscal_year, public.stable_jsonb_hash(parameters))
  WHERE parameters IS NOT NULL;

-- Function to find existing version with same parameters
-- Uses direct JSONB equality which is order-independent
CREATE OR REPLACE FUNCTION public.find_existing_version_by_params(
  p_stock_group_id UUID,
  p_fiscal_year INTEGER,
  p_parameters JSONB
) RETURNS INTEGER AS $$
DECLARE
  existing_version INTEGER;
BEGIN
  SELECT version INTO existing_version
  FROM public.assessment_results
  WHERE stock_group_id = p_stock_group_id
    AND fiscal_year = p_fiscal_year
    AND parameters = p_parameters::JSONB;
  
  RETURN existing_version;  -- Returns NULL if not found
END;
$$ LANGUAGE plpgsql;

-- Add approved_version to stock_assessments
ALTER TABLE public.stock_assessments
  ADD COLUMN IF NOT EXISTS approved_version INTEGER;

-- Function to get next version number for a stock/fiscal_year combination
CREATE OR REPLACE FUNCTION public.get_next_assessment_version(
  p_stock_group_id UUID,
  p_fiscal_year INTEGER
) RETURNS INTEGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM public.assessment_results
  WHERE stock_group_id = p_stock_group_id
    AND fiscal_year = p_fiscal_year;
  
  RETURN max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Publication history for external versioning (ADR 0018)
CREATE TABLE IF NOT EXISTS public.assessment_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_group_id UUID NOT NULL REFERENCES public.stock_groups(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  internal_version INTEGER NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revision_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stock_group_id, fiscal_year, revision_number)
);

-- Create index for publication lookup
CREATE INDEX IF NOT EXISTS idx_assessment_publications_lookup
  ON public.assessment_publications(stock_group_id, fiscal_year, revision_number DESC);

-- Enable RLS
ALTER TABLE public.assessment_publications ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessment_publications
CREATE POLICY "Authenticated users can read publications"
  ON public.assessment_publications
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage publications"
  ON public.assessment_publications
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Users with role for the stock can insert publications
CREATE POLICY "Users with stock role can insert publications"
  ON public.assessment_publications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_stock_group_roles usr
      WHERE usr.user_id = auth.uid()
        AND usr.stock_group_id = assessment_publications.stock_group_id
    )
  );
