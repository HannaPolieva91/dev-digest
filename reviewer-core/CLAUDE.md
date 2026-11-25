# reviewer-core — `@devdigest/reviewer-core` (pure review engine)

## Iron rule
No I/O — no DB, fs, network, GitHub, or persistence. The only side effect is the injected
`LLMProvider`. The same code runs in the studio (server) and, from M6, in CI. Keep it pure.

## Before answering
Search `reviewer-core/docs/`, `reviewer-core/specs/`, `reviewer-core/INSIGHTS.md` first.

## Conventions (not obvious from code)
- The grounding gate (`reviewer-core/src/grounding.ts`) is mandatory; the score is computed
  from findings that SURVIVED grounding, never from the model's self-report.
- skills / memory / specs arrive as RESOLVED strings — slug → body is the caller's job.
- Optional prompt slots that are empty/undefined are omitted — the prompt stays byte-identical.
- Cost estimation is injected (`estimateCost`); no pricing tables here.
- npm, not pnpm. `npm run typecheck` IS the build — the package never emits JS.
- Changing an export → also run `server/`'s typecheck; it is the only consumer (as TS source).

## Gotchas
- Contracts resolve to `server/src/vendor/shared` — don't redefine them here.
- `zod` is aliased to this package's own `node_modules` → a second zod instance at runtime.
- Comments mention a CI "agent-runner" consumer — it doesn't exist until M6.

## Do not touch
- `INJECTION_GUARD` / `wrapUntrusted` in `reviewer-core/src/prompt.ts` — never replace with keyword denylists.

## Use when
- Use when you need pipeline overview, public API, commands → `reviewer-core/README.md`
- Use when you need deep-dives / specs / past traps → `reviewer-core/docs/` · `reviewer-core/specs/` · `reviewer-core/INSIGHTS.md`
