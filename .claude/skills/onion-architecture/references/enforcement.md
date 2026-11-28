# Enforcement with dependency-cruiser

dependency-cruiser is already a dependency (repo-intel uses it to build the import graph), so architecture rules cost one config file and one script. Rules turn the layer table into a check that fails CI instead of relying on review.

## 1. Add the config

`server/.dependency-cruiser.cjs` (paths match the tree as of 2026-11-28; `no-cross-module-imports` also flags `platform/container.ts`'s own imports only if you widen `from` — keep it scoped to `src/modules/`):

```js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'routes-no-infrastructure',
      comment: 'Routes call services only — never adapters, repositories, db or Drizzle.',
      severity: 'error',
      from: {
        path: '^src/modules/[^/]+/routes\\.ts$',
        // legacy debt — remove each entry when the module gets a service
        pathNot: '^src/modules/(polling|pulls|settings|workspace)/routes\\.ts$',
      },
      to: { path: ['^src/adapters/', '^src/db/', '^src/modules/[^/]+/repository', 'node_modules/drizzle-orm'] },
    },
    {
      name: 'services-no-concrete-infrastructure',
      comment: 'Services depend on interfaces injected by the container.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(service|run-executor)\\.ts$' },
      to: { path: ['^src/adapters/', '^src/db/', 'node_modules/(drizzle-orm|@octokit|simple-git|openai|@anthropic-ai)'] },
    },
    {
      name: 'domain-is-pure',
      comment: 'Domain code has no IO and no framework imports.',
      severity: 'error',
      from: { path: ['^src/modules/[^/]+/helpers\\.ts$', '^src/modules/pulls/status\\.ts$', '^src/modules/reviews/findings\\.ts$'] },
      // platform/errors.ts is allowed: plain error classes, no IO
      to: { path: ['^src/(adapters|db)/', '^src/platform/(?!errors\\.ts$)', 'node_modules/(fastify|drizzle-orm|postgres|@octokit|simple-git)', '^node:fs', '^fs$'] },
    },
    {
      name: 'no-cross-module-imports',
      comment: 'Modules talk through the container, not by importing each other.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/([^/]+)/', pathNot: ['^src/modules/$1/', '^src/modules/_shared/', '^src/modules/index\\.ts$'] },
    },
    {
      name: 'adapters-do-not-call-up',
      comment: 'Adapters never import routes or services.',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/[^/]+/(routes|service)\\.ts$' },
    },
    {
      name: 'only-container-builds-adapters',
      comment: 'Concrete adapters are imported only by the composition root, mocks and tests.',
      severity: 'warn',
      from: { pathNot: ['^src/platform/container\\.ts$', '^src/adapters/', '\\.test\\.ts$', '^src/modules/repo-intel/pipeline/'] },
      to: { path: '^src/adapters/(?!mocks)' },
    },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: '(^|/)(clones|vendor|node_modules)/' },
  },
};
```

For `reviewer-core/` add a separate config with one rule: nothing under `src/` (except the `OpenRouterProvider` file) may import `openai`, `node:fs`, or any path outside the package except `@devdigest/shared`.

## Baseline (run against the repo on 2026-11-28, 115 modules)

With this config (after allowing `platform/errors.ts` in domain), the real tree reports:

| Rule | Violation | Suggested fix |
|---|---|---|
| services-no-concrete-infrastructure (error) | `modules/repo-intel/service.ts` → `adapters/codeindex/extract.ts` | expose extraction via the `CodeIndex` port or move the pure extractor into repo-intel/domain |
| services-no-concrete-infrastructure (error) | `modules/repo-intel/service.ts` → `adapters/astgrep/index.ts` | add an AST port on the container (like `DepGraph`/`Tokenizer`) |
| no-cross-module-imports (error) | `modules/repos/service.ts` → `modules/repo-intel/constants.ts` | move the shared constant to `@devdigest/shared` or expose it on `container.repoIntel` |
| only-container-builds-adapters (warn) | `modules/reviews/diff-loader.ts` → `adapters/git/diff-parser.ts` | diff parsing is pure — move to reviewer-core/shared, or call through `GitClient` |
| only-container-builds-adapters (warn) | the two repo-intel imports above | same as above |

Not caught by imports (runtime access, review manually): legacy routes `polling`, `pulls`, `settings`, `workspace` using `container.db` / `container.github()`; services building Drizzle queries on `container.db` instead of a repository.

## 2. Add the script

```json
// server/package.json
"scripts": {
  "arch:check": "depcruise src --config .dependency-cruiser.cjs"
}
```

Run: `cd server && pnpm arch:check`.

## 3. Roll out

1. Run once with all rules at `warn` to see existing violations (expect: services reaching `container.db` directly, repo-intel pipeline importing adapters).
2. Fix or explicitly allow-list (`pathNot`) the known ones, with a TODO.
3. Switch to `error` and add `pnpm arch:check` to the pre-PR checklist / `pr-self-review` and CI.

## Sources

- dependency-cruiser rules reference: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
