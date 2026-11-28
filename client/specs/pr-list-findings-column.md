# FINDINGS column on the Pull Requests list

## Problem
Reviewer feedback on the severity-counters homework: the Pull Requests list
(`/repos/:repoId/pulls`) has no FINDINGS column. To see how bad a PR is, you have to
open it. The mockup ("Pull Requests · Run Review + auto-status") shows a FINDINGS
column with per-severity icons + counts and a hover preview of the top findings.

## Goal
- Each PR row shows a FINDINGS cell: one SEV icon + count per severity that has at
  least one finding, e.g. `⬣ 2  △ 2  💡 2`.
- Hovering or focusing the cell opens a preview card: header "N findings in this run",
  a muted line with the agents whose runs are included, then the top findings.

## Scope
- Only the FINDINGS column and its preview card. Everything else on the mockup is a
  future milestone and out of scope: Auto-review, Triage queue, Review all, the
  per-row Run Review button, sidebar items.
- **Server:** `GET /repos/:id/pulls` gains `findings_counts` next to `score` and
  `cost_usd`.
- **Contract:** `PrMeta.findings_counts` in BOTH copies of `@devdigest/shared`
  (`server/src/vendor/shared/contracts/platform.ts`,
  `client/src/vendor/shared/contracts/platform.ts`):
  `z.object({ CRITICAL: int, WARNING: int, SUGGESTION: int }).nullish()`.
  It's nullish, so `PrDetail` (which extends `PrMeta`) is unaffected.
- **Preview data:** fetched lazily when the card opens, from the existing
  `GET /pulls/:id/reviews` via `usePrReviews(prId)` (query key `["reviews", prId]`,
  shared with the PR page). No new route, and no findings in the list payload.
- No DB migration, no model call.

## Counting rule — sum of the latest run per agent
Counts = **SUM over the latest done run of EACH agent** for that PR.
- A `reviews` row (`kind = 'review'`) is written only when a run finishes successfully
  (`server/src/modules/reviews/run-executor.ts:219`). So "latest done run of an agent"
  = the newest `reviews` row with `kind='review'` for that `(pr_id, agent_id)`.
- Two agents reviewed → their latest runs add up. Older runs of the same agent are
  ignored.
- If an agent's newest run failed or was cancelled, it has no review row, so that
  agent's previous successful review still counts.
- Reviews with `agent_id = NULL` (legacy/seeded) count as one agent.
- Dismissed and accepted findings are counted, same as the PR-page counters
  (`severity-counters.md` → Decisions). The list has no "Hide low confidence" toggle,
  so no confidence filter is applied. With that toggle on, the PR page can show
  smaller numbers.
- Only the 3 contract levels (`Severity.options`: CRITICAL, WARNING, SUGGESTION) are
  counted. Values outside the contract are ignored. Never iterate `SEV` /
  `SEVERITY_ORDER`: both include `INFO`.
- The preview applies the same rule client-side to the `/pulls/:id/reviews` response,
  so its findings match the cell's counts.

**SCORE keeps its own rule (unchanged).** The list's score ring shows the newest
review of ANY agent (`server/src/modules/pulls/routes.ts`, `latestReviewByPr`). So the
score can come from one agent while the counts sum several agents. This is intended
and documented here, not changed.

## Design
Reference: the "Pull Requests · Run Review + auto-status" mockup.
- **Column:** FINDINGS, between SCORE and STATUS (`GRID`, `COLUMN_KEYS`,
  `list.columns.findings` in `client/messages/en/prReview.json`).
