# server/ — insights

Lessons learned in this package. Written by the `engineering-insights` skill
(`.claude/skills/engineering-insights/`); append-only, a human spot-checks via git diff.
Facts about how the code works → `server/README.md`; agent rules → `server/CLAUDE.md`.

repo-intel (`server/src/modules/repo-intel/`) writes here too.

Entry: `- YYYY-MM-DD — <insight>. Why: <reason>. Ref: path/to/file.ts:42 (symbol)`

## What Works

## What Doesn't Work

## Codebase Patterns
- 2026-11-25 — Per-run cost was deliberately removed end-to-end in commit d45ab0d (migration 0009 dropped agent_runs.cost_usd) and restored in 0010 for the M1 cost badge; `git show d45ab0d` lists every touchpoint of the cost path. Why: reviewer-core always computed ReviewOutcome.costUsd, only persistence dropped it. Ref: server/src/modules/reviews/run-executor.ts:214 (ReviewRunExecutor, outcome.costUsd)
- 2026-11-25 — New fields on RunStats must be `.optional()` (e.g. cost_usd): GET /runs/:id/trace returns the stored run_traces.trace jsonb as-is, so traces written before the field existed lack it. Why: a required field breaks parsing of every old run's drawer. Ref: server/src/vendor/shared/contracts/trace.ts:66 (RunStats.cost_usd; client copy client/src/vendor/shared/contracts/trace.ts:65)

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
