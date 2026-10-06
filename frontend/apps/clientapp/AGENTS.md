# Client app

Build mobile screens for iOS and Android. Tablets and browsers render the same mobile interface. Do not add desktop compositions.

The build order is `.scratch/roadmap.md` from the repo root. Complete each workflow's entry, action, persistence, recovery, and return path against Phoenix before marking it delivered.

Reuse the rewritten `coachapp` auth, API, and shadcn React Aria conventions. The V2 client is not a reference. Client routes use the repository's typed-route generator; auth retains OpenAPI generation. `just gen-api` owns `src/api/schema.ts`.

Native verification: `docs/native.md` documents the runtime checks and local environment. Browser tests do not establish native behavior. Record physical-device and real-client usability checks separately.
