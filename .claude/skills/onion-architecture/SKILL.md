---
name: onion-architecture
description: Onion (ports & adapters) layering for the DevDigest backend — server/ (Fastify 5, Zod, Drizzle) and reviewer-core/. Use whenever you add or change a server module, route, service, repository, adapter (LLM, GitHub, git, secrets, auth, ast-grep, depgraph, tokenizer, code index, embedder), the DI container, or reviewer-core code, and whenever the question is "which layer does this go in?", "can this route call X directly?", "where do I put this integration?". Also use when reviewing a diff that touches server/ or reviewer-core/ for layering violations. Covers dependency direction and placement; Fastify, Drizzle, Zod and TypeScript API details live in their own skills.
metadata:
  version: "1.1.0"
  owner: DevDigest team
  scope: server/, reviewer-core/
---

# Onion architecture (DevDigest backend)

**The one rule:** code depends only on layers closer to the center. The center knows nothing about HTTP, Postgres, GitHub, git, the file system or an LLM vendor. Infrastructure plugs in from outside through interfaces (ports) declared in `@devdigest/shared`, and is wired in one place: `server/src/platform/container.ts`.

Why it matters here: tests swap every adapter via `ContainerOverrides`; reviewer-core must also run in the future CI runner without the server; LLM providers and git hosts are interchangeable. One `import * as t from '../../db/schema.js'` in a route breaks all three.

## Layer map

```
  outer   HTTP edge ........ modules/<m>/routes.ts            Fastify + Zod schemas, getContext()
          Composition root . platform/container.ts            the only place that `new`s adapters
          Infrastructure ... adapters/** (implement ports)    llm, github, git, secrets, auth, codeindex,
                             modules/<m>/repository.ts         depgraph, tokenizer, embedder, astgrep
                             (or repository/*.repo.ts), db/    Drizzle + workspace scoping
                             platform/{jobs,sse,…}             JobRunner, RunBus, logging, resilience
          Application ...... modules/<m>/service.ts            use cases; run-executor.ts
  center  Domain ........... reviewer-core/src/**              prompt, grounding, review run, scoring
                             @devdigest/shared                 Zod contracts + ports (LLMProvider,
                             modules/<m>/helpers.ts (pure)     GitHubClient, GitClient, CodeIndex, …)
```

| Layer | May import | Must not import |
|---|---|---|
| Domain (reviewer-core, shared, pure helpers) | other domain code, Zod, shared contracts | fastify, drizzle-orm, `db/`, `adapters/`, `platform/container`, octokit, simple-git, `node:fs`, `process.env` |
| Application (`service.ts`, `run-executor.ts`) | domain, `Container` **type** (to reach ports/repos), own repository, `platform/errors` | `db/schema`, `drizzle-orm` operators, concrete adapter classes, `FastifyRequest`/`Reply`, another module's folder |
| Infrastructure (adapters, repositories, `db/`) | domain types, ports, vendor SDKs, Drizzle | routes, services |
| HTTP edge (`routes.ts`) | own service, `_shared/context`, `_shared/schemas`, shared Zod contracts, `platform/errors` | `db/schema`, `drizzle-orm`, `container.db`, `container.github()/git/llm()/secrets`, adapters, reviewer-core internals |
| Composition root (`platform/container.ts`) | everything | — |

Details per layer and which files belong where: `references/layer-map.md`.

## How the repo does DI (follow it)

- Ports are interfaces in `@devdigest/shared` (`LLMProvider`, `GitHubClient`, `GitClient`, `CodeIndex`, `SecretsProvider`, `AuthProvider`, `Embedder`). `RepoIntel`, `DepGraph`, `Tokenizer` are typed in their modules/adapters.
- `Container` is a class exposing ports lazily (`container.github()`, `container.llm(provider)`, `container.git`), shared repositories (`container.agentsRepo`, `container.reviewRepo`) and the repo-intel facade (`container.repoIntel`).
- A service is a class: `new AgentsService(app.container)`, built once in its `routes.ts`. It reads ports and repos from the container — never imports an adapter.
- A repository is a class taking `Db`: `new AgentsRepository(db)`. Large modules split it: `reviews/repository/{pull,run,review}.repo.ts`.
- Tests: `new Container(config, db, { github: mockGitHub, llm: { openrouter: mockLLM } })` — never `vi.mock` an adapter file.

