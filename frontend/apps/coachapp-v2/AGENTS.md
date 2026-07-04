# CoachApp v2 Agent Instructions

Use this file as the app contract.

## Stack And Commands

- Stack: Vite, React 19, TypeScript strict, HeroUI 3.2.1, Tailwind 4.1.18 (the HeroUI tokens version), Redux Toolkit, RTK Query, react-hook-form, zod, React Router v7 data mode.
- Dev server: `pnpm -C apps/coachapp-v2 dev` on port 2021.
- Build/type-check: `pnpm -C apps/coachapp-v2 build`.
- Lint/format: `pnpm -C apps/coachapp-v2 lint`. This runs Biome with `--write`, so expect file changes.
- There is no app test suite configured. For code changes, use build plus focused manual/browser verification when behavior or UI changed.

## Source Layout

- Feature modules own their screens and one-feature UI: `src/clients/`, `src/exercises/`, `src/foods/`, `src/nutrition-plans/`, `src/training-plans/`, etc.
- Shared app folders:
  - `src/api/`: RTK Query endpoints and API-facing types, one domain per file.
  - `src/domain/`: domain types/helpers not tied to a component render.
  - `src/@components/`: UI used by two or more features.
  - `src/@hooks/`: shared hooks.
  - `src/@hoc/`: route guards and screen wrappers.
  - `src/@config/`: route constants and config.
- New screen for an existing feature: `src/{feature}/screen-name.tsx`.
- Component used by one feature: `src/{feature}/components/component-name.tsx`.
- Component used by two or more features: `src/@components/component-name.tsx`.
- Pure helpers and non-trivial constants: `src/{feature}/lib/topic.ts`, `src/domain/*.ts`, or the owning form/API file, depending on ownership.

## Names, Types, And Imports

- Screen and component files use kebab-case: `list-clients.tsx`, `client-card.tsx`.
- Use direct `@/...` imports. Do not add new barrel files or re-export surfaces.
- Do not duplicate existing shapes. Derive types from API/domain types with `Pick`, `Omit`, `Partial`, indexed access, or local zod inference when the meaning is the same.
- Component files should stay shallow: imports, props type, component, and form schema/type/hook if the file owns a form. If helpers or constants grow, move them to the owning `lib`, `domain`, or mapper file.

## Data And API

- Use RTK Query hooks for server data. Do not fetch in `useEffect`.
- The API layer is generated: `src/api/generated.ts` comes from the backend OpenAPI spec via `just gen-api` and is always overwritten — never hand-edit it. Regeneration and migration rules live in `frontend/AGENTS.md` § API Clients.
- Before writing an endpoint, check `@/api/generated` — it probably already exists. Hand-written `src/api/*.ts` files only enhance or wrap generated endpoints (tags, normalization, narrowed types).
- Keep API response normalization in the owning `src/api/{domain}.ts` file. Keep form/request conversion beside the owning form or feature.
- Use `.unwrap()` for mutations that need navigation or form error handling.
- Surface API errors through existing helpers: `applyFormErrors` or `getApiErrorMessage` from `@/api/shared`.

## Routing And Navigation

- Routes live in `src/router.tsx` with `createBrowserRouter()`.
- Route paths live in `src/@config/routes.ts`. Add or change both the route constant and router entry together.
- Protected app screens are wrapped through `withAuth`; guest-only screens use `withNotAuth`.
- Do not add route loaders for server data. RTK Query owns data loading.
- Back buttons use `useGoBack(fallback)` from `@/@hooks/use-go-back`; do not hand-roll `navigate(-1)` or plain fallback paths for Back.

## Form Navigation

- Create form save: navigate to the created resource with `{replace: true}` so Back skips the empty create form.
  ```tsx
  const result = await createFoo(body).unwrap();
  navigate(`/library/foos/${result.data.id}`, {replace: true});
  ```
- Edit form save: call `goBack()` from `useGoBack(detailPath)` after a successful mutation.
  ```tsx
  const goBack = useGoBack(`/library/foos/${id}`);
  await updateFoo({id, body}).unwrap();
  goBack();
  ```
- Header Back and form Cancel both use `goBack(fallback)` with the same fallback — never a hardcoded list-route navigation.
- Exceptions are rare: in-place confirmations, live-preview editors, and multi-step flows where the next step must remain reachable through browser Back.

## Forms

