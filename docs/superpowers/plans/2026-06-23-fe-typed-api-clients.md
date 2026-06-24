# Phase 0 — Per-App Typed API Clients (RTK Query codegen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Generate each frontend app's API layer (types + RTK Query endpoints + hooks) from the backend OpenAPI spec, scoped to that app's role — coachapp = `/v1/coach` + shared, clientapp = `/v1/client` + shared — so the API layer is self-contained per app and type-synced to the backend.

**Architecture:** The backend (OpenApiSpex) dumps a single `openapi.json`. A split script partitions it by path prefix into `coach.openapi.json` + `client.openapi.json` (each keeps shared `/v1/auth`, `/v1/public`, `/v1/businesses` + the full `components`). Each app runs `@rtk-query/codegen-openapi` against its split spec, injecting generated typed endpoints into the app's EXISTING base API slice (`src/api/base.ts`'s `api = createApi({ endpoints: () => ({}) })`, keeping its reauth `baseQuery`). One root command regenerates everything. NO shared types package — each app owns its generated client; the small duplication of shared entity types is generated, never hand-maintained.

**Tech Stack:** Elixir/OpenApiSpex (`mix openapi.spec.json`), Node (split script), `@rtk-query/codegen-openapi`, `@reduxjs/toolkit` (RTK Query, already v2.9 in both apps), pnpm workspace, Biome.

## Global Constraints

