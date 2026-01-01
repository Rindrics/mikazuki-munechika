-- Create review_assessments table (ADR 0030)
-- 査読用資源評価: Isolated assessment environment for reviewers
CREATE TABLE IF NOT EXISTS public.review_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  calculation_result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique constraint to support upsert operations
  UNIQUE(reviewer_id, stock_name, fiscal_year)
);

-- Create index for efficient per-reviewer queries
CREATE INDEX IF NOT EXISTS idx_review_assessments_reviewer
  ON public.review_assessments(reviewer_id);

-- Create index for stock_name lookups
CREATE INDEX IF NOT EXISTS idx_review_assessments_stock_name
  ON public.review_assessments(stock_name);

-- Create composite index for reviewer + stock queries
CREATE INDEX IF NOT EXISTS idx_review_assessments_reviewer_stock
  ON public.review_assessments(reviewer_id, stock_name);

-- Create trigger for updated_at
CREATE TRIGGER update_review_assessments_updated_at
  BEFORE UPDATE ON public.review_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.review_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own review assessments
CREATE POLICY "Users can manage their own review assessments"
  ON public.review_assessments
  FOR ALL
  USING (auth.uid() = reviewer_id);

-- RLS policy: Service role can access all review assessments (for admin/support)
CREATE POLICY "Service role can manage all review assessments"
  ON public.review_assessments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
