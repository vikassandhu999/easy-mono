# Recurring mistakes — agent anti-patterns

A running ledger of violations we've actually hit, each written as a **rule** so no
future agent run repeats it. This is prevention, not bug-tracking: when you discover a
violation, the job isn't done when the instance is fixed — add (or update) the rule here.

**How to use**
- Before finishing, read only the section that matches the files you touched
  (`## Backend`, `## Frontend`, `## Deploy / ops`, `## Docs`). Do not read the
  other sections. Do not load this file at session start. Use the index to jump
  to a single id.
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

**Index** — id, title, section, enforcement (`check-rm` / `test` / `review`, or the named gate). Duplicate ids are two distinct rules; jump to the heading that matches the title.

| Id | Title | Section | Enforced |
| --- | --- | --- | --- |
| RM-001 | `order_by` must be a total order | Backend | review |
| RM-002 | OpenApiSpex schema ↔ JSON view parity | Backend | test |
| RM-003 | Function nesting ≤ 2 | Backend | credo |
| RM-004 | OpenAPI spec cache is off in `:dev` | Backend | config |
| RM-005 | Write responses tested at value level | Backend | test |
| RM-006 | OpenApiSpex enums and examples mirror domain enums | Backend | review |
| RM-007 | Nested request schemas need map output | Backend | test |
| RM-008 | CastAndValidate controllers read `conn.body_params` | Backend | test |
| RM-009 | Route renames verified from generated OpenAPI | Backend | review |
| RM-010 | Public context functions are Ctx-first | Backend | review |
| RM-011 | Payment flows branch on local payment state | Backend | test |
| RM-012 | Access-control sweeps are route-driven | Backend | review |
| RM-013 | Authorization helpers written fail-closed | Backend | review |
| RM-014 | Tenant-owned child rows carry `business_id` | Backend | test |
| RM-015 | Drop incompatible checks before data remaps | Backend | review |
| RM-016 | Tests must not hard-code calendar dates vs today | Backend | review |
| RM-017 | ILIKE search terms must escape `%`/`_` | Backend | review |
| RM-018 | Dropping uniqueness is an API change for readers | Backend | review |
| RM-019 | `ON DELETE SET NULL` + CHECK over same columns | Backend | review |
| RM-020 | Required-on-create FK required on update and delete | Backend | review |
| RM-021 | Existence guards are tenant-scoped queries | Backend | review |
| RM-022 | `max(position) + 1` needs a parent-row lock | Backend | test |
| RM-023 | A process timer is not a cluster-wide singleton | Backend | test |
| RM-024 | One SQL statement can hide one aggregate per row | Backend | test |
| RM-025 | Real-connection tests must not use insert-side-effect factories | Backend | check-rm |
| RM-026 | Async delivery tests must wait for the mailbox | Backend | test |
| RM-027 | `Operation.parameter/5` schema is the third argument | Backend | test |
| RM-028 | Page enrichment queries by the page keys directly | Backend | test |
| RM-101 | No dead HeroUI v2 Tailwind tokens | Frontend | check-rm |
| RM-102 | Use ROUTES + `generatePath`, never a path string | Frontend | check-rm |
| RM-103 | No orphan routes / no dead screens | Frontend | review |
| RM-104 | Stable React keys for editable lists | Frontend | biome |
| RM-105 | Run biome + tsc before finishing FE work | Frontend | biome |
| RM-106 | Never `as unknown` to read absent contract fields | Frontend | review |
| RM-107 | Field-driving logic has one shared source of truth | Frontend | review |
| RM-108 | Do not optimistically send values the server rejects | Frontend | review |
| RM-109 | No literal brand colors in UI | Frontend | check-rm |
| RM-110 | Verify HeroUI semantics before "fixing" them | Frontend | review |
| RM-111 | Spec audits quote exact spec text | Frontend | review |
| RM-112 | Pickers use the responsive overlay pattern | Frontend | promoted |
| RM-113 | Standard coachapp page alignment | Frontend | promoted |
| RM-114 | Do not let legacy components drive builder architecture | Frontend | review |
| RM-115 | Headers/form actions follow the exercise screen | Frontend | promoted |
| RM-116 | HeroUI v3 primitives over raw HTML controls | Frontend | promoted |
| RM-117 | Detail surface, not permanent edit forms | Frontend | promoted |
| RM-118 | Mutations invalidate every visible list/detail | Frontend | review |
| RM-119 | No blind visual redesigns without live verification | Frontend | review |
| RM-120 | Shared form wrappers must not mount uncontrolled | Frontend | review |
| RM-121 | No react-aria `NumberField` for numeric entry | Frontend | check-rm |
| RM-122 | Forms from shared primitives; no optional/required labels | Frontend | check-rm |
| RM-123 | Browse lists use `BrowseListBox` | Frontend | check-rm |
| RM-124 | Do not stack inline `translateX` with Tailwind translate | Frontend | check-rm |
| RM-125 | Loading/pending states must not change layout | Frontend | check-rm |
| RM-126 | Server field errors + HeroUI validation deadlock | Frontend | review |
| RM-127 | `bg-foreground`/`text-background` invert with theme | Frontend | check-rm |
| RM-128 | Status colors fail AA on body copy | Frontend | check-rm |
| RM-129 | Screen body is `Page.Content bare` + `Page.Frame` | Frontend | check-rm |
| RM-130 | Backend decimals arrive as JSON strings | Frontend | review |
| RM-131 | Screen builds committed when they render, own branch | Frontend | review |
| RM-132 | `--type-*` / `--radius-*` scale is a closed vocabulary | Frontend | check-ui-contract |
| RM-133 | Theme rules for vendor classes: verify the effect | Frontend | check-theme-selectors |
| RM-134 | Size tokens live in `--type-*`; `text-*` is colour | Frontend | check-ui-contract |
| RM-135 | Renaming a custom property means grepping `var(--old)` | Frontend | check-theme-selectors |
| RM-136 | A recurring look is a component variant | Frontend | check-rm |
| RM-137 | Colour is a `text-*` token, never `color:` | Frontend | check-rm |
| RM-138 | Same token on both sides of a responsive pair | Frontend | check-rm |
| RM-139 | Unlayered theme rule released only by its own `:not()` | Frontend | review |
| RM-140 | Visual spacing does not separate a flex accessible name | Frontend | review |
| RM-141 | Overlay gutter is one theme rule | Frontend | check-rm |
| RM-142 | Colour utility needs a `--color-*` alias | Frontend | check-color-utilities |
| RM-142 | `useMutation` result is a new object every render | Frontend | review |
| RM-143 | List-shaped query keys nest under `lists()` | Frontend | review |
| RM-144 | Three kinds of directory, and the arrows point one way | Frontend | check-rm |
| RM-145 | Neutralise HeroUI press scale with `transform-none` | Frontend | review |
| RM-146 | Committed overlay action visible in both shells | Frontend | review |
| RM-147 | Action verb lands at the workflow it promises | Frontend | review |
| RM-148 | Composite progress inside a button needs an action name | Frontend | review |
| RM-149 | Search matches the composite label the list displays | Frontend | test |
| RM-150 | Load-more sentinel needs `hasNextPage`-guarded fetch | Frontend | review |
| RM-150 | Alternative-field validation clears when either is valid | Frontend | review |
| RM-151 | Lifecycle gates cover every dependent surface | Frontend | review |
| RM-152 | Management surface exposes API lifecycle actions | Frontend | review |
| RM-153 | Action eligibility mirrors endpoint preconditions | Frontend | review |
| RM-154 | Async media must not define a navigation control's name | Frontend | review |
| RM-155 | Shared page-title component carries heading semantics | Frontend | review |
| RM-156 | Edit form must not offer fields its read contract overrides | Frontend | review |
| RM-157 | Infinite-scroll sentinels must not compete with terminal states | Frontend | review |
| RM-158 | Recoverable query error owns a Retry outcome | Frontend | review |
| RM-159 | Query failure is not an empty collection | Frontend | review |
| RM-160 | Custom form controls render their field errors | Frontend | test |
| RM-161 | Feature pickers use the canonical button primitive | Frontend | check-ui-contract |
| RM-162 | Form schemas mirror request-string normalization | Frontend | test |
| RM-163 | Collect user-owned mutation prerequisites first | Frontend | review |
| RM-164 | Composite controls name trigger and overlay | Frontend | review |
| RM-165 | Update mappers distinguish omitted fields from clears | Frontend | test |
| RM-166 | Provenance controls mutation affordances by allowlist | Frontend | test |
| RM-167 | Loaded edit forms use defaults, not live overwrite | Frontend | test |
| RM-168 | Controlled fields use an explicit empty value | Frontend | test |
| RM-169 | Copies receive a distinguishable, bounded name | Frontend | test |
| RM-170 | Resolved weight must not erase the selected amount | Frontend | test |
| RM-171 | Buffered numeric editors commit the final draft | Frontend | test |
| RM-172 | Bulk clones preserve source collection order | Frontend | test |
| RM-173 | Incremental multi-field editors have valid intermediate states | Frontend | test |
| RM-174 | Theme skin for a vendor surface covers the family | Frontend | review |
| RM-175 | A copied class string freezes | Frontend | check-rm |
| RM-176 | One object, one component | Frontend | review |
| RM-177 | Empty-state sentence must not assert what it can't know | Frontend | review |
| RM-178 | A row with its own controls is a grid row | Frontend | review |
| RM-179 | A pane inside `Page.Content` must not stretch to the viewport | Frontend | review |
| RM-180 | `scale-100!` cannot cancel vendor `transform: scale` | Frontend | check-rm |
| RM-181 | Responsively-hidden button label still needs `aria-label` | Frontend | check-rm |
| RM-182 | Submit far from validation scrolls the message into view | Frontend | review |
| RM-183 | Keyboard sheet needs offset-aware visual-viewport geometry | Frontend | test |
| RM-184 | Overlay locks are reference counted and exit-lived | Frontend | test |
| RM-185 | Apply eligibility before forming a limited page | Frontend | review |
| RM-186 | Open-ended date windows need explicit NULL in queries | Frontend | test |
| RM-201 | Deployable frontends need guarded build-time env | Deploy / ops | review |
| RM-202 | A verification command that can no-op is not verification | Deploy / ops | review |
| RM-203 | Height-released row in a capped scroll column needs `shrink-0` | Deploy / ops | review |
| RM-204 | Date-only "today" from the browser must hold on both clocks | Deploy / ops | review |
| RM-205 | A picker collection is a ListBox | Deploy / ops | check-rm |
| RM-206 | Overlay motion belongs to the theme | Deploy / ops | check-rm |
| RM-207 | Create/edit form body chrome belongs to `FormPanel` | Deploy / ops | check-rm |
| RM-208 | Collection rows receive external state that changes rendering | Frontend | review |
| RM-209 | Locked queue interaction keeps queue-specific anatomy | Frontend | check-rm |
| RM-210 | Breaking vocabulary cutover includes internal route state | Frontend | check-rm |
| RM-211 | Refresh expiring access token before first socket handshake | Frontend | check-rm |
| RM-212 | Resolve grouped-list loading/errors before empty | Frontend | check-rm |
| RM-213 | Dependent pane does not render instructions without its item | Frontend | check-rm |
| RM-214 | Presentation predicates move with a domain cutover | Frontend | check-rm |
| RM-215 | Multi-line toggle cards release control height | Frontend | check-rm |
| RM-216 | Special builder questions lock invariants; edits clear errors | Frontend | check-rm |
| RM-217 | Client form detail keeps stable loading geometry | Frontend | check-rm |
| RM-218 | Shared form completion copy follows assignment purpose | Frontend | check-rm |
| RM-219 | Mobile queue rows keep the actionable absolute fact visible | Frontend | check-rm |
| RM-220 | Queue identity text stays inside its grid track | Frontend | check-rm |
| RM-221 | Filter-then-assert: parse while filtering instead | Frontend | review |
| RM-222 | A UI key is narrowed into its vocabulary, never cast | Frontend | review |
| RM-301 | Retiring an architecture artifact means grepping the docs | Docs | review |
| RM-302 | Never vendor a plugin skill into `.claude/skills/` | Docs | check-rm |
| RM-303 | The `superpowers` plugin is retired | Docs | check-rm |

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

