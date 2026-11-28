# Severity map

Skills use different scales. Normalize every finding to **critical / major / minor** before gating.

| Source | → critical | → major | → minor |
|---|---|---|---|
| `frontend-architecture`, `onion-architecture` | `critical` | `major` | `minor` |
| `security` | Critical, High | Medium | Low, Info |
| `typescript-expert`, `zod` | wrong at runtime / type hole that hides a bug (`any` on external input, unchecked cast of API data, missing validation of untrusted input) | rule violation without a concrete bug | style / preference |
| `react-best-practices`, `next-best-practices` | bug or leak (stale closure causing wrong data, server secret in client bundle, effect loop) | anti-pattern with real cost (unnecessary effect, state duplication, `'use client'` too high) | style |
| `fastify-best-practices`, `drizzle-orm-patterns`, `postgresql-table-design` | data loss / correctness / missing tenancy filter / unvalidated route input | rule violation | style |
| `react-testing-library` | — | new component or helper with logic and no test; test asserting implementation details | style |
| skills bucket checks | invalid frontmatter (skill won't load) | version not bumped / no changelog entry | wording |
| typecheck failure | critical | | |
| test failure | critical | | |
| `arch:check` new error | critical | | |
| `arch:check` warning | | | minor |
| applied migration edited | critical | | |
| `vendor/shared` copies diverged (not in baseline) | critical | | |
| secret / API key in the diff | critical | | |
| `*.it.test.ts` skipped (no Docker) | not a finding — note in Checks line | | |

When a subagent's label doesn't match the table, judge by consequence: will it break, leak or corrupt something (critical); should it be fixed before merge (major); or is it polish (minor)?

Dedup tie-break: keep the highest normalized severity.
