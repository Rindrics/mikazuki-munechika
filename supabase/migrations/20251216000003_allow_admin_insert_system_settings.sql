-- Allow administrators to insert into system_settings (for upsert operations)
CREATE POLICY "Only 管理者 can insert system settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_stock_group_roles
      WHERE user_stock_group_roles.user_id = auth.uid()
      AND user_stock_group_roles.role = '管理者'
    )
  );

-- Allow all authenticated users to read current_fiscal_year setting
-- (needed for navbar display)
CREATE POLICY "Authenticated users can read fiscal year"
  ON public.system_settings
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND key = 'current_fiscal_year'
  );