### RM-002 — OpenApiSpex schema ↔ JSON view parity
Schema generates the FE types; the view produces the response; they drift when edited
separately. Change both in the same edit, then `just gen-api`. **Enforced by:** each JSON
view's controller test asserts the rendered entity with
`OpenApiSpex.TestAssertions.assert_schema/3` — add one when touching a view that lacks it.

### RM-003 — Keep function nesting ≤ 2. **Enforced by:** `mix credo` (in `mix precommit`).

### RM-004 — OpenApiSpex spec cache is off in `:dev`
`config/dev.exs` sets `config :open_api_spex, :cache_adapter, OpenApiSpex.Plug.NoneCache`, so a schema or controller reload applies on the next request. Prod and test keep the default `PersistentTermCache`. A 422 "Unexpected field" after a schema edit in dev is a real mismatch, not a stale cache.

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
Take `%Easy.Ctx{} = ctx` first (see `Easy.Training.Library`), never threaded
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
needs: Diary rows retain scalar source identities and frozen names and nutrients,
with no duplicate Library foreign keys. Reads hide unavailable Library links.
Recipe Ingredient food references remain restrictive. Menu documents protect Library references with row
locks and tenant-scoped usage checks that return `{:error, :in_use}`. Review question: "for every nilify-on-delete FK, is there a CHECK
or NOT NULL over that column — and is exactly-one a write rule or a lifetime invariant?"

### RM-018 — Dropping a uniqueness guarantee is an API change for every reader of that column
Relaxing a constraint is never local. Before dropping a unique index, grep the column and
every column copied from it across the whole repo — other code may be using it as an
identity key. `20260728100000` dropped the unique `(meal, position)` index on menu items for the
builder ("no position uniqueness anywhere"), but logging reconciliation keyed its
already-logged skip-list on `planned_item_index`, a copy of that position — so two items
sharing a position made "log meal" skip one silently, losing a client's food log. Fix was
to key reconciliation on `meal_item_id`. Review question: "who treats this column as an
identifier, not a value?" Mutable display order and stable identity must never be the same
column.

### RM-021 — Existence guards are tenant-scoped queries too
`Repo.exists?` / `Repo.aggregate` guards ("is this row still referenced?") must carry
`business_id` like any other tenant-owned read. The food, recipe, and exercise delete guards (over menu items, recipe
ingredients, and workout exercises) shipped unscoped: another tenant's row could veto your delete, the check was a cross-tenant
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

### RM-023 — A process timer is not a cluster-wide singleton
Every Fly machine starts its own GenServer, and rolling deploys overlap machines, so a
`Process.send_after` sweeper can run twice even when the steady-state machine count is one.
Guard the automatic tick with a named database lock; keep external I/O outside a database
transaction. **Enforced by:** `test/easy/sweeper_lock_test.exs` proves only one database
connection can enter a named sweep and that the lock is reusable after release.

### RM-024 — One SQL statement can still hide one aggregate per result row
A correlated count in a paginated parent query executes once per returned parent. The coach
inbox ran its unread subplan 20 times for a 20-row page. Load the bounded page first, then
attach child aggregates with one tenant-scoped `GROUP BY` query over those parent IDs.
**Enforced by:** `test/easy/chat_test.exs` requires one grouped unread query and covers both
a null read cursor and an advanced cursor across page boundaries.

### RM-025 — Real-connection tests must not use factories with insert side effects
Concurrency tests that check out `sandbox: false` commit their fixtures. The nutrition
meal-log race test called `insert(:plan)`, `insert(:meal)`, and `insert(:meal_item)` with
overrides, but those factories create default businesses before ExMachina applies the
overrides; the untracked tenants survived cleanup and poisoned later test runs. Build
committed race fixtures with explicit changesets, and track every committed owner for
cleanup. Enforced by `scripts/check-rm.sh` (RM-025) for the known side-effectful nutrition
factories in concurrency tests. **Verify by:** run the race test, then run it and an unrelated
factory-heavy test again in a fresh BEAM; both runs must pass.

