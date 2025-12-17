# ADR 0018: Assessment Result Versioning

## Status

Accepted

## Context

In the stock assessment workflow, the primary assignee calculates and saves assessment results multiple times during the evaluation process. When requesting an internal review, reviewers (secondary assignees) need to approve a specific version of the results.

Current issues:

- Assessment results are overwritten on each save
- No way to track which version was reviewed and approved
- Dashboard shows the latest saved result, not the approved one
- Reviewers cannot verify which specific calculation they are approving

Requirements:

- Primary assignees may calculate and save results multiple times
- Internal review should target a specific version
- Approved version should be displayed on the dashboard
- Version history should be viewable on the assessment page
- **Internal and external versioning should be separate**
- **Same parameter set should reference the same version** (no duplicate versions for identical inputs)

## Decision

Implement version management for assessment results with the following design:

### 1. Separate Internal and External Versioning

**Internal versions** and **external versions** serve different purposes and have different numbering schemes:

| Aspect    | Internal Version           | External Version                  |
| --------- | -------------------------- | --------------------------------- |
| Scope     | All saved calculations     | Published to external reviewers   |
| Numbering | Sequential (v1, v2, v3...) | Date-based (初版, yyyymmdd改訂版) |
| Trigger   | Every save                 | External publication              |
| Display   | Assessment page            | Dashboard, external facing        |

**Rationale:**

- Internal versions track work history for primary/secondary assignees
- External versions track official publications to stakeholders
- Different audiences need different version representations
- Clear separation prevents confusion between "work in progress" and "officially published"

### 2. Auto-increment Version on Save (Internal)

Every time "評価結果を登録" (Save Assessment Result) is clicked, a new internal version is created automatically. Versions are numbered sequentially per stock per fiscal year (v1, v2, v3...).

**Rationale:**

- Simple and intuitive for users
- No additional UI complexity (no "new version" button)
- Automatic audit trail of all calculations
- Consistent with the workflow where saving is a deliberate action

**Alternatives considered:**

- Explicit "Save as New Version" button: Rejected because it adds unnecessary UI complexity and users might forget to create new versions
- Timestamp-based versions: Rejected because sequential numbers are more user-friendly for internal tracking

### 3. Store Parameters with Results (Reproducibility)

Each assessment result record stores the input parameters (catch data, biological data) as JSONB alongside the calculated result. This enables:

1. **Reproducibility**: Results can be recalculated from stored parameters
2. **Deduplication**: Same parameter set returns existing version instead of creating a duplicate

**Parameter deduplication logic:**

```text
On save:
1. Serialize parameters to JSON
2. Check if identical parameters exist for this stock/fiscal_year
3. If exists: return existing version number (no new record)
4. If not: create new version with parameters
```

**Comparison method**: Strict JSON string equality (md5 hash comparison in database)

**Rationale:**

- Audit trail requires knowing what inputs produced what outputs
- Prevents accidental duplicate versions from repeated saves with same data
- Enables future feature: "recalculate" button using stored parameters

**Alternatives considered:**

- Store hash only: Rejected because parameters cannot be recovered for recalculation
- No deduplication: Rejected because it wastes storage and confuses version history

### 4. Version Selection for Review Request

When requesting internal review, the primary assignee selects which version to submit from the version history.

**Rationale:**

- Allows flexibility to choose the best version
- Enables users to continue calculating without auto-submitting the latest
- Clear audit trail of which version was submitted

**Alternatives considered:**

- Auto-submit latest version: Rejected because users may want to submit an earlier, more stable version
- No version selection (always latest): Rejected because it lacks flexibility for the review process

### 5. Store Approved Version in Assessment Status

The `stock_assessments` table tracks which internal version was approved via `approved_version` column.

**Rationale:**

- Single source of truth for the currently approved internal version
- Easy to query for dashboard display
- Decoupled from status transitions

### 6. Publication History Table (External Versioning)

A separate `assessment_publications` table tracks the history of external publications.

**Rationale:**

- Explicit tracking of which internal version was published at what time
- Supports "yyyymmdd改訂版" display format for external users
- Enables reconstruction of publication history without relying on audit logs
- Clear accountability for external-facing publications

**Alternatives considered:**

- Store only latest publication info in `stock_assessments`: Rejected because publication history would be lost on revision
- Rely on audit_log only: Rejected because explicit data model is cleaner and more queryable

### 7. External Version Display Format

- **Initial publication**: No version indicator (e.g., "2024年度マイワシ太平洋系群")
- **Revisions**: Date-based format (e.g., "2024年度マイワシ太平洋系群 (20241217改訂版)")

**Rationale:**

- Clean display for initial publications
- Date-based revision format provides clear context for external stakeholders
- Matches common conventions in official document versioning

### 8. Dashboard Shows Published Version

The dashboard displays results from the latest published version, not the latest internal version.

**Rationale:**

- External users see only officially published results
- Prevents displaying unreviewed calculations
- Consistent with the review workflow

## Schema Changes