- Every form uses react-hook-form plus zod. No native `FormData`. No `useState` for ordinary form fields.
- Define the zod schema, inferred `FormValues` type, defaults, and `useXForm` hook beside the form component unless an existing feature pattern says otherwise.
- Use `Controller` for HeroUI or custom inputs that do not work cleanly with `register`.
- Server errors in forms go through `applyFormErrors(err, fallback, form.setError, knownFields?)`.
  ```tsx
  try {
    await mutate(body).unwrap();
  } catch (err) {
    applyFormErrors(err, "Thing wasn't saved. Check the details and try again", form.setError);
  }
  ```
- Prefer existing form-field wrappers in `src/@components/form-fields/` for common fields.

## Canonical Components

One shared primitive per job — never hand-roll these (graduated from the recurring-mistakes ledger; the greppable ones are enforced by `just check-rm`):

- **Numeric entry**: `NumberInput` from `@/@components/number-input` (or `FormNumberField`). Never react-aria `NumberField` — it races mobile soft keyboards and drops digits.
- **Forms**: `FormLayout`, `FormActions`, `FieldRow`, `FormTextField`/`FormNumberField`/`FormSelectField`/`FormTextAreaField`, `BackButton`, `SectionHeading` (all under `@/@components`). Labels sentence case, units as `(g)`, never `(optional)`/`(required)` in a label — optional is implicit, required = `isRequired`. Sections are `Fieldset` + `Legend`. Header parity (`BackButton` + `Title`) across loading/error/loaded.
- **Browse/search lists**: `BrowseListBox` (`@/@components/browse-list-box`) — bakes in skeleton loading, error+Retry, empty state, infinite load-more. Flat queries pass `fetchNextPage={() => undefined}`.
- **Errors**: page-level fetch errors use the shared `ErrorState` card; inline load errors say "Couldn't load X", never "Failed to load X".
- **Loading**: first-load renders a layout-approximating skeleton (`ListSkeleton` via BrowseListBox, `PageSkeleton` for detail/settings with the real `Page.Header`), never a centered spinner. Pending buttons keep constant width — overlay the spinner on an `invisible` copy of the label (see `form-actions.tsx`), never swap label text.
- **Pickers**: one content component, one responsive wrapper — anchored `Popover` on desktop, `KeyboardSheet` on mobile (mirror `plan-assign-control.tsx` / `food-picker-control.tsx`). Never desktop-only or centered-modal pickers.

## Page Anatomy

- The exercise create/edit/detail screens are the reference: icon back arrow in the header/title group (no labeled back button in `Page.Toolbar`), form actions as `<Fieldset.Actions className="mt-4 flex gap-4">`. Compare any new create/edit/detail page against them.
- Standard page shape: left-aligned max-width content, responsive grid, uppercase section headings, carded sections that stack on mobile. No `mx-auto`-centered detail pages, full-width stretches, or floaty separators.
- A module's primary screen is a designed detail/read surface with explicit edit affordances — not a stack of permanently-editable form sections.
- Prefer HeroUI v3 primitives (`Disclosure`, `ToggleButtonGroup`, `ListBox`, `Chip`, `DateField`, …) over raw HTML controls; raw HTML only for deliberate low-level layout.

## UI Rules

- Build mobile-first. The app must work at 375px and at 1280px.
- Base Tailwind classes target mobile; `sm:`, `md:`, and `lg:` enhance wider layouts.
- Style with Tailwind utilities and HeroUI props. Do not add per-component CSS files.
- Use `Page` from `@/@components/page` for app screens unless the owning feature has a stronger established pattern.
- Interactive targets must be at least `min-h-11` / 44px. Do not rely on hover-only actions.
- Do not show raw HTML tables on mobile. Use cards/lists or horizontal scrolling when tabular data is unavoidable.
- Forms are single-column on mobile; use `md:grid-cols-2` only when the wider layout remains easy to scan.
- Use lucide-react icons for common actions when an icon helps recognition.

## Choosing Containers

- Inline: one field, quick edits, filters, or actions that fit without hiding context.
- New page: two or more text fields, complex forms, multi-step flows, or anything that opens the virtual keyboard for sustained input.
- Dialog: yes/no confirmation without keyboard input.
- Drawer or bottom sheet: read-only preview or tap-only selection. On desktop this may become a popover.
- Never put keyboard-heavy work in a dialog, modal, or drawer.

## Verification

- TypeScript or data-flow changes: run `pnpm -C apps/coachapp-v2 build`.
- UI changes: run the app and verify the touched flow at 375px and desktop width.
- If you run `pnpm -C apps/coachapp-v2 lint`, review its writes before finalizing.
