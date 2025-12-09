# ADR 0013: Use ID for Foreign Keys

## Status

Accepted

## Context

In domain models, we use human-readable names (e.g., `stockGroupName`) for modeling to make it understandable for domain experts.

```typescript
export interface UserStockGroupRole {
  stockGroupName: StockGroupName;
  role: UserRole;
}
```

However, when persisting to the database, there are several issues:

1. **Rename possibility**: Names like `stockGroupName` may be renamed in the future
2. **Referential integrity**: String-based associations cannot use foreign key constraints
3. **RLS policy complexity**: Name-based comparisons require JOINs and become complex

## Decision

Always use UUIDs for foreign keys in database tables.

### Implementation

1. **Database table design**
   - Use UUIDs for foreign keys (e.g., `stock_group_id UUID REFERENCES stock_groups(id)`)
   - Name columns are used only for display purposes

2. **Repository layer**
   - Receives names (e.g., `stockGroupName`) from domain layer
   - Converts name to ID within the repository
   - Uses ID when saving to database

3. **RLS policies**
   - Compare by ID (simple, no JOINs needed)

### Example

```sql
-- Before: Name-based (fragile)
CREATE POLICY "..." WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_stock_group_roles usr
    JOIN stock_groups sg ON usr.stock_group_id = sg.id
    WHERE sg.name = stock_name  -- Name comparison required
  )
);

-- After: ID-based (robust)
CREATE POLICY "..." WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_stock_group_roles usr
    WHERE usr.stock_group_id = assessment_results.stock_group_id
  )
);
```

## Consequences

### Benefits

1. **Referential integrity guaranteed**: Foreign key constraints prevent references to non-existent stock_groups
2. **Rename resilience**: Changing a stock_group's name does not break relations
3. **Simpler RLS**: ID-based comparisons require no JOINs and have better performance
4. **Domain layer independence**: Domain models remain independent of technical details (IDs)

### Drawbacks

1. **Increased repository responsibility**: Name-to-ID conversion logic is required
2. **Additional queries**: A query to fetch stock_group ID is needed when saving

### Notes

- Domain models continue to use name-based representation (prioritizing domain expert understandability)
- Adding `valid_from`/`valid_until` columns for history management can be considered in the future