### RM-026 — Async delivery tests must wait for the mailbox message
`Swoosh.TestAssertions.assert_email_sent/1` uses `assert_received` with a zero-millisecond
mailbox check. It races any production path that intentionally calls
`Easy.MailerDelivery.deliver_async/2`: the reminder can be enqueued correctly while the
full suite fails before the supervised task runs. At async-delivery seams, use a bounded
`assert_receive {:email, email}, timeout` and then assert the email values directly.
**Enforced by:** the Intake-reminder regression test in
`test/easy/forms/required_services_test.exs` and review of new `deliver_async` tests.

### RM-027 — `Operation.parameter/5` takes its schema as the third argument
Passing `:string` as the third argument and a richer schema in `schema:` silently discards
the richer schema when OpenApiSpex calls `Parameter.put_schema/2`. The Programming filter
lost its enum and default this way even though the source appeared to declare both. Pass
the `%OpenApiSpex.Schema{}` as the third argument. **Enforced by:**
`test/easy_web/controllers/workbench_open_api_test.exs` asserts the resolved parameter enum
and default, and generated-client checks require the closed union.

### RM-028 — A bounded page enrichment must query by the page keys directly
The Replies message-count enrichment already had each selected conversation id and its
waiting timestamp, but joined `conversations` again to recover those facts. PostgreSQL
scanned all 1,800 representative conversations for a five-row page. Build the grouped
child query from the tenant id and captured page facts; do not rejoin an unbounded parent
relation for values already loaded. **Enforced by:**
`test/easy/workbench_query_plan_test.exs` rejects large sequential scans and per-client
query growth across every Workbench projection.

### RM-029 — Generators and drift checks must not start the application
Code generation is a compile-time operation. Starting the supervision tree from a generator
or drift check runs sweepers and external delivery workers against the developer database,
so a read-looking command can mutate data or send messages. Compile and
`Application.load/1` only; invoke OpenApiSpex with `--start-app=false`.
**Enforced by:** `scripts/check-rm.sh` rejects `app.start` in generator Mix tasks and requires
the no-start flag in `just gen-api`.

### RM-030 — Typed-route mechanics do not know application policy
The typed-route core parses, casts, checks, dumps, and emits wire types. Authentication
pipelines, required application plugs, and error response construction belong in the
application adapter supplied by `EasyWeb, :typed_controller`. Otherwise every new policy
change edits framework mechanics and makes the generator silently depend on Easy-specific
names. **Enforced by:** `scripts/check-rm.sh` rejects direct `Easy` application references
inside `backend/lib/easy_web/typed_route.ex` and `backend/lib/easy_web/typed_route/`.

### RM-031 — Multistage nutrition reads share a database snapshot
Enforced by `test/easy/nutrition/library_concurrency_test.exs`: menu reads, recipe
reads, and Diary freezes keep one committed version while Library edits proceed;
conflicting Diary saves roll back and can be retried. Joining an existing transaction
does not upgrade its isolation level.

---

## Frontend

### RM-145 — HeroUI's press scale is a `transform`; neutralise it with `transform-none`, not `scale-100`
The button recipe's pressed state is `transform: scale(0.97)` (`&:active, &[data-pressed="true"]`).
A `scale-100!` override targets the separate CSS `scale` property and is a silent no-op — the
row still shrinks (hit on the recipe ingredient row, 2026-08-04; first fix shipped wrong).
Use `active:transform-none! data-[pressed=true]:transform-none!` (plus `transition-none!` for
the ease). **Verify by:** setting `data-pressed="true"` on the element in the console —
computed `transform` must be `none` (a stock button reads `matrix(0.97…)`).

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
theme freeze (`UI_CONTRACT_SKIP_THEME=1` for deliberate changes).

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

### RM-140 — Visual spacing does not separate a flex control's accessible name
Controls are `display:flex` with `gap:0`, and JSX collapses whitespace between children —
so a label plus a count renders `Upper A3` / `Active6` with nothing between them. It has
been written twice: `FilterCount` in `@components/browse-screen.tsx` hit it and fixed it;
TB's workout tabs shipped jammed against the ref until the 2026-07-26 sweep. Any pill, tab
or chip that renders a label and a second span puts a non-breaking space between them (or
an explicit `gap-*` on the control). When visual spacing is already supplied by margins,
give the control an explicit spaced `aria-label`; TB's set rows looked separated but were
announced as `Set 1Working`.

**Write it as the escape — `{'\u00a0'}` — not as a pasted U+00A0.** Both compile to the
same character, but a raw NBSP is invisible in the source: a reader cannot tell it from an
ordinary space, and a well-meaning reformat silently deletes it.
`training-plans/builder/components/workout-tabs.tsx` is the reference. **Verify by:**
reading `textContent` off the live node — `"Upper A 3"`, not `"Upper A3"` — or reading the
accessible name when `aria-label` owns it. **Not gated:**
the shape is a JSX child list, not a class string, so there is no reliable grep for the
MISSING case; this one stays prose until a lint rule can see it.

### RM-146 — A committed overlay action must stay visible in both shells
Responsive overlays can swap a desktop popover for a mobile sheet, but the named completion
action is part of the interaction contract. TB's set editor specified `Done`; the shared
wrapper exposed only outside-click/Escape on desktop and a generic close icon on mobile.
Pass the action through the responsive wrapper so both shells show the same commitment.
**Verify by:** open the overlay at 375px and 1280px; its visible and accessible controls
must both include the contracted action label.

### RM-147 — An action verb must land at the workflow it promises, not the entity default
Dashboard `Renew`, `Assign`, and `Nudge` rows all reused one generic client-detail target,
so three distinct actions silently opened Overview. When row verbs differ, their targets
are item-specific: renewal opens the subscription edit surface, assignment opens the plan
assignment tab, and nudge opens the client conversation. **Verify by:** AXI-click every
verb on seeded `Test` rows and assert the destination URL and named destination control.
Not mechanically gated: the defect is a semantic mismatch between copy and destination.

### RM-148 — Composite progress inside a button needs an explicit action name
A nested `Meter` replaced the dashboard setup row's accessible name with only `33%`,
hiding both the purpose and destination from screen-reader users. A pressable composite
sets an explicit action-oriented `aria-label`; the inner meter keeps its own progress
label. **Verify by:** AXI snapshot before activating it — the button must announce the
action and next step, not only a percentage. Not mechanically gated: the accessible name
depends on the rendered compound-component tree.

### RM-150 — A load-more sentinel needs a `hasNextPage`-guarded `fetchNextPage`
React-aria's `ListBoxLoadMoreItem` fires `onLoadMore` for as long as the sentinel is
visible — on a list shorter than the viewport, that is every render. Fed a raw React Query
`fetchNextPage`, it hot-looped (~2 fetches per frame), and each call's default
`cancelRefetch` aborted in-flight invalidation refetches, so mutations (snooze, review)
never landed fresh data in the mounted list while counts around it updated. The guard
lives in ONE place, `useInfiniteItems`: call through it, never pass a query's
`fetchNextPage` to a sentinel directly. **Verify by:** on a one-page list, mutate a row
out of the queue and assert the row disappears without a reload; watch the network for
repeated identical list fetches. Found on the workbench Quiet queue, 2026-08-06 — latent
in every short infinite list before that.

### RM-149 — Search must match the composite label the list displays
A client row displays `First Last`, but the API searched the entire term against each
column separately, so copying the visible full name returned no result. When list identity
is composed from multiple fields, the shared query searches that same composed identity in
addition to alternate identifiers such as email and phone. **Verify by:** enter an impossible
control term, then the exact visible full name, and assert the result count changes from zero
to one. Mechanically gated by the schema-query regression test.

