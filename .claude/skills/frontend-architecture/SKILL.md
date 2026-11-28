---
name: frontend-architecture
description: Where things go in the DevDigest client (Next.js App Router + React 19 + TanStack Query + next-intl). Use whenever you create, move, split or review files under client/ — a page or route, a component, a hook, constants, helpers, styles, types, business logic, data fetching, i18n strings or tests — and whenever the question is "where should this live?", "should I split this component?", "helpers or lib?", "is this business logic?". Also use when reviewing a diff that touches client/ for architecture and code organization. Covers placement and boundaries only; React idioms, Next.js APIs, TypeScript and RTL testing live in their own skills.
metadata:
  version: "1.1.0"
  owner: DevDigest team
  scope: client/
---

# Frontend architecture (DevDigest client)

This skill answers: **where does this code belong, and what may it depend on?** A predictable layout lets a reviewer spot a mistake from the path alone and keeps a feature's change inside one folder.

Two principles drive every rule:

1. **Colocation** — put code as close as possible to where it is used. Used by one component → inside that component's folder. Used by one route → in that route folder. It moves up only when a second consumer appears.
2. **One-way dependencies** — `vendor (@devdigest/ui, @devdigest/shared) → lib → components → app`. Lower layers never import higher ones; a shared component never imports from a route folder.

## Repo map (client/src)

