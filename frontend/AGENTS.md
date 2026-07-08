# Easy Apps Agent Instructions

This is the frontend-workspace contract: what applies to all apps and packages. App-specific rules (routing, forms, API usage, UI) live in that app's `AGENTS.md` — read it before editing inside the app, and don't copy its rules here.

## Repository Map

- Package manager: `pnpm@10.27.0`.
- Apps:
  - `apps/coachapp-v2`: primary coach app, React 19 + Vite, port 2021.
  - `apps/clientapp-v2`: client PWA and Capacitor shell, React 19 + Vite, port 1314.
  - `apps/website`: marketing site, Next.js 16, port 3000.
- Shared packages:
  - `packages/ui`, `packages/hooks`, `packages/utils`.
  - `packages/error-parser`, `packages/typings`.

## Commands

- All apps dev: `pnpm dev`.
- App dev/build:
  - Coach: `pnpm dev:coachapp`, `pnpm build:coachapp`.
  - Client: `pnpm dev:clientapp-v2`, `pnpm build:clientapp-v2`.
  - Website: `pnpm dev:website`, `pnpm build:website`.
- Whole repo build: `pnpm build`.
- Whole repo lint/format: `pnpm lint`, `pnpm format`.
- Path-local commands are valid: `pnpm -C <path> <script>`.
- Prefer the narrowest command that proves the change. Use repo-wide commands for repo-wide changes.
- `lint` runs Biome with `--write`; review any files it changes.
- There is no general test suite configured. Use build, lint, and manual/browser checks appropriate to the touched surface.

## Boundary Rules

- App code may depend on shared packages; shared packages must not depend on app internals.
- Shared package exports are public contracts. Treat package changes as higher risk than app-local changes.
- Do not add app-specific routing, copy, environment assumptions, or design-system details to shared packages.
- Reuse existing types and utilities instead of re-declaring shapes.
- Check package manifests before changing dependency or peer dependency assumptions.

## Verification

- App code changes: run that app's build command.
- Shared package changes: run the package build and at least one relevant consuming app build.
- Repo-wide refactors: run `pnpm build`; run `pnpm lint` only when formatting/lint writes are intended.
- UI or routing changes: verify the touched flow in a browser at mobile and desktop widths after the build succeeds.

## API Clients (Generated)

Each app's API layer is generated from the backend OpenAPI spec. Do NOT hand-edit `src/api/generated.ts` in either app — it will be overwritten.

### Regenerating

After any backend API change:

```
just gen-api
```

This runs: backend spec dump → coach/client split → `gen:api` in both apps → Biome format on both output files.

If you only need to regenerate the clients without re-dumping the spec:

```
cd frontend && pnpm --filter coachapp-v2 gen:api && pnpm --filter clientapp-v2 gen:api
```

### Architecture

- Config files: `openapi-config.json` in each app root (NOT a `.ts` file).
- Tool pin: `@rtk-query/codegen-openapi@2.1.0`. Do NOT upgrade to 2.2.0 — it crashes on TS 5.8.
- Each app's `generated.ts` injects into the hand-maintained `src/api/base.ts` (the `api` slice with auth/refresh `baseQuery`). The base slice is never overwritten; the generated file is always overwritten.
- Scope: coachapp = `/v1/coach` + `/v1/businesses` + auth/public; clientapp = `/v1/client` + auth/public.

### Migration Rule: delete-then-use per feature

Hand-written `src/api/*.ts` endpoints are being replaced by generated ones feature-by-feature. The rule:

**When you migrate a feature, switch its components to the generated hook AND delete the hand-written endpoint in the same change.**

Never leave a component importing `generated.ts` while a hand-written endpoint for the same operation still exists elsewhere — this causes duplicate-injection / first-wins ordering surprises.

`generated.ts` should only ever be imported by already-migrated screens, never app-wide.

### Cache Tags

Codegen runs with `tag: false`, so generated endpoints have NO `providesTags`/`invalidatesTags`. When migrating a feature that mutates data, add cache-tag wiring per feature — otherwise screens won't auto-refresh after mutations.

### Infinite-scroll Lists Stay Hand-Written

`@rtk-query/codegen-openapi` cannot generate RTK Query `build.infiniteQuery`. The paginated list endpoints MUST remain hand-written `build.infiniteQuery`:

- **coachapp:** exercises, foods, recipes, clients, workout-sessions, nutrition-plans, training-plans, conversation messages (cursor `before`, in `src/api/conversations.ts`)
- **clientapp:** client exercises, client workout-sessions, conversation messages (cursor `before`, in `src/api/conversation.ts`)

When migrating those, keep the hand-written infinite endpoint but refactor it to import generated TYPES (e.g. `ListFoodsApiArg` / `ListFoodsApiResponse` from `generated.ts`) instead of hand-maintaining `ApiListResponse<X>` / `ListXFilters`. The generated standard query and the hand-written infinite endpoint have different names and coexist cleanly.
