# ADR 0021: Manage Page Tabs with Query Parameters

## Status

Accepted

## Context

The `/manage` page needs to support multiple administrative functions:

- Fiscal year management (existing)
- User management (new)
- Potentially more in the future

We need a URL structure that:

1. **Feels like a SPA** - Tab switching should be fast without full page reload
2. **Supports URL sharing** - Users should be able to share links to specific tabs
3. **Keeps code organized** - Related functionality should be co-located

### Options Considered

1. **Option A: Separate routes (`/manage/users`)**
   - Each tab is a separate Next.js page
   - Clear code separation
   - Full page navigation on tab switch

2. **Option B: Query parameters (`/manage?tab=users`)**
   - Single page with tab state in URL
   - SPA-like experience
   - URL is shareable

3. **Option C: Hash fragments (`/manage#users`)**
   - Client-side only routing
   - Server cannot read hash on initial load
   - Not ideal for SSR

## Decision

Use query parameters for tab navigation:

```text
/manage           → Default tab (fiscal-year)
/manage?tab=users → User management tab
```

### Implementation

```typescript
// Using Next.js useSearchParams
const searchParams = useSearchParams();
const tab = (searchParams.get("tab") as Tab) || "fiscal-year";

// Tab navigation updates URL without full reload
router.push(`/manage?tab=${tabId}`);
```

### URL Examples

| URL | Tab |
|-----|-----|
| `/manage` | 年度管理 (default) |
| `/manage?tab=fiscal-year` | 年度管理 |
| `/manage?tab=users` | ユーザー管理 |

## Consequences

### Benefits

1. **SPA-like Experience**
   - Tab switching is fast (client-side navigation)
   - No full page reload
   - Smooth user experience

2. **URL Sharing**
   - Users can share links to specific tabs
   - Bookmarks work correctly
   - Browser back/forward navigation works

3. **Single Page Component**
   - All admin functionality in one place
   - Shared authentication/authorization logic
   - Easier to maintain consistent UI

4. **Server-Side Rendering Support**
   - Query params are available on server
   - Initial render shows correct tab
   - Better than hash fragments for SSR

### Drawbacks

1. **Larger Page Component**
   - Single `page.tsx` contains all tab logic
   - May grow complex as tabs are added
   - Mitigated by extracting panel components

2. **Shared Loading State**
   - All tabs share the same loading boundary
   - Cannot use Next.js route-level loading

### Mitigation

- Extract each tab's content into separate panel components (`FiscalYearPanel`, `UsersPanel`)
- Keep Server Actions in the same `actions.ts` file, organized by section
- Use component-level loading states within each panel

## Related ADRs

- ADR 0012: Use Server Actions
- ADR 0018: Use English Slugs for URL Paths
