# ADR 0030: Review Assessment Isolation (査読用資源評価の分離)

## Status

Proposed

## Context

We are implementing a feature for reviewers to upload published stock assessment data (Excel format) and use it to determine ABC. This creates a design challenge:

### Requirements

1. **Same data structure**: Uploaded data should be stored using the same `資源評価` type as the main assessment workflow
2. **Isolation**: Reviewer operations must not affect the official assessment data
3. **Per-user workspace**: Each reviewer should have their own independent assessment environment

### Problem

If reviewers directly modify `資源評価` records:
- Their experimental changes could corrupt official assessment data
- Multiple reviewers could interfere with each other's work
- There's no clear separation between "official" and "review" assessments

### Options Considered

1. **Add user ID to 資源評価**
   ```typescript
   interface 資源評価 {
     userId?: string;  // null = official, non-null = reviewer's copy
     // ...existing fields
   }
   ```
   - Pros: Simple implementation
   - Cons: Pollutes the core domain model with access control concerns, queries become complex

2. **Separate "査読用資源評価" concept**
   ```typescript
   interface 査読用資源評価 extends 資源評価 {
     readonly 査読者ID: string;
     readonly 元データ: "アップロード" | "公式データコピー";
   }
   ```
   - Pros: Clean separation, explicit intent, no pollution of core model
   - Cons: May need parallel repository/service implementations

3. **Multi-tenant approach with tenant ID**
   ```typescript
   interface 資源評価 {
     tenantId: "official" | string;  // string = reviewer user ID
   }
   ```
   - Pros: Generic, could support other use cases
   - Cons: Over-engineering for current needs, adds complexity

## Decision

Adopt **Option 2: Separate "査読用資源評価" concept**.

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Official Workflow                            │
│  評価担当者 → 資源評価 → ABC算定 → 承認 → 公開                   │
│  (uses 資源評価Repository)                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Review Workflow                              │
│  査読者 → Excel Upload → 査読用資源評価 → ABC算定 → 結果確認     │
│  (uses 査読用資源評価Repository)                                 │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Reviewer A  │  │ Reviewer B  │  │ Reviewer C  │              │
│  │ (isolated)  │  │ (isolated)  │  │ (isolated)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Type Design

```typescript
/**
 * 査読用資源評価
 *
 * 査読者が公開データをアップロードして ABC を算定するための独立した評価環境。
 * 公式の資源評価とは完全に分離され、査読者ごとに独立したインスタンスを持つ。
 */
interface 査読用資源評価 {
  /** 査読者のユーザーID */
  readonly 査読者ID: string;

  /** 対象資源 */
  readonly 対象: 資源情報;

  /** 評価年度 */
  readonly 年度: number;

  /** 当年までの資源計算結果（Excel からアップロード） */
  readonly 資源計算結果: 当年までの資源計算結果;

  /** 作成日時 */
  readonly 作成日時: Date;

  /** 元データの種類 */
  readonly 元データ種別: "Excel公開データ";
}
```

### Repository Design

```typescript
interface 査読用資源評価Repository {
  /**
   * 査読者の評価を保存
   */
  save(評価: 査読用資源評価): Promise<void>;

  /**
   * 査読者の評価一覧を取得
   */
  findBy査読者ID(査読者ID: string): Promise<査読用資源評価[]>;

  /**
   * 特定の評価を取得
   */
  findBy査読者IDAndResource(
    査読者ID: string,
    資源名: 資源名,
    年度: number
  ): Promise<査読用資源評価 | undefined>;

  /**
   * 査読者の評価を削除
   */
  delete(査読者ID: string, 資源名: 資源名, 年度: number): Promise<void>;
}
```

### Data Flow

```text
1. Reviewer uploads Excel file
   ↓
2. ExcelParser extracts 当年までの資源計算結果
   ↓
3. Create 査読用資源評価 with reviewer's ID
   ↓
4. Save to 査読用資源評価Repository
   ↓
5. Reviewer views their /review/ page (filtered by their ID)
   ↓
6. Reviewer runs 将来予測 and determines ABC
   ↓
7. ABC result can be saved (associated with 査読用資源評価)
```

## Consequences

### Benefits

1. **Clean Separation**
   - Official assessment data is never at risk
   - Review workflow is completely independent

2. **Per-Reviewer Isolation**
   - Each reviewer has their own workspace
   - No interference between reviewers

3. **Explicit Domain Concept**
   - "査読用資源評価" is a first-class domain concept
   - Clear intent in code and database schema

4. **Auditable**
   - Can track which reviewer uploaded what data
   - Clear provenance of ABC calculations

### Drawbacks

1. **Parallel Infrastructure**
   - Need separate repository, possibly separate database table
   - Some duplication of CRUD operations

2. **Type Relationship**
   - Need to decide if 査読用資源評価 extends 資源評価 or is separate
   - May need adapters to use same ABC calculation logic

### Mitigation

- Extract common calculation logic that works with both types
- Consider using composition over inheritance for shared behavior

## Database Schema (Conceptual)

```sql
-- Official assessments (existing)
CREATE TABLE stock_assessments (
  id UUID PRIMARY KEY,
  stock_group_id UUID REFERENCES stock_groups(id),
  fiscal_year INTEGER,
  status TEXT,
  -- ... other fields
);

-- Review assessments (new)
CREATE TABLE review_assessments (
  id UUID PRIMARY KEY,
  reviewer_id UUID REFERENCES auth.users(id),
  stock_group_id UUID REFERENCES stock_groups(id),
  fiscal_year INTEGER,
  calculation_result JSONB,  -- 当年までの資源計算結果
  created_at TIMESTAMP DEFAULT NOW(),
  source_type TEXT DEFAULT 'Excel公開データ'
);

-- Index for efficient per-reviewer queries
CREATE INDEX idx_review_assessments_reviewer 
  ON review_assessments(reviewer_id);
```

## Related ADRs

- ADR 0025: Branded Types for Calculation Results
- ADR 0029: Excel Parser Strategy Pattern

## Future Considerations

- Could allow reviewers to "fork" official assessments for comparison
- Could implement review comments/annotations
- Could add approval workflow for promoting review assessments to official

