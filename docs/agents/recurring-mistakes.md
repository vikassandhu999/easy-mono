# Recurring mistakes — agent anti-patterns

A running ledger of violations we've actually hit, each written as a **rule** so no
future agent run repeats it. This is prevention, not bug-tracking: when you discover a
violation, the job isn't done when the instance is fixed — add (or update) the rule here.

**How to use**
- Before finishing any change, skim the entries for the area you touched.
- When you find a NEW recurring mistake, add an entry: the rule, why, and **how it's
  enforced**. Prefer a mechanical check (credo / biome / `scripts/check-rm.sh` / a test) —
  that's the only thing that *guarantees* it won't recur.
- One-off incomplete features (a screen not built yet) do NOT belong here — only mistakes
  that an agent could plausibly make *again*.

**Lifecycle** — this file is bounded, not append-only:
- **Graduate**: once an entry gets a mechanical check, shrink it to one line naming the
  check. The check is the rule; the prose is redundant.
- **Promote**: if a rule turns out to be standing contract ("how we build X"), move it
  into the owning `AGENTS.md` and leave a one-line pointer here. The ledger holds
  mistake-shaped residue, not the contract.
- **Retire**: delete entries whose subject no longer exists. Git remembers.

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
Recurred: `ScheduleJSON` emitted `meal_id`/`meal_name` while `NutritionScheduleEntry`
said `nutrition_meal_id` — the whole nutrition schedule UI read "Unassigned" against a
fully-scheduled plan, and controller tests had codified the wrong shape. When you change a
JSON view, change its OpenApiSpex schema in the same edit (and vice versa), then
`just gen-api`. **Enforced by:** each JSON view's controller test asserts the rendered
entity with `OpenApiSpex.TestAssertions.assert_schema(entity, "SchemaTitle",
EasyWeb.ApiSpec.spec())` (see `schedule_controller_test.exs`) — add one when touching a
view that lacks it. Review alone is not enough.

### RM-003 — Keep function nesting ≤ 2. **Enforced by:** `mix credo` (in `mix precommit`). Extract inner branches into named private helpers.

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
`OpenApiRouteCoverageTest` also fails when any write route lacks a controller-local
`CastAndValidate` plug.

### RM-009 — Route renames must be verified from the generated OpenAPI surface
When renaming HTTP paths (e.g. snake_case → kebab-case), checking only the edited route block
or grepping broadly is not enough. The nutrition route pass kebab-cased coach routes but missed
client routes (`/v1/client/nutrition_plans`) because tests still used the old paths. Verify the
final OpenAPI route list for both coach and client scopes, then update generated clients/tests.
**Enforced by:** generated OpenAPI path diff / `just gen-api` plus route tests for both roles.

### RM-010 — Public context functions are Ctx-first
Public context functions take `%Easy.Ctx{} = ctx` as their first argument (see
`Easy.Exercises`), not separate `business_id` / `user_id` arguments threaded through every
call. **Enforced by:** backend conventions review (`backend/AGENTS.md`) and `mix precommit`.

### RM-011 — External-payment checkout flows must branch on local payment STATE, not the presence of an external resource id
`Billing.checkout/2` picked create-vs-update by whether a `razorpay_subscription_id` was
present, not by whether that subscription had ever been paid. Dismissing the Razorpay modal
left `status: :free` with a dangling subscription id, so the next checkout took the update
path — a 502 dead-end, or an optimistic `paid_seats` bump on a subscription that was never
paid. Branch on `billing.status in [:active, :past_due, :cancel_at_period_end]`; treat any
subscription id on `:free`/`:cancelled` as stale and start a fresh subscription. Instance:
found in the billing/seats feature final review. **Enforced by:** regression test in
`test/easy/billing/checkout_test.exs` (stale-subscription-id-on-:free case) + review.

