# Next.js App Router — organization rules

Scope: where files go and which boundary they sit on. API usage (caching, metadata, data fetching options) belongs to the Next.js best-practices skill.

## Route segment files

| File | Purpose | Keep it |
|---|---|---|
| `page.tsx` | makes the segment routable | thin — params → top component |
| `layout.tsx` | shared shell for child segments | no data shaping |
| `loading.tsx` | Suspense fallback for the segment | skeleton only |
| `error.tsx` | error boundary (`'use client'`) | message + retry |
| `not-found.tsx` | 404 UI | static |

Anything else inside `app/` is safe to colocate (it is not routable without `page.tsx`/`route.ts`), but keep components in `_components/` and route-level logic in `constants.ts` / `helpers.ts` / `styles.ts` next to `page.tsx`, so intent is explicit and it can never collide with a future Next.js file convention.

## Route groups

Use `(group)` folders to share a layout or organize sections without changing URLs, e.g. `app/(dashboard)/repos/…`, `app/(settings)/settings/…`. Do not use groups as a place to dump shared components.

## Server / Client boundary

- Route files are Server Components by default. Keep them that way.
- Put `'use client'` on the smallest interactive component. Everything it imports becomes client code, so a `'use client'` page drags the whole subtree into the bundle.
- Client Components cannot import Server Components; pass server-rendered UI as `children` or props.
- Props crossing the boundary must be serializable (no functions, class instances, Dates unless serialized).
- In DevDigest, data comes from the separate Fastify server via `lib/api.ts` + TanStack Query, so most data components are Client Components. Today most `page.tsx` files are `'use client'` and call hooks directly — that is the accepted current convention, not a review finding. When a page grows, prefer moving its body into a `_components/<Route>View/` client component and keeping `page.tsx` a thin Server Component (as `agents/page.tsx` → `AgentsListView` already does).
- Never import server-only modules or read secrets in client code; only `NEXT_PUBLIC_*` env vars reach the browser.

**Less preferable (fine today, refactor when the page grows):**

```tsx
// app/agents/page.tsx
'use client';                                   // whole route becomes client
export default function AgentsPage() {
  const { data } = useAgents();
  return <AgentTable agents={data ?? []} />;
}
```

**Preferred (what agents/page.tsx does now):**

```tsx
// app/agents/page.tsx — Server Component
import { AgentsListView } from './_components/AgentsListView';
export default function AgentsPage() {
  return <AgentsListView />;
}

// app/agents/_components/AgentsListView/AgentsListView.tsx
'use client';
export function AgentsListView() {
  const { data } = useAgents();
  return <AgentTable agents={data ?? []} />;
}
```

## Dynamic segments

- Folder names: `[repoId]`, `[pullId]` — match the param name used in `lib/api.ts`.
- Parse/validate params once in `page.tsx` (or the route's `helpers.ts`) and pass typed values down; do not read `useParams()` deep in the tree when a prop would do.
