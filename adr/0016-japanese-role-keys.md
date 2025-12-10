# ADR 0016: Japanese Keys for Role Constants

## Status

Accepted

## Context

The role constants were originally defined with English keys:

```typescript
export const USER_ROLES = {
  PRIMARY: "主担当",
  SECONDARY: "副担当",
  ADMIN: "管理者",
} as const;
```

This created a disconnect between the code (`USER_ROLES.PRIMARY`) and the domain language used by stakeholders ("主担当").

## Decision

Use Japanese keys for role constants to align code with domain language:

```typescript
export const ROLES = {
  主担当: "主担当",
  副担当: "副担当",
  管理者: "管理者",
} as const;
```

### Usage

```typescript
// Before
if (role === USER_ROLES.PRIMARY) { ... }

// After
if (role === ROLES.主担当) { ... }
```

### SQL Compatibility

Japanese strings work in SQL as:
- **String values**: `role IN ('主担当', '副担当', '管理者')` ✅
- **Quoted identifiers**: `CREATE POLICY "主担当 users can..."` ✅
- **Reserved words**: `PRIMARY KEY` must remain in English ✅

## Consequences

### Benefits

1. **Domain alignment**: Code directly reflects domain terminology
2. **Readability**: Japanese-speaking developers can understand intent immediately
3. **Consistency**: Same terminology in code, database, and UI

### Drawbacks

1. **Non-ASCII keys**: May cause issues in some tools or environments (none observed so far)
2. **Key-value redundancy**: Keys and values are identical

### Related ADRs

- ADR 0003: User Role Design
- ADR 0015: Rename User Domain Types