### RM-012 — Access-control sweeps are route-driven, not module-driven
An enforcement sweep that walks a named file list or greps for a naming pattern
(`_for_client(`/`_to_client(`) will miss sub-resource contexts that live outside that list.
The trainer-team access-control branch swept Tasks 4–5's module list and missed
`Easy.Meals` and `Easy.Workouts` entirely — both take sub-resource ids (`meal_id`,
`meal_item_id`, `workout_id`, `element_id`) resolved through a private ungated `get_plan/2`,
so a trainer kept indefinite read/write access to a reassigned-away client's plan content.
The only sweep that catches this: enumerate every route in the actor's router scope (e.g.
`scope "/coach"` in `router.ex`), and for each one trace its controller action to the
context call it makes, then verify that call's authorization chain reaches
`Clients.authorize_client_id/2` (or an equivalent client-ownership check) before returning
data. Do not treat a context's own file list, or a grep for an authorization-looking
function-name suffix, as exhaustive — a new sub-resource context can reach client-owned
rows without ever calling a function named `_for_client`. **Enforced by:** review checklist
addition — any access-boundary review must include a full router-route enumeration for the
actor scope under review, not just a module/file sweep.

### RM-013 — Authorization helper skeletons must be written fail-closed
Plan/skeleton code for an authorization or visibility helper is faithfully transcribed by
implementers, so a permissive catch-all in the reference implementation ships as a real
security hole. The coach-client-messaging branch inherited a fail-open final clause
(`defp constrain_to_visible_clients(query, %Ctx{}), do: query`) from its plan, meaning a
malformed ctx with neither `owner?` nor `coach_id` would see every conversation; separately,
a visibility check on that branch was once weakened just to satisfy a wrong test. Prevention:
every authorization/visibility helper skeleton ends in a deny-by-default clause (`where(query,
false)`, `{:error, :forbidden}`, `[]`), and the accompanying tests assert the deny path — never
relax a guard to make a test pass; fix the test. **Enforced by:** review — the last clause of any
authz/visibility helper must deny, and its test suite must cover the unmatched-actor case.

### RM-014 — Tenant-owned child rows carry `business_id` directly
Do not rely on joining through a parent to recover tenant ownership. Stamp `business_id` from
`Ctx` in the child changeset, scope child queries by it, and backfill existing rows before making
the column non-null. Hit in chat messages and recipe ingredients. **Enforced by:** non-null
foreign keys/indexes plus tenant-isolation context/controller tests.

### RM-015 — Drop incompatible check constraints before data remaps
When a migration maps stored values into a vocabulary rejected by the active check constraint,
drop that constraint before the `UPDATE`, then create the replacement constraint after the data
has moved. Apply the same order in `down/0`. Empty test databases do not prove this path; run the
rollback/reapply cycle against representative legacy rows. **Enforced by:** populated-database
migration verification plus review of every enum or status remap.

### RM-016 — Tests must not hard-code calendar dates that depend on "today"
Logic that compares against `Date.utc_today()` (schedule generation, expiry sweeps) must be
tested with dates derived from `Date.utc_today()` (`Date.add(Date.utc_today(), 7)`), never
literals like `~D[2026-07-18]` that were "future" on the day the test was written. Two check-in
schedule tests turned red days later and broke `mix precommit` for unrelated work. Literals are
fine only when the code path takes the date as an argument end-to-end (pure date math).
**Enforced by:** review of any test asserting around a `~D[...]` literal — ask "does the
assertion still hold in a year?"

### RM-017 — ILIKE search terms must escape `%`/`_` via `Easy.Search.like_pattern/1`
Interpolating a raw user term into `ilike(x, ^"%#{term}%")` is safe from SQL injection (bound
param) but not from LIKE-wildcard injection: searching `%` matched every row. Every ilike search
builder now goes through `Easy.Search.like_pattern(term)`, which backslash-escapes `\`, `%`, `_`.
Use it for any new ilike filter. **Enforced by:** review — grep `%#{term}%` should return nothing
under `backend/lib`.

---

## Frontend

### RM-101 — No dead HeroUI v2 Tailwind tokens (`primary`/`divider`/`content1..4`/`foreground-NNN`). **Enforced by:** `just check-rm`.

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

