# client — `@devdigest/web` (Next.js 15 App Router · React 19 · TanStack Query)

## Before answering
Search `client/docs/`, `client/specs/`, `client/INSIGHTS.md` first.

## Conventions (not obvious from code)
- Types/contracts come from `@devdigest/shared` (Zod) — never hand-duplicate them.
- All API access goes through `client/src/lib/api.ts` (`apiFetch`) via hooks in
  `client/src/lib/hooks/*`; no raw `fetch` in components.
- Component folder: `Name.tsx` + `index.ts`, optional `constants.ts` · `helpers.ts` ·
  `styles.ts` · `Name.test.tsx`; children nest under `_components/`.
- Import UI only from the `@devdigest/ui` barrel.
- No hard-coded UI strings — add keys to `client/messages/en/<domain>.json`.

## Gotchas
- `client/src/vendor/shared` drifts from the server copy — a contract change goes to both.
- `apiFetch` sends `content-type: application/json` only when there is a body — Fastify
  rejects body-less requests that carry it.
- Unused pieces for future milestones (ExportWizard, blast, eval…) live in `src/vendor/ui`
  and `messages/en` — leave them.

## Use when
- Use when you need page/route map, commands → `client/README.md`
- Use when using or adding UI components → `client/src/vendor/ui/README.md`
- Use when you need deep-dives / UI flow specs / past traps → `client/docs/` · `client/specs/` · `client/INSIGHTS.md`
