# ADR 0004: Audit Logging

## Status

Accepted

## Context

We need to implement audit logging functionality for the stock assessment web application to track:

- Data changes (create, update, delete operations)
- Approval operations (first-level and final approvals)
- User authentication events (login, logout)
- Permission changes (role assignments, stock group assignments)

Audit logs are important for:

- Security and compliance
- Troubleshooting and debugging
- Accountability and traceability
- Regulatory requirements (if applicable)

## Decision

Implement audit logging from the beginning of the project, storing audit logs in Supabase database tables.

### Implementation Approach

1. **Database Storage**
   - Store audit logs in `public.audit_logs` table in Supabase
   - Use PostgreSQL triggers for automatic logging of database changes
   - Application-level logging for business logic operations (approvals, etc.)

2. **Log Structure**
   - User ID (who performed the action)
   - Action type (CREATE, UPDATE, DELETE, APPROVE, LOGIN, etc.)
   - Resource type (assessment_result, user_role, etc.)
   - Resource ID (identifier of the affected resource)
   - Stock group ID (if applicable)
   - Before/after values (for UPDATE operations)
   - Timestamp
   - IP address (if available)
   - Additional metadata (JSON)

3. **Logging Levels**
   - **Data Changes**: All CRUD operations on important entities
   - **Approval Operations**: First-level and final approvals
   - **Authentication**: Login, logout, failed login attempts
   - **Authorization**: Permission changes, role assignments

4. **Performance Considerations**
   - Use asynchronous logging where possible
   - Index audit logs table for efficient queries
   - Consider archiving old logs periodically

## Consequences

### Benefits

1. **Security and Compliance**
   - Complete audit trail of all important operations
   - Helps identify security breaches or unauthorized access
   - Supports compliance with regulatory requirements

2. **Troubleshooting**
   - Easy to trace issues back to specific operations
   - Helps debug problems in production
   - Provides context for error reports

3. **Accountability**
   - Clear record of who did what and when
   - Supports review and approval workflows
   - Helps resolve disputes

4. **Early Implementation**
   - Easier to add logging from the start than retrofitting later
   - Ensures consistent logging across all features
   - Avoids missing important events

### Drawbacks and Considerations

1. **Storage Costs**
   - Audit logs can grow large over time
   - Need to plan for storage and archiving
   - May need to implement log retention policies

2. **Performance Impact**
   - Logging adds overhead to operations
   - Need to ensure logging doesn't slow down critical operations
   - Consider asynchronous logging for high-volume operations

3. **Privacy Concerns**
   - Audit logs may contain sensitive information
   - Need to ensure proper access controls on audit logs
   - May need to implement data anonymization for old logs

4. **Complexity**
   - Need to decide what to log and what not to log
   - Log structure needs to be flexible enough for future needs
   - Querying audit logs can be complex

### Database Schema

```sql
-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATE', 'UPDATE', 'DELETE',
    'APPROVE_FIRST', 'APPROVE_FINAL',
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'ROLE_ASSIGNED', 'ROLE_REMOVED',
    'STOCK_GROUP_ASSIGNED', 'STOCK_GROUP_REMOVED'
  )),
  resource_type TEXT NOT NULL, -- e.g., 'assessment_result', 'user_role', 'stock_group'
  resource_id UUID, -- ID of the affected resource
  stock_group_id UUID REFERENCES public.stock_groups(id) ON DELETE SET NULL,
  before_data JSONB, -- Previous state (for UPDATE operations)
  after_data JSONB, -- New state (for CREATE/UPDATE operations)
  metadata JSONB, -- Additional context (IP address, user agent, etc.)
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
```

### Implementation Examples

#### Application-Level Logging

```typescript
// Example: Log approval operation
async function approveAssessmentResult(resultId: string, userId: string, stockGroupId: string) {
  // Perform approval
  await approveResult(resultId);

  // Log the action
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action_type: "APPROVE_FIRST",
    resource_type: "assessment_result",
    resource_id: resultId,
    stock_group_id: stockGroupId,
    after_data: { status: "approved" },
    metadata: { timestamp: new Date().toISOString() },
  });
}
```

#### Database Trigger Logging

```sql
-- Example: Automatic logging of user role changes
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

CREATE TRIGGER user_role_changes_audit
  AFTER INSERT OR DELETE ON public.user_stock_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_role_changes();
```

### Alternatives Considered

1. **External Logging Service**
   - Use services like LogRocket, Sentry, or Datadog
   - Pros: Specialized tools, better analytics
   - Cons: Additional cost, vendor lock-in, data privacy concerns
   - Decision: Not chosen because we want to keep data in our own database

2. **File-Based Logging**
   - Write logs to files
   - Pros: Simple, no database overhead
   - Cons: Harder to query, not scalable, difficult to correlate with database records
   - Decision: Not chosen because database storage is more flexible

3. **No Logging**
   - Skip audit logging initially, add later
   - Pros: Faster initial development
   - Cons: Harder to add later, may miss important events, security risk
   - Decision: Not chosen because audit logging is important for security and compliance

4. **Minimal Logging**
   - Only log critical operations
   - Pros: Less storage, better performance
   - Cons: May miss important events, incomplete audit trail
   - Decision: Not chosen because comprehensive logging is more valuable

## Related ADRs

- ADR 0002: Adopt Supabase Auth - Audit logs reference authenticated users
- ADR 0003: User Role and Stock Group Design - Audit logs track role and stock group changes