## Decision guide: where does this code go?

1. **Parses HTTP / validates / sets status?** → `routes.ts`: Zod `schema: { params, body }`, `getContext()`, one service call, return. Nothing else.
2. **A rule true regardless of transport and storage** (grounding, scoring, prompt assembly, blocker count, DTO mapping)? → domain: `reviewer-core` for review-engine rules; pure function in `modules/<m>/helpers.ts` for module rules.
3. **Coordinates a use case** (load repo → call GitHub → upsert pulls → return)? → `service.ts` method.
4. **Talks to an external system?** → adapter in `adapters/<kind>/` implementing a shared port; mock in `adapters/mocks.ts`; registered in `Container` + `ContainerOverrides`.
5. **Reads/writes Postgres?** → the module's repository class. Every query filters by `workspace_id` (from `getContext()`); repo-intel/ci tables scope by `repo_id`.
6. **Needed by another module?** → expose it on the container (`container.agentsRepo`, `container.repoIntel`) — never import another module's folder. Shared rules move inward to shared/reviewer-core.

## Rules with the most leverage

1. **Routes never touch infrastructure.** No `container.db`, `drizzle-orm`, `db/schema`, `container.github()`, `container.secrets` in `routes.ts`. If a module has no service yet, create one.
2. **Services use ports, not adapters.** Only `Container`'s getters and repository classes; no `new OctokitGitHubClient()`, no `import … from '../../adapters/…'`.
3. **The domain is IO-free.** reviewer-core's only side effect is the injected `LLMProvider`. `OpenRouterProvider` ships in reviewer-core but is an adapter: imported only by composition roots.
4. **Modules don't import each other.** Via container only; repo-intel only through `container.repoIntel.*` (never its pipeline or repository).
5. **One composition root.** Only `container.ts` instantiates concrete adapters/shared repos.
6. **Ports are shaped by use case, not vendor.** No Octokit/OpenAI types in shared ports; vendor types stay inside the adapter.
7. **Errors cross layers as `AppError` / `NotFoundError`** (`platform/errors.ts`). Adapters translate vendor errors; services never set HTTP codes; routes rely on the error handler.
8. **Contracts live in `@devdigest/shared`** and exist in two copies (server + client `vendor/shared`). Changing one means changing both.
9. **Best-effort enrichment doesn't throw.** repo-intel/context failures omit the prompt section; the review continues.

Good/bad code for each: `references/examples.md`.

## Known debt (don't copy it)

`polling`, `pulls`, `settings`, `workspace` currently have only `routes.ts`, which use `container.db` + `drizzle-orm` + `db/schema` and call `container.github()` / `container.secrets` / `container.llm()` directly. Treat them as legacy: when a diff touches these routes, the new code goes into a new `service.ts` (+ repository), and the review mentions the remaining debt as a follow-up, not a blocker. New modules must never follow this pattern.

## Reviewing a backend diff

```
[severity] path/to/file.ts:line — rule broken — why it matters — fix (target layer/file)
```

- **critical** — dependency points outward in **new** code: route/service imports `db/schema`, `drizzle-orm`, an adapter or vendor SDK; reviewer-core imports from `server/`; domain does IO; a secret read outside `SecretsProvider`; a repository query without `workspace_id` scoping.
- **major** — business rule in a route or repository; module imports another module's folder; vendor type leaks through a port; adapter without a mock / `ContainerOverrides` entry; contract changed in one `vendor/shared` copy only.
- **minor** — misplaced file inside the right layer, missing `.js` import extension, port named after a vendor.

## Enforcement

dependency-cruiser ^17 is already a server dependency. `references/enforcement.md` has a config that encodes the table above, with the four legacy route files allow-listed, plus the `arch:check` script.

## Reference files

- `references/layer-map.md` — each layer's job, allowed imports, which DevDigest files belong there.
- `references/examples.md` — good/bad code for routes, services, repositories, adapters, container/tests, reviewer-core.
- `references/enforcement.md` — dependency-cruiser rules, script, rollout.
