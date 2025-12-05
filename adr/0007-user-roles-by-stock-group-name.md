# ADR 0007: Use Stock Group Name as Key for User Roles

## Status

Accepted

## Context

We need to decide how to represent user roles for stock groups in the `User` domain model. A user can have different roles for different stock groups (e.g., "主担当" for stock group A, "副担当" for stock group B), and can also have the same role for multiple stock groups.

The database schema uses `stock_group_id` (UUID) as the foreign key in `user_stock_group_roles` table, but we need to decide what to use as the key in the application domain model.

## Decision

Use `stockGroupName` (string) as the key in `User.rolesByStockGroup` mapping instead of `stockGroupId` (UUID).

### Implementation

```typescript
export interface User {
  id: string;
  email: string;
  // Map of stock group name to role
  rolesByStockGroup: Partial<Record<StockGroupName, UserRole>>;
}
```

## Consequences

### Benefits

1. **Better Readability**
   - `user.rolesByStockGroup["マイワシ太平洋系群"]` is more readable than `user.rolesByStockGroup["uuid-here"]`
   - Code is self-documenting
   - Easier to understand and maintain

2. **Type Safety**
   - `StockGroupName` is a TypeScript literal type derived from `STOCK_GROUP_NAMES` constant
   - Compile-time checking prevents typos
   - IDE autocomplete works for stock group names

3. **Consistency with Domain Model**
   - `StockGroup` value object uses `name` as its primary identifier
   - Aligns with ADR 0006's decision to prioritize type safety in application code

4. **Simpler Code**
   - No need to maintain a separate mapping from `stockGroupId` to `stockGroupName`
   - Direct access using stock group names

### Drawbacks and Considerations

1. **Database Mapping Overhead**
   - When reading from database: Need to JOIN `user_stock_group_roles` with `stock_groups` to get names
   - When writing to database: Need to look up `stock_group_id` from `stock_group_name` before INSERT
   - However, `stock_groups.name` has a UNIQUE index, so lookups are fast

2. **Performance Impact**
   - **Read operations**: Requires JOIN between `user_stock_group_roles` and `stock_groups` tables
     - Impact: Minimal, as `stock_groups.name` has UNIQUE index
     - Stock groups are few in number (currently 2), so JOIN cost is negligible
   - **Write operations**: Requires additional SELECT to find `stock_group_id` from `stock_group_name`
     - Impact: One extra indexed lookup per write operation
     - With UNIQUE index on `stock_groups.name`, this is very fast
   - **Conclusion**: Performance impact is negligible given the small number of stock groups

3. **Future Scalability**
   - If stock groups grow significantly (e.g., 100+), UUID-based keys would theoretically be faster
   - However, with proper indexing, the performance difference would still be minimal
   - Can be refactored later if needed (YAGNI principle)

### Database Query Patterns

**Reading user roles:**
```sql
SELECT usgr.*, sg.name
FROM user_stock_group_roles usgr
JOIN stock_groups sg ON usgr.stock_group_id = sg.id
WHERE usgr.user_id = $1;
-- Application maps results using sg.name as key
```

**Writing user roles:**
```sql
-- 1. Lookup stock_group_id from name (uses UNIQUE index)
SELECT id FROM stock_groups WHERE name = $1;
-- 2. Insert role
INSERT INTO user_stock_group_roles (user_id, stock_group_id, role) VALUES ($1, $2, $3);
```

### Performance Analysis

- **Indexes available:**
  - `stock_groups.name`: UNIQUE constraint creates automatic index
  - `user_stock_group_roles.stock_group_id`: Index exists
  - `user_stock_group_roles.user_id`: Index exists

- **Query performance:**
  - JOIN operations use indexed columns, so they are fast
  - With small number of stock groups, performance difference between UUID and name keys is negligible
  - UNIQUE index on `stock_groups.name` ensures fast lookups

- **Conclusion:**
  - Current design is acceptable for the expected scale
  - If stock groups grow significantly, can refactor to use UUID keys later
  - Readability and type safety benefits outweigh minor performance considerations

## Alternatives Considered

1. **Use `stockGroupId` (UUID) as key**
   - **Pros**: Direct mapping from database, no JOIN needed for reads, no lookup needed for writes
   - **Cons**: Less readable, requires separate mapping to get stock group names, no type safety
   - **Decision**: Rejected due to readability and type safety concerns

2. **Store both `stockGroupId` and `stockGroupName` mappings**
   - **Pros**: Fast lookups by either key
   - **Cons**: Data duplication, synchronization concerns, more complex code
   - **Decision**: Rejected as unnecessary complexity for current requirements

## Related ADRs

- ADR 0003: User Role and Stock Group Design - Defines the database schema
- ADR 0006: Stock Group Type Safety in Application Code - Defines type safety approach for stock groups
