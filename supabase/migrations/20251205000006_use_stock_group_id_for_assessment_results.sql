-- Migrate assessment_results to use stock_group_id instead of stock_name
-- This ensures referential integrity and allows stock group name changes without breaking relations

-- Step 1: Drop old RLS policy that depends on stock_name (must be done before dropping column)
DROP POLICY IF EXISTS "主担当 or 副担当 users can insert assessment results" ON public.assessment_results;

-- Step 2: Add stock_group_id column
ALTER TABLE public.assessment_results
  ADD COLUMN stock_group_id UUID REFERENCES public.stock_groups(id) ON DELETE CASCADE;

-- Step 3: Migrate existing data (if any) by looking up stock_group_id from name
UPDATE public.assessment_results ar
SET stock_group_id = sg.id
FROM public.stock_groups sg
WHERE ar.stock_name = sg.name;

-- Step 4: Make stock_group_id NOT NULL after migration
ALTER TABLE public.assessment_results
  ALTER COLUMN stock_group_id SET NOT NULL;

-- Step 5: Drop the old stock_name column and index
DROP INDEX IF EXISTS idx_assessment_results_stock_name;
ALTER TABLE public.assessment_results
  DROP COLUMN stock_name;

-- Step 6: Create new index for stock_group_id
CREATE INDEX IF NOT EXISTS idx_assessment_results_stock_group_id ON public.assessment_results(stock_group_id);

-- Step 7: Create new RLS policy using stock_group_id (simpler and more robust)
CREATE POLICY "主担当 or 副担当 users can insert assessment results"
  ON public.assessment_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_stock_group_roles usr
      WHERE usr.user_id = auth.uid()
        AND usr.stock_group_id = assessment_results.stock_group_id
        AND usr.role IN ('主担当', '副担当')
    )
  );

