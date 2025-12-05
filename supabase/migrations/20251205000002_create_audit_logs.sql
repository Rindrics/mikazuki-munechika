-- Create audit_logs table (ADR 0004)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATE', 'UPDATE', 'DELETE',
    'APPROVE_FIRST', 'APPROVE_FINAL',
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'ROLE_ASSIGNED', 'ROLE_REMOVED',
    'STOCK_GROUP_ASSIGNED', 'STOCK_GROUP_REMOVED'
  )),
  resource_type TEXT NOT NULL,
  resource_id UUID,
  stock_group_id UUID REFERENCES public.stock_groups(id) ON DELETE SET NULL,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_stock_group_id ON public.audit_logs(stock_group_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only administrators can read audit logs
CREATE POLICY "Only administrators can read audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_stock_group_roles
      WHERE user_stock_group_roles.user_id = auth.uid()
      AND user_stock_group_roles.role = '管理者'
    )
  );

-- Service role can insert audit logs (for application-level logging)
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Function to log user role changes (ADR 0004)
CREATE OR REPLACE FUNCTION log_user_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      resource_type,
      resource_id,
      stock_group_id,
      after_data
    ) VALUES (
      NEW.user_id,
      'ROLE_ASSIGNED',
      'user_stock_group_role',
      NEW.id,
      NEW.stock_group_id,
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      resource_type,
      resource_id,
      stock_group_id,
      before_data
    ) VALUES (
      OLD.user_id,
      'ROLE_REMOVED',
      'user_stock_group_role',
      OLD.id,
      OLD.stock_group_id,
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic logging of user role changes
CREATE TRIGGER user_role_changes_audit
  AFTER INSERT OR DELETE ON public.user_stock_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_role_changes();

