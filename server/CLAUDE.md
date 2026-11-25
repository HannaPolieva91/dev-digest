# server — `@devdigest/api` (Fastify 5 + Drizzle/Postgres + repo-intel)

## Before answering
Search `server/docs/`, `server/specs/`, `server/INSIGHTS.md` for the topic before reading code.

## Conventions (not obvious from code)
- Tenancy: every domain table has `workspace_id`. Get it via `getContext()`
  (`server/src/modules/_shared/context.ts`) and filter by it in EVERY repository query.
- ESM: relative imports carry the `.js` extension.
- Module = `routes.ts` → `service.ts` → `repository.ts`. New feature = new module + one line
  in `server/src/modules/index.ts` (static registry, no filesystem autoload).
- Validate with Zod `schema: { params, body }` on the route; don't hand-roll `.parse(req.body)`.
- Throw `AppError` / `NotFoundError` from `server/src/platform/errors.ts`.
- DI via `server/src/platform/container.ts`: services depend on interfaces from
  `@devdigest/shared`, not classes; tests inject mocks via `ContainerOverrides`.
- Cross-module access via `container.*` (e.g. `container.agentsRepo`), never another module's folder.
- repo-intel is reached ONLY through `container.repoIntel.*` — never its pipeline or repository.
- Context enrichment is best-effort: on error/unindexed, omit the prompt section, don't throw.
- New columns/tables → your own NEW migration only; don't alter other modules' tables.

## Gotchas
- There is NO base-repository guard, despite the comment in `server/src/db/schema.ts` —
  workspace scoping is manual. repo-intel and ci tables have no `workspace_id`; they scope by `repo_id`.
- Two zod instances at runtime (reviewer-core has its own) → `instanceof ZodError` can fail; match by shape.
- `server/src/platform/grounding.ts` and `structured.ts` are re-export shims of `reviewer-core`.
- Most DB tables are intentionally empty — reserved for later milestones; don't drop them.

## Do not touch
- `server/src/db/migrations/**` — never hand-edit applied migrations; generate a new one.
- Host/Origin guard (`server/src/platform/local-only.ts`, `onRequest` in `app.ts`) — the API has no auth.

## Use when
- Use when you need overview, commands, env vars, route/API map → `server/README.md`
- Use when touching indexer internals or the facade → `server/src/modules/repo-intel/README.md`
- Use when tracing the review flow end to end → `server/src/modules/reviews/run-executor.ts`
- Use when writing tests (unit vs `*.it.test.ts`) → `TESTING.md`
- Use when you need deep-dives / feature specs / past traps → `server/docs/` · `server/specs/` · `server/INSIGHTS.md`