### RM-104 — Stable React keys for editable/reorderable lists (never `key={index}`; ephemeral `crypto.randomUUID()` on draft rows). **Enforced by:** biome `lint/suspicious/noArrayIndexKey`.

### RM-105 — Run biome + tsc before finishing FE work. The trailing biome error in `just gen-api` on the generated file is expected. **Enforced by:** biome + tsc.

### RM-106 — Never use `as unknown` to read fields absent from the generated contract
If generated types do not expose a field, the runtime response probably does not either. The
training builder read `exercise.tracking_type` via `(exercise as unknown as ...)`, but the
embedded exercise schema/view omitted `tracking_type`, so the UI always defaulted to
weight+reps and broke duration/distance exercises. Fix the backend JSON view + OpenApiSpex
schema, regenerate clients, then consume the typed field. **Enforced by:** avoid contract-bypass
casts in app code; grep for `as unknown as` on API response objects during review. (Known
remaining instances: `food-detail.tsx` tags, `amount-sheet.tsx` food/recipe — fix via contract,
then this can become a `check-rm` rule.)

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

### RM-109 — No literal brand colors in UI classes/styles (semantic tokens only). **Enforced by:** `just check-rm` (coachapp; widen to clientapp once its hex debt is cleaned).

### RM-110 — Verify HeroUI component semantics against app usage before "fixing" them
Audit agents flagged `<Label>` / `<Description>` in menu/list item text as suspicious, but the
same pattern was used across pickers, list items, and menus and matched the intended HeroUI v3
slot pattern. Do not replace established primitives from an audit hunch; verify against local
usage and installed package/types first. **Enforced by:** app-wide usage grep + package/type
check before changing shared UI primitives.

### RM-111 — Spec audits must quote exact spec text, never inferred requirements
One training audit escalated a judgment call by inventing a sentence that did not exist in the
spec. Findings must cite concrete spec lines and distinguish literal requirements from
interpretations. **Enforced by:** adversarial verification: grep/read the cited spec text
before filing or fixing a drift finding.

### RM-112 — Pickers use the responsive overlay pattern. **Promoted to** `coachapp-v2/AGENTS.md` §Canonical Components.

### RM-113 — Standard coachapp page alignment/section structure. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-114 — Do not let legacy components drive builder architecture
Existing code is app-fit reference only, not proof of quality. The plan builders needed an
explicit correction: build to the validated spec/mockups and clean architecture, not by copying
legacy builder structure. Reuse only primitives that are actually good; otherwise rebuild the
component properly. **Enforced by:** implementation prompts/reviews must include a
"legacy-mimicry" check against the spec.

### RM-115 — Headers/form actions follow the exercise reference screen. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-116 — HeroUI v3 primitives over raw HTML controls. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-117 — Detail surface, not permanent edit forms. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-118 — Mutation and delete flows must invalidate/refetch every visible list/detail
Coachapp screen validation found an app-wide delete-staleness bug across five deletable
resources: the mutation succeeded, but infinite lists/details stayed stale. Whenever adding or
rewiring mutations, update RTK Query tag invalidation or explicit refetch wiring for every
visible consumer. **Enforced by:** after create/update/delete, test list, detail, and empty/error
states in the browser; review generated hook tags or manual invalidation.

### RM-119 — Do not finish blind visual redesigns without live verification
For UI/layout changes, typecheck/build is not enough: verify live at desktop and mobile widths,
or explicitly mark the visual path unverified and do not call it done. **Enforced by:** final UI
report must say which viewports were visually checked and which states remain unverified.

### RM-120 — Shared form wrappers must not mount uncontrolled
Optional form values can start as `undefined`, but shared HeroUI wrappers must still pass a
controlled value to the underlying input. Coachapp macro fields passed `field.value` directly
through `FormNumberField`, so empty optional numbers mounted uncontrolled. Normalize empty
values in the shared wrapper, not each caller. **Enforced by:** browser console check on empty
optional form fields after build; add a component test when coachapp has a frontend test runner.

