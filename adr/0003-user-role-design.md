# ADR 0003: User Role and Stock Group Design

## Status

Accepted

## Context

We need to design a user role and permission system for the stock assessment web application. The system needs to support:

- Different roles with different permissions
- Multiple stock groups (e.g., マイワシ太平洋系群, ズワイガニオホーツク海系群)
- Users can have different roles for different stock groups
- Fine-grained access control based on role and stock group combination

## Decision

Adopt a role-based access control (RBAC) system with stock group association, implemented using Supabase Row Level Security (RLS).

### Role Types

1. **主担当 (Primary Operator)**
   - Can read and write data for assigned stock groups
   - Responsible for data entry and management

2. **副担当 (Secondary Operator)**
   - Can perform first-level approval for reports of assigned stock groups
   - Reviews work done by primary operators

3. **管理者 (Administrator)**
   - Can perform final approval (representing stakeholders)
   - Has access to all stock groups
   - Highest level of authority

### Stock Groups

- マイワシ太平洋系群
- ズワイガニオホーツク海系群

### Implementation

- Store user-role-stock group relationships in `public.user_stock_group_roles` table
- Use Supabase RLS policies to enforce access control at the database level
- RLS policies check both role and stock group for each operation

## Consequences

### Benefits

1. **Fine-grained Access Control**
   - Users can have different roles for different stock groups
   - Access control is enforced at the database level via RLS
   - Reduces risk of unauthorized access

2. **Scalability**
   - Easy to add new stock groups without changing role definitions
   - Easy to add new roles if needed
   - Supports future expansion

3. **Security**
   - RLS policies are enforced at the database level
   - Even if application code has bugs, database-level security prevents unauthorized access
   - Clear separation of concerns

4. **Flexibility**
   - Users can be assigned multiple roles across different stock groups
   - Role assignments can be changed without code changes
   - Supports complex permission scenarios

### Drawbacks and Considerations

1. **RLS Policy Complexity**
   - RLS policies can become complex as the number of roles and stock groups grows
   - Need to carefully design policies to avoid performance issues
   - Requires good understanding of PostgreSQL and Supabase RLS

2. **Testing Complexity**
   - Need to test various role and stock group combinations
   - RLS policies need to be tested thoroughly
   - May require more test data and scenarios

3. **Migration Complexity**
   - When adding new roles or stock groups, need to update RLS policies
   - Need to ensure backward compatibility
   - Migration scripts need to be carefully designed

4. **Performance Considerations**
   - RLS policies add overhead to queries
   - Need to ensure proper indexing on `user_stock_group_roles` table
   - May need to optimize queries for better performance

### Database Schema

```sql
-- Stock groups are managed in a separate reference table
-- This allows adding new stock groups without changing the schema structure
CREATE TABLE public.stock_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-role-stock group relationships
CREATE TABLE public.user_stock_group_roles (
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
```

**Benefits of separate stock_groups table**:

- Adding new stock groups only requires inserting a new row (no migration needed)
- Centralized management of stock group names
- Referential integrity through foreign key constraints
- Easy to add metadata to stock groups in the future (e.g., description, status)

### RLS Policy Example

RLS policies can use JOINs to check permissions across multiple tables. Here's an example:

```sql
-- Example: Allow primary operators to read/write data for their assigned stock groups
-- This assumes assessment_results table has a stock_group_id column
CREATE POLICY "Primary operators can manage their stock groups"
  ON public.assessment_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_stock_group_roles
      WHERE user_stock_group_roles.user_id = auth.uid()
      AND user_stock_group_roles.stock_group_id = assessment_results.stock_group_id
      AND user_stock_group_roles.role = '主担当'
    )
  );

-- Example: Allow administrators to access all stock groups
CREATE POLICY "Administrators can access all stock groups"
  ON public.assessment_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_stock_group_roles
      WHERE user_stock_group_roles.user_id = auth.uid()
      AND user_stock_group_roles.role = '管理者'
    )
  );
```

**Note**: RLS policies support JOINs and subqueries, so using a separate `stock_groups` table does not limit RLS functionality. The policies can reference related tables through foreign keys.

### Alternatives Considered

1. **Simple Role-based System**
   - Single role per user (e.g., "マイワシ担当者", "ズワイガニ担当者")
   - Simpler to implement, but less flexible
   - Cannot support users with multiple roles across stock groups
   - Does not meet the requirement for fine-grained access control

2. **Application-level Permission Checks**
   - Check permissions in application code instead of RLS
   - More flexible, but less secure
   - Risk of forgetting to check permissions in some code paths
   - Does not provide defense in depth

3. **Attribute-based Access Control (ABAC)**
   - More complex system with attributes and policies
   - Overkill for current requirements
   - Higher implementation and maintenance cost

## Related ADRs

- ADR 0002: Adopt Supabase Auth - This ADR builds on the Supabase Auth decision and uses RLS for access control
