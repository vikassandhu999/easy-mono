# CoachApp v2 Agent Instructions

Use this file as the app contract.

## Stack And Commands

- Stack: Vite, React 19, TypeScript strict, HeroUI 3.2.1, Tailwind 4.1.18 (the HeroUI tokens version), TanStack React Query 5 + openapi-fetch, react-hook-form, zod, React Router v7 data mode.
- Dev server: `pnpm -C apps/coachapp-v2 dev` on port 2021.
- Build/type-check: `pnpm -C apps/coachapp-v2 build`.
- Lint/format: `pnpm -C apps/coachapp-v2 lint`. This runs Biome with `--write`, so expect file changes.
- There is no app test suite configured. For code changes, use build plus focused manual/browser verification when behavior or UI changed.

## Source Layout

- Feature modules own their screens and one-feature UI: `src/clients/`, `src/exercises/`, `src/foods/`, `src/nutrition-plans/`, `src/training-plans/`, etc.
- Shared app folders:
  - `src/api/`: React Query hooks and API-facing types, one domain per file; `keys.ts` (query-key registry), `client.ts` (openapi-fetch + auth), `schema.ts` (generated types).
  - `src/@components/`: UI used by two or more features.
  - `src/@hooks/`: shared hooks.
  - `src/@hoc/`: route guards and screen wrappers.
  - `src/@config/`: route constants and config.
- New screen for an existing feature: `src/{feature}/screen-name.tsx`.
- Component used by one feature: `src/{feature}/components/component-name.tsx`.
- Component used by two or more features: `src/@components/component-name.tsx`.
- Pure helpers and non-trivial constants: `src/{feature}/lib/topic.ts` or the owning form/API file. Generic, product-agnostic helpers (name/date/number formatting) go in `@easy/utils` — check it before writing one.
- **Every shared concept has an owning feature — there is no neutral `domain/`/`utils/` bucket.** Check-ins own the form-answer vocabulary (`checkins/lib/form-answers.ts`); recipes own recipe math (`recipes/lib/recipe-math.ts`). A feature's `lib/` is its public surface: other features may import it (`nutrition-plans` imports `recipes/lib/recipe-math` — the arrow mirrors the product). A feature's `components/`, `screens` and form files are internals — never imported across features; if two features need the UI, it moves to `@components/`. Enforced by `just check-rm` (RM-144).

## Names, Types, And Imports

- Screen and component files use kebab-case: `list-clients.tsx`, `client-card.tsx`.
- Use direct `@/...` imports. Do not add new barrel files or re-export surfaces.
- Do not duplicate existing shapes. Derive types from API/domain types with `Pick`, `Omit`, `Partial`, indexed access, or local zod inference when the meaning is the same.
- Component files should stay shallow: imports, props type, component, and form schema/type/hook if the file owns a form. If helpers or constants grow, move them to the owning `lib`, `domain`, or mapper file.

## Data And API

- Use the React Query hooks from `src/api/*.ts` for server data. Do not fetch in `useEffect`.
- Type source of truth: `src/api/schema.ts`, generated from the backend OpenAPI spec via `just gen-api` and always overwritten — never hand-edit it. Derive request/response types from it (`components['schemas'][...]`, `paths[...]`); the owning domain file re-exports them under stable names.
- Hooks are hand-written per domain (`useGetFooQuery`, `useUpdateFooMutation`, `useFoosInfiniteQuery` naming). Requests go through `call(client.VERB(path, ...))` from `@/api/client` — never raw fetch.
- Query keys come ONLY from the factories in `src/api/keys.ts`. Every mutation invalidates the affected keys in `onSuccess` (`detail(id)` + `lists()` for an update; deletes `removeQueries` their own detail) — a mutation with no invalidation and no optimistic patch is a bug (stale screens).
- Invalidation lives IN the mutation hook, never at a call site: components call `mutateAsync` and are done. When a mutation doesn't know the affected id (e.g. a plan update changes Programming membership), invalidate by prefix (`details()`, `forClients()`, `workbenchKeys.all`) instead of pushing the knowledge to the caller. The only `invalidateQueries` outside `src/api/` are socket-event handlers (websocket → cache sync).
- Optimistic cache writes use `patchQueryData(key, recipe)` from `@/api/query-client` (immer draft, returns `{undo}`).
- Mutations that need navigation or form error handling use `await mutation.mutateAsync(...)` in try/catch — it throws `ApiError` (with `.status` and `.data`).
- Pending state: `mutation.isPending` for mutations, `isLoading`/`isFetching` for queries. Conditional queries pass `{enabled}`.
- Surface API errors through existing helpers: `applyFormErrors` or `getApiErrorMessage` from `@/api/shared`.

