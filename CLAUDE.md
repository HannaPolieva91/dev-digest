# DevDigest — agent guide

Local-first AI pull-request reviewer. Course starter: import a PR → run an agent
review works end to end; each milestone (M1–M8) adds one feature.

## Before answering
Always search the relevant package's `docs/`, `specs/` and `INSIGHTS.md` for what the
user asks about FIRST — they are curated and may already answer it — then its
`README.md`, then the code.

## Session protocol (learnings loop)
- **Start:** before working in a package, read its `INSIGHTS.md` and treat entries as
  high-confidence guidance; name the relevant ones, if any.
- **During:** hit something non-obvious (bug cause, workaround, dead end, quirk) and the fix
  is confirmed → run the `engineering-insights` skill (`.claude/skills/engineering-insights/`).
- **End:** before finishing a task that involved debugging or discovery, run
  `/engineering-insights` as a wrap-up. Do not skip this step.

## Stack & commands
`server/` Fastify + Drizzle + Postgres/pgvector (pnpm) · `client/` Next.js 15 + React 19 +
TanStack Query (pnpm) · `reviewer-core/` review engine (npm) · `e2e/` agent-browser flows (npm).
```sh
./scripts/dev.sh                     # Postgres (Docker) + migrate + seed + API :3001 + web :3000
cd server && pnpm typecheck && pnpm exec vitest run --exclude '**/*.it.test.ts'  # unit
cd server && pnpm exec vitest run .it.test   # integration (Docker); `pnpm test` = both
cd client && pnpm typecheck && pnpm test && pnpm build   # build catches what vitest/tsc miss
cd reviewer-core && npm run typecheck && npm test
cd e2e && npm test                   # needs ./scripts/dev.sh running + agent-browser CLI
```
client pnpm overrides live in `client/pnpm-workspace.yaml` (not package.json) — see
`client/INSIGHTS.md`. Details: `TESTING.md`.

## Use when
- Use when you need quick start details or architecture → `README.md`
- Use when writing or moving tests, touching CI → `TESTING.md`
- Use when editing built-in agent prompts → `docs/agent-prompts/README.md`
- Use when working in the API or DB → `server/CLAUDE.md`
- Use when working in the web app → `client/CLAUDE.md`
- Use when working in the review engine → `reviewer-core/CLAUDE.md`
- Use when working on browser e2e flows → `e2e/CLAUDE.md`

Package CLAUDE.md files auto-load by location, but that is unreliable in the
VS Code extension (#24987) — follow the pointers above explicitly.

## Conventions (not obvious from code)
- NOT a monorepo workspace: each package has its own `package.json` + lockfile and
  installs separately — `server/`, `client/` use pnpm; `reviewer-core/`, `e2e/` use npm.
- Cross-package code is shared via tsconfig `paths` aliases, never published packages.
- Doc roles: `CLAUDE.md` = agent rules · `README.md` = how it works · `docs/` = deep-dives ·
  `specs/` = what to build · `INSIGHTS.md` = lessons learned. Link between them; never copy.

## Gotchas
- `@devdigest/shared` exists in TWO copies — `server/src/vendor/shared` and
  `client/src/vendor/shared` — and they already drift. `reviewer-core` resolves the server copy.

## Do not touch
- `@devdigest/shared` contracts and `server/src/db/migrations/` — never edit without
  coordination; a contract change must land in BOTH copies.
- Secrets only via `SecretsProvider`; never in DB, logs, git, or URLs.
- `server/clones/` — real checkouts of user repos (git-ignored).
- Never `docker compose down -v` — it wipes the dev DB volume.
