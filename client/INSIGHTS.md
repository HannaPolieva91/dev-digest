# client/ — insights

Lessons learned in this package. Written by the `engineering-insights` skill
(`.claude/skills/engineering-insights/`); append-only, a human spot-checks via git diff.
Facts about how the code works → `client/README.md`; agent rules → `client/CLAUDE.md`.

Entry: `- YYYY-MM-DD — <insight>. Why: <reason>. Ref: path/to/file.ts#symbol`

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes
- 2026-11-25 — Component tests pass NextIntlClientProvider only their own namespace (e.g. `{ prReview }`), so a shared component that calls useTranslations("common") forces every host test to add `common`; keep translation-free variants hook-free. Why: RunHistory.test needed `common` once RunCostBadge's full variant was embedded. Ref: client/src/components/run-cost-badge/RunCostBadge.tsx#CompactCost

## Recurring Errors & Fixes
- 2026-11-25 — `pnpm test`/`pnpm typecheck` fail with ERR_PNPM_VERIFY_DEPS_BEFORE_RUN on pnpm 12 (seen on 12.21) because package.json still holds a `pnpm.overrides` field that pnpm no longer reads; run `pnpm --config.verify-deps-before-run=false test` instead of reinstalling. Why: `pnpm install` would drop the postcss/katex overrides from the lockfile — the real fix (move them to pnpm-workspace.yaml) needs coordination. Ref: client/package.json#pnpm.overrides
- 2026-11-25 — A runtime (non-`type`) import from the `@devdigest/shared` barrel breaks the Next dev/build with "Module not found: Can't resolve './contracts/findings.js'", while vitest and tsc stay green; import runtime values from the contract file instead (`import { Severity } from "@devdigest/shared/contracts/findings"`). Why: the barrel re-exports with `.js` suffixes that Next's webpack doesn't map to `.ts`; `import type` is erased so it never hits this. Ref: client/src/vendor/shared/index.ts

## Session Notes

## Open Questions
