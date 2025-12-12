# ADR 0017: Hide User ID with WeakMap Pattern

## Status

Proposed

## Context

User entities in this system have internal identifiers (IDs) that are used for database relationships and authentication. However, exposing these IDs directly in the type system creates several issues:

1. **Accidental ID manipulation**: Developers might directly access or modify user IDs, bypassing intended access patterns
2. **Type confusion**: Plain string IDs can be confused with other string types (email, name, etc.)
3. **Leaky abstraction**: Implementation details of how users are identified should not be part of the public API

We want to completely hide the user ID from the domain model interface, so that external code cannot even see that an ID exists.

## Considered Options

### Option 1: Branded Type with `unique symbol`

Use TypeScript's branded type pattern to mark the ID field with an unexported symbol.

```typescript
// user/factory.ts
declare const __userId: unique symbol;  // Not exported

export interface ユーザー {
  readonly [__userId]: string;  // Visible in type, but inaccessible
  氏名: 氏名;
  メールアドレス: string;
  担当資源情報リスト: Partial<Record<資源名, ロール>>;
}
```

#### Pros

- **No runtime overhead**: `declare const` generates no runtime code
- **Type-level distinction**: Can distinguish users with/without IDs at compile time
- **Familiar pattern**: Well-known branded type pattern in TypeScript community

#### Cons

- **ID is visible in type definition**: `[__userId]: string` appears in the interface
- **Incomplete encapsulation**: Developers can see the ID field exists, even if they can't access it
- **IDE autocomplete**: May show the symbol property in suggestions

### Option 2: WeakMap for Private Storage (Chosen)

Store user IDs in a module-private WeakMap, keeping the interface completely clean.

```typescript
// user/factory.ts
const userIds = new WeakMap<ユーザー, string>();  // Not exported

export interface ユーザー {
  氏名: 氏名;
  メールアドレス: string;
  担当資源情報リスト: Partial<Record<資源名, ロール>>;
  // No ID field - completely hidden
}

export function createユーザー(id: string, ...): ユーザー {
  const user: ユーザー = { ... };
  userIds.set(user, id);
  return user;
}
```

#### Pros

- **Complete encapsulation**: ID is not visible anywhere in the type definition
- **Clean interface**: Domain model shows only domain-relevant properties
- **True information hiding**: External code has no way to know IDs exist
- **Garbage collection friendly**: WeakMap automatically cleans up when users are GC'd

#### Cons

- **Runtime overhead**: Small cost for WeakMap lookup (negligible in practice)
- **No type-level distinction**: Cannot distinguish "user with ID" from "user without ID" at compile time
- **Serialization requires explicit handling**: ID won't appear in `JSON.stringify()`

## Decision

Use **WeakMap pattern** (Option 2) for hiding user IDs.

The primary goal is complete encapsulation - the domain model interface should not reveal implementation details about how users are identified. The WeakMap pattern achieves this perfectly, while the branded type pattern still exposes the ID field in the type definition.

### Important: WeakMap is Not a Persistence Layer

WeakMap is a **JavaScript built-in object** for in-memory key-value storage, not an external database or persistence layer. The actual data flow is:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Supabase DB   │────▶│    WeakMap      │────▶│  Domain Layer   │
│ (Persistence)   │     │ (Runtime only)  │     │ (ID invisible)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Data flow example:**

```typescript
// 1. Infrastructure layer: Fetch user from DB
const dbRow = await supabase.from("users").select().single();
// dbRow = { id: "uuid-123", name: "田中", email: "tanaka@example.com" }

// 2. Create domain object with ID stored in WeakMap
const user = createユーザー(dbRow.id, dbRow.name, dbRow.email, {});

// 3. Domain layer: Business logic without seeing ID
processUser(user);  // ID is completely hidden

// 4. Infrastructure layer: Retrieve ID when saving to DB
const id = getUserId(user);  // "uuid-123"
await supabase.from("users").update({...}).eq("id", id);
```

**Key points:**

- **Persistence (source of truth)**: Supabase database stores and persists user IDs
- **WeakMap role**: Runtime mechanism to hide IDs from domain layer code
- **WeakMap is ephemeral**: Data is lost on server restart/page reload (this is fine - we reload from DB)

### Implementation

```typescript
// user/factory.ts

// Private storage - not exported, completely hidden
const userIds = new WeakMap<ユーザー, string>();

export interface ユーザー {
  氏名: 氏名;
  メールアドレス: string;
  担当資源情報リスト: Partial<Record<資源名, ロール>>;
}

export function createユーザー(
  id: string,
  氏名: 氏名,
  メールアドレス: string,
  担当資源情報リスト: Partial<Record<資源名, ロール>> = {}
): ユーザー {
  const user: ユーザー = { 氏名, メールアドレス, 担当資源情報リスト };
  userIds.set(user, id);
  return user;
}

// Internal use only - for infrastructure layer
export function getUserId(user: ユーザー): string | undefined {
  return userIds.get(user);
}
```

## Consequences

### Benefits

1. **True encapsulation**: User ID is completely invisible to external code
2. **Clean domain model**: Interface contains only domain-relevant properties
3. **Controlled access**: All ID operations go through explicit factory functions
4. **Memory safe**: WeakMap prevents memory leaks

### Drawbacks

1. **Runtime cost**: Minimal overhead for WeakMap operations
2. **Serialization**: Must explicitly include ID when converting to JSON/database
3. **Testing**: Need factory functions to create test users with specific IDs

### Mitigation

- Provide `createユーザー` factory for all user creation
- Provide `getUserId` for infrastructure layer when ID is needed
- Document that ID access is intentionally restricted

## Comparison Summary

| Aspect | Branded Type | WeakMap |
|--------|--------------|---------|
| ID visible in type | Yes | **No** |
| Runtime overhead | None | Minimal |
| Type-level ID tracking | Yes | No |
| Complete encapsulation | No | **Yes** |
| Serialization | Automatic | Explicit |

## Related ADRs

- ADR 0003: User Role Design
- ADR 0016: Use Japanese for Domain Code
