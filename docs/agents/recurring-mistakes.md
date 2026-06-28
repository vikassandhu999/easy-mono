# Recurring mistakes — agent anti-patterns

A running ledger of violations we've actually hit, each written as a **rule** so no
future agent run repeats it. This is prevention, not bug-tracking: when you discover a
violation, the job isn't done when the instance is fixed — add (or update) the rule here.

**How to use**
- Before finishing any change, skim the entries for the area you touched.
- When you find a NEW recurring mistake, add an entry: the rule, why, and **how it's
  enforced**. Prefer a mechanical check (credo / biome / a test) — that's the only thing
  that *guarantees* it won't recur. Doc-only entries are the weakest rung; promote them to
  a check when feasible.
- One-off incomplete features (a screen not built yet) do NOT belong here — only mistakes
  that an agent could plausibly make *again*.

Severity of the rule isn't the point; recurrence is.

---

## Backend (Elixir)

### RM-001 — Ordering query builders must carry an id tie-break
`newest`/`oldest`/etc. must be `order_by: [desc: inserted_at, desc: id]` (see
`backend/AGENTS.md` §Query Builders). Without `:id`, offset/limit pagination is
non-deterministic on same-second timestamps. Hit in `Easy.Landing.Prospect.newest/1`.
**Enforced by:** review + this doc (credo doesn't catch it). Check every ordering builder.

### RM-002 — OpenApiSpex schema ↔ JSON view parity
The OpenApiSpex schema generates the FE types; the JSON view produces the actual response.
They are hand-maintained separately and drift (e.g. `FoodLogEntry` declared `meal_log_id`
but the view emits `nutrition_meal_log_id`; `fiber_g` returned but absent from the schema).
When you change a JSON view, change its OpenApiSpex schema in the same edit (and vice
versa), then `just gen-api`. **Enforced by:** review + this doc.

### RM-003 — Keep function nesting ≤ 2 (credo)
`Repo.transaction(fn -> case ... end)` and nested `with`/`if` trip credo's
nesting-depth check. Extract the inner branch into a named private helper. Hit in
`upsert_landing_page`, `enroll_prospect`, `Coach.update_profile`.
**Enforced by:** `mix credo` (run it on touched files — it's in `mix precommit`).

### RM-004 — OpenApiSpex spec is cached in the running dev server
Editing a schema while `phx.server` runs returns 422 "Unexpected field" on the new field —
the spec is built once at boot. Fully restart the server (not code-reload) after schema
edits. **Enforced by:** this doc / memory.

### RM-005 — Write responses must be tested at value level, not just truthiness
When a write response renders derived fields from preloads, create/update must return the
same fully-loaded shape as GET. In the nutrition refactor, `create_recipe` / `update_recipe`
and meal writes returned structs without re-preloading ingredients/items, so `nutrition`
rendered as zero and nested rows rendered empty while truthiness-only tests still passed.
Assert concrete values in write-response tests for derived fields and nested collections.
**Enforced by:** controller tests with exact value assertions for create/update responses.

### RM-006 — OpenApiSpex enums and examples must mirror domain enums
Do not hand-wave examples as harmless: invalid examples (`"milk"`, `"high-protein"`,
`"breakfast"`) hid drift from real domain enum values (`"dairy"`, `"high_protein"`, etc.).
When adding enum-ish fields, source the OpenApiSpex `enum:` from a shared helper or the same
domain vocabulary, and make examples valid members. **Enforced by:** schema review + tests
that exercise representative enum members when feasible.

### RM-007 — CastAndValidate nested request schemas need map output
For controller actions that pass nested request bodies into Ecto `cast_embed` / `cast_assoc`,
OpenApiSpex nested object schemas must set `struct?: false` where maps are expected.
Otherwise `CastAndValidate` yields OpenApiSpex structs, which are non-enumerable or fail Ecto
casting. Hit in nutrition schedule slots, food serving sizes, and recipe ingredient requests.
**Enforced by:** request tests through the real router with `content-type: application/json`.

### RM-008 — CastAndValidate controllers read `conn.body_params`, not pattern-matched params
After `OpenApiSpex.Plug.CastAndValidate`, validated bodies live in `conn.body_params` and path
params remain string-keyed in `conn.path_params`. Do not pattern-match old merged controller
params for write actions after enabling the plug. Also ensure tests send JSON content-type.
**Enforced by:** controller tests that hit the routed action, not direct context calls.

### RM-009 — Route renames must be verified from the generated OpenAPI surface
When renaming HTTP paths (e.g. snake_case → kebab-case), checking only the edited route block
or grepping broadly is not enough. The nutrition route pass kebab-cased coach routes but missed
client routes (`/v1/client/nutrition_plans`) because tests still used the old paths. Verify the
final OpenAPI route list for both coach and client scopes, then update generated clients/tests.
**Enforced by:** generated OpenAPI path diff / `just gen-api` plus route tests for both roles.

---

## Frontend

### RM-101 — No dead HeroUI v2 Tailwind tokens
`primary` / `divider` / `content1..4` / `foreground-NNN` are **dead no-ops** under
`@heroui/styles@3.x`. Use only `accent` / `border` / `surface` / `surface-hover` /
`muted` / `success` / `warning` / `danger` / `background`. **Enforced by:** grep both apps'
`src` for `(text|bg|border|divide)-(primary|divider|content[1-4]|foreground-[0-9]{2,3})`
before finishing — must be 0.

### RM-102 — Use the ROUTES constant, never a hardcoded path string
`navigate('/settings/client-profile-fields')` → `navigate(ROUTES.SETTINGS_PROFILE_FIELDS)`.
A literal silently rots into a dead link on any route rename. Hit in `client-profile.tsx`.
**Enforced by:** review + this doc.

### RM-103 — No orphan routes / no dead screens
Every route in `router.tsx` needs an inbound link (nav item or a `navigate()` from another
screen). When you add a screen, wire its entry point in the SAME change. Conversely, don't
delete an "unreachable" screen before checking it isn't the only surface for some field —
the plan-edit screens were the only place a plan's `description` could be edited.
**Enforced by:** review + this doc.

### RM-104 — Stable React keys for editable / reorderable lists
Never `key={index}` for a list whose rows can be added/removed/reordered — removing a middle
row misattributes inputs. Carry an ephemeral `key: crypto.randomUUID()` on each draft row,
separate from any persisted id (see the proof-points / fit-points editors).
**Enforced by:** biome `lint/suspicious/noArrayIndexKey`.

### RM-105 — Run biome + tsc before finishing FE work
`pnpm exec biome check --write <files>` and `pnpm --filter <app> exec tsc --noEmit`.
The trailing biome step in `just gen-api` errors on the generated file by design — that's
expected, not a regression. **Enforced by:** biome + tsc.

### RM-106 — Never use `as unknown` to read fields absent from the generated contract
If generated types do not expose a field, the runtime response probably does not either. The
training builder read `exercise.tracking_type` via `(exercise as unknown as ...)`, but the
embedded exercise schema/view omitted `tracking_type`, so the UI always defaulted to
weight+reps and broke duration/distance exercises. Fix the backend JSON view + OpenApiSpex
schema, regenerate clients, then consume the typed field. **Enforced by:** avoid contract-bypass
casts in app code; grep for `as unknown as` on API response objects during review.

### RM-107 — Field-driving logic must have one shared source of truth
The set row guessed displayed fields by null-checking values while the set sheet used
`tracking_type`, causing row/sheet drift for combined tracking types. Extract tables such as
`tracking_type → fields` into a shared module used by every renderer/editor. **Enforced by:**
shared helper + tests or component review for each consumer.

### RM-108 — Client inputs should not optimistically send values the server rejects
If the API contract has bounds (`rpe` 1–10), the client must enforce or block invalid values
before autosave. Letting an invalid optimistic cache write roll back with a generic save error
looks broken and hides the real constraint. **Enforced by:** mirror OpenApiSpex min/max in form
input attributes and save handlers for edited numeric fields.

### RM-109 — No literal brand colors in UI classes/styles
Hardcoded values like `#6c8cff` bypass the theme and drift from HeroUI tokens. Use semantic
tokens (`border-accent`, `focus:border-accent`, etc.) instead. Hit in builder accent-rule
borders and focus styles. **Enforced by:** grep app `src` for `#[0-9a-fA-F]{3,8}` before
finishing UI work; any remaining literals need a deliberate exception.

### RM-110 — Verify HeroUI component semantics against app usage before "fixing" them
Audit agents flagged `<Label>` / `<Description>` in menu/list item text as suspicious, but the
same pattern was used across pickers, list items, and menus and matched the intended HeroUI v3
slot pattern. Do not replace established primitives from an audit hunch; verify against local
usage and installed package/types first. **Enforced by:** app-wide usage grep + package/type
check before changing shared UI primitives.

### RM-111 — Spec audits must quote exact spec text, never inferred requirements
One training audit escalated a judgment call by inventing a sentence that did not exist in the
spec ("builder must handle not-yet-persisted → persisted plan id transition"). Findings must
cite concrete spec lines and distinguish literal requirements from interpretations. **Enforced
by:** adversarial verification: grep/read the cited spec text before filing or fixing a drift
finding.

### RM-112 — Pickers must use the app's responsive overlay pattern
Do not ship desktop-only or centered-modal pickers for coachapp assignment/search flows. The
client-detail redesign first built assignment as a centered modal and weak mobile pass; it had
to be rebuilt to match the spec and app pattern: anchored `Popover` under the trigger on
desktop, bottom `KeyboardSheet` on mobile, with surface-agnostic content shared between both.
Mirror `plan-assign-control.tsx` / `food-picker-control.tsx`: one content component, one
responsive wrapper selected by pointer/width. **Enforced by:** for any new picker, verify both
desktop and mobile surfaces exist, and test at a narrow viewport before finishing.

### RM-113 — Preserve standard coachapp page alignment and section structure
Do not let redesigned detail pages float centered, stretch oddly, or use ad-hoc separators that
break the app rhythm. Client-detail was initially centered (`mx-auto`), under-used desktop
space, and had floaty section dividers; it was corrected to the standard coachapp pattern:
left-aligned max-width content, responsive grid, uppercase section headings, and carded
sections that stack cleanly on mobile. Before shipping a page redesign, compare against nearby
coachapp list/detail/create/edit screens for header placement, width cap, section casing,
action spacing, and mobile stacking. **Enforced by:** visual check at desktop + mobile widths
and code review for `mx-auto` / full-width stretches / leading separators in page shells.

---

## Deploy / ops

### RM-201 — Deployable frontends need documented + guarded build-time env
Vite inlines `import.meta.env.VITE_API_BASE_URL` at BUILD time; an unset var on a deployed
(HTTPS) origin makes every request hit `localhost:4000` and fail silently. Each Vite app
ships a `.env.example`, and `api/base.ts` `console.error`s loudly when served from a
non-local origin with the var unset. Keep both when adding a new deployable FE.
**Enforced by:** the guard in `base.ts` (runtime) + `.env.example` (doc).

---

_Add new entries above their section's divider. Keep each to: the rule, the instance, and
how it's enforced._
