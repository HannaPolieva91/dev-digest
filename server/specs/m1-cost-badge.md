# M1 — Run Cost Badge (server)

Persist the dollar cost of every agent review run and expose it, together with
token counts, on the run and PR-list GET routes. UI side:
[`client/specs/m1-cost-badge.md`](../../client/specs/m1-cost-badge.md).

## Background
- Token usage and cost are already computed per run by reviewer-core:
  `ReviewOutcome.{tokensIn, tokensOut, costUsd}` (`reviewer-core/src/review/run.ts`).
  `costUsd` prefers OpenRouter's `usage.cost`, falls back to the injected
  `estimateCost` (`server/src/platform/price-book.ts` → `adapters/llm/pricing.ts`),
  and is `null` if any chunk's cost is unknown.
- `run-executor.ts` currently persists tokens but drops `costUsd`.
- Commit `d45ab0d` removed per-run cost on purpose (migration 0009 dropped
  `agent_runs.cost_usd`). This milestone brings it back via a **new** migration.

## Requirements
1. **No extra model calls.** Cost comes only from the `usage` already returned.
2. **Storage.** `agent_runs.cost_usd double precision NULL`, added by a new
   drizzle-kit migration (`0010_*`). Never edit 0000–0009.
3. **Write path.** On a successful run, `completeAgentRun` stores
   `costUsd = outcome.costUsd` and the trace stores `stats.cost_usd`.
   Failed / cancelled / early-exit runs store `null` (not `0`).
4. **Contracts.** Change both copies of `@devdigest/shared`
   (`server/src/vendor/shared` and `client/src/vendor/shared`) identically:
   | Schema | Field | Type |
   |---|---|---|
   | `RunSummary` (`contracts/trace.ts`) | `cost_usd` | `z.number().nullable()` |
   | `RunStats` (`contracts/trace.ts`) | `cost_usd` | `z.number().nullable().optional()`: old `run_traces` jsonb has no such field |
   | `PrMeta` (`contracts/platform.ts`) | `cost_usd` | `z.number().nullish()`: list endpoint only, like `score` |
5. **Routes.**
   - `GET /pulls/:id/runs` returns `cost_usd` per run (alongside the existing `tokens_in`/`tokens_out`).
   - `GET /runs/:id/trace` returns `stats.cost_usd`.
   - `GET /repos/:id/pulls` returns, per PR, `cost_usd` = **sum of `cost_usd` over the PR's
     `status = 'done'` runs**. If no such run has a non-null cost, it returns `null`. Use one
     grouped IN-query next to the existing latest-review-score query (no N+1).

## Acceptance criteria
- [ ] After a review with the mock LLM (`costUsd: 0.001`), `agent_runs.cost_usd = 0.001`,
      the trace has `stats.cost_usd = 0.001`, and `GET /pulls/:id/runs[0].cost_usd = 0.001`.
- [ ] A PR with two done runs ($0.001 each) lists `cost_usd = 0.002`; a PR with no runs lists `null`.
- [ ] Failed run → `cost_usd: null`.
- [ ] Old trace documents without `cost_usd` still parse.
- [ ] Unit + integration tests green (`TESTING.md`).

## Known limitations (out of scope)
- Failed/cancelled runs record 0 tokens and `null` cost even if the model was billed:
  before the review returned (e.g. a schema-repair retry that throws) or after it (a later
  insertReview / saveRunTrace failure). One rule keeps the row, the trace and the PR total
  consistent; PR totals sum only `done` runs, so they under-count spend on failed runs.
- The PR-list total sums only runs with a known cost; runs on an unpriced model are left
  out silently, so the total can be partial (no "partial" marker yet).
- Static OpenRouter prices in `pricing.ts` are approximate; `usage.cost` wins when present.
