# frontend-architecture — README

**Version:** 1.1.0 (2026-11-28) · **Owner:** DevDigest team · **Scope:** `client/`

Human-facing notes for the skill. The agent reads `SKILL.md` and `references/`; this file records *why* the rules exist and *where they come from*, so the team can review, version and update the skill.

## What it covers

Architecture and code organization of the Next.js client:

- where pages, layouts and route-private files live (App Router, `_components`, route-level `constants/helpers/styles`);
- the component-folder convention (`Name.tsx`, `index.ts`, `constants.ts`, `helpers.ts`, `styles.ts`, tests, nested `_components/`);
- where shared components, hooks, constants, utils/helpers and types go;
- how to separate business logic, application logic (hooks) and UI;
- when and how to split components;
- import direction (shared → lib → components → app) and the server/client boundary;
- how to report architecture findings when reviewing a client diff.

## Out of scope (covered by other installed skills — do not duplicate)

| Topic | Skill |
|---|---|
| React idioms, hooks rules, effects, performance | react best-practices skill |
| Next.js APIs: caching, data fetching options, metadata, performance | next best-practices skill |
| Type-level TypeScript rules | typescript skill |
| How to write component tests | React Testing Library skill |
| Backend layering | `onion-architecture` |

If a rule here starts to describe *how to use* an API rather than *where code goes*, it belongs in one of those skills instead.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Repo map, decision guide, core rules, review format (always loaded when triggered) |
| `references/folder-structure.md` | Full target tree, good/bad layouts, promotion rule, barrels |
| `references/logic-placement.md` | Business vs application vs UI logic, hooks, utils vs helpers, constants, types |
| `references/component-splitting.md` | Split triggers, container/presentational, composition |
| `references/next-app-router.md` | Route files, private folders, route groups, server/client boundary |

## Decisions we made (and why)

1. **Codify the existing convention, don't invent a new one** — the repo already uses component folders with `index.ts`/`constants.ts`/`helpers.ts`/`styles.ts` and nested `_components/`; the skill describes that, plus the rules for where logic moves when it gains a second consumer.
2. **Promote to shared on the second consumer** — avoids a global `components/` bucket full of single-use files (colocation principle).
3. **`helpers.ts` vs `lib/` is about scope** — both hold pure functions; component → route → `lib/<topic>.ts` as consumers grow.
4. **`index.ts` per component folder is kept** (repo convention); no new directory-wide barrels beyond `@devdigest/ui` and `@/lib/hooks`.
4a. **`@/` alias instead of deep relative imports** — found `../../../../../../../lib/github-urls` in FindingCard.
5. **All server calls through `lib/api.ts` + `lib/hooks`** — matches the current codebase and keeps components testable.
6. **User-facing strings only in `messages/en`** — next-intl is already in the stack; constants may hold keys, not text.

## Sources

Folder structure and colocation
- Next.js — Project structure and organization: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js — Colocation / private folders (v14 docs): https://nextjs.org/docs/14/app/building-your-application/routing/colocation
- Kent C. Dodds — Colocation: https://kentcdodds.com/blog/colocation
- Kent C. Dodds — State colocation will make your React app faster: https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
- bulletproof-react — Project structure (feature folders, unidirectional imports): https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- Feature-Sliced Design (layers/slices/segments; `ui`/`model`/`lib` naming ideas): https://feature-sliced.design/
- freeCodeCamp — Reusable architecture for large Next.js applications: https://www.freecodecamp.org/news/reusable-architecture-for-large-nextjs-applications/

Business logic and separation of concerns
- Martin Fowler (Juntao Qiu) — Modularizing React Applications with Established UI Patterns: https://martinfowler.com/articles/modularizing-react-apps.html
- Johannes Kettmann — Path to a clean(er) React architecture, part 6 (business logic separation): https://dev.to/jkettmann/path-to-a-cleaner-react-architecture-part-6-business-logic-separation-221g
- Johannes Kettmann — part 7 (domain logic): https://dev.to/jkettmann/path-to-a-cleaner-react-architecture-part-7-domain-logic-lg
- Antony Leme — Business vs application logic in React: https://antonyleme.medium.com/business-vs-application-logic-how-to-separate-and-test-your-reactjs-code-4291d0c983b1
- React docs — Reusing logic with custom hooks: https://react.dev/learn/reusing-logic-with-custom-hooks

Components and the server/client boundary
- React docs — Thinking in React: https://react.dev/learn/thinking-in-react
- Next.js — Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js — The Server and Client boundary: https://nextjs.org/docs/app/guides/server-and-client-boundary

Enforcement ideas (for later)
- bulletproof-react `import/no-restricted-paths` zones (same project-structure doc above)
- dependency-cruiser (already a repo dependency via repo-intel): https://github.com/sverweij/dependency-cruiser

## How to verify the skill

1. New Claude Code chat in the repo, ask: "Where should I put a function that sorts findings by severity, used on the PR page and in the trace view?" → expect `lib/findings/` + pure function + colocated test.
2. Ask: "Add an empty-state component for the agents page" → expect `app/agents/_components/…`, string in `messages/en/agents.json`.
3. Ask it to review a diff where a component calls `fetch` directly → expect a **critical** finding pointing to `lib/api.ts` + `lib/hooks`.
4. Run it on the whole `client/` and compare the plan with what you'd do by hand. Adjust rules, bump the version.

## Known gaps / to check against the repo

- Pages: 4 of 6 `page.tsx` files are `'use client'` with logic inline (pulls page filters/sorts in place). The skill treats this as accepted current state and flags only inline business logic.
- Some helpers return UI text (`relativeTime` → `"now"`, `"—"`) — flagged as minor.
- No automated enforcement yet — candidate: dependency-cruiser rule "nothing outside `app/` imports `app/**`".

## Changelog

- **1.1.0** (2026-11-28) — aligned with the real repo: component-folder anatomy, nested `_components`, route-level constants/helpers/styles, flat `lib/`, `@/lib/hooks` barrel, `@/` alias rule, `styles.ts` rules; removed invented `_lib/`, `lib/utils/`.

- **1.0.0** (2026-11-28) — first version: repo map, placement decision guide, logic placement, component splitting, App Router organization, review format.
