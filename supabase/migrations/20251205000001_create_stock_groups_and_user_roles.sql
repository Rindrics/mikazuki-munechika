-- Create stock_groups table (ADR 0003)
CREATE TABLE IF NOT EXISTS public.stock_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create function to update updated_at timestamp (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock_groups updated_at
CREATE TRIGGER update_stock_groups_updated_at
  BEFORE UPDATE ON public.stock_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_stock_group_roles table (ADR 0003)
CREATE TABLE IF NOT EXISTS public.user_stock_group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_group_id UUID NOT NULL REFERENCES public.stock_groups(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('主担当', '副担当', '管理者')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, stock_group_id, role)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_stock_group_roles_user_id ON public.user_stock_group_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stock_group_roles_stock_group_id ON public.user_stock_group_roles(stock_group_id);
CREATE INDEX IF NOT EXISTS idx_user_stock_group_roles_role ON public.user_stock_group_roles(role);

-- Create trigger for user_stock_group_roles updated_at
CREATE TRIGGER update_user_stock_group_roles_updated_at
  BEFORE UPDATE ON public.user_stock_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.stock_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stock_group_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_groups (all authenticated users can read)
CREATE POLICY "Anyone can read stock groups"
  ON public.stock_groups
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS policies for user_stock_group_roles
-- Users can read their own roles
CREATE POLICY "Users can read their own roles"
  ON public.user_stock_group_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all roles (needed for seed scripts)
CREATE POLICY "Service role can manage all roles"
  ON public.user_stock_group_roles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

