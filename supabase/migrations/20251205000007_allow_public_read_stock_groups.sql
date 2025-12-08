-- Allow anyone to read stock_groups (public information)
-- This is needed because Server Actions may not always have authenticated session cookies

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can read stock groups" ON public.stock_groups;

-- Create new policy that allows anyone to read (including anon users)
CREATE POLICY "Anyone can read stock groups"
  ON public.stock_groups
  FOR SELECT
  USING (true);
