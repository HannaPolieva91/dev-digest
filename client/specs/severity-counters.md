# Severity counters on the Agent runs tab

## Problem
On the PR page → Agent runs, findings are grouped per run. To see how many are
CRITICAL you have to scroll the list and count by eye.

## Goal
In an expanded review run, show a row of counters above the findings list —
"3 CRITICAL · 5 WARNING · 2 SUGGESTION". Clicking a level filters that run's
list to that level; clicking it again clears the filter.

## Scope
- Client only. Counts are computed from the `findings` prop `FindingsPanel` already
  receives (one run's `review.findings`, via `ReviewRunAccordion`).
- No new route, no DB change, no model call, no new server request.
- Levels come from the `Severity` contract — `@devdigest/shared`,
  `client/src/vendor/shared/contracts/findings.ts` (identical server copy):
  `CRITICAL`, `WARNING`, `SUGGESTION`. Iterate `Severity.options`, **not** the keys of
  `SEV` or `SEVERITY_ORDER` — both also contain `INFO`, which the contract does not.
- Colors and icons from `SEV` (`@devdigest/ui`); visible label text in
  `client/messages/en/prReview.json` (see Decisions).

## Design
Reference: lesson design files + implementation screenshots in the homework brief.
- Placement: body of the expanded run in "Review runs", between the verdict card
  (`VerdictBanner`, rendered only when the run has a verdict) and the first finding
  card — i.e. in `FindingsPanel`'s toolbar row. Not in the `ReviewRunAccordion`
  header, not on the Pull Requests list page.
- Row: "N CRITICAL · N WARNING · N SUGGESTION", each item a clickable element with
  `aria-pressed`, using `SEV[level]` color (`c`/`bg`) and icon per level.
  `SeverityBadge` is display-only (no click/pressed state) and renders
  label-then-count ("CRITICAL 3"), so it cannot be used as-is — wrap it or build a
  chip on `SEV` colors (decided in Planning).
- Active filter: active level highlighted with its SEV color (background or border),
  the other two muted; state visible without hover.
- Sits alongside the existing "Hide low confidence" toggle: counters left, toggle
  right (it already uses `marginLeft: auto`).
  ```
  [⬣ 1 CRITICAL] · [△ 1 WARNING] · [💡 0 SUGGESTION]        Hide low confidence (○ )
  ```

## Implementation notes
Folder: `client/src/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/`.
- `helpers.ts`: a pure count function next to `visibleFindings`, and a severity filter
  (extend `visibleFindings` or add a sibling) — unit-testable without rendering.
- `FindingsPanel.tsx`: severity filter is local `useState<Severity | null>`, like `hideLow`.
  Derive counts and `shown` during render (`useMemo`), never copy them into state.
- j/k and a/d shortcuts index into `shown`; reset `focusIdx` to 0 when the filter
  changes so it never points past the end of the filtered list.
- Sync: `useFindingAction`, `useDeleteReview` and finishing a run all invalidate
  `["reviews", prId]` (`client/src/lib/hooks/reviews.ts`), so derived counts update
  after refetch with no extra wiring.

## Acceptance criteria
P1
- [ ] Counters for all 3 levels are visible in an expanded run, format "N LEVEL · …".
- [ ] Each number equals the count of findings of that level in that run's list
      (after "Hide low confidence", before the severity filter — see Decisions).
- [ ] Clicking a level leaves only that level's findings in the list.
- [ ] The filter can be cleared to return to the full list.

P2
- [ ] No network request and no agent run on click.
- [ ] Works together with "Hide low confidence" (both conditions apply).
- [ ] Colors/icons from `SEV`.
- [ ] Count + filter covered by tests (`FindingsPanel.test.tsx`, plus `helpers` unit
      tests); `pnpm test` and `pnpm typecheck` green in `client/`.

P3
- [ ] Active level highlighted with its SEV color, others muted; one active at a time;
      second click on the active level clears filter and highlight.
- [ ] A level with no findings shows "0 LEVEL" (e.g. "0 CRITICAL"); the row always
      has all 3 levels, so its shape never changes.
- [ ] Empty filtered list shows the existing `FindingsPanel` empty state
      (`panel.noMatchTitle` "No findings match" / `panel.noMatchBody`).
- [ ] Labels in `client/messages/en/prReview.json` under `panel.*`. Tests pass only the
      `prReview` namespace to `NextIntlClientProvider` — don't pull in `common`.
- [ ] Counts stay in sync after accept/dismiss without reload (accept/dismiss only set
      `accepted_at`/`dismissed_at`, the finding stays in the list, so counts don't
      change; the list itself is refetched via `["reviews", prId]` invalidation — also
      on run delete / new run).

## Out of scope
- Counters on the Pull Requests list page.
- The "blockers" number in the `ReviewRunAccordion` header.
- Follow-up: reset `focusIdx` when "Hide low confidence" changes (pre-existing: focus can point past the shorter list).
- Follow-up: give the "Hide low confidence" `Toggle` (`role="switch"`) an accessible name — it has none today.
- Follow-up: `FindingCard` styles mix `borderColor` with `borderLeftColor`, so React warns when `focused` changes (pre-existing; surfaced by the counter tests) — fix: replace `borderColor` with the four longhands (`borderTopColor`/`borderRightColor`/`borderBottomColor` + existing `borderLeftColor`).

## Decisions
- Zero-count levels are shown as "0", not hidden. The P3 criterion says so explicitly
  (the last reference screenshot hides them, which contradicts it). A fixed 3-item row
  is easier to scan, and "0 CRITICAL" is itself useful information.
- Counters are computed AFTER the confidence filter and BEFORE the severity filter,
  so the numbers always match what the list shows under "Hide low confidence":
  clicking "2 WARNING" always shows exactly 2 cards, and the other two numbers stay
  visible as targets.
- Dismissed and accepted findings are counted: the list keeps showing them (accept/
  dismiss only sets `accepted_at`/`dismissed_at`), so excluding them would break
  "numbers match the list". Consequence: accept/dismiss alone does not change a count.
  (The header "blockers" count excludes dismissed — that's a different metric and
  stays as is.)
- Only the 3 contract levels (CRITICAL, WARNING, SUGGESTION) are counted; the UI kit's
  extra INFO level is ignored.
- `SeverityBadge` is display-only, so the counter needs a clickable element with
  `aria-pressed` (exact approach decided in Planning). Labels "CRITICAL" etc. come
  from `prReview.json`, not from `SEV.label` (hard-coded "Critical" in the UI kit;
  `client/CLAUDE.md` requires strings in `messages/en`).
- j/k and a/d keyboard shortcuts act on the visible (filtered) list — expected.
- Test data: locally only an older run on PR #482 has findings (1 CRITICAL +
  1 WARNING); the 3 newest runs have 0 findings.