### RM-150 — Alternative-field validation must clear when either alternative becomes valid
The invite form correctly required email or phone, but attached the shared error to Email;
entering a phone left Email announced invalid until another submit. Cross-field validation
must clear stale errors as soon as the alternative field satisfies the rule. **Verify by:**
submit the form empty, enter only the alternate field, and assert the original field is no
longer invalid before resubmitting. Not mechanically gated: it depends on live form state.

### RM-151 — Lifecycle gates must cover every dependent surface, not only navigation
Pending clients correctly hid activity tabs but still rendered workout, meal, weight, and
last-active stats that cannot exist before invite acceptance. A lifecycle capability gate
must wrap every surface whose data depends on that capability. **Verify by:** open a freshly
invited `Test` client and assert activity stat labels and tabs are absent while invitation
management remains available. Not mechanically gated: this is rendered lifecycle behavior.

### RM-152 — A management surface must expose the lifecycle actions the API already owns
Pending client UI linked to “Manage invitation,” but no CoachApp code called the existing
resend or revoke endpoints, leaving invitations unmanageable and test data undeletable.
For every state-specific management surface, trace the backend lifecycle endpoints and expose
the applicable actions with outcome-driven cache invalidation. **Verify by:** resend a fresh
`Test` invite and observe its timestamp/link update, then revoke it and assert list and seat
counts return to their starting values. Not mechanically gated: endpoint reachability is an
end-to-end ownership check.

### RM-153 — Action eligibility must mirror endpoint preconditions
The resend endpoint requires an email, but a phone-only pending client was still offered
Resend and predictably received a 422. State-specific controls must be gated by the same
preconditions as their endpoint, with the valid alternative exposed instead. **Verify by:**
create phone-only and email invitations; the former offers WhatsApp/copy, the latter offers
Resend, and neither can invoke an inapplicable action. Not mechanically gated: the contract
spans response data, rendered controls, and endpoint validation.

### RM-154 — Async media must not define a navigation control's name
A Check-ins photo link inherited its accessible name from lazy thumbnails and an overflow
count, so before signed URLs resolved it was announced only as “+2.” A media-backed
navigation control sets a stable action label on the control itself; image alt text still
describes loaded media but never owns the destination name. **Verify by:** snapshot the
control before and after image resolution and assert both expose the same destination and
total count. Not mechanically gated: the failure depends on asynchronous rendered state.

### RM-155 — A shared page-title component must carry heading semantics
`Page.Title` styled a generic span, so client detail sub-screens and most browse/form
routes had no page-level heading despite displaying a visual title. The shared primitive
renders an `h1`; call sites supply only title content and never rebuild semantics locally.
**Verify by:** query every audited route for exactly one `h1` whose text matches the visual
page title. Not mechanically gated: some full-canvas routes intentionally own their title.

### RM-156 — An edit form must not offer fields its read contract overrides
Coach client reads intentionally use the linked User's name, but the edit form submitted
name changes only to the Client fallback row; Save returned 200 while the visible name
never changed. When read authority makes a field client-owned, the coach form renders it
read-only with ownership copy and omits it from the mutation. Pending invitation names
remain editable because no User owns them yet. **Verify by:** inspect the PATCH body and
round-trip the detail response, not the 200 status. Not mechanically gated: ownership is
split across lifecycle state and response projection.

### RM-157 — Infinite-scroll sentinels must not compete with terminal states
The shared browse list mounted its load-more sentinel even when the initial query had no
items and had failed. The sentinel immediately called `fetchNextPage`, changed the query
back to loading, and repeated the failed request, so the intended error and Retry controls
never rendered. Mount pagination only after at least one row exists and never while the
query is in its terminal error state. **Verify by:** force the first page to fail, assert
one request and visible Retry copy, then remove the failure and assert Retry restores the
real row count. Not mechanically gated: the loop depends on the observer and rendered
sentinel lifecycle.

### RM-158 — A recoverable query error must own a Retry outcome
The conversation lookup and message-history queries rendered shared `ErrorState` cards
without passing their available `refetch`, leaving a transient network failure as a dead
end. Every query-backed error surface passes its query's retry action unless the state is
intentionally terminal (for example, a submission already reviewed elsewhere). **Verify
by:** force one request to fail, assert Retry is present, remove the fault, activate Retry,
and assert the exact real record returns. Not mechanically gated: terminal and transient
states use the same visual primitive, so review must follow the query contract.

### RM-159 — Query failure is not an empty collection
The client plan picker treated a failed plan request as “No plan templates yet” because it
checked only loading and item count. Custom collection surfaces check query error before
empty data and expose Retry; empty copy is reserved for a successful zero-count response.
**Verify by:** fail the exact list request and assert error/Retry, then remove the fault and
assert Retry restores the known template count. Not mechanically gated: custom pickers do
not share one collection component, so the state ordering must be reviewed at each owner.

### RM-160 — Custom form controls must render their field errors
The client editor submitted an end date before its start date; the backend correctly
returned a field error, but the custom `DateInput` had no error prop, so the form appeared
to do nothing. Mirror cheap cross-field invariants in the form schema and make every custom
control render and announce its React Hook Form error. **Gated:** the client self-check
covers ordered, reversed, and open-ended date pairs. **Verify by:** submit a reversed pair,
assert the named end-date error appears without a PATCH, then restore the valid dates.

### RM-161 — Feature pickers use the canonical button primitive
The client plan picker built its close, row, and create actions from styled raw buttons,
bypassing the app's press, focus, pending, and disabled contracts. Every feature action
uses HeroUI `Button` with `onPress`; list semantics still come from `BrowseListBox` when
the canonical fetched-list wrapper fits. **Gated:** `scripts/check-ui-contract.sh` rejects
raw buttons and `onClick` in changed UI files. **Verify by:** keyboard-activate close, a
plan row, and create-new, and assert each reaches its exact state or route.

### RM-162 — Form schemas mirror request-string normalization and bounds
The exercise form accepted whitespace-only names and strings longer than the OpenAPI
request contract, so invalid input reached the network instead of producing an immediate
field error. Required names trim before validation, and every bounded request string uses
the same maximum in its owning form schema. **Gated:** the exercise schema self-check covers
whitespace, exact-boundary, over-boundary, and normalized-name cases. **Verify by:** submit
whitespace and overlong values, assert the named field error appears with zero mutation
requests, then save a padded valid name and assert the reopened detail shows it trimmed.

### RM-163 — Collect user-owned mutation prerequisites before calling the endpoint
The exercise Duplicate action invented `"(copy)"` and submitted immediately even though
the copy endpoint explicitly requires the coach to choose a name; a second duplicate then
collided predictably. When an operation contract assigns a required value to the user, route
through a validated form before mutating rather than guessing it. **Verify by:** activate
Duplicate, submit the naming form empty and assert zero copy requests, then enter a unique
Test-prefixed name and assert exactly one new detail/list record with that exact name.

### RM-164 — Composite controls name both their trigger and overlay
The shared multi-select relied on placeholder text when its visible label was optional,
and its popover dialog had no accessible title, so toolbar filters emitted React Aria
accessibility warnings and screen readers received unnamed controls. Every composite
control supplies an accessible name for its root, nested input, and overlay when a visible
label or heading is absent. **Verify by:** open each labelled and toolbar variant, assert
the settled accessibility tree names the trigger, search field, and dialog. Do not suppress
HeroUI's pre-render warning; its wrapper currently logs before the child heading registers.

### RM-165 — Update mappers distinguish omitted fields from explicit clears
The food edit mapper reused create-time omission rules, so clearing category, notes,
nutrition values, or the final serving size omitted those keys and silently preserved the
old server values. Create requests may omit absent optional values; update requests send
the API's explicit clear representation (`null` for nullable scalars and `[]` for owned
collections). **Gated:** the food form data self-check asserts every clearable scalar and
the empty serving-size collection. **Verify by:** save populated values, clear all of them,
then reopen the detail and edit routes and assert none return.

