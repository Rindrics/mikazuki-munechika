# ADR 0031: Row Filtering Responsibility in tblparse

## Status

Accepted

## Context

When parsing table data from Excel files, we use the `@rindrics/tblparse` package to detect and extract table blocks.

The extracted tables contain the following types of rows:

- **Data rows**: Actual data (e.g., age-specific data: `0歳`, `1歳`, ...)
- **Additional rows**: Total rows or supplementary information (e.g., `計`, `%SPR`, `F/Fmsy`)

### Design Question

Where should additional rows be filtered?

1. **tblparse side**: tblparse separates and returns data rows and additional rows
2. **Caller side**: tblparse returns all rows, and the caller performs filtering

## Decision

**Filter additional rows on the caller side.**

tblparse returns all extracted rows as-is, and the separation of data rows and additional rows is performed on the caller side (e.g., Strategy implementations).

### Example

```typescript
// tblparse: returns all rows as a 2D array
const data = extractBlockData(sheet, block);
// data = [
//   ["年齢＼年", "1976", "1977", ...],  // header
//   ["0歳", "100", "200", ...],         // data row
//   ["1歳", "150", "250", ...],         // data row
//   ...
//   ["計", "1000", "2000", ...],        // additional row
//   ["%SPR", "30", "35", ...],          // additional row
// ]

// Caller side: filter by age label
const extractAge = (label: string): number | null => {
  const match = label.match(/^(\d)歳/);
  return match ? parseInt(match[1], 10) : null;
};

// Extract only age rows
const ageRows = data.filter(row => extractAge(row[0]) !== null);
```

### Rationale

1. **Single Responsibility Principle**: tblparse focuses solely on "detecting table blocks from Excel/CSV and extracting them as 2D arrays." Determining what constitutes a data row versus an additional row depends on domain knowledge and is outside the parser's responsibility.

2. **Domain Knowledge Localization**: Judgments like "`0歳` is an age label" or "`計` is a total row" may vary by resource name. This knowledge should be encapsulated within Strategy implementations.

3. **tblparse Generality**: Keeping tblparse as a straightforward parser allows it to support various use cases. Embedding filtering logic would couple it to specific domains.

4. **Testability**: tblparse's output is deterministic relative to its input. Filtering logic can be tested separately.

## Consequences

### Benefits

1. **Clear tblparse Responsibility**
   - Only table detection and 2D array extraction
   - No domain knowledge required

2. **Flexible Filtering**
   - Different filtering rules can be applied per resource name
   - Easy to add new resource names

3. **Easier Debugging**
   - Checking tblparse output reveals extracted data
   - Problems can be isolated between extraction and filtering

### Drawbacks

1. **Implementation Burden on Caller**
   - Each Strategy must implement filtering logic
   - Mitigation: Provide common filtering utilities

2. **Risk of Forgetting to Filter**
   - If caller forgets to filter, additional rows may be processed as data
   - Mitigation: Use type system and naming conventions to clarify intent

### Alternatives Considered

1. **Add filtering option to tblparse**

   ```typescript
   const data = extractBlockData(sheet, block, {
     rowFilter: (row) => /^\d歳/.test(row[0])
   });
   ```

   - Pros: Self-contained within tblparse
   - Cons: Domain knowledge leaks into tblparse, options become complex
   - Decision: Not adopted

2. **tblparse returns dataRows and additionalRows separately**

   ```typescript
   const { dataRows, additionalRows } = extractBlockData(sheet, block, {
     additionalRowPatterns: [/^計$/, /^%SPR$/]
   });
   ```

   - Pros: Structured output
   - Cons: Pattern definitions are domain-dependent, reduces tblparse generality
   - Decision: Not adopted

## Related ADRs

- ADR 0029: Excel Parser Strategy Pattern - Responsibility separation with Strategy pattern
