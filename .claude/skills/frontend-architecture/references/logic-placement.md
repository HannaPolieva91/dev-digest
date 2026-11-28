# Logic placement — business logic, hooks, helpers, lib, constants, styles

## Three kinds of logic

| | Business logic | Application logic | UI |
|---|---|---|---|
| Answers | "What is true about DevDigest data?" | "What is the app doing now?" | "How does it look/react?" |
| React? | no | yes (state, effects, Query, router) | yes (JSX) |
| Form | pure function | hook | component + `styles.ts` |
| Location | `helpers.ts` → route `helpers.ts` → `lib/<topic>.ts` | `lib/hooks/`, `components/<group>/hooks/` | `<Name>/<Name>.tsx` |

Pure functions are trivial to test and reuse; logic inline in JSX, a page or a hook body is invisible to tests and gets duplicated.

### Example from this repo — the PR list page

**Bad** (current `app/repos/[repoId]/pulls/page.tsx`): filtering, search and sorting inline in the page.

```tsx
const filtered = (pulls ?? [])
  .filter((p) => status === "all" || p.status === status)
  .filter((p) => !q || p.title.toLowerCase().includes(q) || String(p.number).includes(q))
  .slice()
  .sort((a, b) => { /* by updated_at */ });
const openCount = (pulls ?? []).filter((p) => OPEN_STATUSES.has(p.status)).length;
```

**Good:** named, tested pure functions in the route's `helpers.ts`; the page only wires state.

```ts
// app/repos/[repoId]/pulls/helpers.ts
export function filterAndSortPulls(pulls: PullSummary[], o: { status: string; query: string; sort: SortKey }) { /* … */ }
export function countOpen(pulls: PullSummary[]) { return pulls.filter((p) => OPEN_STATUSES.has(p.status)).length; }

// page.tsx
const filtered = filterAndSortPulls(pulls ?? [], { status, query, sort });
const openCount = countOpen(pulls ?? []);
```

with `helpers.test.ts` next to it.

## Hooks

- Hooks own state and effects; they call pure functions for rules.
- Server state: `lib/hooks/<domain>.ts` wraps `lib/api.ts` with TanStack Query; export it through `lib/hooks/index.ts`, import via `@/lib/hooks`.
- Hooks of a shared component group: `components/<group>/hooks/useX.ts` (+ `index.ts`).
- A hook used by one component only can live in that component's folder as `useX.ts`.

**Bad:**

```tsx
useEffect(() => { fetch(`/api/pulls/${id}`).then((r) => r.json()).then(setPr); }, [id]);
```

**Good:**

```ts
const { data: pr } = usePull(repoId, number);   // from @/lib/hooks
```

## helpers.ts vs lib

Both hold pure functions. The difference is **scope**, not kind:

| Used by | Put it in |
|---|---|
| one component | `<Name>/helpers.ts` |
| one route | `app/<route>/helpers.ts` |
| 2+ routes or components in different routes | `lib/<topic>.ts` (domain, e.g. `lib/findings.ts`) or `lib/<verb-noun>.ts` (generic, e.g. `format-cost.ts`) |

Rules for helpers:
- no React imports, no hooks, no `fetch`;
- no user-facing text — return data or i18n keys, let the component translate. `relativeTime()` returning `"now"`/`"—"` is a minor violation; prefer returning `{ unit, value } | null` or using next-intl's `useFormatter().relativeTime` in the component;
- each exported function has a one-line JSDoc and, if it encodes a rule, a test.

DTO-style mapping (`toAgentDto`) is also a helper.

## Constants

| Scope | Location |
|---|---|
| one file | top of that file |
| one component | `<Name>/constants.ts` |
| one route | `app/<route>/constants.ts` |
| across routes | `lib/<topic>.ts` |
| server enums (`Severity`, `CiFailOn`, `Provider`) | `@devdigest/shared` — never copy |

- `SCREAMING_SNAKE_CASE`, `as const` / `Record<…>` typed.
- Theme values are CSS variables (`"var(--crit)"`), not hex.
- No English labels in constants — store message keys:

```ts
// ✅ COLUMN_KEYS = ["title", "status", "updated"] as const  → t(`list.columns.${key}`)
// ❌ COLUMNS = ["Title", "Status", "Updated"]
```

- Magic numbers in components (`SKELETON_ROWS`, `SIZE_SMALL_MAX`) become named constants.

## Styles

- Inline style objects move to the folder's `styles.ts` as `export const s = { … }`.
- Static entries use `satisfies CSSProperties`; dynamic ones are functions returning `CSSProperties`.
- Never mix shorthand and longhand of the same property (`border` + `borderLeft`) — React warns on re-render.
- Tailwind classes are fine where the component already uses them; don't mix both systems in one component.

## Types

- Server data: `@devdigest/shared` (`FindingRecord`, `FindingActionKind`, …). Use `Pick<…>` for narrow helper params.
- Props: inline in the component signature or a local `type Props` in the same file.
- Client-only shared types: `lib/types.ts`. Component-local view types: the component's `constants.ts`/`helpers.ts` where they are produced (as `pulls/constants.ts` does with `PrMeta`, `SizeInfo`).
