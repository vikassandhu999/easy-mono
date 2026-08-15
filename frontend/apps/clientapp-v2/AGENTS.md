# ClientApp v2 Agent Instructions

Use this file as the app contract. Workspace-wide rules live in `frontend/AGENTS.md`.

This is the **client-facing** app: a mobile-first PWA that also ships as a Capacitor
native shell. It is not a small coachapp — the audience, the layout and the interaction
model are different, and several coachapp rules deliberately do NOT apply here (see
"Where this differs from coachapp").

## Stack And Commands

- Stack: Vite, React 19, TypeScript strict, HeroUI 3.0.2, Tailwind 4.1.18, TanStack React
  Query 5 + openapi-fetch, react-hook-form, zod, React Router v7, Capacitor 8.
- Dev server: `pnpm -C apps/clientapp-v2 dev` on port 1314.
- Type-check: `pnpm -C apps/clientapp-v2 typecheck`. Build: `... build` (runs the same
  type-check first).
  **Always pass `-p tsconfig.app.json`.** The root `tsconfig.json` is a solution file
  (`"files": []`), so a bare `tsc --noEmit` compiles nothing and exits 0. It did exactly
  that for months while 183 errors accumulated (RM-202).
- Lint/format: `pnpm -C apps/clientapp-v2 lint` — Biome with `--write`, so expect edits.
- No test suite. Verify with build + browser checks at a phone width.
- Native: `pnpm native` (build + `cap sync`), then `cap open ios|android`.

## Source Layout

- Feature modules own their screens and one-feature UI: `src/today/`, `src/training/`,
  `src/workout/`, `src/nutrition/`, `src/progress/`, `src/checkins/`, `src/messages/`,
  `src/history/`, `src/settings/`, `src/auth/`.
- Shared app folders: `src/api/`, `src/@components/`, `src/@hooks/`, `src/@hoc/`,
  `src/@config/`. There is deliberately no neutral `domain/`/`utils/` bucket.
- **Every shared concept has an owning feature.** Workout owns the session model
  (`workout/session-utils.ts` — history and training import it); nutrition owns
  adherence/targets (`nutrition/nutrition-utils.ts` — today imports it). A feature's
  root-level `*.ts` files are its public surface, importable across features; its
  `components/` and screens are internals — never imported across features (shared UI
  moves to `@components/`, shared hooks to `@hooks/`). Aggregators (`today/`,
  `@components/app-shell`) composing feature-owned cards is the same healthy arrow.
  Enforced by `just check-rm` (RM-144).
- Component used by one feature: `src/{feature}/components/name.tsx`. Used by two or
  more: `src/@components/name.tsx`.
- Files are kebab-case. Use direct `@/...` imports; no barrel files.

## Data And API

Identical in shape to coachapp — see `frontend/AGENTS.md` § API Clients for the full
contract. The parts that bite:

- `src/api/schema.ts` is generated from `frontend/openapi/client.openapi.json` by
  `just gen-api`. Never hand-edit.
- Requests go through `call(client.VERB(path, ...))` from `@/api/client` — never raw
  fetch. Non-2xx throws `ApiError {status, data}`, which is what the `@/api/shared`
  helpers read.
- Hooks are hand-written per domain in `src/api/*.ts`. Mutations take the request body
  directly: `mutateAsync(body)`, or `{id, ...body}` when the path needs an id.
- Query keys come ONLY from `src/api/keys.ts`. Every mutation invalidates the affected
  keys in `onSuccess` — a mutation with no invalidation and no optimistic patch is a bug.
- Invalidation lives IN the mutation hook, never at a call site: screens call
  `mutateAsync` and are done. When the path doesn't carry the affected id (the
  performed-set routes), the mutation takes it as an extra variable instead of pushing a
  `refetch()` to the caller. The only cache calls outside `src/api/` are the socket
  handlers in `use-chat-realtime.ts` and the `queryClient.clear()` session resets.
- List-shaped keys nest under their domain's `lists()` prefix (RM-143) — see
  `nutritionPlanKeys.today()`. A sibling key is invisible to every existing invalidation.