## Routing And Navigation

- Routes live in `src/router.tsx` with `createBrowserRouter()`.
- Route paths live in `src/@config/routes.ts`. Add or change both the route constant and router entry together.
- Protected app screens are wrapped through `withAuth`; guest-only screens use `withNotAuth`.
- Do not add route loaders for server data. React Query owns data loading.
- Back buttons use `useGoBack(fallback)` from `@/@hooks/use-go-back`; do not hand-roll `navigate(-1)` or plain fallback paths for Back.

## Form Navigation

- Create form save: navigate to the created resource with `{replace: true}` so Back skips the empty create form.
  ```tsx
  const result = await createFooMutation.mutateAsync(body);
  navigate(generatePath(ROUTES.FOO_DETAIL, {id: result.data.id}), {replace: true});
  ```
- Edit form save: call `goBack()` from `useGoBack(detailPath)` after a successful mutation.
  ```tsx
  const goBack = useGoBack(generatePath(ROUTES.FOO_DETAIL, {id: id!}));
  await updateFooMutation.mutateAsync({id, body});
  goBack();
  ```
- Paths never appear as string literals: static paths are `ROUTES.X`, parameterized ones go through `generatePath(ROUTES.X, params)` (or the older `ROUTES.X.replace(':id', id)` idiom). Enforced by `just check-rm` (RM-102).
- Header Back and form Cancel both use `goBack(fallback)` with the same fallback — never a hardcoded list-route navigation.
- Exceptions are rare: in-place confirmations, live-preview editors, and multi-step flows where the next step must remain reachable through browser Back.

## Forms

- Every form uses react-hook-form plus zod. No native `FormData`. No `useState` for ordinary form fields.
- Define the zod schema, inferred `FormValues` type, defaults, and `useXForm` hook beside the form component unless an existing feature pattern says otherwise.
- Use `Controller` for HeroUI or custom inputs that do not work cleanly with `register`.
- Server errors in forms go through `applyFormErrors(err, fallback, form.setError, knownFields?)`.
  ```tsx
  try {
    await mutation.mutateAsync(body);
  } catch (err) {
    applyFormErrors(err, "Thing wasn't saved. Check the details and try again", form.setError);
  }
  ```
- Prefer existing form-field wrappers in `src/@components/form-fields/` for common fields.

## Canonical Components

One shared primitive per job — never hand-roll these (graduated from the recurring-mistakes ledger; the greppable ones are enforced by `just check-rm`):

- **Numeric entry**: `NumberInput` from `@/@components/number-input` (or `FormNumberField`). Never react-aria `NumberField` — it races mobile soft keyboards and drops digits.
- **Forms**: `FormLayout`, `FormPanel`, `FormActions`, `FieldRow`, `FormTextField`/`FormNumberField`/`FormSelectField`/`FormTextAreaField`, `BackButton`, `SectionHeading` (all under `@/@components`). `FormPanel` is the one responsive create/edit body surface; never re-type its card classes. Labels sentence case, units as `(g)`, never `(optional)`/`(required)` in a label — optional is implicit, required = `isRequired`. Sections are `Fieldset` + `Legend`. Header parity (`BackButton` + `Title`) across loading/error/loaded.
- **Browse/search lists**: `BrowseListBox` (`@/@components/browse-list-box`) — bakes in skeleton loading, error+Retry, empty state, infinite load-more. Flat queries pass `fetchNextPage={() => undefined}`. Rows that carry their OWN controls (a verb button, a menu) pass `grid` and render `GridListItem` instead of `ListBox.Item`: a listbox option is one focusable unit, so buttons inside it are unreachable by keyboard however correct the markup (RM-178). Grid rows own their press — list-level `onAction` is ignored, the row passes its own.
- **Errors**: page-level fetch errors use the shared `ErrorState` card; inline load errors say "Couldn't load X", never "Failed to load X".
- **Loading**: first-load renders a layout-approximating skeleton (`ListSkeleton` via BrowseListBox, `PageSkeleton` for detail/settings with the real `Page.Header`), never a centered spinner. Pending buttons keep constant width — overlay the spinner on an `invisible` copy of the label (see `form-actions.tsx`), never swap label text.
- **Pickers**: one content component in the canonical shell `PickerModal` (`@/builder-kit/picker-modal`) — one `md` desktop width, `KeyboardSheet` on mobile (decision 2026-08-04: pickers get one stable, predictable position; never anchored to the trigger). Search pickers go through `SearchPickerSheet`, which composes it. Every selectable collection inside a picker is a `ListBox`/`ListBox.Item` (or `GridList` when rows own controls), never a map of row-shaped Buttons; buttons remain correct for independent actions and tile palettes. Anchored `Popover`s (via `ResponsiveOverlay`) are only for select-like controls (meal slot) and inline editors (set editor, amount sheet). Never desktop-only pickers.
- **Overlay motion**: `index.css` owns entrance/exit motion for every HeroUI `Modal`, `AlertDialog`, and `KeyboardSheet`. Centered surfaces lift and settle; bottom sheets slide from their edge; reduced-motion removes spatial movement and keeps a brief opacity fade. Never add animation, transition, or duration classes at an overlay call site.

