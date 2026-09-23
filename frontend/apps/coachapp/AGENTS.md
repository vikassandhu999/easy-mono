# Coach app

Vite + React 19 + React Router + TanStack Query + React Hook Form + shadcn (React Aria).

Build one complete coaching task at a time. Read `.scratch/coachapp-rebuild/plan.md` from the repo root before designing a product screen.

**Rebuild:** Follow `.scratch/coachapp-rebuild/plan.md`, designing each screen from the coach's task and the mobile-first foundation. Write app code from scratch. Use the backend contract for behavior and data and this app's primitives for UI.

API types come from generated `src/api/schema.ts`. Forms use basic field rules and server validation. Do not add Zod or duplicate API schemas. Runtime checks belong at untrusted persistence boundaries.

Name app query hooks after their resource (`useProfile`) and mutation hooks after their action (`useCreateBusiness`). Omit `Query` and `Mutation` suffixes.

Download new shadcn primitives with the CLI only when a screen needs them; preserve their generated APIs and adapt styling to the new app's tokens. Keep them in `src/ui/`; `components.json` routes the CLI there. Reuse this app's shared primitives before adding another.

- Dev: `pnpm -C apps/coachapp dev` or `just coach` (port 2022)
- Build: `pnpm -C apps/coachapp build`

This is the retained coach application.

## Lists and server-owned values

Use resource `useInfiniteQuery` hooks with `api/pagination.ts`, filter-specific keys under `lists()`, and `ui/infinite-list.tsx`. Use `ui/list-search.tsx` for debounced URL search. Send search and filters to the API; follow its opaque `next_cursor` until null. Mutations invalidate the owning lists. Pass the query abort signal and retain loaded rows on next-page or refresh failures.

Counts, aggregates, and business selections come from API fields or scoped endpoints. Never derive them by filtering, reducing, or sorting downloaded records. Local array operations are for rendering and unsaved form editing; loaded row length is only an empty/rendering check, never the result total. Add a server field when a screen needs a persisted derived value.

Before adding a list, read `.scratch/coachapp-rebuild/lists.md`. Verify multiple pages, server totals, search beyond the first page, retry, and return navigation at 375px and 1280px.

## Builder and client hierarchy

Use `Page` with `editor-page` or `client-page` for these screens. `FormField`'s `emphasis` distinguishes editable names from ordinary values; `editor-section-title` and `editor-item-title` distinguish sections from their contents. Keep maintenance actions secondary and exercise rows borderless. Verify the rendered sizes, wrapping and primary actions at both widths with `pnpm test:visual-hierarchy`; class names alone do not prove the hierarchy is visible.
