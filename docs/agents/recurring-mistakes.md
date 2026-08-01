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

### RM-001 — Every `order_by` must be a total order, tie-break included
`newest`/`oldest`/etc. must be `order_by: [desc: inserted_at, desc: id]` — without `:id`,
offset/limit pagination is non-deterministic on same-second timestamps. The rule covers
`order_by` written INLINE inside an `include_*` preload builder too, which is how
`Meal.include_items` shipped a bare `[asc: inserted_at]`: `timestamps(type: :utc_datetime)`
is second-precision, so every meal of a duplicated plan ties and the plan detail's meal
order varied between reads of the same plan. If the sort key isn't unique, add `:id`.
**Enforced by:** review (credo doesn't catch it; the multi-line forms defeat grep).
Known outstanding: `Food.search` orders by `ts_rank` alone, so paginated food search can
repeat or skip equally-ranked foods across pages.

### RM-002 — OpenApiSpex schema ↔ JSON view parity
Schema generates the FE types; the view produces the response; they drift when edited
separately. Change both in the same edit, then `just gen-api`. **Enforced by:** each JSON
view's controller test asserts the rendered entity with
`OpenApiSpex.TestAssertions.assert_schema/3` — add one when touching a view that lacks it.

### RM-003 — Keep function nesting ≤ 2. **Enforced by:** `mix credo` (in `mix precommit`).

### RM-004 — OpenApiSpex spec is cached in the running dev server
Schema edits 422 ("Unexpected field") until `phx.server` is fully restarted — the spec is
built once at boot; code-reload doesn't bust it.

### RM-005 — Write responses must be tested at value level, not just truthiness
Create/update must return the same fully-preloaded shape as GET; truthiness-only tests let
zero/empty derived fields pass. **Enforced by:** exact value assertions in write-response
tests for derived fields and nested collections.

### RM-006 — OpenApiSpex enums and examples must mirror domain enums
Invalid examples hide drift from real enum values. Source `enum:` from the domain
vocabulary; make examples valid members.

### RM-007 — CastAndValidate nested request schemas need map output
Nested object schemas feeding `cast_embed`/`cast_assoc` must set `struct?: false`, else
Ecto gets non-enumerable OpenApiSpex structs. **Enforced by:** request tests through the
real router with JSON content-type.

### RM-008 — CastAndValidate controllers read `conn.body_params`
After the plug, validated bodies live in `conn.body_params`; path params stay string-keyed
in `conn.path_params` — don't pattern-match merged params. **Enforced by:**
`OpenApiRouteCoverageTest` fails any write route lacking a controller-local plug; routed
controller tests.

### RM-009 — Route renames must be verified from the generated OpenAPI surface
Grep + editing the obvious route block misses sibling scopes (a kebab-case pass missed all
`/v1/client/*` routes). Diff the generated OpenAPI path list for BOTH coach and client
scopes, then regenerate clients and update tests.

### RM-010 — Public context functions are Ctx-first
Take `%Easy.Ctx{} = ctx` first (see `Easy.Exercises`), never threaded
`business_id`/`user_id` args. **Enforced by:** `backend/AGENTS.md` conventions review.

### RM-011 — Payment flows branch on local payment STATE, not external-id presence
A dangling `razorpay_subscription_id` on a never-paid `:free` business is stale, not proof
of a subscription — branch on `billing.status`. **Enforced by:** regression test in
`test/easy/billing/checkout_test.exs`.

### RM-012 — Access-control sweeps are route-driven, not module-driven
A sweep over a named module list or an authorization-looking name grep misses sub-resource
contexts (`Easy.Meals`/`Easy.Workouts` kept a reassigned trainer's access via an ungated
private `get_plan/2`). The only exhaustive sweep: enumerate every route in the actor's
router scope, trace each controller action to its context call, and verify that call's
chain reaches `Clients.authorize_client_id/2` (or equivalent) before returning data.
**Enforced by:** review checklist — access-boundary reviews start from the router.

### RM-013 — Authorization helper skeletons must be written fail-closed
A permissive catch-all in a plan/skeleton ships verbatim as a security hole. Every
authz/visibility helper ends in a deny-by-default clause (`where(query, false)`,
`{:error, :forbidden}`, `[]`) and its tests assert the deny path. Never relax a guard to
make a test pass — fix the test.

### RM-014 — Tenant-owned child rows carry `business_id` directly
Stamp it from `Ctx` in the child changeset and scope child queries by it; don't recover
tenancy by joining through the parent. **Enforced by:** non-null FKs/indexes +
tenant-isolation tests.

### RM-015 — Drop incompatible check constraints before data remaps
Constraint out → `UPDATE` → new constraint in, same order mirrored in `down/0`. Empty test
DBs don't prove this path — run rollback/reapply against representative legacy rows.

### RM-016 — Tests must not hard-code calendar dates that depend on "today"
Anything compared against `Date.utc_today()` is tested with dates derived from it
(`Date.add(Date.utc_today(), 7)`), never `~D[...]` literals that rot. Literals are fine
only for pure date math that takes the date as an argument. Review question: "does the
assertion still hold in a year?"

### RM-017 — ILIKE search terms must escape `%`/`_`
Every ilike filter goes through `Easy.Search.like_pattern/1` (searching `%` matched every
row). **Enforced by:** review — grep `%#{term}%` should return nothing under `backend/lib`.

### RM-020 — A required-on-create FK must also be required on update and on delete
`validate_required` in `insert_changeset` alone is one door out of three. `training_workout_exercises.exercise_id` was required on create but nilify-on-delete with no NOT NULL, and `update_changeset` never required it — so deleting an exercise, or `PATCH`ing the element with `exercise_id: nil`, silently left a plan row pointing at nothing that still rendered its `planned_sets` as a nameless movement. Whenever a parent reference is mandatory, cover all three doors: `validate_required` in **both** changesets, a `:restrict` FK (not nilify + NOT NULL — that trips RM-019), and a context guard returning `{:error, :in_use}` so the user gets a 409 instead of a constraint error. Deciding rule: nilify is for rows that denormalise what they need to survive (`food_name`, `exercise_name` on log entries); restrict is for structural rows that are meaningless without the parent.

### RM-019 — `ON DELETE SET NULL` + a CHECK over the same columns = deletes raise
SET NULL is an UPDATE, and Postgres evaluates CHECK constraints on UPDATE. A
`num_nonnulls(a, b) = 1` check over nilify-on-delete FKs therefore makes deleting the
parent raise `Ecto.ConstraintError` (a 500), not fail gracefully. Deleting any food that
had ever been logged was impossible for this reason. Decide per table which the row
needs: history rows (`nutrition_food_log_entries`) relax to `<= 1` because they
denormalise `food_name` and freeze macros, so they outlive the library row; structural
rows (`nutrition_meal_items`) keep `= 1` and the delete is blocked up front as
`{:error, :in_use}`. Review question: "for every nilify-on-delete FK, is there a CHECK
or NOT NULL over that column — and is exactly-one a write rule or a lifetime invariant?"

### RM-018 — Dropping a uniqueness guarantee is an API change for every reader of that column
Relaxing a constraint is never local. Before dropping a unique index, grep the column and
every column copied from it across the whole repo — other code may be using it as an
identity key. `20260728100000` dropped unique `(nutrition_meal_id, position)` for the
builder ("no position uniqueness anywhere"), but logging reconciliation keyed its
already-logged skip-list on `planned_item_index`, a copy of that position — so two items
sharing a position made "log meal" skip one silently, losing a client's food log. Fix was
to key reconciliation on `meal_item_id`. Review question: "who treats this column as an
identifier, not a value?" Mutable display order and stable identity must never be the same
column.

### RM-021 — Existence guards are tenant-scoped queries too
`Repo.exists?` / `Repo.aggregate` guards ("is this row still referenced?") must carry
`business_id` like any other tenant-owned read. Four delete guards
(`ensure_food_not_in_use`, `ensure_recipe_not_in_use`, `ensure_exercise_not_in_use` — over
`nutrition_meal_items`, `nutrition_recipe_ingredients`, `training_workout_exercises`)
shipped unscoped: another tenant's row could veto your delete, the check was a cross-tenant
existence oracle, and the query couldn't use the `business_id`-leading indexes. The
tenant-isolation rule has no "it's only a boolean" exception — pipe the schema's
`for_business/2` into every existence probe. **Enforced by:** review; grep
`Repo.exists?(` and confirm each pipeline includes a `for_business`/`for_client`/
`for_coach` builder (deliberate cross-tenant checks, e.g. the global
active-client-email rule, carry a comment saying so).

### RM-022 — `max(position) + 1` needs a stable parent-row lock
Moving `max(position) + 1` into an INSERT does not serialize concurrent appends: two
transactions can still read the same maximum. Lock the owning parent row with `FOR UPDATE`
inside the write transaction so only siblings under that parent contend. **Enforced by:**
`test/easy/training/performed_set_concurrency_test.exs` releases same-session appends together
and requires contiguous positions.

---

## Frontend

### RM-101 — No dead HeroUI v2 Tailwind tokens (`primary`/`divider`/`content1..4`/`foreground-NNN`). **Enforced by:** `just check-rm`.

### RM-102 — Use the ROUTES constant (+ `generatePath`), never a hardcoded path string. **Enforced by:** `just check-rm`.

### RM-103 — No orphan routes / no dead screens
Every route needs an inbound link, wired in the SAME change. Conversely, check an
"unreachable" screen isn't the only surface for some field before deleting it.

### RM-104 — Stable React keys for editable/reorderable lists (never `key={index}`; ephemeral `crypto.randomUUID()` on draft rows). **Enforced by:** biome `lint/suspicious/noArrayIndexKey`.

### RM-105 — Run biome + tsc before finishing FE work. The trailing biome error in `just gen-api` on the generated file is expected. **Enforced by:** biome + tsc.

### RM-106 — Never use `as unknown` to read fields absent from the generated contract
If the types don't expose a field, the runtime response probably doesn't either. Fix the
backend view + schema, regenerate, then consume the typed field. Review grep:
`as unknown as` on API response objects.

### RM-107 — Field-driving logic must have one shared source of truth
Extract tables like `tracking_type → fields` into a shared module used by every
renderer/editor; parallel null-check heuristics drift.

### RM-108 — Client inputs should not optimistically send values the server rejects
Mirror OpenApiSpex min/max in input attributes and save handlers; a rolled-back optimistic
write looks broken and hides the real constraint.

### RM-109 — No literal brand colors in UI classes/styles (semantic tokens only). **Enforced by:** `just check-rm` (coachapp; widen to clientapp once its hex debt is cleaned).

### RM-110 — Verify HeroUI component semantics against app usage before "fixing" them
Don't replace established primitives from an audit hunch — check app-wide usage and the
installed package/types first (`<Label>`/`<Description>` in menus was the intended v3 slot
pattern, not a bug).

### RM-111 — Spec audits must quote exact spec text, never inferred requirements
Findings cite concrete spec lines and separate literal requirements from interpretation;
grep/read the cited text before filing or fixing a drift finding.

### RM-112 — Pickers use the responsive overlay pattern. **Promoted to** `coachapp-v2/AGENTS.md` §Canonical Components.

### RM-113 — Standard coachapp page alignment/section structure. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-114 — Do not let legacy components drive builder architecture
Existing code is app-fit reference, not proof of quality — build to the validated
spec/mockups; reuse only primitives that are actually good.

### RM-115 — Headers/form actions follow the exercise reference screen. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-116 — HeroUI v3 primitives over raw HTML controls. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-117 — Detail surface, not permanent edit forms. **Promoted to** `coachapp-v2/AGENTS.md` §Page Anatomy.

### RM-118 — Mutations must invalidate/refetch every visible list/detail
Delete-staleness shipped app-wide across five resources. After create/update/delete, test
list, detail, and empty/error states in the browser; review tag invalidation wiring.

### RM-119 — Do not finish blind visual redesigns without live verification
Typecheck/build is not enough for UI changes: verify live at desktop and mobile widths, or
explicitly report the visual path unverified. The final UI report names which viewports
were checked.

### RM-120 — Shared form wrappers must not mount uncontrolled
Optional values start `undefined`; normalize to a controlled value in the shared wrapper,
not at each caller.

### RM-121 — No react-aria `NumberField` for numeric entry (races mobile soft keyboards; use `NumberInput`). **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-122 — Forms from shared primitives; no `(optional)`/`(required)` labels. **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-123 — Browse lists use `BrowseListBox`; errors via `ErrorState` / "Couldn't load X". **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-124 — Never stack inline `translateX` with a Tailwind `-translate-x-*` (v4 emits the `translate` property, so both apply and the offsets ADD — one mechanism per axis). **Enforced by:** `just check-rm`.

### RM-125 — Loading/pending states must not change layout (skeletons not centered spinners; constant-width pending buttons). **Promoted to** AGENTS §Canonical Components; **enforced by** `just check-rm`.

### RM-126 — Server field errors + HeroUI native form validation deadlock resubmits
`setError` sets a native `customError`, and HeroUI's default `validationBehavior` then
blocks submit before react-hook-form can clear it — the form dead-ends until the field is
touched. Any form surfacing server errors via `setError` needs
`validationBehavior="aria"` plus `form.clearErrors()` before `handleSubmit`.
**Enforced by:** convention; graduate to `check-rm` if it recurs.

### RM-127 — `bg-foreground`/`text-background` inverts with the theme; the stable always-dark pair is `bg-accent` + `text-accent-foreground`. **Enforced by:** `just check-rm`.

### RM-128 — Status colors (`text-danger` etc.) fail AA on body copy — icons/borders/large numerals only; sentences and chip text use `text-<status>-soft-foreground`. **Enforced by:** `just check-rm`.

### RM-129 — Every screen body is `<Page.Content bare>` + `<Page.Frame size=...>` — a non-`bare` Content applies the gutter itself, so nesting a Frame doubles it and omitting one unbounds the width. **Enforced by:** `just check-rm`.

### RM-130 — Backend decimal fields arrive as JSON strings; coerce with `Number()` before math
Elixir serializes `Decimal` columns as strings, but the generated types say `number` — the
type lies, so `.toFixed()` crashes and `<`/`>` compare lexicographically with no TS
warning. Coerce once at first numeric use (prefer the api/domain helper layer), with a
comment naming the string serialization. **Enforced by:** review — no reliable grep
exists; treat every decimal-ish API field as suspect until coerced.

### RM-131 — Screen builds are committed the moment they render, on their own branch
Two client-detail builds were browser-verified and then lost to branch switches because
the tree was never committed. WIP-commit as soon as it compiles and renders — before
verification loops, review passes, or anything that switches branches.

### RM-132 — The `--type-*` / `--radius-*` scale is a closed vocabulary
A per-screen `@theme` token is a px literal wearing a name (nine ports grew the theme
81 → 164 tokens). Snap to the nearest existing step or STOP and propose one — adding a
step is a user decision in its own commit. **Enforced by:** `scripts/check-ui-contract.sh`
theme freeze (`UI_CONTRACT_SKIP_THEME=1` for deliberate changes); `style-diff.mjs` snaps
design values onto the scale.

### RM-133 — After writing a theme rule for a vendor class, verify the EFFECT, not the edit
A wrong vendor class name fails silently (HeroUI is BEM-ish: you want `block__element`,
not the hyphenated guess). Confirm the selector matches a live node and produces the
intended computed value. **Enforced by:** `scripts/check-theme-selectors.sh` in
`just lint` — every class selector in `index.css` must exist in the installed
`@heroui/styles`.

### RM-134 — Size tokens live in `--type-*`, never `text-*`; `text-*` means colour, only
tailwind-merge (inside every HeroUI component) groups any custom `text-<size>` with
colours and silently drops one of the pair. The `type-*` namespace has no merge group, so
the collision is impossible by construction. **Enforced by:**
`scripts/check-ui-contract.sh` rejects the old `text-<size>` utilities.

### RM-135 — Renaming a custom property means grepping `var(--old-name)` too
A dangling `var()` invalidates the whole declaration at computed-value time — the property
silently inherits, looking exactly like "the rule is not applying". Read the computed
value off a real node after a rename. **Enforced by:** `scripts/check-theme-selectors.sh`
fails any `var(--x)` in `index.css` that nothing defines.

### RM-136 — A recurring look is a component variant, not a class string to re-type
Five hand-assembled copies of the ink-selected pill drifted on three axes. Define the look
once as a variant following HeroUI's own convention — a BEM modifier class that sets the
block's custom properties (like `.toggle-button--ghost`), never on the base class. Use
`.toggle-button--ink` / `.toggle-button--filter`. **Enforced by:** `just check-rm` rejects
the re-assembly signature; `check-theme-selectors.sh` verifies the modifier's block exists.

### RM-137 — Colour is a `text-*` token; there is no case for an arbitrary `color:` property
Literals bypass the theme, and token-wrapped ones were scar tissue from the pre-RM-134
merge collision — worse, tailwind-merge can't classify them, making the base string
unoverridable. **Enforced by:** `just check-rm` (whole app). Prose quoting the banned form
trips the check — reword comments.

### RM-138 — A responsive pair with the same token on both sides is a missing step, not a style
Nobody writes `sm:x` to mean "stay the same": it's either a step never filled in (fix) or
a leftover (delete). Check what the base actually computes before deleting — under RM-134
the base could be silently eaten, making the `sm:` load-bearing. **Enforced by:**
`just check-rm` (multiline `-U`, since the halves usually sit in separate string literals
inside one `cn()`).

### RM-139 — An UNLAYERED theme rule can only be released by its own `:not()`, not by a layered class
`.button--row` (the sanctioned release from the control-height tier) lived in `@layer
components` while the control-height rule was unlayered — unlayered beats every layer, so
the release was a silent no-op and the DB glance bar, CD's photo tiles and CD's pressable
detail rows were all being crushed to 36px with the class dutifully applied. A release must
be expressed as an exclusion **in the rule it releases from**
(`.button:not(.button--sm):not(.button--lg):not(.button--row)`). **Verify by:** toggling
the modifier on a live node and reading `getComputedStyle` — a class that changes nothing
is the whole failure mode (RM-133's rule applied to app-owned classes, not just vendor ones).

### RM-140 — Two text children of a flex control need a non-breaking space, not JSX whitespace
Controls are `display:flex` with `gap:0`, and JSX collapses whitespace between children —
so a label plus a count renders `Upper A3` / `Active6` with nothing between them. It has
been written twice: `FilterCount` in `@components/browse-screen.tsx` hit it and fixed it;
TB's workout tabs shipped jammed against the ref until the 2026-07-26 sweep. Any pill, tab
or chip that renders a label and a second span puts a non-breaking space between them (or
an explicit `gap-*` on the control).

**Write it as the escape — `{'\u00a0'}` — not as a pasted U+00A0.** Both compile to the
same character, but a raw NBSP is invisible in the source: a reader cannot tell it from an
ordinary space, and a well-meaning reformat silently deletes it.
`training-plans/builder/components/workout-tabs.tsx` is the reference. **Verify by:**
reading `textContent` off the live node — `"Upper A 3"`, not `"Upper A3"`. **Not gated:**
the shape is a JSX child list, not a class string, so there is no reliable grep for the
MISSING case; this one stays prose until a lint rule can see it.

### RM-144 — Every shared concept has an owning feature; never a neutral bucket
A `domain/`/`utils/` layer-folder is a junk drawer: the name carries no meaning, nobody
owns it, and it erases the dependency information that matters (history depends on
workout; nutrition-plans depends on recipes). When 2+ features need a concept, the
OWNING feature publishes it (`{feature}/lib/*` in coachapp, feature-root files in
clientapp) and consumers import across — that arrow mirrors the product. Internals
(`components/`, screens, form files) are never imported across features; shared UI goes
to `@components/`, shared hooks to `@hooks/`, product-agnostic helpers to `@easy/utils`.
Instance: a `src/domain/` bucket existed in coachapp and got dutifully replicated into
clientapp before being recognized as the anti-pattern. **Enforced by:** `just check-rm`
(bans `@/domain/` and cross-feature internals imports).

### RM-143 — A list-shaped query key must nest under its domain's `lists()` prefix
React Query invalidates by key prefix, so nesting is what lets existing
`invalidateQueries({queryKey: fooKeys.lists()})` calls cover a new list for free. A
SIBLING key is invisible to all of them: `clientKeys.attention()` was
`['clients','attention']`, so invite/update/assign/enroll/reassign all refreshed the
client lists while the Needs-attention tab and its count served stale rows for the whole
staleTime. When adding a key to `keys.ts`, ask "which existing invalidations must reach
this?" and place it under that prefix — don't mint a new root. **Enforced by:** review of
`keys.ts` diffs; the factory doc comment states the rule.

### RM-142 — A colour utility needs a `--color-*` alias, not just the var
Declaring `--success-secondary: #127c4e` does NOT make `text-success-secondary`
work. Tailwind generates the utility from the `--color-*` alias, and HeroUI ships
that alias for most of its vars but not all. clientapp declared the var, used the
utility in 12 places, and rendered inherited near-black in all 12 — chat "Online",
completed-set ticks, weight deltas, the membership badge, the workout finish
banner. coachapp had the same shape on `bg-field-background`. It fails silently and
does not *look* broken: dead colour reads as "that text is dark", not as a bug.
Fix is one line in the app's `@theme inline`: `--color-x: var(--x);`. **Gated:**
`scripts/check-color-utilities.sh` (in `just lint`) flags any token the app
declares that is used as a utility and has no alias. **Verify by:**
`getComputedStyle` on a probe element, never by eye.

### RM-141 — The overlay gutter is one theme rule, not a per-surface choice
Every overlay surface (keyboard sheet, popover, picker bands) keeps content 16px from the
edge, but the two vendor dialogs shipped `p-6` and call sites were re-deciding the gutter
per surface (24px confirm dialogs beside 16px pickers; one modal hand-set `px-6` bands
that broke `SearchPickerBody`'s sticky-header `-mx-4` bleed). The gutter is pinned once
in `index.css` (`.alert-dialog__dialog, .modal__dialog { padding: 16px }`). A call site
may RELEASE it (`p-0`) to build band anatomy — title row · body · dock — never restate or
widen it. Same rule for overlay list rows: the inset lives on the shared row wrapper
(`SearchPickerBody`'s row button) or the vendor `ListBox.Item` default — renderItem
content and `ListBox.Item` classNames don't re-add insets. **Gated:**
`scripts/check-rm.sh` fails any `AlertDialog.Dialog`/`Modal.Dialog` className with a
non-zero padding. **Verify by:** `getComputedStyle` padding on a live dialog = 16px.

### RM-142 — A useMutation RESULT is a new object every render; never key a stateful memo on it
TanStack's `useMutation` returns a fresh result object each render (only
`mutate`/`mutateAsync` are stable). Putting that object in the deps of a `useMemo`
that creates a STATEFUL value — a coalescing queue, a debouncer, anything holding
timers or in-flight state — rebuilds the value every render. Both plan-builder
writers hit this: `write()` patches the cache → re-render → new queue, and the
unmount-flush `useEffect` fired the OLD queue's pending timer, so every keystroke
sent a request and two could be in flight per item (out-of-order last-write-wins
against the server). It passed tsc, biome AND a single-edit browser smoke — one
change event can't distinguish "debounced" from "sent immediately". Fix: the queue's
deps are only planId-stable callbacks; the send function is read through a ref
(`sendRef.current = mutation.mutateAsync`). Not mechanically gated: mutation objects
in `useCallback` deps are ubiquitous and merely re-create the callback, so a grep
can't separate the harmful stateful-memo case from noise. **Verify by:** typing
several characters into the debounced field and counting the network requests —
exactly one after the debounce window.

---

## Deploy / ops

### RM-201 — Deployable frontends need documented + guarded build-time env
Vite inlines `VITE_API_BASE_URL` at build time; unset on a deployed origin silently hits
`localhost:4000`. Each Vite app ships `.env.example`, and `api/client.ts` `console.error`s
on a non-local origin with the var unset. Keep both when adding a deployable FE.

### RM-202 — A verification command that can no-op is not verification
`clientapp-v2`'s build script ran bare `tsc --noEmit`, but its root `tsconfig.json` is a
solution file (`"files": []`, only `references`). Bare `tsc` on a solution config compiles
nothing and exits 0, so `pnpm build` "typechecked" the app for months while 183 type errors
accumulated — including dead code (`workout.notes`, a field the API never returns) that
looked live. A typecheck must name the project that holds the sources:
`tsc --noEmit -p tsconfig.app.json` (coachapp always did). **Verify by:** breaking a type on
purpose and confirming the command fails. Applies to any "check" command — if you can't make
it fail, it isn't checking.

---

## Docs

### RM-301 — Retiring an architecture-level artifact means grepping the docs for it
When a framework, contract file, or command is replaced, `grep -rn --include='*.md'
<old-name> .` and fix every hit in the same change — stale docs describing the old thing
as current is how agents resurrect dead decisions.

---

_Add new entries above their section's divider. Keep each to: the rule, the instance, and
how it's enforced. Apply the lifecycle: graduate to `scripts/check-rm.sh`, promote to the
owning `AGENTS.md`, retire when the subject dies._