- `conversationKeys.detail()` and `.messages()` are SIBLINGS on purpose: sending a
  message must not refetch the loaded infinite chat history out from under the optimistic
  `appendClientMessage()`. Only a socket rejoin invalidates `conversationKeys.all`.
- Logout clears the cache with `queryClient.clear()`.
- Pending state: `mutation.isPending`; queries use `isLoading`/`isFetching`. Conditional
  queries pass `{enabled}`, never a `skip` flag.

## Auth And Session

- Tokens live in `localStorage` under `clientapp.*` keys (`src/api/authStorage.ts`).
- A 401 ends the session: `client.ts` clears tokens, drops the socket, and redirects to
  `/login?session_expired=true&redirect_to=<path>`. The query param is deliberate — it
  survives the hard reload that react-router state does not. A 403 does NOT log out.
- Protected screens go through `withAuth`; guest-only screens through `withNotAuth`.
- Dev OTP for any login/signup is `123456`.

## Shared Primitives

One component per job — don't hand-roll these:

- **Page shell**: `PageLayout` (`@/@components/page-layout`) for ordinary screens.
  Full-bleed screens (active workout, chat, auth, the sheets) legitimately opt out.
- **Fetch errors**: `ErrorState` (`@/@components/error-state`). Copy is
  "Couldn't load X", never "Failed to load X". Five screens each had their own version
  of this block before it was extracted — don't start a sixth.
- **Dates and initials**: `@easy/utils` already exports `formatDateISO`, `getInitials`,
  `formatDuration`, `formatMacroValue`, `MEAL_SLOTS`, `TRAINING_WEEKDAYS` and friends.
  Three screens had hand-rolled `localToday()` and two had their own `getInitials`
  before this rule; check the package before writing a helper.
- **Adherence colours**: `ADHERENCE_RING` / `ADHERENCE_TEXT` in
  `src/nutrition/nutrition-utils.ts`, beside the `Adherence` type that keys them.

## Theme And Styling

- The theme is HeroUI's raw custom properties in `src/index.css` (`--accent`, `--surface`,
  `--muted`, …), not coachapp's `@theme` `--color-*` scale. Both work; they are different
  mechanisms, so do not copy coachapp's theme rules here wholesale.
- **A colour utility needs a `--color-*` alias, not just the var.** Declaring
  `--success-secondary` does not make `text-success-secondary` resolve; HeroUI ships the
  alias for most vars but not all, and a missing one is a SILENT no-op that renders as
  inherited colour. Add `--color-x: var(--x);` to the `@theme inline` block.
  `just lint` runs `scripts/check-color-utilities.sh` to catch this (RM-142).
- Prefer theme tokens over hex. A hex that duplicates a token (`#0485f7` for `--accent`)
  is a drift risk; a genuinely app-specific chart colour is fine but belongs in one
  named place, not scattered across screens.
- Build mobile-first: the app must work at 375px. It is a phone app — desktop is not a
  target, so there are few `sm:`/`md:` breakpoints by design.
- Style with Tailwind utilities and HeroUI props. No per-component CSS files.
- Respect the safe-area insets (`env(safe-area-inset-*)`) on anything that touches a
  screen edge — this runs full-bleed inside a native shell.

## Where This Differs From CoachApp

These are deliberate, not drift. Don't "fix" them toward coachapp without a reason:

- **Loading is a centred `Spinner`, not a skeleton**, except the form-assignment
  detail route (`fill-checkin.tsx`): that screen is a form, so it keeps a
  content-shaped skeleton and the shared `ErrorState` with Retry (RM-217).
  Other screens stay on the spinner. Changing the rest is a design decision, not a cleanup.
- **Type sizes are arbitrary values (`text-[13px]`)**, because this app has no `type-*`
  scale. coachapp's "never `text-*` for size" rule does not apply until one exists.
- **Light mode only.** There is no dark block in `index.css`.
- **No `useGoBack` everywhere** — several screens navigate to an explicit route because
  the phone back-stack is shallower than coachapp's.

## Verification

- Type or data-flow changes: `pnpm -C apps/clientapp-v2 build`.
- UI changes: run the app and check the touched flow at 375px.
- Theme or colour changes: verify with `getComputedStyle` on the live element, not by
  eye — a dead colour utility looks like "dark text", not like a bug.