### RM-166 — Server-owned provenance controls mutation affordances by allowlist
Food edit/delete controls excluded `system` rows but still treated `imported` and unknown
provenance as mutable even though the API permits only coach-owned `custom` foods. When a
server field owns mutability, expose actions from an allowlist of editable states rather
than a denylist of one known read-only state, and apply the same predicate to direct edit
routes. **Gated:** the food form data self-check covers custom, system, and imported
sources. **Verify by:** assert custom detail exposes edit/delete, system and imported
details do not, and direct edit URLs for read-only sources return to detail without a
mutation form.

### RM-167 — Loaded edit forms use defaults unless live server overwrite is intentional
The food edit form passed fetched values through React Hook Form's reactive `values` option.
Clearing an optional number produced `undefined`, which the still-populated server values
immediately replaced, so the last digit could never stay deleted. A form that mounts only
after its record loads initializes with `defaultValues`; reserve reactive `values` for a
screen that deliberately overwrites user edits when external data changes. **Gated:** the
food form hook accepts only `defaultValues`, so TypeScript rejects the reactive misuse.
**Verify by:** populate an optional number, delete every digit, submit, then reopen and
assert the field is empty rather than restored.

### RM-168 — Controlled fields use an explicit empty value, then normalize at the schema boundary
The shared number field emitted `undefined` when cleared, but React Hook Form controlled
fields require `null` or an empty string and retained the previous default instead. The
field now emits `''`, and each owning Zod schema preprocesses that sentinel back to
`undefined` before request mapping; required-number schemas still reject it. **Gated:** the
number-field value self-check covers clear, zero, constraints, and required emptiness, and
all shared number-field callers use the normalizing schema wrapper. **Verify by:** clear a
populated optional number through the UI, submit, and assert the update request carries the
domain's explicit clear value and the reopened form stays empty.

### RM-169 — Copies receive a distinguishable, bounded name at the domain boundary
Recipe copy reused the source name exactly, producing indistinguishable list rows, and a
255-character source left no room for a suffix. Copy operations that do not ask the user
for a name generate the first available `Name (Copy N)` inside the tenant, stripping an
existing copy suffix and truncating the base to the request limit. **Gated:** the recipe
context test copies both an original and its copy and asserts distinct names while every
other scalar remains unchanged. **Verify by:** duplicate a Test-prefixed record twice,
assert three distinct list names and exact inherited content, then delete every Test row.

### RM-170 — A resolved weight must not erase the amount the coach selected
The nutrition builder converted a recipe serving to grams before creation but omitted the
entered serving amount and unit. Reopening the amount editor therefore showed `1 serving`
plus raw grams instead of the selected fraction. When a serving resolves to weight, persist
both representations; weight prices the item and amount/unit reconstruct the coach's input.
**Gated:** the nutrition amount-draft self-check asserts a half-serving recipe retains
`0.5 serving` alongside its resolved grams. **Verify by:** add a weighed recipe as a
fractional serving, reopen its amount editor, and assert the same fraction is selected.

### RM-171 — Buffered numeric editors commit the final draft, not a valid prefix
The training set editor wrote every parseable keystroke immediately, so typing an invalid
RPE of `11` queued `1` before the final draft became invalid and silently persisted that
prefix. Numeric editors buffer while typing, render invalid final text as an error, and
commit only a valid final draft on blur; strict parsers reject partial integers and decimals.
**Gated:** the training-set self-check covers boundary, partial, fractional, negative, and
garbage drafts. **Verify by:** type an invalid final RPE, leave the field, assert the inline
error and unchanged fresh API value, then enter a valid decimal and assert it round-trips.

### RM-172 — Bulk clones preserve the source collection's logical order
Training-plan copy generated new child IDs while giving every workout the same
second-precision timestamp. The total-order tie-break was stable per read but no longer
represented the source order, so a copied plan shuffled its workout tabs. A bulk clone of
an insertion-ordered collection assigns distinct timestamps in source enumeration order;
position-backed collections copy their positions instead. **Gated:** the training-plan
context test clones three ordered workouts, asserts exact name order and distinct ordering
timestamps, and still checks weekday inheritance. **Verify by:** copy a three-workout Test
plan and compare the source and copy tab sequences exactly.

### RM-173 — Incremental multi-field editors must have valid intermediate states
The assigned training-plan period editor saves Start and End independently, while the
changeset rejected either date unless both were present. Entering the first complete date
therefore failed and rolled the control back, even though assignment intentionally creates
a dateless plan and the API marks both dates nullable. A field-at-a-time editor either
permits every contract-valid partial state or buffers both fields and submits atomically;
cross-field ordering applies once both values exist. **Gated:** the training-plan context
test round-trips start-only, rejects a reversed pair, accepts a completed pair, and clears
one side. **Verify by:** assign a Test plan, enter Start then End separately, reopen and
assert both; attempt a reversed end and assert the stored pair is unchanged.

### RM-144 — Three kinds of directory, and the arrows point one way
A folder named for a layer (`domain/`, `utils/`, `components/`, `lib/`) is a junk drawer:
the name carries no meaning, nobody owns it, and it erases the dependency information
that matters. An app's `src/` holds exactly three kinds of directory — `api/` (the server
contract), `ui/` (feature-agnostic components and hooks), and one folder per route group,
nesting only when the child is itself a route group. Files are told apart by NAME.

**Arrows point one way: feature → ui → api.** `ui/` imports `api/` and `@easy/utils`,
never a feature. A feature imports `ui/`, `api/`, and other features' `.ts` files only —
its `.tsx` is private. `router.tsx` and `app-shell.tsx` are the composition root and are
exempt. Carrying the public surface on the file EXTENSION rather than on a folder is what
makes it testable: anything another feature can reach is pure `.ts`, and pure `.ts` gets a
sibling `.check.ts`.

A `.ts` must never share a basename with a `.tsx` — module resolution picks the `.ts` and
the component silently vanishes from the route that imported it.

Instances: a `src/domain/` bucket existed in coachapp and got dutifully replicated into
clientapp before being recognized as the anti-pattern. Its replacement — "a feature's
`lib/` is its public surface" — described the right arrow but left three ways to nest the
same thing, and coachapp grew to 50 directories for 325 files, six competing sub-idioms
inside `clients/` alone, and a `@components/` that imported three different features.
**Enforced by:** `scripts/check-frontend-shape.mjs` via `just check-rm` (bans bucket and
`@`-prefixed directories, `ui/`→feature imports, cross-feature `.tsx` imports, and
`.ts`/`.tsx` basename collisions).

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

### RM-174 — A theme skin for a vendor surface must cover the whole surface family
The theme's popover skin targeted `.popover`, but HeroUI's composite widgets (Dropdown,
Select, Autocomplete, DatePicker, ComboBox) float their own `<block>__popover` element
that never carries `.popover` — so every composite popover silently shipped the vendor
look (24px radius, no border, own shadow, no viewport max-width) while plain Popovers got
the design's card. Fixed by one selector list naming the family
(`.popover, .autocomplete__popover, …` in `index.css`). When skinning a vendor component
class, enumerate its BEM family from the live stylesheets
(`document.styleSheets` scan for `<block>__<element>` variants), not from the one class
the current screen happens to render. Not mechanically gated: `check-theme-selectors.sh`
verifies the listed selectors exist but cannot know a family member is missing — the
live-stylesheet census is the check. **Verify by:** open one popover of each kind
(menu, select, date picker, autocomplete filter) and read `border-radius` off the
computed style — all must equal `--radius-card`.

The same miss repeats with POSITIONAL rules, not just BEM elements: HeroUI rounds a
toggle group with three rules — `:first-child`, `:last-child`, and `:first-child:last-child`
for the lone-child case. The theme's escape covered only the first two, and the third is
(0,4,0) against the escape's (0,3,0), so a plan with ONE workout drew a 24px pill while the
same tab in a plan with two drew the control step — the radius changed with the number of
siblings. **Verify by:** render the group at one child AND at several; a single-count check
cannot see this. Prove the rule is yours by removing the variant class on a live node and
watching the vendor value return.