- **Cell:**
  | `findings_counts` | Cell shows | Preview |
  |---|---|---|
  | `null` (never reviewed) | `—` (muted, same rule as COST: never a fake 0) | none |
  | all three `0` (reviewed, nothing found) | muted `0` | none |
  | some `> 0` | per level with count > 0: `SEV[level].icon` + count in `SEV[level].c`, in `Severity.options` order; zero levels **hidden** | yes |

  Hiding zero levels follows the mockup (#455 shows only `△ 2  💡 4`). This differs
  from the PR-page counters, which always show all 3 levels. Those are filter buttons,
  so a fixed row matters there; here the cell is a compact summary.
- **Preview card:**
  ```
  ┌──────────────────────────────────────────────────┐
  │ ⓘ 6 findings in this run                         │
  │   Security Reviewer · Performance Reviewer        │  ← muted
  │ ⬣ Hardcoded Stripe secret key in commit  security │
  │   src/config.ts:12  · 98% conf                    │
  │   Line 12 contains a literal string starting…     │  ← 1st line of rationale, truncated
  │ ⬣ …                                                │
  │ △ …                                                │
  │   +3 more — open the PR                           │  ← muted, only when N > 3
  └──────────────────────────────────────────────────┘
  ```
  - Header: the reviewer's exact text "N findings in this run" (ICU plural).
    N = total findings across the included runs.
  - Agents line: `agent_name` of each included review, newest first, joined with
    " · ". If `agent_name` is missing, show the "Unknown agent" label.
  - Top 3 findings, sorted by severity (`Severity.options` order), then confidence
    descending. Each shows: SEV icon, title, category, `file:start_line` (or
    `file:start-end` when the range has more than one line), confidence %, first line
    of the rationale (single line, ellipsis).
  - When N > 3: a muted last line "+K more — open the PR" (K = N − 3).
  - Loading: the header shows N from `findings_counts`, and the finding rows show
    skeletons. Error: a short "Couldn't load findings" line.
- **Behaviour:**
  - Opens 150 ms after mouseenter or focus, so moving the pointer down the list
    doesn't fetch every row. Closes on mouseleave, blur or Esc. Moving the pointer
    from the cell into the card keeps it open.
  - Rendered in a portal (`document.body`), positioned from the trigger's
    `getBoundingClientRect`, so the table container can't clip it.
  - Read-only. A click on the cell bubbles to the row, which opens the PR (as today).

## Implementation notes
- **Server** (`server/src/modules/pulls/routes.ts`): one aggregated query with no N+1.
  `DISTINCT ON (pr_id, agent_id)` keeps the newest `kind='review'` review per pair
  (scoped by `workspace_id` and `pr_id IN (…)`). A `LEFT JOIN findings` then counts per
  `(pr_id, severity)`, and JS grouping builds a zero-filled object per PR. The LEFT
  JOIN gives a reviewed PR with no findings `{0,0,0}` rather than `null`. Replace the
  stale comment saying the findings breakdown is intentionally not on the list.
- **Client helpers** (`client/src/lib/findings.ts`, pure, unit-tested):
  - `countBySeverity`, moved here from `FindingsPanel/helpers.ts`, which re-imports it.
  - `latestReviewPerAgent(reviews)`: same rule as the server.
  - `topFindings(findings, n)`.
- **Popover:** a small accessible `HoverCard` in `client/src/components/hover-card/`.
  There's no popover primitive in `vendor/ui`, which stays untouched. The trigger is a
  `<button type="button">` with `aria-describedby` pointing to a `role="tooltip"` panel
  while open.
- **Runtime import:** `Severity` comes from `@devdigest/shared/contracts/findings`, not
  the barrel. A barrel runtime import breaks the Next build while tests stay green
  (`client/INSIGHTS.md`).
- **Freshness:** today nothing invalidates the pulls list (`["pulls", repoId]`) after
  review activity, and the global `staleTime` is 30 s (`client/src/lib/providers.tsx`).
  So coming back to the list right after a run shows old counts. Fix: invalidate the
  `["pulls"]` prefix (the mutations only know `prId`) wherever `["reviews", prId]` is
  invalidated after a run settles or is deleted:
  - run settles on the PR page: `pulls/[number]/page.tsx`, next to `refetchReviews()`
  - `useRunReview`, `useDeleteRun`, `useDeleteReview` (`client/src/lib/hooks/reviews.ts`)

  Accept/dismiss doesn't change counts, so it's left as is. The prefix doesn't match
  `["pull", prId]` (PR detail).

## Acceptance criteria
P1
- [ ] The PR list shows a FINDINGS column between SCORE and STATUS.
- [ ] A reviewed PR shows SEV icon + count per level with count > 0, colors/icons from
      `SEV`, in CRITICAL → WARNING → SUGGESTION order; zero levels hidden.
- [ ] A never-reviewed PR shows `—`. A reviewed PR with no findings shows a muted `0`.
- [ ] Counts = sum over the latest done review of each agent; older reviews of the same
      agent are ignored.
- [ ] Hover or keyboard focus on the cell opens the card with "N findings in this run",
      the agents line, and the top 3 findings (title, category, file:line, confidence,
      first line of rationale). Esc closes it.
- [ ] When N > 3, the card ends with a muted "+K more — open the PR" (K = N − 3).

P2
- [ ] Server: one aggregated query for counts, no N+1. `findings_counts` is in both
      contract copies.
- [ ] Preview data is fetched only when the card opens (150 ms delay), via the existing
      reviews endpoint. Nothing is fetched just by rendering the list.
- [ ] After a run completes, or a run/review is deleted, the list's FINDINGS column
      updates without a page reload.
- [ ] Tests:
  - server integration: multiple agents + older runs → only the latest per agent
    counted; PR without reviews → `null`; reviewed with no findings → `{0,0,0}`.
  - client: counts render, `—` for null, muted `0`, zero levels hidden, card opens on
    hover and on focus showing "N findings in this run", Esc closes.
  - client: run-settle on the PR page, `useRunReview`, `useDeleteRun` and
    `useDeleteReview` invalidate the `["pulls"]` prefix.
  - helpers unit tests.
- [ ] Green: server typecheck + tests; client typecheck + tests + **`pnpm build`**.

P3
- [ ] The card renders in a portal and is not clipped by the table.
- [ ] Strings in `client/messages/en/prReview.json` (`list.columns.findings`,
      `list.findings.*`). Tests pass only the `prReview` namespace.
- [ ] Stale comment in `pulls/routes.ts` updated.

## Out of scope
- Everything else on the mockup (Auto-review, Triage queue, Review all, Run Review in
  the row, sidebar).
- Changing the SCORE rule.
- Filtering the list by severity, or clicking a finding in the card to deep-link to it.
- Confidence filtering on the list.

## Decisions
- Lazy fetch over a top-N in the list payload: keeps `GET /repos/:id/pulls` small, and
  it reuses `["reviews", prId]`, so opening the PR afterwards is instant.
- Header text stays "N findings in this run" (the reviewer's wording) even when several
  agents' runs are summed. The agents line under it makes that clear.
- Zero levels are hidden in the cell (mockup), unlike the PR-page counters (see Design).
- Test data: locally only an older run on PR #482 has findings (1 CRITICAL + 1 WARNING).
  To check summing, run a second agent on a PR that has findings.
