# ADR 0022: Adopt Strategy Pattern for ABC Calculation Logic

## Status

Accepted

## Context

The current ABC (Acceptable Biological Catch) calculation is a dummy implementation that needs to be replaced with actual calculation logic.

Different calculation methods are required for each stock type:

| Stock Type | Method | Description |
| ---------- | ------ | ----------- |
| Type 1 (1系) | Cohort Analysis | Future projection based on stock-recruitment relationship |
| Type 2 (2系) | Empirical Method with CPUE | Future projection without stock-recruitment relationship |
| Type 3 (3系) | Empirical Catch Analysis | Empirical analysis based on catch variation only |

Furthermore, we may want to use different calculation methods for the same stock type in the future (e.g., switching to Stock Synthesis).

### Options Considered

1. **Option A: Status Quo (if-else branching)**
   - Switch calculation logic by stock type using conditionals
   - Simple but difficult to swap calculation methods
   - Logic bloat is expected

2. **Option B: Strategy Pattern**
   - Abstract calculation logic as an interface
   - Implement concrete calculation methods as Strategies
   - Swappable design

3. **Option C: Class Inheritance**
   - Create classes for each stock type and extend via inheritance
   - In TypeScript, interface + functions are more natural

## Decision

Adopt the **Strategy Pattern** to make ABC calculation logic swappable.

### Design

```text
                    ┌────────────────────────────────┐
                    │       ABCCalculationStrategy   │
                    │           (interface)          │
                    │  + calculate(input): ABCResult │
                    └───────────────┬────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│ CohortAnalysis    │  │ EmpiricalCPUE     │  │ EmpiricalCatch    │
│ Strategy          │  │ Strategy          │  │ Strategy          │
│ (Type 1 / 1系)    │  │ (Type 2 / 2系)    │  │ (Type 3 / 3系)    │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Directory Structure

```text
src/domain/
├── models/
│   └── stock/
│       └── calculation/           # New directory
│           ├── index.ts
│           ├── strategy.ts        # ABCCalculationStrategy interface
│           ├── cohort-analysis.ts # Type 1 (1系): Cohort Analysis
│           ├── empirical-cpue.ts  # Type 2 (2系): Empirical Method (CPUE)
│           └── empirical-catch.ts # Type 3 (3系): Empirical Analysis (Catch only)
```

### Interface Design

```typescript
// strategy.ts
export interface ABC算定Strategy {
  readonly 手法名: string;
  算定(入力: ABC算定入力): ABC算定結果;
}

export interface ABC算定入力 {
  資源量推定値: number;
  // Each Strategy extends input type as needed
}
```

### Usage Example

```typescript
// Current implementation
const result = stock.ABC算定();

// After applying Strategy Pattern
const strategy = createABC算定Strategy(資源タイプ);
const result = strategy.算定(inputData);
```

## Consequences

### Benefits

1. **Swappability**
   - Easy to swap calculation methods (e.g., migration to Stock Synthesis)
   - Can inject mock Strategies for testing

2. **Separation of Concerns**
   - Each calculation method's logic is isolated in its own file
   - Improved readability and maintainability

3. **Incremental Implementation**
   - Each stock type's calculation logic can be implemented independently
   - Can implement Type 1 (1系) first, then others

4. **Type Safety**
   - TypeScript interfaces clarify inputs and outputs
   - Errors detected at compile time

### Drawbacks

1. **Increased Complexity**
   - More files
   - More indirection layers

2. **Learning Curve**
   - Requires understanding of Strategy Pattern

### Mitigation

- Keep each Strategy in a single file and keep it simple
- Provide thorough documentation and tests

## Implementation Plan

1. Define Strategy interface
2. Implement Cohort Analysis Strategy for Type 1 (1系)
3. Implement Strategies for Type 2 (2系) and Type 3 (3系) sequentially
4. Refactor existing `helpers.ts` to use the new Strategies

## Related ADRs

- ADR 0006: Stock Group Type Safety
- ADR 0016: Use Japanese for Coding
