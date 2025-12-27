# ADR 0029: Excel Parser Strategy Pattern for Stock-Specific Formats

## Status

Accepted

## Context

We are implementing a feature to upload and parse published stock assessment data in Excel format. Different stock may have different Excel structures:

- **マイワシ太平洋系群**: Sheets like 表3-1, 補足表2-1, etc.
- **Other stocks**: May have different sheet names, column layouts, or data structures

### Design Question

When the Excel format differs by stock, should we:

1. Add a stock type parameter to the existing `年齢年行列<U>` type?
2. Keep `年齢年行列<U>` unchanged and handle stock-specific parsing separately?

### Existing Type

```typescript
// ADR 0023: Age-Year Matrix Type
interface 年齢年行列<U extends 単位> {
  readonly 単位: U;
  readonly 年範囲: { 開始年: number; 終了年: number };
  readonly 年齢範囲: { 最小年齢: number; 最大年齢: number };
  readonly データ: readonly (readonly number[])[];
  get(年: number, 年齢: number): number;
  getFormatted(年: number, 年齢: number): string;
}
```

## Decision

**Keep `年齢年行列<U>` unchanged and implement stock-specific parsers using the Strategy pattern.**

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Excel File Upload                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PublishedDataExcelParser                       │
│  1. detect資源名(file) - Extract stock name from Excel content  │
│  2. getParseStrategy(資源名) - Select appropriate strategy      │
│  3. strategy.parse(file) - Parse with stock-specific logic      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ マイワシ        │  │ マサバ          │  │ Other Stock     │
│ 太平洋系群      │  │ 太平洋系群      │  │ Strategies      │
│ Strategy        │  │ Strategy        │  │ (future)        │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     公開データセット                            │
│  - 資源名: 資源名           (detected from Excel)               │
│  - コホート解析結果: {...}  (uses 年齢年行列<U>)                │
│  - 将来予測結果?: {...}                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Interface Design

```typescript
/**
 * Main entry point for parsing published data Excel files
 * Stock name is automatically detected from Excel content
 */
interface ExcelParser {
  /**
   * Parse Excel file into 公開データセット
   * Stock name is detected from Excel content (e.g., "令和6(2024)年度マイワシ太平洋系群...")
   * @throws ValidationError if file format is invalid or stock name cannot be detected
   */
  parse(file: File): Promise<公開データセット>;
}

/**
 * Strategy interface for stock-specific parsing logic
 * Used internally by PublishedDataExcelParser
 */
interface ParseStrategy {
  /**
   * Parse Excel file with stock-specific logic
   */
  parse(file: File, 資源名: 資源名): Promise<公開データセット>;
}

/**
 * Concrete implementation that detects stock name and delegates to appropriate strategy
 */
class PublishedDataExcelParser implements ExcelParser {
  async parse(file: File): Promise<公開データセット> {
    // 1. Detect stock name from Excel content
    const 資源名 = await this.detect資源名(file);

    // 2. Select appropriate strategy based on detected stock name
    const strategy = this.getParseStrategy(資源名);

    // 3. Parse with stock-specific logic
    return strategy.parse(file, 資源名);
  }

  private async detect資源名(file: File): Promise<資源名> {
    // Read Excel and extract stock name from title/header
    // e.g., "令和6(2024)年度マイワシ太平洋系群の資源評価のデータセット"
    // → "マイワシ太平洋系群"
  }

  private getParseStrategy(資源名: 資源名): ParseStrategy {
    switch (資源名) {
      case "マイワシ太平洋系群":
        return new マイワシ太平洋系群Strategy();
      case "マサバ太平洋系群":
        return new マサバ太平洋系群Strategy();
      // ... other stocks
      default:
        throw new Error(`No parse strategy available for ${資源名}`);
    }
  }
}

/**
 * Parsed data from Excel (in-memory only, not persisted)
 */
interface 公開データセット {
  資源名: 資源名;
  年度: number;
  コホート解析結果: {
    年齢別漁獲尾数: 年齢年行列<"千尾">;
    年齢別漁獲量: 年齢年行列<"トン">;
    年齢別漁獲係数: 年齢年行列<"無次元">;
    年齢別資源尾数: 年齢年行列<"千尾">;
    SPR: Map<number, number>;
    F_Fmsy: Map<number, number>;
  };
  将来予測結果?: {
    // Structure TBD based on other sheets
  };
}
```

