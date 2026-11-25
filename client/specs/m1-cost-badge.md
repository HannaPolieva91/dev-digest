# M1 — Run Cost Badge (client)

Show the cost (and tokens) of agent review runs in three places with one
`RunCostBadge` component. Data contracts and aggregation rules:
[`server/specs/m1-cost-badge.md`](../../server/specs/m1-cost-badge.md).

## Component — `RunCostBadge`
Location: `client/src/components/run-cost-badge/` (`RunCostBadge.tsx`, `index.ts`,
`RunCostBadge.test.tsx`). Plain text, no pill: `mono`, 11–12px, `var(--text-muted)`.

```ts
type Props = {
  costUsd: number | null | undefined;
  tokensIn?: number | null;
  tokensOut?: number | null;
  variant: "compact" | "full";
};
```

| Variant | Output | Notes |
|---|---|---|
| `compact` | `$0.014` | |
| `full` | `9,119 tok · $0.0013` | tok = `tokensIn + tokensOut`, `en-US` thousands separator |
| `full`, cost unknown | `9,119 tok · —` | tokens > 0 but `costUsd == null` |
| any, no data | `—` | never `$0.00` for missing data |

Formatting helpers go in `client/src/lib/format-cost.ts`:
- `formatUsd(n)`: values `< $0.01` keep 2 significant digits (`$0.0013`), `$0.01`–`$1` get
  3 decimals (`$0.014`, `$0.060`), `≥ $1` gets 2 decimals (`$1.23`). The bracket is chosen
  from the rounded value. `null`/`undefined` returns `—`; under `$0.000001` → `<$0.000001`.
  The server's run-log `usageLine` uses the same rule.
- `formatTokenTotal(in, out)` returns the number part, `9,119`. The `tok` suffix comes from
  i18n (`common.json` → `costBadge.tokens: "{count} tok"`, since the badge is shared across
  pages), not hard-coded (see `client/CLAUDE.md`). Tests that host the `full` variant must
  pass the `common` namespace to `NextIntlClientProvider`.

## Placements
1. **Pull Requests list.** New **COST** column between STATUS and UPDATED.
   - `pulls/constants.ts`: add `"cost"` to `COLUMN_KEYS` and a width (~80px) to `GRID`.
   - `PRRow.tsx` renders `<RunCostBadge variant="compact" costUsd={pr.cost_usd} />`.
   - i18n: `prReview.json` → `list.columns.cost`.
   ```
   SCORE  STATUS          COST     UPDATED
   (61)   ● Needs review  $0.014   3h ago
   (95)   ● Stale         —        9d ago
   ```
2. **PR detail → Agent runs → Timeline card** (`RunHistory.tsx`). Goes in the right column,
   under the run time. Only for `status === "done"`; failed and running cards show no badge.
   ```
   [reviewed] (38) Security Reviewer deepseek-v4-flash      8:52:51 PM
                   ⓘ2 ⚠1 · 2 blockers               9,119 tok · $0.0013
   ```
3. **Agent run drawer → Stats** (`TraceBody.tsx`). Add a fourth `Stat` tile, **COST**, between
   TOKENS and FINDINGS, holding `<RunCostBadge variant="compact" costUsd={stats.cost_usd} />`.
   The TOKENS tile is unchanged. i18n: `runs.json` → `trace.stat.cost`.
   ```
   │ DURATION 8.2s │ TOKENS 15k→1.2k │ COST $0.06 │ FINDINGS 3 │
   ```

Out of scope: the verdict banner in the Review runs section.

## Acceptance criteria
- [ ] Every completed run shows its cost in the timeline and the drawer.
- [ ] Runs without data (pre-migration, failed, unpriced model) show `—`, never `$0.00`.
- [ ] The PR list shows the summed cost per PR, or `—`.
- [ ] No extra API calls: the data comes from the existing `usePulls`, `usePrRuns` and `useRunTrace`.
- [ ] Tests: `RunCostBadge.test.tsx`; updated `RunHistory.test.tsx`, `RunTraceDrawer.test.tsx`;
      a PR-list Cost column test. `pnpm test && pnpm typecheck` green.
