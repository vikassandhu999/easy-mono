# Frontend contract

This file is the contract for every app and package under `frontend/`. Follow it while writing and reviewing. Cursor loads it when you edit this tree. App screens, routing, and UI live in that app's `AGENTS.md` — read it before editing inside the app.

Commands: the app's `package.json` `scripts`, or `just --list` from the repo root.

## Boundary

Apps depend on `packages/*`. Packages do not depend on app internals. Package exports are public contracts.

Inside an app's `src/` there are three kinds of directory and no fourth:

- `api/` — the server contract. Flat, one file per backend resource.
- `ui/` — feature-agnostic components and hooks. Flat.
- `<feature>/` — one per route group. Nests only when the child is itself a route group (`library/foods/`, `nutrition-plans/builder/`).

No `components/`, no `lib/`, no `utils/`, no `@`-sigils. Files are told apart by **name**, not by a generic parent folder.

**The arrows point one way: feature → ui → api.**

- `ui/` imports `api/`, `@easy/utils`, and nothing else. Never a feature.
- A feature imports `ui/`, `api/`, and other features' **`.ts` files only**.
- A feature's `.tsx` is private, always. UI that two features need moves to `ui/`.
- `router.tsx` and `app-shell.tsx` are the composition root and may import anything.

The public surface rides on the file extension rather than on a folder, which is what keeps it testable: if another feature needs it, it is pure `.ts`, and pure `.ts` gets a sibling `.check.ts`. Enforced by `scripts/check-frontend-shape.mjs` through `just check-rm` (RM-144).

`@easy/utils` is for product-agnostic helpers (dates, names, numbers). Check it before writing one.

## API

Both coach and client apps: TanStack React Query 5 + `openapi-typescript` types + `openapi-fetch`. Hooks are hand-written. There is no hook codegen.

`just gen-api` dumps the backend spec, splits it, and regenerates both apps' `src/api/schema.ts`. That file is always overwritten.

- Types come from `schema.ts` (`components['schemas'][...]`, `paths[...]`). The owning `src/api/*.ts` file re-exports them. Derive with `Pick` / `Omit` / indexed access; do not redeclare the shape.
- Runtime calls: `call(client.VERB(path, ...))` from `src/api/client.ts`. Non-2xx throws `ApiError {status, data}`.
- Query keys come only from `src/api/keys.ts` factories: `{all, lists(), list(filters), infinite(filters), details(), detail(id)}`. List-shaped keys nest under `lists()` (RM-143). Flat and infinite lists use different keys.
- Invalidation lives in the mutation hook (`detail(id)` + `lists()` on update; deletes `removeQueries` their detail). A mutation with neither invalidation nor an optimistic patch leaves stale screens. Call sites `await mutateAsync(...)` and stop. Socket handlers are the only `invalidateQueries` outside `src/api/`.
- Optimistic writes: `patchQueryData(key, recipe)` from `src/api/query-client.ts`.
- Logout: `queryClient.clear()`.

A public JSON field or endpoint: root `AGENTS.md` **API** pointer.

## Verify

`pnpm -C apps/<app> build` is the finish gate (typecheck `-p tsconfig.app.json`, `check`, Vite). A bare `tsc --noEmit` on a solution `tsconfig.json` compiles nothing and exits 0 (RM-202).

`*.check.ts` files are the frontend unit suite. `pnpm -C apps/<app> check` globs them (`src` plus `@easy/utils`; client also `scripts/`). A new file is live with no `package.json` edit. A new mapper, predicate, or lifecycle helper ships with a sibling `.check.ts` in the same change.

`pnpm -C apps/<app> lint` is Biome `--write` — review its edits.

Biome enforces `suspicious/noExplicitAny`, `suspicious/noConsole` (`.check.ts` files are exempt), and `style/noNonNullAssertion` as `warn`. Prefer discriminated unions and `requirePrimaryReason`/`primaryReason` over `reasons[0]!`.

Both apps set `"exactOptionalPropertyTypes": true`. Optional props typed `foo?: T` cannot be passed `undefined` — omit the key, or widen to `foo?: T | undefined` when undefined is intentional. Use `omitUndefined` from `src/api/shared` for request objects.

UI or routing: exercise the touched flow in a browser (root **Browser** pointer). Coach: 375px and 1280px. Client: 375px.