### RM-121 — No react-aria `NumberField` for numeric entry (races mobile soft keyboards; use `NumberInput`). **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-122 — Forms from shared primitives; no `(optional)`/`(required)` labels. **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-123 — Browse lists use `BrowseListBox`; errors via `ErrorState` / "Couldn't load X". **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-130 — Backend decimal fields arrive as JSON strings; coerce with `Number()` before math
The Elixir backend serializes `Decimal` columns (weight values, load values, goal weights, macro
targets) as JSON **strings**, but the generated OpenAPI types declare them `number` — TypeScript
will not warn. Any arithmetic, comparison, or `.toFixed()` on such a field crashes at runtime
("x.toFixed is not a function") or silently compares lexicographically. Instance: the 2026-07-21
client-detail rebuild crashed on `weight_entries[].value.toFixed(1)` and charted string values.
Rule: at the first point a decimal-ish API field is used numerically, wrap it once in `Number(...)`
(with a comment naming the string serialization) and use the coerced value everywhere after.
Prefer coercion in the api/domain layer helper over per-component. **Enforced by:** review — no
reliable grep exists; the type lies, so treat every `.value`/`*_value`/`target_*` field from the
API as suspect until coerced.

### RM-129 — `Page.Content` never takes the gutter into its own hands: `bare` + `Page.Frame`, or nothing
A `<Page.Content className=...>` that isn't `bare` applies the page gutter itself. Two failure
shapes shipped ~30 times during the redesign: (a) content with NO `Page.Frame` inside — no width
limit, so bodies stretch unbounded past 1264px viewports; (b) a `Page.Frame` nested under a
non-`bare` Content — both apply the gutter, so the body sits 32px from the edge while its own
header sits at 16px. Rule: every screen body is `<Page.Content bare>` + `<Page.Frame size=...>`
(className on either carries only vertical padding). Instance: the 2026-07-21 compliance sweep
(create/detail/prospect/session screens; both plan builders). **Enforced by:** `just check-rm`.

### RM-124 — Never stack inline `translateX` with a Tailwind `-translate-x-*` (v4 emits the `translate` property, so both apply and the offsets ADD — one mechanism per axis). **Enforced by:** `just check-rm`.

### RM-125 — Loading/pending states must not change layout (skeletons not centered spinners; constant-width pending buttons). **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-127 — `bg-foreground`/`text-background` is not a "dark cell"; it inverts with the theme
Both tokens flip between light and dark themes, so a cell painted `bg-foreground text-background`
renders dark-on-light in one theme and light-on-dark in the other — the opposite of the intent.
`--accent` is authored dark in BOTH theme blocks, so `bg-accent` + `text-accent-foreground` is the
only stable "always dark surface" pair. Instance: the 2026-07-09 dashboard bento shipped four
inverting cells (needs-attention, quick-actions, subscription avatar, featured avatar).
**Enforced by:** `just check-rm`.

