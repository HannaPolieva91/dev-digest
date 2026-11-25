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

## Session Notes

## Open Questions
