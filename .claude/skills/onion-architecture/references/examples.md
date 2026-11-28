# Good / bad examples

Code is illustrative; match the real names in the repo.

## Route: transport only

**Bad** (pattern currently in `pulls/routes.ts`, `polling/routes.ts`):

```ts
import { and, eq } from 'drizzle-orm';                   // ❌ Drizzle in a route
import * as t from '../../db/schema.js';                 // ❌
app.post('/repos/:id/poll', { schema: { params: IdParams } }, async (req) => {
  const [repo] = await container.db.select().from(t.repos).where(eq(t.repos.id, req.params.id)); // ❌
  const gh = await container.github();                    // ❌ adapter call in route
  // … upsert loop, status rules …                        // ❌ use-case logic in route
});
```

**Good:**

```ts
export async function pollingRoutes(app: FastifyInstance) {
  const service = new PollingService(app.container);
  app.withTypeProvider<ZodTypeProvider>().post('/repos/:id/poll', { schema: { params: IdParams } },
    async (req) => {
      const ctx = await getContext(app.container, req);
      return service.poll(ctx, req.params.id);
    });
}
```

## Service: depends on ports via the container

**Bad:**

```ts
import { Octokit } from '@octokit/rest';                 // ❌ vendor SDK in app layer
import * as t from '../../db/schema.js';                 // ❌ tables in a service
import { eq } from 'drizzle-orm';                        // ❌ query building in a service
export class PollingService {
  constructor(private container: Container) {}
  async poll(repoId: string) {
    const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });   // ❌ constructs deps, reads env
    const [repo] = await this.container.db.select().from(t.repos).where(eq(t.repos.id, repoId)); // ❌
  }
}
```

**Good:**

```ts
export class PollingService {
  private repo: PollingRepository;
  constructor(private container: Container) {
    this.repo = new PollingRepository(container.db);     // repository owns Drizzle
  }
  async poll(ctx: RequestContext, repoId: string) {
    const repo = await this.repo.getRepo(ctx.workspaceId, repoId);
    if (!repo) throw new NotFoundError('repo', repoId);
    const gh = await this.container.github();            // GitHubClient port
    const pulls = await gh.listPulls(repo.owner, repo.name);
    await this.repo.upsertPulls(ctx.workspaceId, repoId, pulls);
    return { count: pulls.length };
  }
}
```

## Domain: pure and injectable

**Bad:**

```ts
// reviewer-core/src/grounding.ts
import { readFileSync } from 'node:fs';           // ❌ IO in domain
export function groundFindings(findings, repoPath) {
  const file = readFileSync(`${repoPath}/${f.path}`, 'utf8');
  // …
}
```

**Good:**

```ts
export function groundFindings(findings: Finding[], diff: UnifiedDiff): Finding[] {
  const lines = indexDiffLines(diff);
  return findings.filter((f) => lines.has(`${f.path}:${f.line}`));
}
```

The diff arrives as data; whoever has IO (a service via `GitPort`) fetches it.

## Repository: Drizzle stays inside, workspace always scoped

**Bad:**

```ts
async listPulls(repoId: string) {
  return this.db.select().from(t.pulls).where(eq(t.pulls.repoId, repoId));   // ❌ no workspace_id filter
}
```

**Good:**

```ts
export class PullsRepository {
  constructor(private db: Db) {}
  async listPulls(workspaceId: string, repoId: string): Promise<PullSummary[]> {
    const rows = await this.db.select().from(t.pulls)
      .where(and(eq(t.pulls.workspaceId, workspaceId), eq(t.pulls.repoId, repoId)));
    return rows.map(toPullSummary);                         // map row → contract type
  }
}
```

## Adapter: vendor-shaped inside, port-shaped outside

**Bad:**

```ts
export interface LLMPort { chat(params: OpenAI.ChatCompletionCreateParams): Promise<OpenAI.ChatCompletion> } // ❌ vendor types in port
```

**Good:**

```ts
// port (shared)
export interface LLMProvider {
  completeStructured<T>(req: { system: string; user: string; schema: ZodType<T>; model: string }): Promise<T>;
}
// adapters/llm/anthropic.ts
export class AnthropicProvider implements LLMProvider {
  async completeStructured<T>(req) {
    try { /* SDK call, map to T */ }
    catch (e) { throw new AppError('LLM_UNAVAILABLE', 'Anthropic request failed', { cause: e }); }
  }
}
```

## Cross-module call

**Bad:**

```ts
// modules/reviews/service.ts
import { AgentsRepository } from '../agents/repository.js';   // ❌ reaching into another module
import { buildIndex } from '../repo-intel/pipeline/index.js'; // ❌ repo-intel internals
```

**Good:** `this.container.agentsRepo`, `this.container.repoIntel.getRepoMap(…)`.

## Container and tests

**Good:**

```ts
const container = new Container(config, db, {
  github: mockGitHub({ pulls: fixtures.pulls }),
  llm: { openrouter: mockLLM(fixtures.review) },
  repoIntel: mockRepoIntel(),
});
const app = await buildApp(container);
```

**Bad:** `vi.mock('../../adapters/github/octokit.js')` in a service test — couples the test to file layout and hides a missing seam.
