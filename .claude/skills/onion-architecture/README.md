# onion-architecture — README

**Version:** 1.1.0 (2026-11-28) · **Owner:** DevDigest team · **Scope:** `server/`, `reviewer-core/`

Human-facing notes. The agent reads `SKILL.md` and `references/`; this file records the reasoning and sources so the skill can be reviewed, versioned and kept current.

## What it covers

- The DevDigest backend as an onion: domain (reviewer-core, shared contracts & ports) → application services → infrastructure (adapters, Drizzle repositories) → HTTP edge, wired by `platform/container.ts`.
- Dependency direction (inward only) and where each kind of code goes.
- How new integrations are added: port → adapter → mock → container registration.
- How to review a backend diff for layering violations.
- How to enforce the rules automatically with dependency-cruiser.

## Out of scope (other skills)

| Topic | Skill |
|---|---|
| Fastify API usage: plugins, hooks, decorators, schemas, serialization | fastify skill |
| Drizzle schema, queries, migrations, transactions | drizzle skill |
| Type-level TypeScript | typescript skill |
| Client code | `frontend-architecture` |
| Generic security review | security agent / skill |

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Layer map, decision guide, 8 core rules, review format |
| `references/layer-map.md` | Each layer's job, allowed/forbidden imports, which DevDigest files belong there |
| `references/examples.md` | Good/bad code for routes, services, domain, repositories, adapters, cross-module calls, container/tests |
| `references/enforcement.md` | dependency-cruiser config + script + rollout plan |

## Decisions we made (and why)

0. **Describe the DI the repo already uses** (class services taking `Container`, ports from `@devdigest/shared`) instead of inventing factory functions.
1. **reviewer-core is the domain core.** It already has one side effect (injected `LLMProvider`) and must run without the server (future CI runner).
2. **`OpenRouterProvider` stays in reviewer-core** but is treated as an adapter: own file, implements the port, imported only by composition roots.
3. **Ports live next to their consumer or in `@devdigest/shared`,** shaped by the use case, not the vendor.
4. **One composition root** (`platform/container.ts`) + `ContainerOverrides` for tests, instead of module mocking.
5. **Modules never import each other;** shared capabilities come via the container, shared rules move inward.
6. **Enforce with dependency-cruiser** because it is already installed — architecture as a fitness function, not just a convention.

## Sources

Onion / hexagonal / clean
- Jeffrey Palermo — The Onion Architecture, part 1: https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/
- Jeffrey Palermo — part 2: https://jeffreypalermo.com/2008/07/the-onion-architecture-part-2/
- Jeffrey Palermo — parts 3–4 (index): https://jeffreypalermo.com/tag/onion-architecture
- Herberto Graça — Onion Architecture (Software Architecture Chronicles): https://medium.com/the-software-architecture-chronicles/onion-architecture-79529d127f85
- Alistair Cockburn — Hexagonal / Ports & Adapters (overview): https://en.wikipedia.org/wiki/Hexagonal_architecture_(software)
- Cockburn & Garrido de Paz — Hexagonal Architecture Explained, code preview: https://alistaircockburn.com/code%20hexarch%20book%20v0.9a.pdf
- NDepend — Onion architecture layers (tenets: inner layers define interfaces, outer implement): https://blog.ndepend.com/onion-architecture-layers/
- DZone — Onion architecture vs layered (dependency direction): https://dzone.com/articles/onion-architecture-is-interesting

Stack-specific
- Fastify — Plugins guide (encapsulation, decorators): https://fastify.dev/docs/latest/Guides/Plugins-Guide/
- NearForm — Complete guide to the Fastify plugin system: https://nearform.com/blog/complete-guide-fastify-plugin-system
- LogRocket — Repository pattern in TypeScript/Node: https://blog.logrocket.com/exploring-repository-pattern-typescript-node
- Folionaut ADR — Repository pattern over Drizzle (trade-offs): https://spencerjireh.github.io/folionaut/decisions/004-repository-pattern

Enforcement
- dependency-cruiser rules reference: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
- Xebia — Taking architecture seriously with dependency-cruiser (fitness function): https://xebia.com/blog/taking-frontend-architecture-serious-with-dependency-cruiser/

## How to verify the skill

1. Ask: "Add a GitLab integration to fetch PR diffs" → expect a `GitHostPort`-style interface, adapter in `adapters/`, mock, container registration — nothing in routes.
2. Ask: "In the reviews route, check whether the repo is indexed before starting" → expect the check to go into the service (or domain), not the route.
3. Give it a diff where `service.ts` imports `db` → expect a **critical** finding.
4. Run `pnpm arch:check` after adding the config and compare with the skill's own review.

## Known gaps / to check against the repo

- Legacy routes `polling`, `pulls`, `settings`, `workspace` query Drizzle and call adapters directly (no service yet) — documented as debt, allow-listed in the dependency-cruiser config.
- dependency-cruiser config was run against the real `server/src` (115 modules): 3 errors + 3 warnings remain — see the baseline table in `references/enforcement.md`.
- Runtime access through `container.db` inside services is not detectable by import rules; the skill asks reviewers to catch it.

## Changelog

- **1.1.0** (2026-11-28) — aligned with the real repo: class services built with `Container`, ports in `@devdigest/shared`, repository classes (incl. `reviews/repository/*.repo.ts`), `_shared/context`, workspace scoping rule, legacy route debt; dependency-cruiser config verified on the codebase with a recorded baseline.

- **1.0.0** (2026-11-28) — first version: layer map, decision guide, core rules, examples, dependency-cruiser enforcement.