### RM-128 — Status colors are not body-copy colors; use `*-soft-foreground` for colored text
On `--surface` the status tokens fail WCAG AA for normal text: `danger` 4.15:1, `success` 3.30:1,
`link` 3.23:1, `warning` 3.19:1 (AA needs 4.5:1). HeroUI ships `--danger-soft-foreground` and
friends — `color-mix(<color>, --foreground)` — precisely for readable colored copy; they measure
7.1–7.5:1 on surface and 5.8–6.4:1 on their own `*-soft` tint. Use `text-danger`/`text-warning`
for icons, borders, and large numerals only; use `text-<status>-soft-foreground` (over
`bg-<status>-soft`) for any sentence, label, or chip text. Instance: the 2026-07-09 dashboard
bento used `text-danger`/`text-warning` for 12px copy. Corollary: `--link` itself must be an
AA-passing blue (#0072D6, 4.80:1), not the brand #0091FF (3.23:1) — keep the brighter blue on
`--focus`, where the 3:1 non-text threshold applies.
**Enforced by:** `just check-rm`.

### RM-126 — Server field errors + HeroUI native form validation deadlock resubmits
`applyFormErrors`/`setError` on a field inside a HeroUI `Form` sets a native `customError`,
and HeroUI's default `validationBehavior` then blocks the browser submit event BEFORE
react-hook-form's `onSubmit` (and any `clearErrors`) can run — the form dead-ends until the
errored field is manually touched. Instance: client edit form after the reactivation-guard
422 (2026-07-09); Save silently did nothing after the coach fixed the date. Any form that
surfaces server errors via `setError` needs `validationBehavior="aria"` (passthrough on
`FormLayout`) plus `form.clearErrors()` before `handleSubmit` in its submit wrapper.
**Enforced by:** convention for now; graduate to `check-rm` (grep forms using
`applyFormErrors` without `validationBehavior="aria"`) if it recurs.

### RM-130 — Generated API clients are not hand-fixed to satisfy lint

OpenAPI codegen may emit bracket access for reserved-looking query keys such as `from`. Do not edit
`src/api/generated.ts`; the next generation overwrites it. Keep generated-file-only lint exceptions
in `frontend/biome.json`, narrowly scoped to the emitted rule.

**Enforced by:** the Biome override for `**/src/api/generated.ts`.

### RM-131 — Screen builds are committed the moment they render, on their own branch

The coach client-detail screen was built twice (2026-07-21 and 2026-07-22), browser-verified
both times, and lost both times because the working tree was never committed before later
sessions branched/cleaned. A multi-file screen build is committed (WIP commit is fine) on its
feature branch as soon as it compiles and renders — before verification loops, before review
passes, before anything that switches branches or reseeds.

**Enforced by:** convention; session-memory carries the reminder. The third build (port/cd-ov)
was committed within the same session.

---

### RM-132 — A per-screen `@theme` token is a px literal wearing a name

Banning arbitrary values in `.tsx` does not remove per-screen pixel values unless the theme
file is also closed. It only relocates them: told "never a px literal — register an `@theme`
token for the exact spec value", nine screen ports took `coachapp-v2/src/index.css` from 81 to
164 tokens — 19 font sizes between 9.5px and 27px, 14 radii, most used once and named after
the single element they came from (`--radius-detail-strip`, `--text-set-chip`). The theme
became an append-only log of per-screen decisions, and three separate "restore the baseline"
resets each grew back within nine commits.

The rule: **the `--text-*` / `--radius-*` scale is a closed vocabulary.** A port snaps to the
nearest existing step or STOPs and proposes a new one — the same fence UI-CONTRACT §2 already
puts around components. Adding a step is a user decision in its own commit. Generally: when a
gate forbids a shape, check where the pressure goes instead of assuming it disappeared.

**Enforced by:** `scripts/check-ui-contract.sh` (theme freeze — fails any commit that adds a
scale token; `UI_CONTRACT_SKIP_THEME=1` for deliberate changes) + `style-diff.mjs` snaps design
values onto the scale so between-step values are a PASS, not drift to chase.

---

### RM-133 — A theme rule aimed at a third-party class fails silently when the name is wrong

Styling someone else's component from your own stylesheet means guessing at their class
names, and a wrong guess produces no error anywhere: the build is green, the linter is
quiet, and the page simply keeps whatever it had. Three shipped in one session —
`.search-field-group` (really `.search-field__group`), `.tab` (`.tabs__tab`) and
`.alert-dialog` (`.alert-dialog__dialog`). The first two were merely inert. The third was a
regression: 14 dialogs had their `sm:max-w-100` deleted "because the theme owns it now",
and the rule that was supposed to own it had never matched anything, so those dialogs went
two commits with no width cap.

HeroUI's names are BEM-ish — `block__element--modifier`. The class you want is almost
always the `block__element` form, not the hyphenated shortening that reads naturally.

The rule: **after writing a theme rule for a vendor component, confirm the selector matches
a live node and produces the value you intended** — `document.querySelectorAll(sel).length`
and a `getComputedStyle` read. Verifying that the edit landed is not the same as verifying
it did anything. The same session made this mistake three times in different forms (a
`min-w-0` deletion, a global `border-` strip, these selectors); the common thread each time
was checking the edit rather than the effect.

**Enforced by:** `scripts/check-theme-selectors.sh` in `just lint` — every class selector in
`index.css` must exist in the installed `@heroui/styles`, resolved from the version the app
actually loads (several can sit in the pnpm store at once and their names differ).
App-owned classes are allowlisted in the script.

---

### RM-134 — A custom `text-<size>` token is eaten by tailwind-merge whenever a colour follows it

`cn()` is tailwind-merge, and it runs inside every HeroUI component as well as at our own
call sites. It knows Tailwind's OWN size names and nothing else, so a custom size lands in
the same class group as a colour and the later one wins:

    cn('text-eyebrow', 'text-muted')  ->  'text-muted'           size silently gone
    cn('text-sm',      'text-muted')  ->  'text-sm text-muted'   stock size survives

Nothing errors. The element just renders at the inherited size. `BrowseRow`'s meta line had
been 12px instead of 11px since it was written, and a stray `sm:text-eyebrow` was the only
reason it looked right above `sm` — which in turn made 111 apparently-dead `sm:` duplicates
look removable when they were load-bearing. 37 call sites were affected.

Reordering does not help: size and colour are one group, so whichever is last wins and the
other is always lost. Configuring the merge does not help either — `tailwind-variants`
exposes `defaultConfig.twMergeConfig`, but it does not reach `cn`, and the drop happens
inside HeroUI's own components where our config cannot reach at all.

The rule: **size tokens live in their own namespace.** They are `--type-*` / `type-eyebrow`,
not `--text-*` / `text-eyebrow`, so tailwind-merge has no group for them and can never
choose between a size and a colour. `text-*` means colour, only. This is consistency by
construction rather than by discipline — the mistake is not possible to make.

**Enforced by:** `scripts/check-ui-contract.sh` rejects `text-(eyebrow|body|title|heading|
metric|display)` — those utilities no longer exist, so any survivor is a dead class.
`style-diff.mjs` reads the scale from `--type-*`.

---

### RM-135 — A renamed custom property leaves `var()` references that silently unset the property

The rename in RM-134 moved the type scale from `--text-*` to `--type-*`. The gate added with
it looks for surviving `text-<size>` *utilities*, so it caught the call sites — and missed
`var(--text-eyebrow)` inside `index.css` itself. One survived, on `.segmented > .toggle-button`.

`var(--nope)` with no fallback is not ignored and does not fall back to the inherited
declaration: the whole declaration is invalid at computed-value time, so the property drops to
its inherited value. Every segmented-control label therefore rendered at the inherited 14px
instead of the design's 12.5px → 11px, in both plan builders, and nothing anywhere went red.

This is RM-133's failure mode on the other half of a rule. A theme rule has two halves that
can each miss silently — the *selector* (does it match a node?) and the *value* (does the
token resolve?). RM-133 covered the first. Renames are when the second breaks, because the
grep that finds the utilities is not the grep that finds the `var()`s.

The rule: **renaming a custom property means grepping `var(--old-name)` too, not just the
utilities it generated** — and reading the computed value off a real node afterwards, since a
dangling `var()` looks exactly like "the rule is not applying" and exactly like "the design
always looked like this".

**Enforced by:** `scripts/check-theme-selectors.sh` (in `just lint`) now also fails on any
`var(--x)` in `index.css` that nothing defines — checked against the theme itself, the
installed `@heroui/styles`, and Tailwind's `theme.css`. Give a deliberate one a fallback.

---

### RM-136 — A recurring look is a component variant, not a class string to re-type

The ink-selected pill — bordered surface pill, filled `--ink` when selected — had been
hand-assembled at five call sites: BrowseScreen's filter row, the nutrition builder's day
tabs, the training builder's workout tabs, the settings tab strip, and `.segmented`. Eight
to ten classes each, and they disagreed:

- **type step** `type-eyebrow` (11px) in the builders vs `type-body` (14px) in BrowseScreen
- **selected foreground** `text-ink-foreground` vs `[color:white]` — same computed
  `oklch(1 0 0)`, one bypassing the theme
- **radius** `rounded-control` (10px) vs `.segmented`'s `--radius-chip` (8px)

The dc.html settles it and also proves the point: `.pill` and `.daytab` are byte-identical
there apart from 1px of padding. The prototype duplicated the object, the port duplicated it
five more times, and each copy drifted on a different axis. `12.5px` -> `--type-eyebrow`, so
the 14px was the wrong one.

The rule: **when a look repeats, define it once as a variant on the component.** For a HeroUI
component, follow HeroUI's own convention rather than inventing one — its variants are BEM
modifier classes that set the block's custom properties (`.toggle-button--ghost` sets
`--toggle-button-bg` and friends), so an app variant does the same and only writes plain
declarations for axes HeroUI does not tokenise. Do NOT put the look on the base class: a
`ToggleButton` is also an icon toggle and a segmented segment.