### Rationale

1. **Single Responsibility Principle**: `年齢年行列` is responsible for "holding 2D age-year data". Stock identification is a separate concern belonging to the business domain.

2. **Separation of Concerns**: Stock-specific Excel format differences are a "parsing" concern, not a "data structure" concern.

3. **Minimal Impact on Existing Code**: `年齢年行列` is widely used throughout the codebase. Adding a type parameter would require changes to many files.

4. **Extensibility**: New stock parsers can be added without modifying existing types or parsers.

## Consequences

### Benefits

1. **Clean Separation**
   - Data structure (`年齢年行列`) remains pure and reusable
   - Parsing logic is encapsulated in stock-specific classes

2. **Easy Extension**
   - Adding support for new stock formats only requires implementing a new parser
   - No changes to existing code

3. **Testability**
   - Each parser can be unit tested independently
   - Mock parsers can be used for integration tests

4. **Type Safety**
   - `公開データセット.資源名` identifies the stock at runtime
   - Compiler ensures all parsers produce the same output type

### Drawbacks

1. **No Compile-Time Stock Tracking in Data**
   - Cannot use TypeScript to prevent mixing data from different stocks
   - Must rely on runtime checks if needed

2. **Parser Proliferation**
   - May need many parser classes if stock formats vary significantly
   - Mitigation: Extract common parsing logic into base class or utilities

### Alternatives Considered

1. **Add stock type parameter to 年齢年行列**
   ```typescript
   interface 年齢年行列<U extends 単位, S extends 資源名>
   ```
   - Pros: Type-level stock tracking
   - Cons: Changes all existing usage, mixes concerns
   - Decision: Not adopted

2. **Generic parser with configuration**
   ```typescript
   class ConfigurableParser {
     constructor(config: ParserConfig) {}
   }
   ```
   - Pros: Single class, configuration-driven
   - Cons: Complex config, harder to handle edge cases
   - Decision: Not adopted. Strategy pattern is simpler for varying formats

## Future Considerations

In the future, we may introduce a unified export format ("公開データセット v2") that normalizes the varying legacy formats. The export functionality would not require the Strategy pattern since it outputs a single standardized format.

```text
Import (current):
  Legacy Excel (varying formats per stock) → Strategy Pattern → 公開データセット

Export (future):
  公開データセット → Single Exporter → Unified Excel Format (v2)
```

## Related ADRs

- ADR 0023: Age-Year Matrix Type - The `年齢年行列<U>` type this decision preserves
- ADR 0024: Unit Type Parameter - Unit tracking pattern we continue to use

## Implementation Notes

### File Structure

Following clean architecture principles, interfaces (ports) are defined in the domain layer while implementations (adapters) reside in the infrastructure layer:

```text
src/
  domain/
    models/
      published-data/
        parser.ts       # ExcelParser interface (port)
        strategy.ts     # ParseStrategy interface
        types.ts        # 公開データセット type
        index.ts        # Re-exports
  infrastructure/
    excel-parser/
      parser.ts         # PublishedDataExcelParser implementation (adapter)
      strategies/
        maiwashi-pacific.ts   # マイワシ太平洋系群Strategy
        index.ts
      index.ts          # Factory function (createExcelParser)
```

This separation ensures:
- Domain layer remains pure (no external library dependencies)
- xlsx library dependency is encapsulated in infrastructure layer
- Easy to swap implementations (e.g., for testing)

### Excel Library

Using `xlsx` (SheetJS) for parsing.
