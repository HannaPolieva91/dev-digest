# Baseline — known pre-existing violations (never block)

Recorded 2026-11-28 on `origin/main` @ 7816108. When a change touches one of these, report it under FOLLOW-UP. When the debt is paid, delete the line here (and bump the skill's patch version).

## Architecture (dependency-cruiser, `onion-architecture/references/enforcement.md`)

| Rule | From → To |
|---|---|
| services-no-concrete-infrastructure | `server/src/modules/repo-intel/service.ts` → `server/src/adapters/codeindex/extract.ts` |
| services-no-concrete-infrastructure | `server/src/modules/repo-intel/service.ts` → `server/src/adapters/astgrep/index.ts` |
| no-cross-module-imports | `server/src/modules/repos/service.ts` → `server/src/modules/repo-intel/constants.ts` |
| only-container-builds-adapters (warn) | `server/src/modules/reviews/diff-loader.ts` → `server/src/adapters/git/diff-parser.ts` |
| only-container-builds-adapters (warn) | repo-intel service → codeindex/extract, astgrep (same as above) |

## Legacy routes with infrastructure access (no service yet)

- `server/src/modules/polling/routes.ts`
- `server/src/modules/pulls/routes.ts`
- `server/src/modules/settings/routes.ts`
- `server/src/modules/workspace/routes.ts`

New code added to these files must go into a new service/repository — that new code is judged normally; the existing queries are follow-up.

## Contract copies already diverged (`client/src/vendor/shared` vs `server/src/vendor/shared`)

- `adapters.ts`
- `contracts/eval-ci.ts`
- `contracts/knowledge.ts`
- `contracts/productionize.ts`
- `contracts/trace.ts`

A change to any **other** shared file must keep both copies identical. A change to one of these five should not make them diverge further — mention if it does.

## Client conventions not yet followed everywhere

- 4 of 6 `page.tsx` files are `'use client'` (accepted, not a finding).
- Deep relative import in `client/src/app/repos/[repoId]/pulls/[number]/_components/FindingCard/FindingCard.tsx` (`../../../../../../../lib/github-urls`).
- `relativeTime()` in `client/src/app/repos/[repoId]/pulls/helpers.ts` returns UI text (`"now"`, `"—"`).
- Inline filter/sort in `client/src/app/repos/[repoId]/pulls/page.tsx`.