**Enforced by:** `scripts/check-rm.sh` rejects `data-[selected=true]:bg-ink` at a call site —
that is the signature of re-assembling the pill. Use `.toggle-button--ink` (always a pill) or
`.toggle-button--filter` (underline below `sm`, pill above). `check-theme-selectors.sh`
allows an app-owned `--ink`/`--filter` modifier but still verifies the BLOCK exists, so
`.toggle-buton--ink` is still caught.

---

### RM-137 — A literal colour inside an arbitrary value is the one that cannot follow the theme

`[color:var(--color-muted)]` is fine and there are ~45 of them: that is the token, escalated
to an arbitrary property because a HeroUI recipe outranks the plain `text-muted` utility.
`[color:white]` is a different thing entirely — it is a value the theme can never reach, so
it cannot respond to light/dark and cannot be retargeted when the palette moves. Nine had
accumulated, and the two outside Client Detail were sitting next to `bg-accent` and `bg-ink`,
both of which have a matching foreground token.

Note `--accent-foreground` is `oklch(0.9911 0 0)`, not pure white — so swapping is a real
(imperceptible) change, not a no-op. Take the token anyway: the value of the swap is that the
ban becomes mechanical.

The rule: **arbitrary-value syntax may carry a token, never a literal colour.**

**Enforced by:** `scripts/check-rm.sh` rejects `[color:` followed by `white`/`black`/`#`/
`rgb`/`hsl`/`oklch`. Client Detail is excluded pending its redesign (8 literals live there).