- **One approach only:** per-app self-contained generated clients. No shared `@easy/api-types` package, no shared all-in-one client.
- **Preserve the existing base API slice** in each app (`src/api/base.ts` — the `api` export with `baseQueryWithReauth` + `tagTypes`). Codegen injects into it via `api.injectEndpoints`; do NOT rewrite the auth/refresh logic.
- **Scope per app:** coachapp gets `/v1/coach/*` + `/v1/businesses/*` + `/v1/auth/*` + `/v1/public/*`; clientapp gets `/v1/client/*` + `/v1/auth/*` + `/v1/public/*`.
- **`tag: false`** in codegen for now (OpenApiSpex operation tags are descriptive, not the apps' entity `tagTypes`); cache-invalidation tags are wired per-feature during migration, not auto-generated.
- **Coexistence, not big-bang:** generated endpoints live ALONGSIDE the existing hand-written `src/api/*.ts` during transition. Migrate ONE feature per app as a tracer (proves the pipeline end-to-end); the rest migrate incrementally later. Watch for RTK Query duplicate-endpoint-name errors — generated endpoints use operationId-derived names (distinct from the hand-written custom names), but the tracer must DELETE the hand-written endpoints it replaces.
- **Check in** the raw `openapi.json` and the generated client code (reviewable diffs; apps build without running codegen). Split specs are intermediate build artifacts (gitignored).
- **Verification = typecheck + build** (the apps have no unit-test runner; Vite build runs `tsc`). Run from `frontend/`.
- Lint with Biome (`biome check --write`) per the repo convention.

## File structure

- Backend: a mix alias/usage of `mix openapi.spec.json --spec EasyWeb.ApiSpec` (no new module needed — the task ships with `open_api_spex`).
- `frontend/openapi/easy-openapi.json` — checked-in dumped spec.
- `frontend/openapi/.gitignore` — ignore `coach.openapi.json`, `client.openapi.json` (intermediate).
- `frontend/scripts/split-openapi.mjs` — the path-prefix splitter.
- `frontend/apps/coachapp-v2/openapi-config.ts` — coachapp codegen config.
- `frontend/apps/coachapp-v2/src/api/generated.ts` — generated coach client (checked in).
- `frontend/apps/clientapp-v2/openapi-config.ts` + `src/api/generated.ts` — same for clientapp.
- Root `package.json` (or `Justfile`) script `gen:api` — dump → split → codegen both.

---

## Task 1: OpenAPI dump + split pipeline

**Files:**
- Create: `frontend/openapi/easy-openapi.json` (generated, checked in), `frontend/openapi/.gitignore`
- Create: `frontend/scripts/split-openapi.mjs`
- Modify: root `Justfile` (add `openapi` recipe) and/or `frontend/package.json` scripts

**Interfaces:**
- Produces: `frontend/openapi/easy-openapi.json`; `frontend/openapi/coach.openapi.json` + `client.openapi.json` (gitignored); a `pnpm -w gen:openapi` (or `just openapi`) command that dumps + splits.
- Consumes: backend `EasyWeb.ApiSpec`.

- [ ] **Step 1: Verify the backend dump task works**

Run: `cd backend && mix openapi.spec.json --spec EasyWeb.ApiSpec --pretty=true --start-app=false ../frontend/openapi/easy-openapi.json`
Expected: writes the JSON spec. (If `--start-app=false` errors because the spec needs the app, drop that flag.) Confirm the file has `paths` with `/v1/coach/...` and `/v1/client/...` keys: `grep -c '"/v1/coach' ../frontend/openapi/easy-openapi.json` → > 0.

- [ ] **Step 2: Write the split script**

Create `frontend/scripts/split-openapi.mjs`:

```js
#!/usr/bin/env node
// Splits the full OpenAPI spec into per-app specs by path prefix.
// coach app: /v1/coach, /v1/businesses, /v1/auth, /v1/public, /api
// client app: /v1/client, /v1/auth, /v1/public, /api
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "openapi");
const spec = JSON.parse(readFileSync(join(dir, "easy-openapi.json"), "utf8"));

const SHARED = ["/v1/auth", "/v1/public", "/api"];
const COACH = ["/v1/coach", "/v1/businesses", ...SHARED];
const CLIENT = ["/v1/client", ...SHARED];

const pick = (prefixes) => {
  const paths = {};
  for (const [p, item] of Object.entries(spec.paths ?? {})) {
    if (prefixes.some((pre) => p === pre || p.startsWith(pre + "/") || p.startsWith(pre))) {
      paths[p] = item;
    }
  }
  // keep full components so $refs resolve; codegen only emits types reachable from included paths
  return { ...spec, paths };
};

writeFileSync(join(dir, "coach.openapi.json"), JSON.stringify(pick(COACH), null, 2));
writeFileSync(join(dir, "client.openapi.json"), JSON.stringify(pick(CLIENT), null, 2));
console.log(`split: coach=${Object.keys(pick(COACH).paths).length} client=${Object.keys(pick(CLIENT).paths).length} paths`);
```

- [ ] **Step 3: Add gitignore for intermediate specs**

Create `frontend/openapi/.gitignore`:

```
coach.openapi.json
client.openapi.json
```

- [ ] **Step 4: Wire the dump+split command**

In root `Justfile` add:

```make
# regenerate the OpenAPI spec from the backend and split it per app
openapi:
    cd backend && mix openapi.spec.json --spec EasyWeb.ApiSpec --pretty=true ../frontend/openapi/easy-openapi.json
    node frontend/scripts/split-openapi.mjs
```

- [ ] **Step 5: Run it and verify both split specs**

Run: `just openapi`
Expected: prints `split: coach=N client=M paths` with N,M > 0; `frontend/openapi/coach.openapi.json` contains `/v1/coach` paths and NO `/v1/client` paths (`grep -c '"/v1/client' frontend/openapi/coach.openapi.json` → 0); `client.openapi.json` the inverse.

- [ ] **Step 6: Commit**

```bash
git add frontend/openapi/easy-openapi.json frontend/openapi/.gitignore frontend/scripts/split-openapi.mjs Justfile
git commit -m "build(fe): OpenAPI spec dump + per-app split pipeline"
```

---

## Task 2: coachapp-v2 generated client (+ tracer migration)

**Files:**
- Create: `frontend/apps/coachapp-v2/openapi-config.ts`, `frontend/apps/coachapp-v2/src/api/generated.ts` (generated)
- Modify: `frontend/apps/coachapp-v2/package.json` (devDep + script)
- Modify: one existing feature's call site (tracer) + delete its hand-written endpoint file

**Interfaces:**
- Consumes: `frontend/openapi/coach.openapi.json` (Task 1); the existing `api` export from `src/api/base.ts`.
- Produces: generated endpoints/hooks injected into `api`; a `pnpm --filter coachapp-v2 gen:api` script; one feature migrated to a generated hook.

- [ ] **Step 1: Add the codegen dependency**

Run: `cd frontend && pnpm --filter coachapp-v2 add -D @rtk-query/codegen-openapi`

- [ ] **Step 2: Write the codegen config**

Create `frontend/apps/coachapp-v2/openapi-config.ts`:

```ts
import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
  schemaFile: "../../openapi/coach.openapi.json",
  apiFile: "./src/api/base.ts",
  apiImport: "api",
  outputFile: "./src/api/generated.ts",
  exportName: "coachApi",
  hooks: { queries: true, lazyQueries: true, mutations: true },
  tag: false,
};

export default config;
```

- [ ] **Step 3: Add the per-app gen script**

In `frontend/apps/coachapp-v2/package.json` `scripts`, add:

```json
"gen:api": "rtk-query-codegen-openapi openapi-config.ts"
```

- [ ] **Step 4: Generate the client**

Run: `cd frontend && just --justfile ../Justfile openapi 2>/dev/null || (cd .. && just openapi)` then `pnpm --filter coachapp-v2 gen:api`
Expected: `src/api/generated.ts` is created, exporting `coachApi` (an `api.injectEndpoints(...)`) plus typed hooks (e.g. `use<OperationId>Query`/`Mutation`) and request/response types. Run `pnpm exec biome check --write apps/coachapp-v2/src/api/generated.ts`.

- [ ] **Step 5: Typecheck the generated client compiles**

Run: `cd frontend && pnpm --filter coachapp-v2 exec tsc --noEmit`
Expected: no type errors introduced by `generated.ts`. (If the app's tsc config doesn't support `--noEmit` standalone, run the app's build/typecheck script, e.g. `pnpm --filter coachapp-v2 build`.)

- [ ] **Step 6: Tracer — migrate ONE read feature to a generated hook**

Pick a simple coach GET already used in the UI (e.g. the exercises or muscles list). In that component, replace the hand-written hook import with the generated one from `src/api/generated.ts` (e.g. `import { useListTrainingExercisesQuery } from "@/api/generated"` — use the actual generated name from the file). Remove the now-redundant hand-written endpoint(s) for that feature from the corresponding `src/api/<feature>.ts` to avoid duplicate-endpoint registration; if the file becomes empty, delete it. Keep the component's behavior identical (same data shape — adjust field access if the generated type differs).

- [ ] **Step 7: Verify the tracer compiles + builds**

Run: `cd frontend && pnpm --filter coachapp-v2 build`
Expected: build succeeds; the migrated component uses the generated hook; no duplicate-endpoint runtime warning (grep the dev console note is optional — the build + typecheck is the gate).

- [ ] **Step 8: Commit**

```bash
git add frontend/apps/coachapp-v2/openapi-config.ts frontend/apps/coachapp-v2/src/api/generated.ts frontend/apps/coachapp-v2/package.json frontend/pnpm-lock.yaml frontend/apps/coachapp-v2/src
git commit -m "feat(coachapp): generated RTK Query client from OpenAPI + tracer migration"
```

---

## Task 3: clientapp-v2 generated client (+ tracer migration)

**Files:**
- Create: `frontend/apps/clientapp-v2/openapi-config.ts`, `frontend/apps/clientapp-v2/src/api/generated.ts` (generated)
- Modify: `frontend/apps/clientapp-v2/package.json` (devDep + script)
- Modify: one existing feature's call site (tracer) + delete its hand-written endpoint file

**Interfaces:**
- Consumes: `frontend/openapi/client.openapi.json` (Task 1); the existing `api` export from `clientapp-v2/src/api/base.ts`.
- Produces: generated endpoints/hooks injected into `api`; `pnpm --filter clientapp-v2 gen:api`; one feature migrated.

- [ ] **Step 1: Add the codegen dependency**

Run: `cd frontend && pnpm --filter clientapp-v2 add -D @rtk-query/codegen-openapi`

- [ ] **Step 2: Write the codegen config**

Create `frontend/apps/clientapp-v2/openapi-config.ts`:

```ts
import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
  schemaFile: "../../openapi/client.openapi.json",
  apiFile: "./src/api/base.ts",
  apiImport: "api",
  outputFile: "./src/api/generated.ts",
  exportName: "clientApi",
  hooks: { queries: true, lazyQueries: true, mutations: true },
  tag: false,
};

export default config;
```

(Confirm `clientapp-v2/src/api/base.ts` exports `api` like coachapp's does — it has the same empty-split-api pattern; if the export name differs, set `apiImport` to match.)

- [ ] **Step 3: Add the per-app gen script**

In `frontend/apps/clientapp-v2/package.json` `scripts`, add:

```json
"gen:api": "rtk-query-codegen-openapi openapi-config.ts"
```

- [ ] **Step 4: Generate the client**

Run: `cd frontend && pnpm --filter clientapp-v2 gen:api` (run `just openapi` first if the split specs aren't present)
Expected: `src/api/generated.ts` created (`clientApi = api.injectEndpoints(...)` + hooks + types). `pnpm exec biome check --write apps/clientapp-v2/src/api/generated.ts`.

- [ ] **Step 5: Typecheck**

Run: `cd frontend && pnpm --filter clientapp-v2 exec tsc --noEmit` (or the app's build/typecheck script)
Expected: no type errors from `generated.ts`.

- [ ] **Step 6: Tracer — migrate ONE read feature to a generated hook**

Pick a simple client GET used in the clientapp UI (e.g. the client's plans or exercises list). Swap the component to the generated hook from `src/api/generated.ts`; remove the redundant hand-written endpoint(s) for that feature; delete the file if empty. Keep behavior identical.

- [ ] **Step 7: Verify build**

Run: `cd frontend && pnpm --filter clientapp-v2 build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend/apps/clientapp-v2/openapi-config.ts frontend/apps/clientapp-v2/src/api/generated.ts frontend/apps/clientapp-v2/package.json frontend/pnpm-lock.yaml frontend/apps/clientapp-v2/src
git commit -m "feat(clientapp): generated RTK Query client from OpenAPI + tracer migration"
```

---

## Task 4: One-command regeneration + docs

**Files:**
- Modify: root `Justfile` (a `gen-api` recipe chaining dump→split→both apps)
- Modify: `frontend/AGENTS.md` (document the workflow) — or create `frontend/openapi/README.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `just gen-api` regenerates everything; documented workflow + incremental-migration guidance.

- [ ] **Step 1: Add the orchestration recipe**

In root `Justfile`:

```make
# regenerate the OpenAPI spec + both app clients end-to-end
gen-api: openapi
    cd frontend && pnpm --filter coachapp-v2 gen:api && pnpm --filter clientapp-v2 gen:api
    cd frontend && pnpm exec biome check --write apps/coachapp-v2/src/api/generated.ts apps/clientapp-v2/src/api/generated.ts
```

- [ ] **Step 2: Run the full pipeline clean**

Run: `just gen-api`
Expected: dumps spec, splits, regenerates both `generated.ts`; `git diff --stat` shows only the generated files (or nothing if already current).

- [ ] **Step 3: Document the workflow**

Add to `frontend/AGENTS.md` (or create `frontend/openapi/README.md`):

```markdown
## API clients (generated)

Each app's API layer is generated from the backend OpenAPI spec — do NOT hand-edit `src/api/generated.ts`.

- Regenerate after any backend API change: `just gen-api` (dumps the spec, splits coach/client, regenerates both apps).
- Each app's generated client injects into `src/api/base.ts` (the `api` slice with auth/refresh `baseQuery`). The base slice is hand-maintained; everything in `generated.ts` is not.
- Scope: coachapp = `/v1/coach` + `/v1/businesses` + auth/public; clientapp = `/v1/client` + auth/public.
- Migration: hand-written `src/api/*.ts` endpoints are being replaced by generated ones feature-by-feature. When you touch a feature, switch it to the generated hook and delete the hand-written endpoint. Cache-invalidation tags (`providesTags`/`invalidatesTags`) are added per-feature (codegen runs with `tag: false`).
```

- [ ] **Step 4: Verify build of both apps still green**

Run: `cd frontend && pnpm --filter coachapp-v2 build && pnpm --filter clientapp-v2 build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add Justfile frontend/AGENTS.md frontend/openapi/README.md
git commit -m "build(fe): one-command API client regeneration + docs"
```

---

## Self-Review

**Spec coverage:** (1) shared/per-app decision → the locked "no shared package; per-app generated client" is the Global Constraint + the per-app Tasks 2/3. (2) coach/client endpoint split → Task 1 split script by path prefix. (3) types live in the apps → each app's `generated.ts` emits its own types. (4) keep endpoints in apps → generated into `src/api/generated.ts` per app, injected into the existing base slice. (5) regenerable → Task 1 + Task 4 commands. (6) proof it works → tracer migration + build in Tasks 2/3.

**Placeholder scan:** the tracer steps say "use the actual generated name from the file" — this is intentional (the exact hook name depends on the operationId in the spec, which the implementer reads from the generated file); the step names the file and the pattern, not a vague TODO. All config/scripts are complete code.

**Type/name consistency:** `apiImport: "api"` matches the `export const api = createApi(...)` in both apps' `base.ts` (verified in coachapp; Task 3 Step 2 notes to confirm clientapp's export name). `outputFile` `src/api/generated.ts` is consistent across tasks. `exportName` differs per app (`coachApi`/`clientApi`) — cosmetic, the injected endpoints attach to `api` regardless.

**Open confirmations for the implementer (verify against the installed tool/app, adjust — not blockers):** exact `mix openapi.spec.json` flags (drop `--start-app=false` if it errors); the apps' typecheck/build script names (`build` vs a dedicated `typecheck`); the precise generated hook names for the tracer (read from `generated.ts`); that `clientapp-v2/src/api/base.ts` exports `api`.
