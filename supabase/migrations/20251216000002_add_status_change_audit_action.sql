-- Add STATUS_CHANGE action type to audit_logs
-- Drop and recreate the constraint to include new action type
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_type_check 
CHECK (action_type IN (
  'CREATE', 'UPDATE', 'DELETE',
  'APPROVE_FIRST', 'APPROVE_FINAL',
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'ROLE_ASSIGNED', 'ROLE_REMOVED',
  'STOCK_GROUP_ASSIGNED', 'STOCK_GROUP_REMOVED',
  'STATUS_CHANGE'
));

-- Allow authenticated users to insert audit logs for their own actions
CREATE POLICY "Authenticated users can insert their own audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
