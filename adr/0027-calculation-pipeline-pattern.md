# ADR 0027: Calculation Pipeline Pattern

## Status

Accepted

## Context

The ABC calculation process consists of multiple steps that must be executed in sequence:

1. 一次処理 (Primary Processing)
2. 前年までのコホート解析 (Cohort Analysis up to Previous Year)
3. 前進計算 (Forward Calculation)
4. 将来予測 (Future Projection)
5. ABC決定 (ABC Determination)

We need to:

- Execute these steps in the correct order
- Generate a flowchart showing the calculation flow for users
- Ensure the flowchart always reflects the actual implementation

### Problem

If step definitions and execution logic are maintained separately, they can diverge:

```typescript
// These can get out of sync!
const calculationSteps = [...];  // For flowchart
算定() { /* actual execution */ }  // For execution
```

## Decision

**Use a Pipeline Pattern where steps are defined once and used for both execution and flowchart generation.**

### Design

```typescript
interface PipelineStep<TInput, TOutput> {
  name: string;
  inputNames: string[];
  outputName: string;
  execute: (input: TInput, context: PipelineContext) => TOutput;
}

interface Pipeline {
  steps: PipelineStep[];

  // Single source of truth for both:
  execute(input: コホート解析入力): ABC算定結果;
  generateFlowchart(): string;
}
```

### Implementation Approach

```typescript
function createコホート解析Strategy(): コホート解析Strategy {
  // Define pipeline steps - SINGLE SOURCE OF TRUTH
  const pipeline = createPipeline<コホート解析入力, ABC算定結果>()
    .addStep({
      name: "一次処理",
      inputNames: ["漁獲量データ", "生物学的データ"],
      outputName: "コホート解析用データ",
      execute: (input) => {
        /* ... */
      },
    })
    .addStep({
      name: "前年までのコホート解析",
      inputNames: ["コホート解析用データ", "M", "資源量指標値"],
      outputName: "前年までの資源計算結果",
      execute: (prev, ctx) => {
        /* ... */
      },
    })
    // ... more steps
    .build();

  return {
    手法名: "コホート解析",
    算定: (input) => pipeline.execute(input),
    generateFlowchart: () => pipeline.generateFlowchart(),
    // Individual step methods still available for testing/debugging
    一次処理: pipeline.getStep("一次処理").execute,
    // ...
  };
}
```

### Configurable Parameters with Defaults

Users can override specific parameters from the UI while using defaults for others:

```typescript
// All parameters are optional with defaults
interface CalculationParameters {
  M?: M;
  資源量指標値?: 資源量指標値データ;
  再生産関係残差?: 再生産関係残差;
  翌年のF?: F;
  将来予測年数?: number;
  漁獲管理規則?: 漁獲管理規則;
  調整係数β?: 調整係数β;
}

// Default values
const defaultParameters: Required<CalculationParameters> = {
  M: () => 固定値(0.4),
  将来予測年数: 10,
  // ...
};

// Usage: only override what user specified
pipeline.execute(入力, {
  M: userSelectedM, // User specified
  将来予測年数: 15, // User specified
  // Other parameters use defaults
});
```

### Benefits

1. **Single Source of Truth**: Step definitions are used for both execution and visualization
2. **Impossible to Diverge**: Adding/changing a step automatically updates both execution and flowchart
3. **Declarative**: Pipeline structure is clear and self-documenting
4. **Testable**: Individual steps can be tested in isolation
5. **Extensible**: Easy to add logging, timing, or other cross-cutting concerns
6. **Configurable**: Parameters can be customized per execution with sensible defaults

## Consequences

### Positive

- Flowchart always matches actual execution
- Clear visualization of data flow
- Easier to understand and maintain calculation logic
- Built-in documentation through step definitions

### Negative

- More complex initial setup
- Learning curve for pipeline pattern
- Some type complexity for chaining steps with different types

### Neutral

- Existing Strategy interface remains unchanged (backward compatible)
- Individual step methods are still exposed for debugging/testing