### RM-175 — A copied class string freezes; the component it came from keeps moving
Both plan builders rendered their page heading as a raw `<h1>` carrying a byte-identical
copy of `Page.Title`'s classes, with a comment justifying the copy (`.typography--h3` is
unlayered) that had stopped being true — `PageTitle` is a plain `<h1>` with utilities and
has no `Typography` in it. Meanwhile `Page.Title` grew the mobile step the copies never
got (`type-metric` + `sm:type-display`), so every plan title rendered at 27px on a 375px
screen and truncated ("Test N…", "TB fixt…"). The rule is not "don't duplicate" — it is
that a copy cannot receive later fixes, so the justification for one has to be re-checked,
not inherited. **Gated:** `check-rm.sh` RM-175 greps `font-grotesk…type-display` outside
`page.tsx`. **Verify by:** render a long title at 375 and confirm `scrollWidth ===
clientWidth` on the `<h1>`.

### RM-176 — One object, one component — a second copy drifts on axes nobody chose
The two plan builders each had their own `WeekdayChips`, and `@easy/utils` carried two
byte-identical weekday vocabularies (`WEEKDAYS`/`WEEKDAY_LABELS`/`WEEKDAY_SHORT_LABELS`
and `TRAINING_WEEKDAYS`/`TRAINING_DAY_LABELS`/`TRAINING_DAY_SHORT_LABELS`) which is what
let each builder reach for "its own" and never notice. The two chip copies had drifted on
five axes — radius (control vs chip), desktop size (30 vs 32), gap (4 vs 6), padding
(`p-0` vs `px-0`) and label ("M" vs "Mon") — and the label difference had a consequence:
seven 44px chips with 3-letter labels measure 344px against a 309px card, so training
pushed Sunday behind an unhinted horizontal scroll while nutrition cut the label to one
ambiguous letter (T/T, S/S). Both copies also carried `[row-gap:normal]
[column-gap:normal]` and `size-11 sm:size-7.5` to fight the theme. Fixed as one
`builder-kit/weekday-chips.tsx` over one `toggle-button--weekday` theme variant at
`--spacing-control`. **Verify by:** before adding a component to one builder, grep the
other for the same noun — and when a shared package holds two names for one concept,
collapse the data and keep both names as aliases so no importer has to change.

### RM-177 — An empty-state sentence must not assert what the component can't know
The nutrition builder's meal palette hardcoded `emptyLabel="Every meal is already on this
day."` for its reuse list. That list is empty for two different reasons, and the component
only receives the *filtered* result, so it cannot tell them apart — on a brand-new plan
with zero meals, the first screen a coach sees, it stated something false. Fixed by
passing `planMealCount` so the caller's knowledge reaches the sentence. **Verify by:**
exercise BOTH branches — an empty collection and a full-but-all-used one — and confirm the
copy differs; a single-case check cannot detect this class.

### RM-178 — A row with its own controls is a grid row, not a listbox option
Every workbench queue row carried a verb button (`Message` / `Assign plan` / `Review`) and
some carried a snooze menu, all inside a `ListBox.Item`. The markup was correct and the
buttons had `tabIndex=0`, and they were still **unreachable by keyboard**: a listbox option
is a single focusable unit, so react-aria gives the whole list one tab stop, moves between
rows with the arrows, and sends the next Tab out of the list entirely. Snooze had no
keyboard path at all. Fixed with a `grid` opt-in on `BrowseListBox` (react-aria `GridList`
+ `GridListItem` + `GridListLoadMoreItem`), where ArrowRight steps into a row's controls.
Grid rows own their press — list-level `onAction` does not apply, the row passes its own.
**Verify by:** driving real `Tab`/`Arrow` key presses and logging `document.activeElement`
at each stop. Programmatic `el.focus()` proves nothing here — react-aria tracks
focus-visible itself, so a scripted focus reports a ring that a keyboard user never gets.

### RM-180 — `scale-100!` cannot cancel a vendor `transform: scale(…)`
`LIST_ITEM_CLASS` carried `active:scale-100! data-[pressed=true]:scale-100!` to kill HeroUI's
row press effect, and the docstring above it stated "no press-scale animation". It never
worked: the vendor rule is `.list-box-item[data-pressed=true]{transform:scale(.98)}`, and
Tailwind v4 compiles `scale-*` to the **standalone `scale` property**. Two different
properties both apply and multiply — `!important` is irrelevant because they were never
competing. Every browse row in the app pressed to 98% under a class asserting it didn't.
`transform-none!` is the cancel that lands. Same family as RM-134: a utility that looks like
the fix and silently isn't. Enforced by `just check-rm` (RM-180). **Verify by:** set the
`data-pressed` attribute by hand and read `getComputedStyle(el).transform` — synthetic
events never trigger react-aria's press state, so clicking proves nothing. A valid probe
shows identity on the fixed element AND `matrix(0.98…)` on an unfixed control beside it.

### RM-179 — A pane inside `Page.Content` must not stretch to the viewport
The workbench put `min-h-0 flex-1` on its `Page.Frame` and card, which is exactly what
`page.tsx` documents as the thing not to do: `Page.Content` is deliberately `flex-1` with
NO `min-h-0` so short pages hug and long lists overflow the scroll container. With the
clamp back on, a drained queue rendered its empty state stranded at the top of a ~640px
empty card, and a two-row queue showed two rows over a void. **Verify by:** open the state
with the FEWEST rows (empty, and 1–2 rows) — a full list hides this class completely.

### RM-181 — A responsively-hidden button label still needs `aria-label`
The form builder's "Edit details" button wrapped its label in `<span className="hidden
sm:inline">` to go icon-only on mobile — and `display:none` removes the span from the
accessibility tree, so below `sm` the button had NO name (the a11y snapshot showed a bare
`button` between named siblings). Any button whose visible label can hide at some
breakpoint carries a constant `aria-label`. Gated in `scripts/check-rm.sh`. **Verify by:**
a11y snapshot at 375px — every button row must carry a name.

### RM-182 — A submit control far from its validation message scrolls it into view
The form builder's Save lives in the sticky header while its validation message renders at
the form's bottom; on a tall desktop form a failed save painted the error at y≈2000 in an
800px viewport — the click looked like a silent no-op. When the submit affordance and the
message can be more than a viewport apart, failed validation must `scrollIntoView` the
message (or render the message adjacent to the trigger). Not mechanically gated: the
distance is a runtime layout fact. **Verify by:** on the tallest reachable state, scroll to
the opposite end from the message, submit invalid, and assert the message's
`getBoundingClientRect()` lands inside the viewport.

### RM-183 — A keyboard sheet needs offset-aware visual-viewport geometry
A HeroUI Drawer replacement tracked visual viewport HEIGHT but kept an `85vh` dialog cap,
ignored `visualViewport.offsetTop`/`scroll`, and added drag dismissal. Keyboard-open sheets
could push their heading/search above the visible screen, and editor drafts gained a new
swipe-loss path. A keyboard sheet keeps its own bottom inset and maximum height: listen to
both viewport resize and scroll, position from `layoutHeight - viewportHeight - offsetTop`,
and cap height from `viewportHeight` itself. Compose vendor focus/dialog semantics under
that geometry; do not delegate the geometry or add dismiss gestures. **Enforced by:**
`src/builder-kit/keyboard-sheet.check.ts` geometry cases plus mobile overlay verification.

### RM-184 — Overlay locks for the app scroller are reference counted and exit-lived
`Page` scrolls `.easy_main-content`, not the document. One lock saving/restoring one inline
`overflow` value fails when overlays overlap: the first close unlocks under the second, and
the final close can restore stale `hidden`. Acquire by target with a count, restore only on
the final idempotent release, and keep the lock until the exiting overlay unmounts rather
than when `open` first becomes false. **Enforced by:** nested, reverse-release, independent-
target, and idempotent cases in `src/builder-kit/keyboard-sheet.check.ts`.

