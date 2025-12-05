# ADR 0006: Stock Group Type Safety in Application Code

## Status

Accepted

## Context

We need to decide how to handle stock group names in the application code versus the database.

The following requirements exist:

- Stock group names may change over time (new stock groups may be added)
- We want to avoid database migrations when adding new stock groups
- We want type safety in application code during development
- Database setup is not yet complete, so we prioritize code-level type safety

## Decision

Use strict type safety in application code with enumerated stock group names, while allowing flexible string values in the database.

### Application Code (Type Safety)

- Define stock group names as a const object with TypeScript literal types
- Use `StockGroup` value object with strict type checking
- Validate against known stock groups during development (warn on unknown values)
- This provides compile-time type safety and IDE autocomplete

### Database (Flexibility)

- `stock_groups.name` column is `TEXT NOT NULL UNIQUE` (no CHECK constraint)
- Database accepts any string value, allowing new stock groups without migrations
- New stock groups can be added by inserting rows into `stock_groups` table

### Trade-off

- **Benefit**: Type safety in application code catches typos and provides better developer experience
- **Benefit**: No database migrations needed when adding new stock groups
- **Trade-off**: When a new stock group is added to the database, the application code's `STOCK_GROUP_NAMES` constant must be updated to maintain type safety

## Consequences

### Benefits

1. **Type Safety During Development**
   - Compile-time checking prevents typos in stock group names
   - IDE autocomplete helps developers use correct names
   - Reduces runtime errors from incorrect stock group names

2. **No Database Migrations for New Stock Groups**
   - Adding a new stock group only requires:
     1. Inserting a row into `stock_groups` table
     2. Updating `STOCK_GROUP_NAMES` constant in application code
   - No schema changes needed

3. **Clear Source of Truth**
   - Application code explicitly lists known stock groups
   - Makes it easy to see what stock groups are supported

### Drawbacks and Considerations

1. **Code-Database Synchronization**
   - When a new stock group is added to the database, the application code must be updated
   - If code is not updated, warnings will be shown but the system will still work
   - This is acceptable because:
     - Stock groups are added infrequently
     - The warning helps developers notice when synchronization is needed

2. **Runtime Validation**
   - Currently, unknown stock group names only trigger a warning, not an error
   - This allows the system to work with database-driven values even if code is not updated
   - Future consideration: Could add a stricter validation mode for production

3. **Type Casting**
   - Database-loaded values need to be cast to `StockGroupName` type
   - This is safe because the database enforces UNIQUE constraint, ensuring consistency

### Implementation Example

```typescript
// Application code: strict type safety
export const STOCK_GROUP_NAMES = {
  MAIWASHI_PACIFIC: "マイワシ太平洋系群",
  ZUWAIGANI_OKHOTSK: "ズワイガニオホーツク海系群",
} as const;

export type StockGroupName =
  (typeof STOCK_GROUP_NAMES)[keyof typeof STOCK_GROUP_NAMES];

export class StockGroup {
  readonly name: StockGroupName;

  constructor(name: StockGroupName | string) {
    const trimmedName = typeof name === "string" ? name.trim() : name;
    if (!trimmedName || trimmedName.length === 0) {
      throw new Error("Stock group name cannot be empty");
    }

    // Validate against known stock groups (for type safety during development)
    // In production, this validation may be relaxed to allow database-driven values
    const validNames = Object.values(STOCK_GROUP_NAMES);
    if (!validNames.includes(trimmedName as StockGroupName)) {
      console.warn(
        `Unknown stock group name: ${trimmedName}. This may be valid if loaded from database.`
      );
    }
    this.name = trimmedName as StockGroupName;
  }
}
```

```sql
-- Database: flexible string values
CREATE TABLE public.stock_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,  -- No CHECK constraint, accepts any string
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Future Considerations

If we need to support truly dynamic stock groups (added via admin panel without code changes), we could:

1. Relax the type to `string` instead of strict enum
2. Load stock group names from database at application startup
3. Use runtime validation instead of compile-time type checking

However, for now, the explicit enumeration provides better type safety and developer experience.

## Related ADRs

- ADR 0003: User Role and Stock Group Design - Defines the database schema for stock groups
- ADR 0002: Adopt Supabase Auth - Uses Supabase for database storage
