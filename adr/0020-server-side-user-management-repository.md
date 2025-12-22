# ADR 0020: Server-Side User Management Repository

## Status

Accepted

## Context

The user management feature requires administrative operations such as:

- Inviting new users by email
- Listing all users
- Deleting users
- Updating user stock assignments

These operations require Supabase Admin API, which needs the `service_role` key. This key:

1. **Bypasses Row Level Security (RLS)** - has full database access
2. **Must never be exposed to clients** - security critical

The existing `ユーザーRepository` interface is used on both client and server sides, primarily for authentication-related operations like `authenticate()`, `getCurrentユーザー()`, and `onAuthStateChange()`.

### Options Considered

1. **Option A: Extend existing `ユーザーRepository`**
   - Add management methods to the existing interface
   - Create separate implementations for client (throws error) and server (implements)
   - Use factory pattern to select implementation

2. **Option B: Create separate `ユーザー管理Repository`**
   - Define a new interface for management operations only
   - Single implementation using service_role client
   - Clear separation between authentication and management concerns

## Decision

Create a separate `ユーザー管理Repository` interface for user management operations.

### Interface Design

```typescript
export interface ユーザー管理Repository {
  findAll(): Promise<ユーザー情報[]>;
  invite(data: ユーザー招待データ): Promise<{ userId: string }>;
  updateAssignments(
    userId: string,
    担当資源: Array<{ 資源名: 資源名; ロール: ロール }>
  ): Promise<void>;
  delete(userId: string): Promise<void>;
}
```

### Implementation

- `Supabaseユーザー管理Repository` - uses `getSupabaseServiceRoleClient()`
- Only instantiated in Server Actions (never on client)

## Consequences

### Benefits

1. **Clear Separation of Concerns**
   - Authentication (`ユーザーRepository`): login, session management
   - Management (`ユーザー管理Repository`): CRUD operations on users
   - Each interface has a single responsibility

2. **Type Safety**
   - Client code cannot accidentally call management methods
   - No need for runtime checks or throwing "not implemented" errors

3. **Security by Design**
   - Management repository only exists with service_role client
   - Impossible to accidentally use on client side

4. **Simpler Testing**
   - Can mock each repository independently
   - No complex factory logic to test

### Drawbacks

1. **Two Interfaces for User Operations**
   - Developers need to know which repository to use
   - Some conceptual overlap (both deal with users)

2. **Cannot Share Implementation**
   - Some methods like `findById` could theoretically be shared
   - Duplication if both repositories need similar queries

### Mitigation

- Clear naming convention: `ユーザーRepository` (auth) vs `ユーザー管理Repository` (admin)
- Documentation in interface comments
- Only `ユーザー管理Repository` is used in `/manage/users` Server Actions

## Related ADRs

- ADR 0002: Adopt Supabase Auth
- ADR 0003: User Role and Stock Group Design
- ADR 0004: Audit Logging (service_role usage)
- ADR 0012: Use Server Actions
- ADR 0019: User Profiles Table
