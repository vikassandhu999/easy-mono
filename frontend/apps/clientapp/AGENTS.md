# Client app

Build mobile screens for iOS and Android. Tablets and browsers render the same mobile interface. Do not add desktop compositions.

Before a workflow, read `.scratch/clientapp-rebuild/plan.md` and its completion ledger. Complete its entry, action, persistence, recovery, and return path against Phoenix before marking it delivered.

Reuse the rewritten `coachapp` auth, API, and shadcn React Aria conventions. Neither v2 app is a reference. Client routes use the repository's typed-route generator; auth retains OpenAPI generation. `just gen-api` owns `src/api/schema.ts`.

Native verification: `.scratch/clientapp-rebuild/auth-native.md` documents the runtime checks and local environment. Browser tests do not establish native behavior. Record physical-device and real-client usability checks separately.
