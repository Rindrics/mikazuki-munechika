# ADR 0016: Use Japanese for Domain Code for Stakeholder Communication

## Status

Accepted

## Context

This project is a fishery stock assessment system for Japanese stakeholders. The domain terminology (資源評価, 系群, ABC算定, etc.) is inherently Japanese and used daily by fishery scientists and administrators.

Originally, the codebase used English identifiers:

```typescript
// Domain concepts expressed in English
export const USER_ROLES = { PRIMARY: "主担当", ... };
export interface StockGroup { call_name: string; region: string; }
function estimateAbundance(...) { ... }
```

This created several issues:

1. **Translation overhead**: Developers must mentally translate between English code and Japanese domain concepts
2. **Stakeholder disconnect**: Domain experts cannot easily read or review code
3. **Inconsistency**: UI, database values, and documentation use Japanese, but code uses English

## Decision

Write domain code in Japanese to prioritize communication with stakeholders.

### Scope

| Layer | Language | Rationale |
|-------|----------|-----------|
| Domain models | Japanese | Core business concepts |
| Domain constants | Japanese | Domain terminology |
| Application services | Japanese | Business logic |
| Infrastructure | Mixed | Technical + domain concerns |
| UI components | Mixed | React/Next.js conventions + Japanese labels |
| External APIs | English | Interoperability |

### Examples

```typescript
// Constants
export const ロールs = { 主担当: "主担当", 副担当: "副担当", 管理者: "管理者" } as const;
export const 資源タイプs = { "1系": 1, "2系": 2, "3系": 3 } as const;

// Interfaces
export interface 資源情報 {
  readonly 呼称: string;
  readonly 系群名: string;
  readonly 資源タイプ: 資源タイプ;
}

export interface 資源評価 {
  readonly 対象: 資源情報;
  readonly 資源量: string;
  資源量推定(漁獲データ: CatchData, 生物データ: BiologicalData): 資源評価;
  ABC算定(): AcceptableBiologicalCatch;
}

// Functions
export function create資源情報(name: 資源名): 資源情報 { ... }
export function get担当資源情報s(user: ユーザー): 担当資源情報[] { ... }
```

### SQL Compatibility

Japanese strings work in SQL as:
- **String values**: `role IN ('主担当', '副担当', '管理者')` ✅
- **Quoted identifiers**: `CREATE POLICY "主担当 users can..."` ✅
- **Reserved words**: `PRIMARY KEY`, `SELECT`, etc. must remain in English ✅

### What Remains in English

1. **Language reserved words**: `export`, `const`, `function`, `interface`
2. **SQL reserved words**: `PRIMARY KEY`, `CREATE TABLE`, `SELECT`
3. **Framework conventions**: React hooks (`useState`), Next.js APIs
4. **External library types**: `Promise`, `Record`, `Partial`
5. **Infrastructure identifiers**: `supabase`, `getSupabaseClient`

## Consequences

### Benefits

1. **Stakeholder alignment**: Domain experts can read and review code directly
2. **Reduced cognitive load**: No mental translation required for Japanese developers
3. **Living documentation**: Code itself documents domain concepts
4. **Consistency**: Same terminology across code, database, UI, and documentation

### Drawbacks

1. **Non-ASCII identifiers**: Some tools may have issues (none observed so far)
2. **Mixed language code**: English framework code + Japanese domain code
3. **Onboarding**: Non-Japanese speakers would need domain knowledge
4. **IME switching**: Developers must switch input methods frequently

### Mitigation

- Use consistent naming conventions (e.g., `〇〇s` for collections)
- Document domain terms in TypeDoc
- Keep infrastructure layer in English for broader compatibility

### Related ADRs

- ADR 0003: User Role Design
- ADR 0015: Rename User Domain Types
