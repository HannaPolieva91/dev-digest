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