### RM-185 — Apply eligibility before forming a limited page
The Add-to-client picker requested 30 clients and removed inactive rows afterward, so four
inactive records consumed four of the promised eligible slots and the picker rendered only
26 clients while eligible clients existed on the next page. When an action excludes a state,
apply that eligibility at the endpoint or merge server-filtered pages before the final limit;
never filter a bounded mixed page afterward. **Enforced by:** review — the picker's
status-scoped queries merge through `eligibleClientPage` before the final slice; no
mechanical check remains (its check file was removed by decision 2026-08-09).

### RM-186 — Open-ended date windows need explicit NULL semantics in queries
Training assignment intentionally writes `end_date: nil`, but the in-force queries compared
`end_date >= today`; PostgreSQL treats that comparison as unknown, so active open-ended plans
vanished from the client picker and the client's current workout. When a nullable boundary
means unbounded, every singular and bulk query must say `is_nil(boundary) or …` explicitly —
changeset/API nullability alone does not give SQL that meaning. **Enforced by:** the training
plan-day and client plan-name tests use an active plan starting today with `end_date: nil` and
require it to be returned.

---

### RM-208 — React Aria collection rows must receive the external state that changes their rendering
A Replies prototype kept `selectedId` outside its `Collection` items. Selecting Theo changed
Theo's data and expanded it, but Maya's unchanged item was reused with its old expansion, so
both rows stayed open. When `renderItem` depends on selection, expansion, pending, or another
external row state, derive that state into every affected item (or use the collection's
controlled state) so both the previous and next rows invalidate. **Verify by:** select row A,
then row B; exactly one detail is rendered and it is a descendant of row B.

### RM-209 — A locked queue interaction keeps its queue-specific anatomy
Ticket 16 had correct queue data and actions but partially flattened three accepted interactions
into generic production chrome: Onboarding lost its two-column mobile identity/action layout,
Programming put its filter inside the list, centered an intrinsic-width row, and truncated required
mobile facts; Replies split one desktop task surface into two cards and then double-bordered it.
Share data and behavior helpers, but
do not replace a locked interaction's responsive structure with a generic row or card grammar,
and do not ship prototype narration that explains the design decision to the end user.
**Enforced by:** `scripts/check-rm.sh` pins the accepted Onboarding compact grid, Programming
toolbar/stretch/full-fact contract, one-owner Replies split surface, and absence of known prototype-only narration.
**Verify by:** compare populated states at 375px and 1280px against the locked variant, including
child `scrollWidth <= clientWidth` and a copy pass that leaves only user-facing facts/actions.

### RM-210 — A breaking vocabulary cutover includes internal route state
Removing an old API name while retaining it in a URL/query-state id leaves a live compatibility
alias and lets bookmarks, analytics, and UI logic keep teaching the retired vocabulary. When a
cutover names one canonical resource, update production route state and discriminated unions too;
locked prototypes and historical evidence stay unchanged. **Enforced by:** `just check-rm` rejects
the retired `new` workbench id from the production queue registry.

### RM-211 — Refresh an expiring access token before the first socket handshake
HTTP auth middleware and Phoenix sockets start independently after a reload. Connecting the socket
synchronously let it race the HTTP refresh with a stored five-minute token, producing a `403`
before the error callback refreshed storage and a later retry recovered. Giving HTTP and socket
separate refresh locks then produced duplicate refresh requests. Both apps create the socket
synchronously for channel callers, but HTTP and socket await the same shared refresh promise before
their request/first `connect()`; the socket error callback remains the recovery path for later
disconnects. **Enforced by:** `just check-rm` requires both owners to import one refresh module,
keeps the token endpoint in that module, and requires refresh before the first socket connect.
**Verify by:** force the stored expiry into the past, reload, and assert exactly one successful
token refresh, no console errors or failed first handshake, and an open socket.

### RM-212 — Resolve grouped-list loading and errors before classifying an empty result
Programming partitioned fetched rows into priority groups before rendering its canonical
`BrowseListBox`. While the request was loading, the empty group map painted a blank pane; when the
request failed, the same empty array selected the successful “Everyone's programmed” state and hid
the error and Retry action. A grouped or derived collection must pass loading/error through its
canonical list surface before branching on derived emptiness. **Enforced by:** `just check-rm`
pins Programming's pre-group loading/error gate. **Verify by:** delay the first queue response and
require list skeleton rows, then fail it and require “Couldn't load” plus a working Retry; the
successful empty message must appear only after a successful empty response.

### RM-213 — A dependent pane does not render instructions without its source item
Desktop Replies always rendered its selected-task pane, even with zero conversations. The queue's
truthful “Replies cleared” card then sat beside “Choose a reply,” an impossible instruction; the
same stale pane appeared beside loading and fetch-error states. A detail/task pane that depends on
a selected collection item renders only when that item exists, leaving the canonical collection
state to own the full surface otherwise. **Enforced by:** `just check-rm` pins the no-selection
guard in Replies. **Verify by:** exercise loading, error, and successful empty responses at desktop
width and require one state surface with no selection instruction; then populate one row and
require the locked split surface.

### RM-214 — Presentation predicates move with a coordinated domain cutover
The roster still derived “Needs plan” from both plan names being absent after Programming moved to
explicit `required_services`. Active clients with an empty set were therefore told they needed a
plan even though the domain classifies them as Unclassified and deliberately excludes them from
Programming. When a coordinated cutover replaces a predicate, audit presentation helpers and copy
as well as endpoint/query code; derive UI state from the canonical domain field. **Enforced by:**
`just check-rm` pins `isUnclassified` / `needsRequiredPlan` in `clients/lib/client.ts` and their
roster call sites. **Verify by:** render an active
client with `required_services: []` and require Unclassified at both widths, then render a
classified client missing a required service plan and require “Needs plan.”

### RM-215 — Multi-line toggle cards must release the theme's control height
The required-services selector used `ToggleButton` for correct multi-select semantics, but inherited
the theme's one-line control height while rendering a 40px icon plus a label and description. Both
Invite and Edit visibly clipped the description at mobile and desktop widths. A toggle styled as a
content card must use the theme's named row release; the fixed control tier only fits compact toggles.
**Enforced by:** `just check-rm` pins `toggle-button--row` at the shared field and in the theme's
control-height exclusion/release.
**Verify by:** render Training and Nutrition selected at 375px and desktop and require each card's
scroll height to equal its client height with both text lines fully visible.

### RM-216 — Special builder questions lock every invariant and edits clear stale errors
The Intake builder created `Service type` as required and non-duplicable, but still let coaches
rename it or change its answer type. It also left “Add at least one question” visible after the
question was added. A domain-special question locks every invariant its server meaning depends on,
and validation feedback is cleared when the relevant draft changes so the screen never contradicts
its current state. **Enforced by:** `just check-rm` pins `questionIdentityLocked` and the builder's
draft-commit error reset. **Verify by:** add Service type after an empty-save
error; require the error to disappear, Question and Answer type to be disabled, Required selected and
disabled, no Options editor, no Duplicate action, and no second palette item.

### RM-217 — Client form detail keeps stable loading geometry and a recovery action
The ClientApp Intake/check-in detail used a lone centered spinner during load and a bespoke failure
card with no Retry. The required-services completion route therefore jumped from almost-empty chrome
to a form and stranded transient request failures. Detail routes render a content-shaped skeleton and
the app's shared `ErrorState` wired to the query refetch. **Enforced by:** `just check-rm` pins Skeleton,
shared ErrorState, and Retry wiring in `fill-checkin.tsx`. **Verify by:** delay the assignment GET and
require form skeleton blocks, then fail it and require “Couldn't load” plus a Retry that recovers.

### RM-218 — Shared form completion copy follows the assignment purpose
The shared ClientApp completed state always said “Check-in submitted,” including on a page titled
Test Intake with an Intake assignment. Shared rendering must not flatten the domain vocabulary it
already receives; branch user-facing completion copy on `assignment.purpose`. **Enforced by:**
`just check-rm` pins `purposeLabel` on the completed heading. **Verify by:** complete one Intake and
one Check-in and require the matching noun while their common completed layout stays identical.

