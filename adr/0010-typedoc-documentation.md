# ADR 0010: TypeDoc for Domain References

## Status

Accepted

## Context

We need to share domain knowledge among stakeholders:

- **Domain experts**: Understand business concepts without reading code
- **Developers**: Reference canonical definitions of domain terms
- **New team members**: Learn the domain model quickly

The documentation should cover:

- Domain models (`src/domain/models.ts`)
- Domain implementations (`src/domain/implementations/`)
- Application services (`src/application/`)

Requirements:

1. **JSDoc comments** in source code should become browsable references
2. **Integration with Jekyll** site in `docs/` directory
3. **No external service dependencies** (generated locally)
4. **TypeScript-native** tooling

## Decision

Use **TypeDoc** to generate domain references from TypeScript source files with JSDoc comments.

### Configuration

```json
// typedoc.json
{
  "entryPoints": [
    "src/domain/models.ts",
    "src/domain/implementations/fishery-stock.ts",
    "src/application/index.ts"
  ],
  "out": "docs/references",
  "name": "資源評価 web リファレンス",
  "skipErrorChecking": true,
  "exclude": [".next/**/*", "scripts/**/*"]
}
```

Key settings:

| Option              | Value                       | Reason                                  |
| ------------------- | --------------------------- | --------------------------------------- |
| `out`               | `docs/references`           | Output alongside Jekyll site            |
| `name`              | `資源評価 web リファレンス` | Japanese title for stakeholders         |
| `skipErrorChecking` | `true`                      | Avoid errors from external module types |
| `exclude`           | `.next/`, `scripts/`        | Focus on domain/application code        |

### Integration with Jekyll

TypeDoc generates static HTML files in `docs/references/`. Jekyll copies this directory as-is to `_site/references/` during build.

### Git Ignore

Generated references are excluded from version control:

```
# .gitignore
docs/references/
```

## Consequences

### Benefits

1. **Shared vocabulary**: Stakeholders can reference canonical domain definitions
2. **Single source of truth**: Documentation lives in source code as JSDoc comments
3. **Always up-to-date**: Regenerated from source on each build
4. **Accessible to non-developers**: Browsable HTML without reading TypeScript

### Drawbacks

1. **Build step required**: Must run `pnpm docs:generate` to update
2. **Technical appearance**: Generated output still looks like code documentation

### Commands

```bash
# Generate references
pnpm docs:generate

# Build Jekyll site (includes references)
cd docs && bundle exec jekyll build
```

## Related

- TypeDoc: https://typedoc.org/
- JSDoc reference: https://jsdoc.app/
