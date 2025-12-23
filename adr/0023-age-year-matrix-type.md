# ADR 0023: Age-Year Matrix Type for Stock Calculation Data

## Status

Accepted

## Context

Stock calculation involves time-series data indexed by both year and age, such as:

- 年齢別資源尾数 (Stock abundance by age)
- 親魚量 (Spawning stock biomass)
- 加入量 (Recruitment)

We need a data structure to represent this 2D data (year × age) in a type-safe and accessible manner.

### Options Considered

1. **Option 1: Simple 2D array**

   ```typescript
   年齢別資源尾数: number[][];
   ```

   - **Pros**: Simple
   - **Cons**: No metadata about year/age ranges, ambiguous index meaning

2. **Option 2: Interface with metadata and accessor**

   ```typescript
   interface 年齢年行列 {
     readonly 年範囲: { 開始年: number; 終了年: number };
     readonly 年齢範囲: { 最小年齢: number; 最大年齢: number };
     readonly データ: number[][];
     get(年: number, 年齢: number): number;
   }
   ```

   - **Pros**: Clear range information, accessor hides index calculation
   - **Cons**: Slightly more complex

3. **Option 3: Record with explicit keys**

   ```typescript
   type 年齢年データ = Record<number, Record<number, number>>;
   ```

   - **Pros**: Explicit keys, supports sparse data
   - **Cons**: Verbose access, no range metadata

4. **Option 4: Array with start offset**

   ```typescript
   interface 年齢年行列 {
     readonly 開始年: number;
     readonly 最小年齢: number;
     readonly 値: number[][];
   }
   ```

   - **Pros**: Simple with range info
   - **Cons**: Manual index calculation required

## Decision

Adopt **Option 2**: Interface with metadata and accessor method.

```typescript
export interface 年齢年行列 {
  readonly 年範囲: { 開始年: number; 終了年: number };
  readonly 年齢範囲: { 最小年齢: number; 最大年齢: number };
  readonly データ: readonly (readonly number[])[];
  get(年: number, 年齢: number): number;
}
```

### Usage Example

```typescript
const matrix = create年齢年行列({
  年範囲: { 開始年: 2015, 終了年: 2024 },
  年齢範囲: { 最小年齢: 0, 最大年齢: 10 },
  データ: [[100, 80, 60, ...], [120, 90, 70, ...], ...],
});

// Access by year and age directly
const value = matrix.get(2020, 3);  // Get value for year 2020, age 3
```

## Consequences

### Benefits

1. **Clear metadata**
   - Year and age ranges are explicit in the type
   - Self-documenting data structure

2. **Safe access**
   - Accessor method handles index calculation
   - Range validation prevents out-of-bounds errors

3. **Type safety**
   - TypeScript enforces the structure
   - IDE autocompletion works well

4. **Immutability**
   - `readonly` arrays prevent accidental mutation

### Drawbacks

1. **Slight complexity**
   - Factory function needed to create instances
   - More code than a simple 2D array

2. **Memory overhead**
   - Stores metadata in addition to data
   - Negligible for typical dataset sizes

### Mitigation

- Provide a factory function `create年齢年行列()` for easy instantiation
- Keep the interface simple with only essential methods

## Related ADRs

- ADR 0022: ABC Calculation Strategy Pattern
