# ADR 0019: User Profiles Table for Storing User Names

## Status

Accepted

## Context

The user management feature requires storing user names (氏名) for display purposes. Currently, Supabase Auth manages user accounts in `auth.users`, but this table does not have a dedicated field for user names.

We need to decide where to store user profile information such as names.

### Options Considered

1. **Option A: Use `auth.users.raw_user_meta_data`**
   - Store name in Supabase Auth's metadata field
   - No migration required
   - Depends on Supabase Auth internals

2. **Option B: Create a separate `user_profiles` table**
   - Create a dedicated table for user profile data
   - Requires migration
   - More extensible and explicit

## Decision

Create a separate `user_profiles` table in the public schema.

### Schema

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### RLS Policies

```sql
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

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles"
  ON public.user_profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

## Consequences

### Benefits

1. **Clear Separation of Concerns**
   - Auth data (email, password) managed by Supabase Auth
   - Profile data (name) managed in our application schema
   - Easy to understand data ownership

2. **Extensibility**
   - Easy to add more profile fields in the future (e.g., department, phone)
   - No dependency on Supabase Auth internal structures

3. **Query Simplicity**
   - Profile data can be joined with other tables using standard SQL
   - No need to extract from JSONB metadata

4. **Type Safety**
   - Explicit columns with proper types
   - Database-level constraints (NOT NULL)

### Drawbacks

1. **Additional Migration**
   - Requires creating a new table and maintaining sync with auth.users

2. **Cascade Dependency**
   - Profile must be created when user is invited
   - Automatically deleted when user is removed (via ON DELETE CASCADE)

## Related ADRs

- ADR 0002: Adopt Supabase Auth
- ADR 0003: User Role and Stock Group Design
