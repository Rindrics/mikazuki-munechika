-- Create stock_assessments table for tracking assessment status
CREATE TABLE IF NOT EXISTS public.stock_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_group_id UUID NOT NULL REFERENCES public.stock_groups(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT '未着手' CHECK (status IN ('未着手', '作業中', '内部査読中', '外部公開可能', '外部査読中', '再検討中', '外部査読受理済み')),
  -- For reconsideration, track the origin status
  origin_status TEXT CHECK (origin_status IS NULL OR origin_status IN ('内部査読中', '外部査読中')),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each stock group can only have one assessment per fiscal year
  UNIQUE(stock_group_id, fiscal_year)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_assessments_stock_group_id ON public.stock_assessments(stock_group_id);
CREATE INDEX IF NOT EXISTS idx_stock_assessments_fiscal_year ON public.stock_assessments(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_stock_assessments_status ON public.stock_assessments(status);

-- Create trigger for updated_at
CREATE TRIGGER update_stock_assessments_updated_at
  BEFORE UPDATE ON public.stock_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.stock_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_assessments
-- All authenticated users can read assessment status
CREATE POLICY "Authenticated users can read stock assessments"
  ON public.stock_assessments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users with role for the stock can insert/update
CREATE POLICY "Users with stock role can manage assessments"
  ON public.stock_assessments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stock_group_roles usr
      WHERE usr.user_id = auth.uid()
        AND usr.stock_group_id = stock_assessments.stock_group_id
    )
  );

-- Service role can manage all (for admin/testing)
CREATE POLICY "Service role can manage all stock assessments"
  ON public.stock_assessments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
