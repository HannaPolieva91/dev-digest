# engineering-insights — examples

The bar: an agent reads the entry cold and **knows what to do**, without re-investigating.
Test: "if this were obvious to anyone reading the code — don't write it."

## Vague vs useful

| ❌ Noise | ✅ Insight |
|---|---|
| Promises can be tricky. | `Promise.all()` on the ingest pipeline times out after ~30 items — use `Promise.allSettled()` in batches of 10. |
| Be careful with async. | Checkout state always goes through Zustand (`cartStore.ts`) — 3 components share the cart; local state breaks sync. |
| Zod errors are weird here. | `instanceof ZodError` can be false — reviewer-core ships a second zod instance; match by shape (`issues` array). |
| Fastify is strict about requests. | Fastify rejects a body-less request carrying `content-type: application/json` ("Body cannot be empty") — only set it when there is a body. |

## One example per section (DevDigest-flavoured)

**What Works**
```
- 2026-11-25 — Reproduce review-run bugs with a ContainerOverrides mock LLM instead of a real provider. Why: deterministic, no API cost, runs in unit tests. Ref: server/src/platform/container.ts:<line> (ContainerOverrides)
```

**What Doesn't Work**
```
- 2026-11-25 — Detecting validation errors with `err instanceof z.ZodError` alone misses errors thrown from reviewer-core. Why: two zod instances at runtime. Ref: server/src/app.ts:<line> (setErrorHandler)
```

**Codebase Patterns**
```
- 2026-11-25 — Grounding score is computed only from findings that survived the grounding gate, never the model's self-reported score. Why: model scores are unverified. Ref: reviewer-core/src/grounding.ts:<line> (groundFindings)
```

**Tool & Library Notes**
```
- 2026-11-25 — Fastify returns 400 "Body cannot be empty" when content-type is JSON but body is absent; apiFetch adds the header only with a body. Why: Fastify's JSON parser runs on the header. Ref: client/src/lib/api.ts:<line> (apiFetch)
```

**Recurring Errors & Fixes**
```
- 2026-11-25 — "Cannot find module './foo'" at runtime in server/ → relative import missing `.js`. Why: ESM requires the extension. Ref: server/src/modules/index.ts:<line> (route registration)
```

**Session Notes**
```
- 2026-11-25 — Traced why PR import hung: clone step waits on git credential prompt; set GIT_TERMINAL_PROMPT=0. Why: first time this path was debugged. Ref: server/src/modules/repo-intel/pipeline/<file>.ts:<line> (<symbol>)
```

**Open Questions**
```
- 2026-11-25 — Unclear whether repo-intel re-indexes on force-push or only on new SHA. Why: saw stale symbols once, not reproduced. Ref: server/src/modules/repo-intel/service.ts:<line> (<symbol>)
```

**Correcting an old entry (append, never edit)**
```
- 2026-12-02 — Supersedes 2026-11-25: Promise.allSettled batch size of 10 still times out with large repos; 5 is stable. Why: measured on acme/payments-api. Ref: server/src/modules/repo-intel/pipeline/<file>.ts:<line> (<symbol>)
```

> Refs above illustrate the format (`<line>` is a placeholder); always cite the real `file:line` you opened and verified, plus the symbol.

## What is NOT an insight — skip these
- **A description of the code** ("routes.ts registers routes") — the code already says it.
- **A replay of the chat** ("first I tried X, then the user said Y…") — extract the lesson only.
- **Generic best practice** ("write tests", "validate input") — true everywhere, says nothing about this repo.
- **Already documented** in `README.md`, `CLAUDE.md`, `docs/` — link to it instead.
- **An unconfirmed guess** — put it under Open Questions, or don't write it.
