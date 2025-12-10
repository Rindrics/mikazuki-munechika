# ADR 0015: Rename User Domain Types

## Status

Accepted

## Context

Several types in the user domain had naming issues:

1. **`UserRole`**: The `User` prefix was redundant since the type is already scoped within `src/domain/models/user/`
2. **`UserStockGroupRole`**: The name implied it was a "role", but it actually represents "a role assignment for a stock group". Additionally, having `role: Role` inside a type named `...Role` was confusing

## Decision

Rename the following types:

1. `UserRole` → `Role`
2. `UserStockGroupRole` → `StockGroupRoleAssignment`

### Before

```typescript
export type UserRole = "admin" | "reviewer" | "viewer";

export interface UserStockGroupRole {
  stockGroupName: StockGroupName;
  role: UserRole;
}
```

### After

```typescript
export type Role = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface StockGroupRoleAssignment {
  stockGroupName: StockGroupName;
  role: Role;
}
```

## Consequences

### Benefits

1. **Conciseness**: Shorter type names reduce verbosity
2. **Consistency**: Follows the pattern of other domain types (e.g., `StockType`, not `FisheryStockType`)
3. **Context clarity**: The module path already indicates the domain context
4. **Semantic accuracy**: `StockGroupRoleAssignment` correctly describes what the type represents (an assignment, not a role itself)

### Drawbacks

1. **Historical ADRs**: Previous ADRs (0007, 0013) reference the old `UserRole` name
   - These are kept as-is to preserve decision history

### Related ADRs

- ADR 0003: User Role Design
- ADR 0007: User Roles by Stock Group Name