| What | Where (real convention) |
|---|---|
| Route files | `app/<route>/page.tsx`, `layout.tsx` |
| Route-level constants / helpers / styles | `app/<route>/constants.ts`, `helpers.ts`, `styles.ts` |
| Component used by one route | `app/<route>/_components/<Name>/` |
| Child used by one component only | `<Name>/_components/<Child>/` (nest, don't flatten) |
| Shared app components (2+ routes) | `components/<kebab-group>/` — e.g. `components/app-shell/AppShell.tsx`, `components/diff-viewer/<Name>/` |
| Hooks of a shared component group | `components/<group>/hooks/useX.ts` + `hooks/index.ts` |
| HTTP client | `lib/api.ts` (`ApiError`) — the only place that calls the server |
| Server-state hooks (TanStack Query) | `lib/hooks/<domain>.ts` (core, agents, reviews, repo-intel, trace), imported via `@/lib/hooks` |
| Domain logic shared across routes | `lib/<topic>.ts` (e.g. `lib/findings.ts` + `findings.test.ts`) |
| Generic utils | `lib/<verb-noun>.ts` (e.g. `format-cost.ts`, `github-urls.ts`) |
| React contexts / providers | `lib/<name>-context.tsx`, `lib/providers.tsx` |
| Client-only shared types | `lib/types.ts` |
| Server contracts / types | `@devdigest/shared` (`vendor/shared`) — never redefine |
| Design system | `@devdigest/ui` (`vendor/ui`) — import from the barrel only |
| UI strings | `client/messages/en/<namespace>.json`, read with `useTranslations('<namespace>')` |
| Test setup / shared fixtures | `test/setup.ts`, `test/fixtures/` |

## The component folder

Every non-trivial component is a folder named in PascalCase:

```
FindingCard/
├── FindingCard.tsx        # the component, named export
├── index.ts               # export { FindingCard, FindingCard as default } from "./FindingCard";
├── constants.ts           # SCREAMING_SNAKE constants used by this component
├── helpers.ts             # pure functions used by this component (no React)
├── helpers.test.ts        # unit tests for helpers
├── styles.ts              # export const s = { … } satisfies CSSProperties / (args) => CSSProperties
├── FindingCard.test.tsx   # RTL test
└── _components/           # children used only by FindingCard
```

Create only the files you need (a component with no constants has no `constants.ts`). Import a component through its folder (`./_components/FindingCard`), not its inner file.

## Decision guide: where does this go?

Stop at the first "yes":

1. **A route?** → `app/<route>/page.tsx`. Keep it thin: read params/search params, call hooks, compose components. Filtering, sorting, counting and grouping belong in helpers, not inline in the page.
2. **User-facing text?** → `messages/en/<namespace>.json`. Not in JSX, not in constants, not returned from helpers (`"now"`, `"—"`, `"Critical"` are UI text too).
3. **Talks to the server?** → request in `lib/api.ts`, query/mutation hook in `lib/hooks/<domain>.ts`. Components never call `fetch` or `api.*` directly.
4. **A pure rule over DevDigest data** (severity order, PR size bucket, findings filter/sort)? → business logic, a pure function:
   - used by one component → its `helpers.ts`;
   - used by one route → `app/<route>/helpers.ts`;
   - used by 2+ routes → `lib/<topic>.ts`.
5. **A domain-free helper** (format cost, build a GitHub URL, clamp)? → `lib/<verb-noun>.ts`.
6. **A component?** One route → `_components/<Name>/`. Only one parent → parent's `_components/`. 2+ routes → `components/<group>/`. Generic visual primitive → check `@devdigest/ui` first.
7. **A constant?** One file → top of that file (e.g. `OPEN_STATUSES` in a page is fine if only the page uses it). Several files of a component/route → that folder's `constants.ts`. Across routes → `lib/<topic>.ts` or `lib/feature-models.ts`-style module.
8. **Inline styles?** → the folder's `styles.ts` as `s.<part>`. Dynamic styles are functions (`s.card(focused, color)`).

## Imports

- Cross-folder imports use the `@/` alias (`@/lib/github-urls`, `@/components/app-shell`). Never climb with deep relatives like `../../../../../../../lib/x` — it breaks on every move and hides the layer you are crossing.
- Inside a component folder use `./constants`, `./helpers`, `./styles`, `./_components/X`.
- Contracts from `@devdigest/shared`, UI from `@devdigest/ui`, hooks from `@/lib/hooks`.
- Never import from another route's `_components/`. If you need it, promote it to `components/` in the same change.

## Business vs application vs UI logic

| Kind | Example | Lives in | Tested with |
|---|---|---|---|
| Business logic | `sizeOf(pr)`, sort findings by severity, count blockers | `helpers.ts` / `lib/<topic>.ts` | Vitest, no React |
| Application logic | selected finding, run review, SSE subscription, URL query state | hooks (`lib/hooks`, `components/<group>/hooks`) | renderHook / RTL |
| UI | JSX, layout, event wiring | component `.tsx` + `styles.ts` | RTL |

A hook or page body with `filter`/`sort`/`reduce` over domain data is a smell: extract a named pure function into `helpers.ts` and test it. More: `references/logic-placement.md`.

## Splitting components

Split when: it does two jobs (fetch + rich render); a block owns state nobody else reads; a block has a name (`FindingRow`); whole-screen branches (loading / empty / error / data); repetition. Don't split by line count alone. Put the child in the parent's `_components/`. More: `references/component-splitting.md`.

## Naming

- Component folder and file: `PascalCase` (`RunTraceDrawer/RunTraceDrawer.tsx`), named export matching the file.
- Shared component groups: `kebab-case` folder (`diff-viewer/`, `app-shell/`).
- Hooks: `useCamelCase.ts`. Lib modules: `kebab-case.ts`.
- Tests next to the code: `X.test.tsx`, `helpers.test.ts`.
- Styles object is always `s`; constants `SCREAMING_SNAKE_CASE`, `as const` where literal types matter.

## Reviewing a client diff

Report findings most severe first:

```
[severity] path/to/file.tsx:line — rule broken — why it matters — where it should go
```

- **critical** — boundary that causes bugs or leaks: component calls `fetch`/server directly; client imports server-only code or secrets; shared component imports from a route folder; a server contract type redefined instead of imported from `@devdigest/shared`.
- **major** — business logic inline in a page/component/hook; user-facing string hard-coded (including in helpers/constants); logic duplicated that already exists in `lib/`; component imported from another route's `_components/`.
- **minor** — deep relative import instead of `@/`; inline styles instead of `styles.ts`; misplaced constant; missing colocated test for new helpers; premature split.

Flag what the diff changes; mention pre-existing issues it touches as follow-ups, not blockers.

## Reference files

- `references/folder-structure.md` — real tree, component folder anatomy, promotion rule, good/bad layouts.
- `references/logic-placement.md` — business logic, hooks, helpers vs lib, constants, styles, types, with examples from this repo.
- `references/component-splitting.md` — split triggers, container/presentational, `_components` nesting.
- `references/next-app-router.md` — route files, private folders, `'use client'` placement.
