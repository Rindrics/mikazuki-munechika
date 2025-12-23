# ADR 0024: Type Parameter with Formatter for Unit Handling

## Status

Accepted

## Context

Stock calculation data has various units:

- Stock abundance: 千尾 (thousands of fish), 尾 (fish)
- Biomass: トン (tons)
- Fishing mortality (F): 無次元 (dimensionless)

We need a way to:

1. Track units at the type level to prevent mixing incompatible data
2. Format values for display (e.g., "15.0 千トン" for 15000 tons)
3. Keep the solution simple and serializable

### Options Considered

1. **Option A: String literal + Record formatter**

   ```typescript
   export type 単位 = "トン" | "千尾" | "尾" | "無次元";
   export const 単位フォーマッタ: Record<単位, (値: number) => string> = { ... };
   export interface 年齢年行列 {
     readonly 単位: 単位;
     ...
   }
   ```

   - **Pros**: Simple, easy to serialize
   - **Cons**: Cannot prevent unit mismatch at compile time

2. **Option B: Unit as object (interface)**

   ```typescript
   export interface 単位 {
     readonly 名前: string;
     format(値: number): string;
   }
   export const トン: 単位 = { ... };
   ```

   - **Pros**: Self-contained, easy to extend (OCP)
   - **Cons**: Requires conversion for serialization, no type-level tracking

3. **Option C: Type parameter + Record formatter**

   ```typescript
   export type 単位 = "トン" | "千尾" | "尾" | "無次元";
   export const 単位フォーマッタ: Record<単位, (値: number) => string> = { ... };
   export interface 年齢年行列<U extends 単位 = 単位> {
     readonly 単位: U;
     ...
   }
   ```

   - **Pros**: Type-level unit tracking, easy to serialize
   - **Cons**: Two places to update when adding new units

## Decision

Adopt **Option C**: Type parameter with Record formatter.

### Implementation

```typescript
// Unit type (string literal)
export type 単位 = "トン" | "千尾" | "尾" | "無次元";

// Formatter for each unit
export const 単位フォーマッタ: Record<単位, (値: number) => string> = {
  トン: (値) => (値 >= 1000 ? `${(値 / 1000).toFixed(1)} 千トン` : `${値.toFixed(1)} トン`),
  千尾: (値) => (値 >= 1000 ? `${(値 / 1000).toFixed(2)} 百万尾` : `${値.toFixed(1)} 千尾`),
  尾: (値) =>
    値 >= 1_000_000 ? `${(値 / 1_000_000).toFixed(2)} 百万尾` : `${値.toLocaleString()} 尾`,
  無次元: (値) => 値.toFixed(3),
};

// Matrix with unit type parameter
export interface 年齢年行列<U extends 単位 = 単位> {
  readonly 単位: U;
  readonly 年範囲: { 開始年: number; 終了年: number };
  readonly 年齢範囲: { 最小年齢: number; 最大年齢: number };
  readonly データ: readonly (readonly number[])[];
  get(年: number, 年齢: number): number;
  getFormatted(年: number, 年齢: number): string;
}
```

### Usage Example

```typescript
// Units are tracked at type level
const 親魚量: 年齢年行列<"トン"> = create年齢年行列({ 単位: "トン", ... });
const 資源尾数: 年齢年行列<"千尾"> = create年齢年行列({ 単位: "千尾", ... });

// Display with formatting
親魚量.getFormatted(2020, 3);  // "15.0 千トン"

// Type error: cannot assign different units
const wrong: 年齢年行列<"トン"> = 資源尾数;  // ❌ Compile error
```

## Consequences

### Benefits

1. **Type-level unit tracking**
   - Compiler prevents mixing incompatible units
   - IDE shows unit information in type hints

2. **Display formatting**
   - Human-readable output (e.g., "千トン", "百万尾")
   - Consistent formatting across the application

3. **Easy serialization**
   - Units are strings, no conversion needed for JSON/DB

4. **Simple mental model**
   - String literal types are familiar to TypeScript developers

### Drawbacks

1. **Two places to update**
   - Adding a new unit requires updating both `単位` type and `単位フォーマッタ`
   - Mitigated: TypeScript will error if formatter is missing

2. **Limited extensibility**
   - Cannot add units without modifying source
   - Acceptable: Unit types are stable in fisheries science

## Related ADRs

- ADR 0022: ABC Calculation Strategy Pattern
- ADR 0023: Age-Year Matrix Type