---

## Deploy / ops

### RM-201 — Deployable frontends need documented + guarded build-time env
Vite inlines `import.meta.env.VITE_API_BASE_URL` at BUILD time; an unset var on a deployed
(HTTPS) origin makes every request hit `localhost:4000` and fail silently. Each Vite app
ships a `.env.example`, and `api/base.ts` `console.error`s loudly when served from a
non-local origin with the var unset. Keep both when adding a new deployable FE.
**Enforced by:** the guard in `base.ts` (runtime) + `.env.example` (doc).

---

## Docs

### RM-301 — Retiring an architecture-level artifact means grepping the docs for it
When a framework, contract file, or command is replaced (Ash → Ecto, `docs/api_contract.yaml`
→ OpenApiSpex schemas), grep every `*.md` for the old name and fix each hit in the same
change. Instance: the 2026-07-04 docs audit found "Ash" and `api_contract.yaml` still
described as current in four docs weeks after the switch. Run
`grep -rn --include='*.md' <old-name> .` before finishing any stack/contract rename.
**Enforced by:** convention; the `/repo-cleanup` skill greps known offenders each run.

---

_Add new entries above their section's divider. Keep each to: the rule, the instance, and
how it's enforced. Apply the lifecycle: graduate to `scripts/check-rm.sh`, promote to the
owning `AGENTS.md`, retire when the subject dies._
