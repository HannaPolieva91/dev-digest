# e2e — `@devdigest/e2e` (deterministic browser flows via agent-browser)

## Before answering
Search `e2e/docs/`, `e2e/specs/`, `e2e/INSIGHTS.md` first.

## Conventions (not obvious from code)
- Flows are deterministic; no LLM is called — behavior is stable across runs.
  Deterministic locators only; never the agent-browser AI `chat` command.
- Flows read seeded data only (`acme/payments-api`, PR #482, built-in agents).
- npm, not pnpm. Run locally with `scripts/e2e.sh` (hermetic), not `npm test` against your dev DB.
- `e2e/specs/` holds executable flows (`*.flow.json`), not prose specs.

## Use when
- Use when you need how to run, structure, preconditions → `e2e/README.md`
- Use when writing or editing a flow scenario → `e2e/specs/*.flow.json`
- Use when you need deep-dives / past traps → `e2e/docs/` · `e2e/INSIGHTS.md`
