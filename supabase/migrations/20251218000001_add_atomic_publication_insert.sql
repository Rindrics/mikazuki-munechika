-- Create a function to atomically insert a publication record with the next revision number
-- This prevents race conditions when multiple requests try to publish simultaneously

CREATE OR REPLACE FUNCTION insert_publication_atomic(
  p_stock_group_id UUID,
  p_fiscal_year INTEGER,
  p_internal_version INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_revision_number INTEGER;
BEGIN
  -- Lock the table for this stock_group_id and fiscal_year to prevent concurrent inserts
  -- Get the next revision number atomically
  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_revision_number
  FROM assessment_publications
  WHERE stock_group_id = p_stock_group_id
    AND fiscal_year = p_fiscal_year
  FOR UPDATE;

  -- Insert the new publication record
  INSERT INTO assessment_publications (
    stock_group_id,
    fiscal_year,
    internal_version,
    revision_number,
    published_at
  ) VALUES (
    p_stock_group_id,
    p_fiscal_year,
    p_internal_version,
    v_revision_number,
    NOW()
  );

  RETURN v_revision_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_publication_atomic(UUID, INTEGER, INTEGER) TO authenticated;
