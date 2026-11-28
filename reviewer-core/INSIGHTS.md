# reviewer-core/ — insights

Lessons learned in this package. Written by the `engineering-insights` skill
(`.claude/skills/engineering-insights/`); append-only, a human spot-checks via git diff.
Facts about how the code works → `reviewer-core/README.md`; agent rules → `reviewer-core/CLAUDE.md`.

Entry: `- YYYY-MM-DD — <insight>. Why: <reason>. Ref: path/to/file.ts:42 (symbol)`

## What Works

## What Doesn't Work
- 2026-11-27 — Appending an "Additional rules" block after "Findings discipline" in the General Reviewer prompt (v2, PR #3) made both runs balloon (23 and 50 findings vs 5–13 on v1; 5–11k output tokens vs ≤4k) and downgraded RCE from CRITICAL to WARNING; put new rules into the existing Severity / Quality bar / Findings discipline sections instead, and judge any prompt change on ≥2–3 runs. Why: rules placed last seem to override "precision over volume", and deepseek-v4-flash already varies 5–13 findings run-to-run on an unchanged prompt. Ref: docs/agent-prompts/general-reviewer.md:75 (# Findings discipline)

## Codebase Patterns
- 2026-11-27 — Nothing between the model and the DB dedupes findings: groundFindings only drops findings whose file or lines aren't in the diff, and the server saves the rest as-is. So a degenerate run (seen: run 53e1ff28, 50 findings, 13 exact-duplicate titles) goes unchanged into the review, the PR list's FINDINGS counts and the CI blocker count. Why: grounding checks location, not distinctness; add dedup (same file + overlapping range + similar title) in reviewer-core rather than relying on the prompt. Ref: reviewer-core/src/grounding.ts:52 (groundFindings); server/src/modules/reviews/run-executor.ts:230 (insertFindings)

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
