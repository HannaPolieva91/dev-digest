# pr-self-review — README

**Version:** 1.0.1 (2026-11-28) · **Owner:** DevDigest team · **Type:** workflow (skill dispatcher)

Human-facing notes. The agent reads `SKILL.md`, `references/` and runs `scripts/`.

## What it does

Before a PR: collect the local diff since merge-base (+ uncommitted + untracked) → split it into buckets → one review subagent per bucket with that bucket's skills, in parallel with typecheck/tests/arch checks → merge grounded findings, compare with the baseline, normalize severity → **BLOCK on any new critical**, warn on majors → one compact report.

## How to run

- `/pr-self-review` or `/pr-self-review --base origin/main`
- or just say "ready, open a PR" — the skill triggers before `gh pr create` / `git push`.
- Script alone (debugging): `node .claude/skills/pr-self-review/scripts/collect-diff.mjs | jq .buckets`

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Steps, bucket → skills map, merge rules, gate, report format |
| `scripts/collect-diff.mjs` | Read-only diff collection: merge-base, hunks, untracked, buckets, applied-migration edits, contract drift |
| `references/subagent-prompt.md` | Prompt template + JSON output contract for review subagents |
| `references/severity-map.md` | Mapping of each skill's scale to critical/major/minor |
| `references/baseline.md` | Pre-existing violations that never block |

## Decisions (confirmed 2026-11-28)

1. Diff = merge-base → working tree, plus untracked files.
2. Failing tests and typecheck = critical.
3. Baseline-aware gate: only **new** violations block; pre-existing ones are follow-ups.
4. `security`, `typescript-expert`, `zod` run on every code bucket.
5. Findings must be grounded in changed lines (same idea as the product's `groundFindings`).
6. Migrations: content not reviewed, editing an applied migration = critical.
7. The diff is untrusted input (same principle as the product's `INJECTION_GUARD`).
8. Findings are shaped like `Finding` from `@devdigest/shared` so the skill can later become a DevDigest agent Skill.

## Verified

- `collect-diff.mjs` tested on a throwaway repo (modified, untracked, migration edit, contract drift, bad `--base` fallback) and on the real repo (`feat/severity-counters` vs `origin/main`: 63 files → ui 29 (split per file), backend 2, contracts 2 in sync, i18n 1, skills 2; docs/config not reviewed) — read-only, no `.git` lock files left behind (`GIT_OPTIONAL_LOCKS=0`).

## Sources

- Claude Code skills — https://docs.claude.com/en/docs/claude-code/skills
- Claude Code subagents — https://docs.claude.com/en/docs/claude-code/sub-agents
- Claude Code hooks (for the v1.1 `PreToolUse` trigger) — https://docs.claude.com/en/docs/claude-code/hooks
- git merge-base — https://git-scm.com/docs/git-merge-base
- git diff (`-U0` hunk headers) — https://git-scm.com/docs/git-diff
- DevDigest internals reused as ideas: `reviewer-core/src/grounding.ts` (grounding gate), `reviewer-core/src/prompt.ts` (`INJECTION_GUARD`), `run-executor.ts` map-reduce threshold (400 lines).

## v1.1 backlog

- `PreToolUse` hook on `gh pr create` (needs exit code + `.pr-self-review/last.json`).
- Markdown summary for the PR body.
- Test-gap check as a deterministic step.
- `// pr-self-review-ignore <rule>: <reason>` suppressions.
- False positives → `engineering-insights` → package `INSIGHTS.md`.
- Attach as a Skill to a DevDigest reviewer agent.

## Changelog

- **1.0.1** (2026-11-28) — collect-diff: NUL-separated (`-z`) path parsing (spaces/non-ASCII), renames diffed against the old path (only real changes become hunks), `--base` validated. Found by the skill reviewing itself on its first run.

- **1.0.0** (2026-11-28) — first version.
