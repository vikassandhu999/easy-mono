# AGENTS.md

Guide for agentic coding assistants. Follow these rules strictly.

## Stack

- Vite + React + TypeScript (strict)
- UI: **HeroUI only** (`@heroui/react`) + Tailwind utility classes
- State: Redux Toolkit + RTK Query
- Forms: react-hook-form + zod (validation only) + Controller pattern
- Routing: react-router

## Commands

- `npm run dev` — Vite dev server (port 2020)
- `npm run build` — TypeScript check + Vite build
- `npm run lint` — ESLint with auto-fix
- `npm run format` — Prettier

## Migration mandate

The codebase has Mantine debt (~113 files). When touching any file, migrate it:

- **Remove all `@mantine/*` imports.** Replace with HeroUI equivalents.
- **Remove all `.module.css` files.** Use Tailwind utility classes instead.
- **Remove all `--ce-*` CSS variable usage.** Use Tailwind classes directly.
- **Remove `z.infer<typeof Schema>` patterns.** TypeScript types are the source of truth, not Zod schemas. Keep Zod only for form validation with `zodResolver`.
- **Do not create custom wrapper components** around HeroUI unless explicitly asked.

## UI components

- Use HeroUI compound components directly (Modal, Toast, Button, Input, etc.).
- **Notifications**: `toast()` / `toast.success()` / `toast.danger()` from `@heroui/react`. Render `<Toast.Provider />` at app root. Replaces `@mantine/notifications`.
- **Modals**: HeroUI `Modal` compound component (`Modal`, `Modal.Backdrop`, `Modal.Container`, `Modal.Dialog`, `Modal.Header`, `Modal.Body`, `Modal.Footer`, `Modal.CloseTrigger`). Use `useOverlayState` hook. Replaces `@mantine/modals`.
- **Drawers**: Use HeroUI `Modal` styled as a side panel via Tailwind (e.g., positioning, width). No dedicated drawer component.
- **Styling**: Tailwind utility classes only. No CSS Modules. No custom CSS classes. No `--ce-*` tokens.
- Mobile-first layout. Minimum touch target 44px (prefer 48px).
- WCAG 2.1 AA contrast. Never rely on color alone. Ensure focus-visible.

## TypeScript and API types

### Types are the source of truth

- Define entity types as TypeScript `interface` or `type` in `_definition.ts` files.
- Never derive types from Zod schemas. Zod is only for form validation.
- Avoid `any`. Use `Record<string, unknown>` over `Record<string, any>`.

### Single canonical source per entity

- Each entity type is defined **once** in its own domain's `_definition.ts`.
- Other domains that need the type **import it** from the canonical source.
- For subsets, use `Pick<Entity, 'field1' | 'field2'>` or `Omit<Entity, ...>`.
- Never duplicate type definitions across domains.

### Shared API generics

Define and use shared generic types for API response envelopes:

```ts
type ApiResponse<T> = { data: T };
type ApiListResponse<T> = { data: T[] };
```

Use these in `transformResponse` typing instead of inline object shapes.

### Pagination

- All paginated endpoints must use the shared helpers in `src/services/paginationUtils.ts`.
- Extend `paginationUtils.ts` to handle both offset-based and page-based pagination.
- Do not duplicate pagination logic in individual service files.

### RTK Query conventions

- Server data uses RTK Query (`baseAPISlice` + `injectEndpoints`).
- Prefer RTK Query hooks (`useXQuery`, `useXMutation`) over ad-hoc axios.
- Tag types are defined centrally in `src/services/baseAPISlice.ts`.
- Use specific tag invalidation (`{ type, id }`) over broad invalidation (`'TagName'`).
- Type `query` and `mutation` endpoints explicitly: `query<ResponseType, ArgType>`.

## Forms

- `react-hook-form` with `Controller` for custom inputs.
- Use `zodResolver` for form validation schemas.
- Zod schemas live in `_definition.ts` alongside entity types but do not define types.
- Submit via RTK Query mutations. No ad-hoc axios in form handlers.
- Prefer controlled inputs, visible labels, single-column layout, clear error states.

## State

- Server data: RTK Query.
- Client UI state: Redux slices under `src/slices/`.
- Do not store server data in slices; let RTK Query cache handle it.

## Error handling

- Use `humanizeError` for user-facing messages.
- Surface errors via HeroUI `toast.danger()` (replaces `notifyError` which uses Mantine).
- Never throw raw axios errors into UI; normalize first.

## Auth

- Token refresh managed in `src/services/baseAPISlice.ts`. See `docs/TOKEN_REFRESH_SYSTEM.md`.
- Exclude auth endpoints from refresh retry logic to avoid loops.
- Do not store tokens in localStorage; use provided token storage helpers.

## Imports and formatting

- Use `@/` path alias for `src/*`.
- Group imports: external, internal (`@/`), relative.
- Named imports preferred. Prettier is the formatter (single quotes, trailing commas).

## Naming

- Components: `PascalCase` files and names.
- Hooks: `useSomething`.
- Types/interfaces: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE` for globals only.

## Project structure

- `src/app/` — entry points, router
- `src/components/` — reusable UI
- `src/domains/` — feature pages
- `src/shared/` — shared builders, forms, drawers
- `src/services/` — RTK Query APIs and `_definition.ts` type files
- `src/slices/` — Redux slices

## When changing code

- Small, localized changes. Match existing HeroUI + Tailwind patterns.
- Update types and form validation schemas together.
- Keep API definitions in `*_definition.ts` alongside service files.
- If a file still uses Mantine, CSS Modules, or `--ce-*` tokens, migrate it.
- Run commands from `apps/coachapp` (monorepo workspace).