```sql
-- Add versioning to assessment_results (internal versions)
ALTER TABLE assessment_results
  ADD COLUMN fiscal_year INTEGER NOT NULL,
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN stock_group_id UUID REFERENCES stock_groups(id),
  ADD COLUMN parameters JSONB;  -- Store input parameters for reproducibility

-- Index for version queries
CREATE INDEX idx_assessment_results_version
  ON assessment_results(stock_group_id, fiscal_year, version);

-- Unique constraint to prevent duplicate parameter sets per stock/fiscal_year
-- Uses md5 hash of parameters JSON for efficient comparison
CREATE UNIQUE INDEX idx_assessment_results_unique_params
  ON assessment_results(stock_group_id, fiscal_year, md5(parameters::text))
  WHERE parameters IS NOT NULL;

-- Add approved version tracking to stock_assessments
ALTER TABLE stock_assessments
  ADD COLUMN approved_version INTEGER;

-- Publication history for external versioning
CREATE TABLE assessment_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_group_id UUID NOT NULL REFERENCES stock_groups(id),
  fiscal_year INTEGER NOT NULL,
  internal_version INTEGER NOT NULL,  -- Which internal version was published
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revision_number INTEGER NOT NULL,   -- 1 = initial, 2 = first revision, etc.
  UNIQUE(stock_group_id, fiscal_year, revision_number)
);

CREATE INDEX idx_assessment_publications_lookup
  ON assessment_publications(stock_group_id, fiscal_year, revision_number DESC);
```

### Parameters JSON Structure

```json
{
  "catchData": {
    "value": "漁獲量データの値"
  },
  "biologicalData": {
    "value": "生物学的データの値"
  }
}
```

## Workflow Examples

### Example 1: Initial Publication

1. Primary assignee saves results (internal v1, v2, v3)
2. Primary assignee requests internal review for v3
3. Secondary assignee approves → `approved_version = 3`
4. Admin publishes externally → `assessment_publications` record created:
   - `internal_version = 3, revision_number = 0, published_at = 2024-10-15`
5. Dashboard shows: "2024年度マイワシ太平洋系群" (no revision indicator)

### Example 2: Revision After Reconsideration

1. External review triggers reconsideration request
2. Primary assignee saves new results (internal v4, v5, v6, v7)
3. Primary assignee requests internal review for v7
4. Secondary assignee approves → `approved_version = 7`
5. Admin publishes externally → new `assessment_publications` record:
   - `internal_version = 7, revision_number = 1, published_at = 2024-12-17`
6. Dashboard shows: "2024年度マイワシ太平洋系群 (20241217改訂版)"

## Consequences

### Benefits

1. **Complete Internal History**
   - All calculation results are preserved
   - Full audit trail of assessment iterations
   - Can compare internal versions if needed

2. **Result Reproducibility**
   - Parameters stored with each version
   - Results can be recalculated from stored parameters
   - Full traceability from inputs to outputs

3. **No Duplicate Versions**
   - Same parameter set returns existing version
   - Clean version history without redundant entries
   - Storage efficiency

4. **Clear External Publication History**
   - Explicit record of which internal version was published when
   - Supports date-based revision display
   - No reliance on audit logs for critical publication data

5. **Review Integrity**
   - Reviewers approve a specific, immutable internal version
   - No confusion about which calculation was approved
   - Clear accountability in the approval process

6. **Workflow Flexibility**
   - Primary assignees can continue working after submitting for review
   - Can submit an earlier internal version if the latest has issues
   - Supports iterative refinement

7. **Appropriate Versioning for Each Audience**
   - Internal users see sequential version numbers (v1, v2, v3)
   - External users see date-based revisions (20241217改訂版)
   - Clear separation of concerns

### Drawbacks

1. **Storage Increase**
   - More rows in assessment_results table
   - Additional assessment_publications table
   - However, the number of versions per stock per year is typically small (< 10)

2. **UI Complexity**
   - Need to display version history
   - Need version selection UI for review request
   - However, this provides valuable transparency

3. **Query Complexity**
   - Need to join with publications table for dashboard
   - However, indexes mitigate performance concerns

### Race Condition Considerations

**Decision: Atomic insertion using database function**

Potential race condition when determining revision number:

- Between reading the last publication and inserting a new record, another request could insert with the same revision number.

**Why handle race conditions despite single primary assignee per stock:**

While each stock has exactly one primary assignee (making concurrent operations rare), we still implemented atomic insertion for the following reasons:

1. **Defense in depth**: Even with business-level constraints, database-level protection provides an additional safety layer.
2. **Administrator operations**: External publication is performed by administrators, not primary assignees. Multiple administrators could theoretically operate on the same stock simultaneously.
3. **Future-proofing**: As the system scales, assumptions about single operators may change.
4. **Low implementation cost**: Using a database function with row-level locking is straightforward and has minimal performance impact.

**Implementation:**

The `insert_publication_atomic` database function atomically:

1. Acquires a row-level lock using `FOR UPDATE`
2. Calculates the next revision number
3. Inserts the new publication record
4. Returns the assigned revision number

This ensures uniqueness without relying on client-side logic or retry mechanisms.

## Implementation Notes

### Domain Function Signatures

Status change domain functions require a `対象バージョン` (target version) parameter to ensure the status change is explicitly tied to a specific version:

- `内部査読依頼(対象資源評価, 日時, 操作者, 対象バージョン)` - Request internal review for a specific version
- `外部公開(対象資源評価, 日時, 操作者, 対象バージョン)` - Publish a specific version externally
- `再検討依頼(対象資源評価, 日時, 操作者, 対象バージョン)` - Request reconsideration for a specific version
- `受理(対象資源評価, 日時, 操作者, 対象バージョン)` - Approve a specific version

**Exception**: `作業着手` (start work) does not require a version parameter because no version exists when transitioning from "未着手" (not started) to "作業中" (in progress).

The version information is stored in the status change event (`ステータス変化イベント.対象バージョン`) for audit purposes.

## Related ADRs

- ADR 0004: Audit Logging - Complements version tracking with action audit
- ADR 0005: No Event Sourcing - Versioning provides history without full event sourcing
- ADR 0012: Use Server Actions - Version operations implemented as Server Actions
