# Coach app

Vite + React 19 + React Router + TanStack Query + React Hook Form + shadcn (React Aria).

Build one complete coaching task at a time. Read `.scratch/coachapp-rebuild/plan.md` from the repo root before designing a product screen.

Write app code from scratch. Use the backend contract as evidence; do not copy implementation from `coachapp-v2`.

API types come from generated `src/api/schema.ts`. Forms use basic field rules and server validation. Do not add Zod or duplicate API schemas. Runtime checks belong at untrusted persistence boundaries.

Name app query hooks after their resource (`useProfile`) and mutation hooks after their action (`useCreateBusiness`). Omit `Query` and `Mutation` suffixes.

Install shadcn primitives only when a screen needs them. Keep them in `src/ui/`; `components.json` routes the CLI there.

- Dev: `pnpm -C apps/coachapp dev` or `just coach` (port 2022)
- Build: `pnpm -C apps/coachapp build`

`coachapp-v2` on port 2021 is still the live product.
