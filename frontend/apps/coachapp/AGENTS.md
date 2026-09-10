# Coach app

Vite + React 19 + React Router + TanStack Query + React Hook Form + shadcn (React Aria).

Build one complete coaching task at a time. Read `.scratch/coachapp-rebuild/plan.md` from the repo root before designing a product screen.

**Rebuild:** Design each screen from the coach's task and the mobile-first foundation. Write app code from scratch; never copy components, layouts, styles, or interaction patterns from `coachapp-v2`. Use the backend contract for behavior and data. If an old screen is consulted to clarify a behavior, evaluate that behavior independently before adopting it.

API types come from generated `src/api/schema.ts`. Forms use basic field rules and server validation. Do not add Zod or duplicate API schemas. Runtime checks belong at untrusted persistence boundaries.

Name app query hooks after their resource (`useProfile`) and mutation hooks after their action (`useCreateBusiness`). Omit `Query` and `Mutation` suffixes.

Download new shadcn primitives with the CLI only when a screen needs them; preserve their generated APIs and adapt styling to the new app's tokens. Keep them in `src/ui/`; `components.json` routes the CLI there. Reuse this app's shared primitives before adding another.

- Dev: `pnpm -C apps/coachapp dev` or `just coach` (port 2022)
- Build: `pnpm -C apps/coachapp build`

`coachapp-v2` on port 2021 is still the live product.
