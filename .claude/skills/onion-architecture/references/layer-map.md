# Layer map — DevDigest backend

Request path today: HTTP → `onRequest` Host/Origin guard (`platform/local-only.ts`) → plugins (helmet, cors, rate-limit, SSE) → route Zod schema (invalid → 422) → `modules/<name>/routes.ts` → `service.ts` → `repository.ts` → Drizzle → Postgres. Composition root: `platform/container.ts`.

## 1. Domain (center)

**Responsibility:** rules and data shapes that are true no matter how they are delivered or stored.

**Belongs here**
- `reviewer-core/src/prompt.ts` — prompt assembly, `INJECTION_GUARD`, `wrapUntrusted`
- `reviewer-core/src/grounding.ts` — dropping findings that don't cite a real diff line
- `reviewer-core/src/review/run.ts` — review engine (strategy, parse-with-repair, score recomputation), with `LLMProvider` injected
- Zod contracts and port interfaces in `@devdigest/shared` (`Review`, `Finding`, `UnifiedDiff`, `LLMProvider`)
- Module-level pure rules and DTO mappers in `modules/<m>/helpers.ts` (e.g. `toAgentDto`), `modules/reviews/findings.ts`, `modules/pulls/status.ts` — keep them free of `db`/adapters
- Ports in `@devdigest/shared`: `LLMProvider`, `GitHubClient`, `GitClient`, `CodeIndex`, `SecretsProvider`, `AuthProvider`, `Embedder`

**Allowed deps:** other domain code, Zod, shared contracts.
**Forbidden:** fastify, drizzle-orm, postgres, `server/src/**` (anything outside reviewer-core/shared), octokit, simple-git, openai/anthropic SDK (except behind `LLMProvider` inside an adapter), `node:fs`, `process.env`.

Note: `OpenRouterProvider` lives in reviewer-core by design (the future CI runner needs it). Treat it as an adapter that happens to ship with the core package: keep it in its own file, implement `LLMProvider`, and never import it from domain files — only from composition roots (server container, CI entrypoint).

## 2. Application services

**Responsibility:** one method per use case; orchestrate domain + ports; own transactions and side-effect ordering.

**Belongs here:** `modules/<m>/service.ts`, `modules/reviews/run-executor.ts` (orchestrates a review run: loadDiff → repo-intel → reviewPullRequest → persist → runBus).

**Allowed deps:** domain, port interfaces, repository interfaces, `platform/errors`.
**Forbidden:** `FastifyRequest`/`FastifyReply`, Drizzle tables/`db`, concrete adapter classes, another module's `service.ts`/`repository.ts`.

Services are classes that receive the `Container` and read **ports and shared repositories** from it (the repo's DI style):

```ts
export class ReviewService {
  constructor(private container: Container) {}
  async startReview(ctx: RequestContext, pullId: string) {
    const agents = await this.container.agentsRepo.listEnabled(ctx.workspaceId);
    const gh = await this.container.github();          // GitHubClient port
    // … orchestrate, persist via repository, publish via container.runBus
  }
}
```

Allowed from the container: port getters (`github()`, `git`, `llm()`, `codeIndex`, `embedder`), `agentsRepo`, `reviewRepo`, `repoIntel`, `jobs`, `runBus`, `config`. Not allowed: reaching `container.db` to build queries in the service — that belongs in the module's repository.

## 3. Infrastructure (adapters + repositories)

**Responsibility:** talk to the outside world and translate it into domain terms.

**Belongs here**
- `server/src/adapters/llm/*` (OpenAI, Anthropic, pricing), `adapters/github/octokit`, `adapters/git/simple-git`, `adapters/secrets/local` (`~/.devdigest/secrets.json`), `adapters/auth/local` (LocalNoAuthProvider), `adapters/astgrep`, `adapters/depgraph`, `adapters/tokenizer`, `adapters/codeindex/ripgrep`, `adapters/embedder/openai`
- `adapters/mocks.ts` — test doubles for every port
- `modules/<m>/repository.ts` (class taking `Db`) or `modules/<m>/repository/*.repo.ts` for large modules — Drizzle queries; every query filters by `workspace_id` (repo-intel/ci tables: `repo_id`)
- JobRunner (p-queue + `jobs` table), RunBus (SSE bus) — infrastructure services exposed to the app layer through narrow interfaces

**Allowed deps:** domain types, port interfaces, vendor SDKs, Drizzle, `platform/errors`.
**Forbidden:** routes, services (an adapter never calls up into the app).

Adapter checklist:
- implements an interface the consumer owns; vendor types don't appear in the signature;
- maps vendor errors → `AppError`/domain error;
- has a mock in `adapters/mocks.ts` and is overridable via `ContainerOverrides`;
- reads secrets only through the secrets adapter.

## 4. HTTP edge

**Responsibility:** transport only — schema, auth/guards, status codes, SSE wiring.

**Belongs here:** `modules/<m>/routes.ts`, `modules/_shared/{context,schemas}.ts`, module registration in `modules/index.ts`, Fastify plugins and guards (`platform/local-only.ts`, `app.ts`).

**Legacy exceptions:** `polling`, `pulls`, `settings`, `workspace` routes currently query Drizzle and call adapters directly — known debt, see SKILL.md.

**Allowed deps:** the module's service (obtained from the container), shared Zod schemas, `platform/errors`.
**Forbidden:** adapters, repositories, `db`, Drizzle, vendor SDKs, reviewer-core functions (go through the service).

## 5. Composition root

`platform/container.ts` (class `Container`) builds adapters lazily, shared repositories (`agentsRepo`, `reviewRepo`), the repo-intel facade, JobRunner and RunBus, and accepts `ContainerOverrides` for tests. Services are built in their module's `routes.ts` with `new XService(app.container)`. It is the only file allowed to know every concrete class. New module = `modules/<name>/routes.ts` + one import + one line in `modules/index.ts`; its service and repository are wired here.

## Cross-module communication

Modules (`repos`, `polling`, `pulls`, `agents`, `reviews`, `repo-intel`, `settings`, `workspace`) do not import each other. When `reviews` needs agents or repo-intel, it receives `agentsRepo` / the repo-intel facade from the container. If a rule is needed by two modules, push it inward into domain/shared.
