-- Create user_profiles table (ADR 0019)
-- Stores user profile data separately from Supabase Auth for extensibility
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Administrators can read all user profiles
CREATE POLICY "Administrators can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stock_group_roles
      WHERE user_stock_group_roles.user_id = auth.uid()
      AND user_stock_group_roles.role = '管理者'
    )
  );

-- Service role can manage all profiles (needed for user management)
CREATE POLICY "Service role can manage all profiles"
  ON public.user_profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_name ON public.user_profiles(name);
