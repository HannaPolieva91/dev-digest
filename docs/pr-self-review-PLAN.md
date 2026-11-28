# pr-self-review — plan (draft for review, the skill is NOT written yet)

**Type:** Workflow / skill dispatcher · **Target version:** 1.0.0

## 1. Goal

Before a change is marked "done" or a PR is opened, run a second review pass over the **local, uncommitted (or unpushed) diff**, route each changed surface to the right skills, and **block** the PR if any critical finding remains. Catch architecture and stack violations locally, not in GitHub review.

## 2. Triggers

- Manual: `/pr-self-review` (optionally `/pr-self-review --base main`).
- Implicit: the user says "ready", "open a PR", "create PR", "push this", or Claude is about to run `gh pr create` / `git push`.
- Later (out of scope for v1): a Claude Code `PreToolUse` hook on `gh pr create` that runs the skill automatically.

## 3. Inputs — what diff to review

1. Default: everything not yet in the base branch — `git diff <base>...HEAD` **plus** working tree (`git diff HEAD`) **plus** untracked files (`git ls-files --others --exclude-standard`).
2. Base = `--base` arg, else `origin/main`, else `main`.
3. Skip: lockfiles, `server/clones/**`, generated files, binaries, `node_modules`.
4. If the diff is empty → say so and stop.

## 4. Surface routing (the dispatcher table)

| Changed paths | Surface | Skills to load and apply |
|---|---|---|
| `client/**` (`.ts`, `.tsx`) | Frontend | `frontend-architecture`, `react-best-practices`, `next-best-practices`, `typescript-expert` |
| `client/**/*.test.tsx` or components without a test | Frontend tests | `react-testing-library` |
| `client/messages/**` | i18n | frontend-architecture (strings rule) |
| `server/src/**` | Backend | `onion-architecture`, `fastify-best-practices`, `drizzle-orm-patterns`, `zod`, `typescript-expert` |
| `server/src/db/**`, migrations | Persistence | `drizzle-orm-patterns`, `postgresql-table-design` + check "new migration, no edits to applied ones" |
| `reviewer-core/**` | Domain core | `onion-architecture` (domain-is-pure), `typescript-expert` |
| any surface touching auth, secrets, uploads, prompts | Security | `security` (always on for these paths) |
| `*/vendor/shared/**` | Contracts | both architecture skills + **contract sync check** (server and client copies must match for changed files) |
| `.claude/skills/**` | Skills | skill-format check (frontmatter, version bumped, README changelog) |

Skill names above are the ones installed in `.claude/skills/` as of 2026-11-28. Load only the skills for surfaces that actually changed (token budget).

## 5. Steps

1. Collect the diff (section 3) and group files by surface (section 4).
2. For each surface: load the mapped skills, review only that surface's hunks against them.
3. Run cheap deterministic checks for touched packages (configurable, default on):
   - `pnpm -C client lint && pnpm -C client typecheck`, `pnpm -C client test --run` (related tests if possible)
   - `pnpm -C server typecheck`, `pnpm -C server test` (unit; `*.it.test.ts` need Docker)
   - `pnpm -C server arch:check` once the dependency-cruiser config from `onion-architecture/references/enforcement.md` is added (baseline: 3 errors, 3 warnings — compare against baseline, block only on new ones)
   - `npm --prefix reviewer-core run build` (= typecheck)
4. Merge findings, deduplicate (same file+line+rule), sort by severity.
5. Apply the gate (section 6) and print the report (section 7).

## 6. Severity model and gate

- **critical** — boundary/security/correctness violations defined as critical by the architecture skills; failing typecheck/tests/arch:check; contract copies out of sync; secrets in diff.
- **major** — rule violations that should be fixed before merge but don't break things.
- **minor** — naming, placement nits.

Gate: **≥1 critical → status BLOCKED.** Claude must not run `gh pr create` / `git push` and tells the user what to fix. Majors → WARN (allowed, listed). Only minors → PASS.
Override: only if the user explicitly says to proceed despite criticals; record that in the PR description.

## 7. Output format

```
pr-self-review — BLOCKED | WARN | PASS
Base: origin/main · Files: 12 (client 7, server 4, shared 1)
Skills used: frontend-architecture, react…, onion-architecture, fastify…, drizzle…
Checks: typecheck ✅  tests ✅  arch:check ❌

CRITICAL
- server/src/modules/reviews/routes.ts:42 — routes-no-infrastructure — route queries Drizzle directly — move to reviews service/repository
MAJOR
- …
MINOR
- …
Next: fix criticals and re-run /pr-self-review.
```

## 8. Files the skill will contain

```
pr-self-review/
├── SKILL.md            # trigger, steps, routing table, gate, output format
├── README.md           # why, sources, version, changelog
└── scripts/
    └── collect-diff.sh # base detection + diff + untracked + surface grouping (JSON out)
```

## 9. Out of scope for v1

Auto-fixing findings; posting comments to GitHub; running integration tests with Docker by default; the PreToolUse hook (v1.1).

## 10. Open questions for review

1. Review uncommitted only, or everything since base (proposal: since base + uncommitted)?
2. Should failing tests count as critical (proposal: yes)?
3. Run lint/tests inside the skill, or only the LLM review (proposal: run, they are cheap and deterministic)?
4. Should the skill offer to fix majors automatically after the report?