### RM-219 — Mobile queue rows keep the actionable absolute fact visible
The shared queue row truncated every subtitle at all widths. With Renew and Snooze controls present,
the 375px Expiring row collapsed “Engagement ending soon · Ends 20 Aug” to “Engagement ending s…”,
hiding the date that explains the action; Quiet's missed date had the same risk. Queue facts wrap on
mobile and return to truncation at the desktop breakpoint. **Enforced by:** `just check-rm` pins the
mobile-wrap/desktop-truncate class at the shared row. **Verify by:** populate Expiring and Quiet at
375px with both trailing controls present and require the complete reason plus absolute date.

### RM-220 — Queue identity text stays inside its grid track
The long `Test Workbench Client` name painted underneath Expiring's Renew and Quiet's Message control
groups at 375px even though its grid track used `minmax(0, 1fr)`. The text column must also clip its
own paint and the single-line label must own an explicit block-width truncation boundary. **Enforced
by:** `just check-rm` pins `overflow-hidden` on the text column and the block/max-width truncation
boundary on its label. **Verify by:** populate Expiring and Quiet with a long client name at 375px and
require an ellipsis before the action group with no overlapping pixels.

## Deploy / ops

### RM-221 — Filter-then-assert: parse WHILE filtering, don't assert afterwards
`xs.filter((x) => x.weight != null).map((x) => x.weight!)` type-checks only because of the
assertion — `filter` does not narrow the elements it keeps, so the shape the compiler sees
still carries the null. It hides real bugs: the recipe ingredient mapper ran every field
through `omitUndefined` and cast the required-`weight_g` shape back, so a weightless row
compiled into a request the server rejects with a generic 422. Use `flatMap` and return the
parsed row (or nothing):

```ts
const weighed = ingredients.flatMap((row) => {
  const weight = toPositiveNumber(row.weight_g);
  return weight == null ? [] : [{food: row.food, weight}];
});
```

The same shape covers `groups.filter((g) => g.date).sort(…)` and `sorted[0]!` after a
length check. For a genuinely non-empty list, type it `[T, ...T[]]` — a Map built by
insertion is already ordered and non-empty per key, so it needs no `groupOrder` array
beside it.

### RM-222 — A UI key is NARROWED into its vocabulary, never cast into it
A `?tab=` search param, a react-aria selection `Key`, and a `<select>`'s `event.target.value`
are all `string`. `raw as TabId` is a lie the moment the vocabulary changes or the URL is
hand-edited. Use `isOneOf` from `@easy/utils/closed-vocabulary` against the same array the
options render from:

```tsx
const TAB_IDS = TABS.map(({id}) => id);
const tab: TabId = isOneOf(TAB_IDS, params.get('tab')) ? params.get('tab') : 'overview';
```

Its sibling: a lookup table keyed on `string` (`Record<string, FieldKey[]>`) silently accepts
a member the backend added and falls through to the default. Key it on the generated union
(`Record<TrackingType, …>`) so the build breaks instead, and list the members as
`[…] as const satisfies readonly TrackingType[]` rather than `Object.keys(TABLE) as T[]`.

Import `isOneOf` from the SUBPATH (`@easy/utils/closed-vocabulary`), not the `@easy/utils`
barrel: the `.check.ts` runner is plain node and cannot resolve the barrel's extensionless
re-exports, so a barrel import breaks every check that transitively reaches the module.

### RM-201 — Deployable frontends need documented + guarded build-time env
Vite inlines `VITE_API_BASE_URL` at build time; unset on a deployed origin silently hits
`localhost:4000`. Each Vite app ships `.env.example`, and `api/client.ts` `console.error`s
on a non-local origin with the var unset. Keep both when adding a deployable FE.

### RM-203 — A height-released row inside a capped scroll column needs `shrink-0`
`.button--row` releases `min-height` to 0 (that is its job), and a flex child with
`min-height: 0` inside a `max-h-* overflow-y-auto` flex column SHRINKS to fit instead of
letting the column scroll. The add-to-client picker's 28 rows compressed to ~24px each and
their two-line content overlapped unreadably; the pre-fix rows only survived because the
control tier's 36px `min-height` was still flooring them by accident. Any content-sized row
in a height-capped scroll list gets `shrink-0`. **Verify by:** rendering more rows than the
cap fits and asserting a row's `offsetHeight` ≥ its content (or clicking a row Playwright
says is "intercepted" by its sibling — that interception IS the overlap).

### RM-204 — Plan coverage uses the client's calendar
Assignment defaults, coverage reads, lifecycle labels, and Programming queues must
use the client's local date, computed by the server with the business timezone
fallback. The coach browser and UTC can show different dates near midnight.
Do not choose the earlier of competing clocks; that hides disagreement instead of
fixing ownership. **Verify by:** exercising UTC+14 and UTC−10 clients at the same
instant, and checking assignment uses the returned `Client.local_date`.

### RM-205 — A picker collection is a ListBox, not a stack of row-shaped Buttons
The shared search picker, add-to-client picker, and plan-template picker each rendered
selectable entities by mapping `Button`s inside generic `div`s. That discarded collection
semantics, produced different row spacing, and let the same centered picker shell drift
between `sm` and `md` widths. `PickerModal` now owns one `md` desktop width; selectable
picker collections use `ListBox`/`ListBox.Item` (or `GridList` for rows with controls).
Picker searches use the same sticky top band so their field remains available while rows
scroll. Independent create actions and tile palettes remain Buttons. Enforced at the
shared seams by `scripts/check-rm.sh` (RM-205). **Verify by:** inspect every overlay
collection at 375px and desktop, scroll a long list without losing its search field, then
use Arrow keys to move between items without tabbing through each row.

### RM-206 — Overlay motion belongs to the theme, not individual dialogs
Modal, confirmation-dialog, and sheet motion had separate defaults: HeroUI owned the two
centered surfaces while `KeyboardSheet` carried transition classes and render-prop transforms
inside its component. That makes duration, easing, direction, and reduced-motion behavior
drift as soon as another overlay is added. `index.css` now owns one centered lift-and-settle
motion and one directional bottom-sheet slide; call sites supply no motion classes. Enforced
at the shared seams by `scripts/check-rm.sh` (RM-206). **Verify by:** inspect enter and exit
animations on a Modal, AlertDialog, and KeyboardSheet; with reduced motion enabled, all three
must retain only the brief opacity fade and report no spatial transform.

### RM-207 — Create/edit form body chrome belongs to `FormPanel`
Promoted to `frontend/apps/coachapp-v2/AGENTS.md`; enforced by `scripts/check-rm.sh` (RM-207).

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

### RM-303 — The `superpowers` plugin is retired; don't resurrect it
Enforced by `scripts/check-rm.sh` (RM-303): no `superpowers` reference outside
`.scratch/archive/`. Use the skill mapping in the root `AGENTS.md`.

### RM-302 — Never vendor a plugin skill into `.claude/skills/`
Four mattpocock skills (`codebase-design`, `diagnosing-bugs`, `prototype`, `handoff`) had been
copied into `.claude/skills/`. A local copy shadows the plugin, so the agent kept loading the
vendored version while upstream moved on — the stale `diagnosing-bugs` was missing the
secret-redaction section entirely. `.claude/skills/` is for skills this repo owns
(`design-pro`, `ui-quality-loop`, `first-principles-edit`, …). Enforced by `scripts/check-rm.sh`
(RM-302): fails if a directory there collides with a plugin skill name.

### RM-301 — Retiring an architecture-level artifact means grepping the docs for it
When a framework, contract file, or command is replaced, `grep -rn --include='*.md'
<old-name> .` and fix every hit in the same change — stale docs describing the old thing
as current is how agents resurrect dead decisions.

---

_Add new entries above their section's divider. Keep each to: the rule, the instance, and
how it's enforced. Apply the lifecycle: graduate to `scripts/check-rm.sh`, promote to the
owning `AGENTS.md`, retire when the subject dies._
