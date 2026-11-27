# client/ — insights

Lessons learned in this package. Written by the `engineering-insights` skill
(`.claude/skills/engineering-insights/`); append-only, a human spot-checks via git diff.
Facts about how the code works → `client/README.md`; agent rules → `client/CLAUDE.md`.

Entry: `- YYYY-MM-DD — <insight>. Why: <reason>. Ref: path/to/file.ts:42 (symbol)`

## What Works

## What Doesn't Work

## Codebase Patterns
- 2026-11-27 — The PR list query ["pulls", repoId] has the global 30 s staleTime and nothing invalidated it after review activity, so FINDINGS/SCORE/COST stayed stale after a run; anything that adds or removes a review must call invalidatePullsList(qc) (prefix ["pulls"], which doesn't match ["pull", id]). Why: review hooks only know prId, not repoId. Ref: client/src/lib/hooks/reviews.ts:23 (invalidatePullsList)

## Tool & Library Notes
- 2026-11-25 — Component tests pass NextIntlClientProvider only their own namespace (e.g. `{ prReview }`), so a shared component that calls useTranslations("common") forces every host test to add `common`; keep translation-free variants hook-free. Why: RunHistory.test needed `common` once RunCostBadge's full variant was embedded. Ref: client/src/components/run-cost-badge/RunCostBadge.tsx:24 (CompactCost)

## Recurring Errors & Fixes
- 2026-11-25 — `pnpm test`/`pnpm typecheck` fail with ERR_PNPM_VERIFY_DEPS_BEFORE_RUN on pnpm 12 (seen on 12.21) because package.json still holds a `pnpm.overrides` field that pnpm no longer reads; run `pnpm --config.verify-deps-before-run=false test` instead of reinstalling. Why: `pnpm install` would drop the postcss/katex overrides from the lockfile — the real fix (move them to pnpm-workspace.yaml) needs coordination. Ref: client/package.json:40 (pnpm.overrides)
- 2026-11-25 — A runtime (non-`type`) import from the `@devdigest/shared` barrel breaks the Next dev/build with "Module not found: Can't resolve './contracts/findings.js'", while vitest and tsc stay green; import runtime values from the contract file instead (`import { Severity } from "@devdigest/shared/contracts/findings"`). Why: the barrel re-exports with `.js` suffixes that Next's webpack doesn't map to `.ts`; `import type` is erased so it never hits this. Ref: client/src/vendor/shared/index.ts:17 (export * from './contracts/findings.js')
- 2026-11-27 — tsc TS2742 "inferred type of 's' cannot be named without a reference to .pnpm/csstype" comes from a `satisfies CSSProperties` styles entry that spreads a shared `const x: CSSProperties`; annotate those entries (`({ ...x, … } as CSSProperties)`) instead. Why: `satisfies` keeps the inferred csstype literal types, which aren't portable for an exported object. Ref: client/src/app/repos/[repoId]/pulls/_components/FindingsCell/_components/FindingsPreview/styles.ts:17 (s.agents)

## Session Notes

## Open Questions