## Page Anatomy

- The exercise create/edit/detail screens are the reference: icon back arrow in the header/title group (no labeled back button in `Page.Toolbar`), form actions as `<Fieldset.Actions className="mt-4 flex gap-4">`. Compare any new create/edit/detail page against them.
- Standard page shape: one centred max-width content column, responsive grid, uppercase section headings, carded sections that stack on mobile. No full-width stretches or floaty separators.
- **Width and centring are `Page`'s job, not the screen's.** There is one content width: lists, forms and detail screens all pass `size="content"` to `Page.Header`/`Page.Toolbar`/`Page.Frame`, so navigating list → detail → edit never shifts the column. `size="wide"` is only for the two plan builders and the dashboard grid. A screen that needs the width on its body wraps it in `Page.Frame` and marks the `Page.Content` `bare` (Content owns the gutter; Frame owns gutter + width, so nesting both without `bare` double-gutters). Never hand-roll `mx-auto` or a `max-w-*` on a screen — if a column is off, fix the size token in `page.tsx`.
- A module's primary screen is a designed detail/read surface with explicit edit affordances — not a stack of permanently-editable form sections.
- Prefer HeroUI v3 primitives (`Disclosure`, `ToggleButtonGroup`, `ListBox`, `Chip`, `DateField`, …) over raw HTML controls; raw HTML only for deliberate low-level layout.

## UI Rules

- Build mobile-first. The app must work at 375px and at 1280px.
- Base Tailwind classes target mobile; `sm:`, `md:`, and `lg:` enhance wider layouts.
- Style with Tailwind utilities and HeroUI props. Do not add per-component CSS files.
- Use `Page` from `@/@components/page` for app screens unless the owning feature has a stronger established pattern.
- **Type sizes are `type-*`, never `text-*`.** `text-eyebrow` and friends do not exist as utilities — the size tokens live in a `--type-*` namespace precisely so tailwind-merge cannot confuse them with `text-<colour>` and silently drop them (RM-134). `text-*` is colour only.
- **Never write a height on a control.** Buttons, toggles, tabs and inputs get their height from the control-height block in `index.css` (`--spacing-control`, 36px, both breakpoints). No `min-h-*`, no `h-*`, no `sm:` override at a call site — a screen that needs a different control height is a theme change, not a className. This replaced `min-h-11` copied onto 93 controls across 44 files, each paired with an `sm:min-h-9`/`sm:min-h-0` that existed only to undo HeroUI's own `h-10 md:h-9`. Renaming that class to a token would have been the same copy-paste with a nicer name; the height belongs on the component.
  - HeroUI's `--sm`/`--lg` size modifiers still scale — the override is scoped away from them, and 53 `size="sm"` buttons depend on it.
  - Rows and layout wrappers are not controls and keep their own heights.
  - 36px is below the 44px pointer-target guidance (WCAG 2.5.5). Deliberate product decision, 2026-07-25 — the compact control is the design's. Keep adequate spacing *between* adjacent controls so the effective tap area stays comfortable.
- Do not rely on hover-only actions.
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
