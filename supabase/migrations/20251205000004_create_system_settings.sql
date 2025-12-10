-- Create system_settings table for maintenance mode and other system-wide settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only 管理者 can read system settings
CREATE POLICY "Only 管理者 can read system settings"
  ON public.system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_stock_group_roles
      WHERE user_stock_group_roles.user_id = auth.uid()
      AND user_stock_group_roles.role = '管理者'
    )
  );

-- Only 管理者 can update system settings
CREATE POLICY "Only 管理者 can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_stock_group_roles
      WHERE user_stock_group_roles.user_id = auth.uid()
      AND user_stock_group_roles.role = '管理者'
    )
  );

-- Service role can manage all settings (needed for scripts)
CREATE POLICY "Service role can manage all settings"
  ON public.system_settings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Insert initial maintenance mode setting (disabled by default)
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'maintenance_mode',
  'false'::jsonb,
  'When enabled, the application is in maintenance mode and write operations are blocked'
)
ON CONFLICT (key) DO NOTHING;

