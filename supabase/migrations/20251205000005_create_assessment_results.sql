-- Create assessment_results table
CREATE TABLE IF NOT EXISTS public.assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_name TEXT NOT NULL,
  value TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_results_stock_name ON public.assessment_results(stock_name);
CREATE INDEX IF NOT EXISTS idx_assessment_results_created_at ON public.assessment_results(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_assessment_results_updated_at
  BEFORE UPDATE ON public.assessment_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessment_results
-- All authenticated users can read assessment results
CREATE POLICY "Authenticated users can read assessment results"
  ON public.assessment_results
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users with PRIMARY or 副担当 role for the stock can insert
CREATE POLICY "主担当 or 副担当 users can insert assessment results"
  ON public.assessment_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_stock_group_roles usr
      JOIN public.stock_groups sg ON usr.stock_group_id = sg.id
      WHERE usr.user_id = auth.uid()
        AND sg.name = stock_name
        AND usr.role IN ('主担当', '副担当')
    )
  );

-- Service role can manage all results (for admin/testing)
CREATE POLICY "Service role can manage all assessment results"
  ON public.assessment_results
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

