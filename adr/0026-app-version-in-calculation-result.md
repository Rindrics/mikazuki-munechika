# ADR 0026: Store App Version in Calculation Result

## Status

Accepted

## Context

ABC calculation results depend not only on input parameters but also on the calculation logic itself. When the application is updated, the same inputs may produce different results due to algorithm changes, bug fixes, or improvements.

For reproducibility and traceability, we need to record which version of the application was used to calculate each result.

## Decision

**The calculation logic (not the save process) includes the `appVersion` in the `ABC算定結果`.**

### Rationale

1. **Correct timing**: The version that matters is the one used at calculation time, not save time
2. **Avoids race conditions**: If the app is updated between calculation and save, the save process would record the wrong version
3. **Reproducibility**: Same version + same inputs = same results (for debugging and auditing)

### Implementation

```typescript
// src/domain/data/index.ts
export interface ABC算定結果 {
  value: string;
  unit: "トン";
  資源量?: 資源量;
  appVersion: string;  // Added
}

// Calculation logic returns the version
return {
  value: `ABC calculated via: ${processPath}`,
  unit: "トン",
  資源量: { 値: "dummy", 単位: "トン" },
  appVersion: APP_VERSION,  // Set at calculation time
};
```

### Version Source

The version is read from `package.json`:

```typescript
// src/utils/version.ts
import packageJson from "../../package.json";
export const APP_VERSION = packageJson.version;
```

### Legacy Data Handling

For data saved before this change (without `appVersion`), the repository returns `"unknown"`:

```typescript
function parseResultFromDb(dbValue: unknown): ABC算定結果 {
  // ...
  appVersion: String(obj.appVersion ?? "unknown"),
}
```

## Consequences

### Positive

- **No migration required**: JSONB column automatically stores new fields
- **Backward compatible**: Legacy data returns `"unknown"` version
- **Accurate tracking**: Version is captured at the exact moment of calculation
- **Debugging support**: Can identify which version produced unexpected results

### Negative

- All places creating `ABC算定結果` must include `appVersion` (enforced by TypeScript)
- Tests need to include `appVersion` in mock data

### Neutral

- Version format follows semver (e.g., "0.2.14")
