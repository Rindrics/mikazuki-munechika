# ADR 0025: Branded Types for Stock Calculation Results

## Status

Accepted

## Context

Stock calculation involves multiple steps:

1. **一次処理** (Primary processing): Calculate stock up to the current year
2. **前進計算** (Forward calculation): Extend calculation to the next year
3. **将来予測** (Future projection): Project stock into the future

The outputs of 一次処理 and 前進計算 have the same structure:

```typescript
interface 資源計算結果 {
  最終年: number;
  年齢別資源尾数: 年齢年行列<"千尾">;
  親魚量: 年齢年行列<"トン">;
  加入量: 年齢年行列<"千尾">;
}
```

However, they represent semantically different states:

- 一次処理 output: **当年までの** 資源計算結果
- 前進計算 output: **翌年までの** 資源計算結果

We want to prevent accidentally passing the wrong result to the wrong function.

### Options Considered

1. **Option A: Separate interfaces with identical fields**

   ```typescript
   interface 当年資源計算結果 { ... }
   interface 翌年資源計算結果 { ... }
   ```

   - **Problem**: TypeScript uses structural typing, so identical structures are interchangeable

2. **Option B: Branded Types**

   ```typescript
   interface 資源計算結果Base { ... }
   type 当年資源計算結果 = 資源計算結果Base & { readonly __kind: "当年" };
   type 翌年資源計算結果 = 資源計算結果Base & { readonly __kind: "翌年" };
   ```

   - **Benefit**: Type-level distinction despite identical runtime structure

## Decision

Adopt **Branded Types** to distinguish between calculation result states.

### Implementation

```typescript
// Base interface (not exported)
interface 資源計算結果Base {
  最終年: number;
  年齢別資源尾数: 年齢年行列<"千尾">;
  親魚量: 年齢年行列<"トン">;
  加入量: 年齢年行列<"千尾">;
}

// Branded types (exported)
export type 当年資源計算結果 = 資源計算結果Base & { readonly __kind: "当年" };
export type 翌年資源計算結果 = 資源計算結果Base & { readonly __kind: "翌年" };
```

### Usage in Strategy Interface

```typescript
interface コホート解析Strategy {
  一次処理(入力: コホート解析入力): 当年資源計算結果;
  前進計算(当年結果: 当年資源計算結果, 残差: 再生産関係残差): 翌年資源計算結果;
  将来予測(翌年結果: 翌年資源計算結果, F: F, 予測年数: number): 将来予測結果;
}
```

### Creating Branded Values

```typescript
// Factory functions would add the brand
function create当年資源計算結果(data: 資源計算結果Base): 当年資源計算結果 {
  return { ...data, __kind: "当年" as const };
}

function create翌年資源計算結果(data: 資源計算結果Base): 翌年資源計算結果 {
  return { ...data, __kind: "翌年" as const };
}
```

## Consequences

### Benefits

1. **Type-level safety**
   - Compiler prevents passing 当年資源計算結果 where 翌年資源計算結果 is expected
   - Catches logic errors at compile time

2. **Self-documenting code**
   - Function signatures clearly show which result type is expected
   - IDE shows the distinction in type hints

3. **Zero runtime overhead**
   - Brand field is only used for type checking
   - Same runtime behavior as unbranded types

### Drawbacks

1. **Factory functions required**
   - Cannot create branded values with object literals alone
   - Need helper functions to add the brand

2. **Extra field in objects**
   - `__kind` field exists at runtime (though minimal overhead)
   - Could use `Symbol` for truly invisible brand if needed

### Mitigation

- Provide factory functions (`create当年資源計算結果`, `create翌年資源計算結果`)
- Document the pattern for team members

## Related ADRs

- ADR 0022: ABC Calculation Strategy Pattern
- ADR 0023: Age-Year Matrix Type
- ADR 0024: Unit Type Parameter
