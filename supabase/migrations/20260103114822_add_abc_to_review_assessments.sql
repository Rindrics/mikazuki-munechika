-- Add ABC result and parameters to review_assessments
-- Allows reviewers to calculate and save ABC results alongside uploaded data

ALTER TABLE public.review_assessments
  ADD COLUMN abc_result JSONB,
  ADD COLUMN abc_parameters JSONB;

COMMENT ON COLUMN public.review_assessments.abc_result IS
  'ABC calculation result (ABC算定結果)';
COMMENT ON COLUMN public.review_assessments.abc_parameters IS
  'Input parameters for ABC calculation (for reproducibility)';
