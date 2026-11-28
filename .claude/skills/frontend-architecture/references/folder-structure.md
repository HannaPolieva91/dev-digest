# Folder structure — how the client is organized

## The real tree (abridged)

```
client/
├── messages/en/                       # next-intl: agents.json, prReview.json, settings.json, common.json, …
└── src/
    ├── app/
    │   ├── layout.tsx, page.tsx, globals.css
    │   ├── agents/
    │   │   ├── page.tsx
    │   │   ├── _components/
    │   │   │   ├── AgentCard/          # AgentCard.tsx, index.ts, constants.ts, helpers.ts, styles.ts, AgentCard.test.tsx
    │   │   │   └── AgentsListView/
    │   │   │       └── _components/CreateAgentModal/
    │   │   └── [id]/
    │   │       ├── page.tsx
    │   │       └── _components/AgentEditor/_components/ConfigTab/
    │   ├── repos/[repoId]/pulls/
    │   │   ├── page.tsx
    │   │   ├── constants.ts, helpers.ts, styles.ts       # route-level
    │   │   ├── _components/ (FilterBar, FindingsCell, PRRow)
    │   │   └── [number]/
    │   │       ├── page.tsx
    │   │       └── _components/ (FindingCard, FindingsPanel, RunTraceDrawer/_components/…, VerdictBanner, …)
    │   ├── settings/[section]/_components/SettingsView/_components/…
    │   └── onboarding/_components/AddRepoView/
    ├── components/                    # shared by 2+ routes
    │   ├── app-shell/  (AppShell.tsx, constants.ts, helpers.ts, hooks/useGlobalShortcuts.ts, index.ts)
    │   ├── diff-viewer/ (CodeLine/, CommentCard/, DiffViewer/, FileCard/, InlineComposer/, …)
    │   ├── page-shell/, repo-not-found/, run-cost-badge/, hover-card/, mermaid-diagram/
    ├── lib/
    │   ├── api.ts                     # HTTP client + ApiError
    │   ├── hooks/ (core.ts, agents.ts, reviews.ts, repo-intel.ts, trace.ts, index.ts)
    │   ├── findings.ts (+ test)       # shared domain logic
    │   ├── format-cost.ts, github-urls.ts, model-label.ts, feature-models.ts
    │   ├── providers.tsx, repo-context.tsx, theme.tsx, toast.tsx
    │   └── types.ts
    ├── i18n/request.ts
    ├── test/ (setup.ts, smoke.test.tsx, fixtures/)
    └── vendor/ (ui → @devdigest/ui, shared → @devdigest/shared)
```

## Rules

1. **Routes stay thin.** `page.tsx` reads params, calls hooks, composes components. Derivations go to `helpers.ts`.
2. **Private folders start with `_`.** `_components/` is never routed and means "only for this route/component".
3. **Nest children under their only parent.** `RunTraceDrawer/_components/TraceBody/` — not a sibling at route level — so deleting the parent deletes its children.
4. **Promote on the second consumer, not before.** When a second route needs a component, move it to `components/<group>/` in the same change and fix both imports. Same for logic: component `helpers.ts` → route `helpers.ts` → `lib/<topic>.ts`.
5. **Import direction:** `vendor` ← `lib` ← `components` ← `app`. Nothing outside `app/` imports from `app/`; no route imports another route's `_components/`.
6. **`index.ts` per component folder is the convention** (`export { X, X as default } from "./X"`). Don't add barrels that re-export a whole directory tree beyond the existing `@devdigest/ui` and `@/lib/hooks`.

## Good vs bad

**Bad** — deep relative import across layers:

```ts
import { githubBlobUrl } from "../../../../../../../lib/github-urls";
```

**Good:**

```ts
import { githubBlobUrl } from "@/lib/github-urls";
```

**Bad** — a child used only by `RunTraceDrawer` flattened to route level:

```
pulls/[number]/_components/TraceBody/
pulls/[number]/_components/RunTraceDrawer/
```

**Good:**

```
pulls/[number]/_components/RunTraceDrawer/_components/TraceBody/
```

**Bad** — shared component reaching into a route:

```ts
// components/run-cost-badge/RunCostBadge.tsx
import { sizeOf } from "@/app/repos/[repoId]/pulls/helpers";   // ❌
```

**Good** — move `sizeOf` to `lib/pulls.ts` (now two consumers) and import it from both places.

**Bad** — new component file dropped next to the page without a folder:

```
agents/_components/AgentBadge.tsx
```

**Good:**

```
agents/_components/AgentBadge/AgentBadge.tsx
agents/_components/AgentBadge/index.ts
```

## When the repo and this file disagree

The repo wins for the change at hand. Mention the mismatch so the skill gets updated (and bump its version).
