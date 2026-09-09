# Backend structural pass handoff — 2026-09-09

The current structural pass is closed. Start here when resuming; older entries
below are chronological evidence and may describe work that was later completed.
This is a bounded structural closeout, not a claim of whole-backend compliance.

Completed: clarified context ownership, removed pass-through interfaces, shared
repeated workflows and queries, split embedded schemas into individual modules,
tightened fixed-shape type contracts, and added architecture and domain regression
coverage. Updated dependency versions, replaced the separate Resend wrapper with
Swoosh's adapter, and verified the updated release runtime.

Final verification: full precommit session 20922 exited 0 with **1,617 tests,
zero failures**; compile, format, strict Credo and 155 typed-route checks passed.
The last addition tests signed failure/cancellation webhooks across all five
billing statuses, including repeated notifications with distinct event IDs,
unchanged states and exact event counts. Focused BillingTest: 15 passed.
The initial gate found one long test line, corrected before the passing gate.

Release build 95083 and smoke 59472 passed: migrations/seeds twice, readiness
204, health ok and clean SIGTERM. The subsequent change was test-only.
Runtime requirement is now Elixir ~> 1.19; the verified image uses Elixir 1.19.1
and OTP 28.1.1. Real provider delivery and deployed database upgrades remain
unverified. Changes have not been committed or deployed by this pass.

## Resume on another day

The user selected the next scope, then postponed execution to another day:
**specific failure/authorization cases, semantic type correctness, real-provider
delivery, and upgrades of an existing deployed database.** That follow-up has
not started. Do not ask the user to choose the scope again. All other follow-ups
in the table below are out of scope for that session.

Do not restart the broad audit or repeat completed dependency/release work
because of historical pending notes. The user will continue development in this
worktree meanwhile: inspect intervening changes and preserve them. The results
above establish the handoff baseline, not automatic verification of later edits.

### Exact stopping point and next actions

1. The last code change was the BillingTest failure/cancellation transition
   regression described above. Full precommit 20922 passed afterward. Subsequent
   work only updated this handoff and reconciled historical billing coverage.
   No test or build process from this pass remains running.
2. Resume with the named operation-map gaps, reconciling each against subsequent
   entries and current tests before adding work. Forms notes identify direct
   hidden-trainer denial for reminders/review and late submission-transaction
   rollback branches as candidates. Confirm which remain uncovered; do not
   recreate completed billing, library or identity regressions.
3. Verify concrete public type contracts against actual callers and return/error
   branches. Spec presence and exported remote types were already checked.
   Menu, nutrient totals, PlannedSet and token configuration contracts were
   tightened. The broad-map classification immediately below records intentional
   unvalidated/persisted JSON boundaries; do not narrow those without evidence.
4. For real-provider delivery, first establish available test credentials and
   a user-designated recipient. Existing ResendAdapterTest uses Req.Test and
   proves payload/error mapping, not real delivery. Do not send messages without
   explicit authorization for the recipient and test send.
5. For deployed-database upgrade verification, obtain a representative pre-upgrade
   database copy and its starting version, then test in an isolated restore.
   Fresh database migrations/seeds twice already passed; they do not prove an
   existing-data upgrade. Do not run destructive checks against a live database.
6. Run focused checks for actual changes and the required final backend gate.
   Refresh release evidence only when relevant runtime/dependency changes or
   upgrade verification warrant it. Record remaining external prerequisites
   honestly instead of substituting local mocks for external verification.

Prior estimate for this selected scope: 45–90 minutes for local verification
and fixes, plus 30–60 minutes for external delivery/database checks if suitable
credentials, recipient and database copy are available. This was an estimate,
not evidence that those prerequisites exist or that the follow-up is complete.

| Follow-up | Starting point and intended result |
| --- | --- |
| Monitoring (user deferred) | Inventory existing telemetry, choose a consumer/exporter and operational destination, then implement useful dashboards and actionable alerts. Verify event delivery end to end. |
| Race conditions (user deferred) | Reproduce intermittent Sweeper timing failures deterministically. Resolve invitation acceptance when seat capacity falls: agree on awaiting-seat membership/session behavior, then test the transaction outcome. |
| Delivery reliability | Decide durable outbound delivery and provider-success/local-failure reconciliation requirements before implementation. |
| Product policies | Resolve library impact visibility, history pagination and graph/bulk limits, and UTC versus client-local training dates before changing behavior. |
| Further compliance evidence | Use the operation maps below to select a named failure/authorization gap or a concrete semantic type contract. Spec presence alone does not prove type correctness. |

Keep the agreed constraints when resuming: backend structure first; only
elixir-production:elixir-patterns and elixir-production:production-quality;
no additional skills or reviews. Monitoring, race conditions, delivery-reliability
implementation and product-policy changes remain deferred. Real-provider delivery
verification is selected; redesigning delivery reliability is not.

## Remaining broad map contracts classified — 2026-09-09

The remaining broad-map return sites were inspected directly:
- FormAnswers.from_attrs returns a caller's unvalidated answer map; value checking
  occurs in validate. Claiming a validated answer shape here would be incorrect.
- Business.dashboard_setup_input returns normalized params after only a presence
  check. LandingPage.program_inputs validates the collection, not each program.
- DefaultIntake/DefaultCheckIn sections are persisted heterogeneous form JSON.
  DefaultCheckIn.upgrade_sections preserves caller-provided section fields.
- Training.PrescriptionSnapshot builds versioned, string-keyed persisted JSON;
  its consumer validates exercise references against that document. Keeping the
  JSON boundary explicit avoids changing persisted representation to satisfy types.
- Prospect.invitation_attrs fixes four keys but forwards unvalidated caller values
  for the invitation changeset. Their value types must not be narrowed to strings
  until validation actually occurs.

These sites are intentional dynamic-data boundaries rather than missing runtime
abstractions. Menu, nutrient totals, PlannedSet and token configuration fixed
contracts were tightened separately. This bounded inspection does not imply all
argument/result types throughout every module have been semantically verified.
No source changes or repeated test run were needed. Latest gate: 19039, 1,616
passing tests.

## Full locked-dependency advisory check — 2026-09-09

Queried Hex release metadata for all 44 locked Hex releases. Only Phoenix 1.8.1
reported advisories (including CVE-2026-56811/56812/32689). Raised its minimum
requirement to ~> 1.8.9; resolver selected Phoenix 1.8.13, PhoenixPubSub 2.3.0,
and WebSockAdapter 0.6.0. Rechecked those changed releases: all 44 current
releases now report empty security_advisories and no retirement.
The check covers published Hex metadata as of this date, not undisclosed bugs,
OS packages or deployed exposure. Evidence: /tmp/easy-dependency-advisories.json.

Full precommit 19039 exited 0: 1,616 tests, zero failures, clean application
compile/format/Credo and 155 typed routes. Docker build 95083 exited 0.
Image: `sha256:0ea89008991dd663ec1e80ccd11f07f2811e2e64c3b136f9091d1b8ca828d163`.
Smoke 59472 exited 0: migrations/seeds twice, readiness 204, health ok,
SIGTERM exit 0 without OOM, temporary resources cleaned up. Runtime remains
Elixir 1.19.1 / OTP 28.1.1, linux/arm64. No external email was sent.

## Module layout regression check — 2026-09-09

ContextLayoutTest now parses each domain source file and requires one top-level
module, protecting the embedded-schema file splits. Replaced its redundant
text-based schema Repo scan: ArchitectureTest already checks compiled imports,
which detects aliased calls and avoids comment/string false positives.
Focused layout/architecture checks: 12 passed. Full precommit 60268 exited 0:
1,616 tests, zero failures, clean compile/format/Credo and 155 typed routes.
No runtime changes were made.

## Planned Set type contracts — 2026-09-09

PlannedSet.t now declares embedded field types. Its attrs and snapshot maps
specify string keys and the actual scalar/Decimal/enum values; snapshot values
also allow the float produced for RPE. PrescribedExercise.copy_attrs reuses the
attrs type. No runtime or wire representation changed. Dynamic input maps in
PrescriptionInput remain broad until their changeset validation boundary.
After correcting a long type line, full precommit 29720 exited 0: 1,616 tests,
zero failures, clean application compile/format/Credo, 155 typed routes checked.

## Invitation capacity scope reconciliation — 2026-09-09

Current source confirms the previously recorded mismatch: Invitations verifies
membership acceptance and active-client session creation in one transaction.
ClientInvitations can choose inactive/awaiting_seat when billing capacity has
fallen since issuance, while SessionFactory requires active client membership.
A session failure rolls back acceptance and OTP consumption in that transaction.

This is a timing-dependent capacity transition and falls under the user's
existing deferral of race-condition work. It is retained as a follow-up concern,
not used to extend the structural pass or request another policy confirmation.
No new runtime behavior, success-path test, or capacity policy was introduced.

## Public spec presence verification — 2026-09-09

Parsed current Elixir ASTs and compared source-written public def name/arity pairs
against @spec declarations, including polymorphic when specs. No missing specs
were found in 151 domain files, then in all 264 backend lib files. The first
checker version failed to recognize six polymorphic specs; correcting the checker
removed those false positives. This was a read-only mix run --no-start check;
the application and its workers were not started.

Scope: source-written def heads; generated exports, defdelegate and macros were
not counted. This proves spec presence for that scope, not semantic correctness
of every type. ArchitectureTest separately checks referenced exported types.
No production changes or additional full-suite run were needed for this check.
Latest full precommit remains 73019: 1,616 tests, zero failures.

## Billing quantity transition contract — 2026-09-09

BillingTest drives signed subscription.updated events through the public webhook
for all five local statuses. Active, past_due and cancel_at_period_end accounts
retain status/free seats, update paid seats and record the exact seat delta.
Free and cancelled accounts retain their entire stored record and emit no billing
event. This closes quantity-update state coverage; it does not prove out-of-order
charged-event policy or provider reconciliation. No runtime changes were needed.
Focused tests: 14 passed. The first gate found a long fixture line; after formatting,
full precommit 73019 exited 0: 1,616 tests, zero failures, clean compile/format/Credo
and 155 typed routes checked.

## Food media write boundary — 2026-09-09

LibraryTest now covers missing/foreign media on Food creation and update,
asserting not_found with unchanged persisted metadata, revision and total row
count. Explicit media clearing succeeds, preserves the name, clears the preload,
and advances revision once. Training already has direct foreign-media write and
clear assertions in training/library_media_test.exs. Runtime code was unchanged.
Focused Food checks: 25 passed. Full precommit 69610 exited 0: 1,615 tests,
zero failures, clean compile/format/Credo and 155 typed routes checked.

## Library missing/foreign identity contracts — 2026-09-09

LibraryTest now directly checks get/copy/delete for both Foods and Recipes with
foreign-tenant and missing UUIDs. Every operation returns not_found; the foreign
record and total row count remain unchanged. Focused tests: 24 passed.
Full precommit 43779 exited 0: 1,614 tests, zero failures, clean application
compile/format/Credo and 155 typed routes. No runtime changes were needed.
This closes the previously named missing/foreign read/copy/delete gap, without
claiming coverage of unrelated media or provider failures.

## Menu and token return contracts — 2026-09-09

Menu.format/1 now declares its actual nested meal/item/day-pattern/schedule
shape, reusing Portion, MealSlot and NutrientTotals domain types. Token.token_config/0
uses the dependency's Joken.token_config type. Runtime behavior is unchanged.
Unvalidated answers, dashboard params and landing program maps remain broad
because their functions pass through data for later validation.
Full precommit 84128 exited 0: 1,612 tests, zero failures; clean application
compile/format/Credo and 155 typed routes. The last release image predates these
type-only edits; no runtime or dependency change warrants another release run.

## Mail dependency cleanup and runtime upgrade — 2026-09-09

Replaced Resend.Swoosh.Adapter with Swoosh.Adapters.Resend and selected Req
in development as well as production. Removed the separate Resend dependency;
precommit removed unused Resend, Tesla, Metrics, and UnicodeUtilCompat locks.
Swoosh 1.28.0 and Tzdata 1.1.5 permit Hackney 4.7.4 without overrides.
The resolver also updated Req 0.7.4, Finch 0.23.0, Mint 1.10.0, Certifi 2.17.0,
IDNA 7.1.0 and ParseTrans 3.4.2, adding Hackney's H2/QUIC/WebTransport dependencies.

Raised project Elixir requirement to ~> 1.19; Docker builds with Elixir 1.19.1 /
OTP 28.1.1 on Debian bookworm. Updated the three legacy ENV declarations.
ResendAdapterTest exercises request authorization, recipient, sender, subject,
text/HTML and provider error mapping through Req.Test; no external mail was sent.
Focused adapter/runtime tests: 7 passed. Initial full check found two test alias
style issues, corrected before final precommit 44670 exited 0: 1,612 tests,
zero failures, clean application compile/format/Credo, 155 typed routes checked.

Docker build 84471 exited 0 without the old Docker ENV warnings.
Image: `sha256:4ef0365b03eb8255d9c791afd564d8e08c05553c4c128b1ca52ef1a44f32a4b5`.
Smoke 36710 exited 0: migrations and seeds twice, readiness 204, health ok,
SIGTERM exit 0 without OOM, temporary resources cleaned up.
Bandit, Decimal and Hackney versions now include the identified upstream fixes.
This is not a claim that every dependency or deployment vulnerability is absent.

## Decimal release validation — 2026-09-09

Build 90066 and smoke 65738 both exited 0 with current dependency lock.
Image: `sha256:d2b629a1082f1aff00b733b1585cde2ab795088d0988d0cf237bff4b987134f8`.
Elixir 1.15.7 / OTP 26 linux/arm64: migrations and seeds twice, readiness 204,
health ok, SIGTERM exit 0 without OOM, temporary resources cleaned up.
Hackney/mail dependency remediation remains open; no claim of full security clearance.

## Mail dependency compatibility finding — 2026-09-09

Current Swoosh 1.19.8 has no built-in Resend adapter. Upstream Swoosh now has
Swoosh.Adapters.Resend, which uses its configured API client and can remove the
separate Resend/Tesla wrapper. Switching would also require enabling Req as the
Swoosh API client in dev (currently false), updating runtime adapter assertions,
and verifying outgoing payloads and normalized errors using a local HTTP stub.
Source: https://github.com/swoosh/swoosh/blob/main/lib/swoosh/adapters/resend.ex

Hex release metadata checked for Swoosh 1.20.0, 1.21.0, 1.22.0, 1.23.0,
1.24.0, 1.25.3, 1.26.3, 1.27.1 and 1.28.0. The checked releases that permit
Hackney 4.x require Elixir ~> 1.16. The current Dockerfile uses Elixir 1.15.7.
Thus the supported mail dependency route includes a release-runtime upgrade;
changing the adapter alone does not complete remediation. No adapter/config
change has been made and no external email has been sent.

## Decimal dependency remediation — 2026-09-09

Resolved supported upgrades under existing dependency ranges: Decimal 3.1.1,
Ecto 3.14.2, EctoSQL 3.14.0, Postgrex 0.22.4, DBConnection 2.10.2,
Jason 1.4.5, Tzdata 1.1.5, and Mimerl 1.5.0. No overrides were used.
Precommit 81142 exited 0: 1,610 tests, zero failures, application compile,
format, Credo and 155 typed-route checks passed. Release verification must
be refreshed after the remaining dependency changes.

Correction to the earlier preliminary compatibility check: Tzdata was not the
only Hackney constraint. Resend 0.4.4 requires Hackney ~> 1.9, Tesla 1.15.3
requires ~> 1.21 when installed, and Swoosh 1.19.8 also constrains optional
Hackney to ~> 1.9. The resolver correctly kept Hackney 1.25.0; its advisories
remain unresolved. Current runtime/dev mail config selects Resend.Swoosh.Adapter.
Investigate replacing that wrapper with the supported Swoosh Resend adapter
and compatible dependencies, while preserving email delivery behavior.

## Remaining dependency remediation constraints — 2026-09-09

Upstream Decimal advisory GHSA-rhv4-8758-jx7v identifies 3.0.0 as patched.
Current Ecto 3.13.4 requires Decimal ~> 2.0; Postgrex 0.21.1 permits only
~> 1.5 or ~> 2.0. A supported upgrade therefore needs compatible Ecto and
Postgrex releases, followed by numeric casting, persistence, and release checks.
Do not force an unsupported Decimal version with override: true.
Source: https://github.com/ericmj/decimal/security/advisories/GHSA-rhv4-8758-jx7v

Upstream Hackney advisory GHSA-j9wq-vxxc-94wf identifies 4.0.1 as patched.
Current Tzdata 1.1.4 requires Hackney ~> 1.17. A supported fix needs a compatible
time-zone provider release or provider migration, then time-zone conversion,
update behavior, and release checks. config/config.exs currently selects
Tzdata.TimeZoneDatabase. No direct Hackney invocation was found in backend/lib
or backend/config; this does not clear transitive exposure.
Source: https://github.com/benoitc/hackney/security/advisories/GHSA-j9wq-vxxc-94wf

Decimal is reachable through typed-route parsing, client decimal rendering, and
weight-history arithmetic. These advisories are not assumed irrelevant.
Hex release metadata now confirms a supported route without dependency overrides:
Tzdata 1.1.5 accepts Hackney ~> 4.0; Ecto 3.14.2 requires Decimal ~> 3.0;
Postgrex 0.22.4 accepts Decimal 3.x and requires DBConnection ~> 2.9.
The published Elixir requirements are compatible with the release's 1.15 line.
This is resolver metadata evidence, not a completed integration test.

The user has been asked whether to include broader dependency upgrades now or
track them separately given the requested focus on code structure. No deferral
is assumed until the user answers. No dependency changes were made in this check.

## Bandit security update — 2026-09-09

Raised Bandit requirement to ~> 1.12.5 and resolved lock to 1.12.5.
Upstream changelog: https://github.com/mtrudel/bandit/blob/1.12.5/CHANGELOG.md
The resolver also updated HPAX 1.0.4, Plug 1.20.3, PlugCrypto 2.2.0,
Telemetry 1.4.2, and ThousandIsland 1.5.0.
Precommit 92992 exited 0: 1,610 tests, clean application compile/format/Credo,
155 typed routes checked. Docker build 49266 exited 0 with Elixir 1.15.7 / OTP 26.
Image: `sha256:3d0fcec71c2646950057ebc96c18b7703fe2e4f768c254b42cc15331f7aa26d1`.
Smoke 12545 exited 0: migrations/seeds twice, readiness 204, health ok,
clean SIGTERM exit 0 without OOM, temporary resources cleaned up.

Bandit no longer received vulnerability warnings in Docker dependency resolution.
Remaining warnings include Decimal 2.3.0 (CVE-2026-32686) and Hackney 1.25.0
(CVE-2026-47075 and CVE-2026-47076). Their compatible remediation remains open.
Dependency compilation also reports existing Tesla deprecation and DBConnection
OTP compatibility warnings; they are not application compiler warnings.

## Current release verification — 2026-09-09

Docker build 81743 exited 0 for linux/arm64, Elixir 1.15.7 / OTP 26.
Image: `sha256:0d26e731b27376c54b9e69c9bc8aa1057df8aa25e575aa79ccde492d901fc971`.
Smoke 59002 exited 0: isolated PostgreSQL 17 migrations and seeds ran twice,
readiness returned 204, health returned status ok, and SIGTERM shutdown exited 0
without OOM. Temporary containers and internal network were cleaned up.
This proves local fresh-database release behavior, not deployed upgrades or real
provider integration. Docker still reports three legacy ENV syntax warnings.

Dependency resolution exposed security advisories for locked Bandit 1.8.0,
including GHSA-rf5q-vwxw-gmrf (unauthenticated chunked-decoder denial of service).
The upstream advisory identifies 1.11.1 as the patched version for that advisory:
https://github.com/mtrudel/bandit/security/advisories/GHSA-rf5q-vwxw-gmrf
A compatible dependency remediation remains required; the successful smoke test
does not establish security against malformed HTTP requests. `mix hex.audit`
returned no retired packages, which is not a vulnerability-clear result.

## Library filter verification — 2026-09-09

Closed the named combined-exercise-filter and visible-food-category evidence gaps.
Focused checks passed: 18 tests. Full precommit 52686 exited 0: 1,610 tests,
zero failures, clean compilation/format/Credo, and 155 typed routes checked.
Runtime query composition already met these contracts; no additional abstraction
was needed. The first focused run exposed duplicate fixture names violating the
existing unique constraint; distinct fixture names corrected the test setup.

## Nutrient totals contracts — 2026-09-09

`NutrientTotals.dump/1` now declares the five nullable numeric fields it persists.
`sum/1` declares its required nutrient payload while permitting additional item
fields, matching Diary items and entries. Runtime behavior is unchanged.
Precommit 77963 exited 0: 1,609 tests, zero failures, clean compile/format/Credo,
and 155 typed routes checked. Broad maps at unvalidated input boundaries and
string-keyed snapshot boundaries are not replaced with falsely narrow types.

## Monitoring deferred by user — 2026-09-09

The user authorized skipping monitoring implementation for now and documenting it.
This removes monitoring setup from the current implementation pass; L6 remains
incomplete and must not be represented as production-ready observability.
Existing delivery and sweeper telemetry stays in place.

Before production operations depend on monitoring:
- Choose the monitoring destination and configure its exporter and credentials.
- Connect OS/VM and Phoenix/Ecto measurements alongside application events.
- Define useful user-workflow signals, dashboards, and actionable alerts with owners.
- Verify ingestion and alert delivery against the deployed environment.

Race-condition work remains separately deferred as previously requested.

The food-list query now always appends its default ordering after optional search
ranking. This removes a context branch and gives punctuation-only searches stable
pagination. Focused library/category checks passed: 29 tests, zero failures.
Full precommit 63448 then exited 0: 1,609 tests, zero failures, clean
compilation/format/Credo, and 155 typed routes checked.

# Backend production-quality audit

Scope: apply the elixir-patterns and production-quality skills throughout the
backend. Completion requires review of every backend domain and production gate.
Passing the suite proves the covered behavior; it does not finish this audit.
Use only those two skills for this work. The user explicitly excluded Superpowers
workflows and separate code reviews.

Current priority: code structure, cohesive module boundaries, duplicated workflows,
and simpler interfaces. The user explicitly deferred further race-condition work.
The unfinished coach invitation race patch and its new tests were set aside.

The backend contract takes precedence over skill defaults, including its ban on
module/function documentation and its Ctx, changeset, and error conventions.

## Verified changes on 2026-09-09

* Nutrition coverage summary now has direct assertions for empty coverage,
  multiple future plans in chronological order, draft/archived/ended exclusion,
  and today's current plan alongside upcoming plans. All 14 focused coverage
  tests passed. Full precommit 26849 exited 0: 1,608 tests, zero failures,
  155 typed routes and clean Credo. Runtime code required no changes. Prior
  Sweeper timing failures remain recorded; this pass does not establish a fix.

* Read every assertion in Auth.AcceptInviteTest, replacing the earlier
  test-name-only evidence. Request checks verify pending client identity/email
  preservation, accepted-email token binding, old-token removal and public
  error codes. Verification checks assert client activation, accepted email,
  existing-user identity and uniqueness, confirmation/new-user name seeding,
  wrong/expired/bound-to-other-invitation-or-email rejection and failed reuse
  after success. Changed membership errors are also directly asserted. The
  wrong-OTP test name says 401 but the actual assertion expects 400.
  Capacity-to-session behavior remains the separately recorded policy gap;
  these assertions do not prove provider delivery or every late-write rollback.
  No source or test changes; latest full-suite status remains recorded below.

* WorkbenchProgrammingQueue.list now separates pure item_query construction
  from service validation, pagination, Repo execution and result mapping.
  The tenant join, grouping, ordering and projection are unchanged. All seven
  focused queue tests passed. Full gates 95101 and 31955 passed compilation,
  formatting, typed routes and Credo but failed Sweeper timing assertions:
  first deadline/retry, then deadline/retry plus interval-after-work. The first
  isolated retry 24455 also failed; the final saved-failure run 39885 passed
  both unchanged. No production concurrency fix or clean latest full suite is
  claimed. Latest complete suite: 1,607 tests, two failures (31955).

* Tightened DiarySlot.Document contracts to Menu.Meal inputs and an explicit
  entry-reference shape; DiaryDay target projection now accepts Plan or nil
  and declares its five possible target fields. Error now declares its struct
  fields and serialized payload shape. These are type-only changes. Initial
  gate 42495 rejected a long spec line; naming entry_reference resolved it.
  Final precommit 24994 exited 0: 1,607 tests, zero failures, 155 typed routes
  and clean Credo. The suite took 103.8 seconds; no runtime cause is inferred.

* Checked the 20 root-level nutrition_*.ex files against ContextLayoutTest.
  Their placement follows the existing repository rule: nested domain folders
  contain schemas, with Identity explicitly exempted. Kept the context files
  at lib/easy/ rather than moving them merely to match module namespaces.
  The Menu/DiarySlot embedded-schema splits satisfy that rule. No source
  change or additional test run was needed; gate 44043 already exercised
  ContextLayoutTest. This file-layout question is resolved, not an open
  structural refactor.

* Split DiarySlot.Item, Entry, Option and Document into individual files under
  lib/easy/nutrition/diary_slot/. The persisted DiarySlot schema stays in
  diary_slot.ex. Reconstruction matched the original five module definitions
  exactly. Source inventory found no other multi-top-level-module files under
  lib/easy. Full precommit session 44043 exited 0: 1,607 tests, zero failures,
  155 typed routes and no Credo issues across 466 source files.

* Split Menu.Item, Menu.Meal, Menu.Slot and Menu.DayPattern into their own
  files under lib/easy/nutrition/menu/. Menu's aggregate topology, resolution
  and formatting remain in menu.ex. Reconstructing the original file from
  all five modules matched its prior indexed contents exactly. Full precommit
  session 19045 exited 0: 1,607 tests, zero failures, 155 typed routes and no
  Credo issues across 462 source files. This changes file ownership only.

* Declared Telemetry as a direct runtime dependency because Sweeper,
  MailerDelivery and CheckIns call it directly. The existing lock remains
  Telemetry 1.3.0; no dependency upgrade was needed. Rechecked Application,
  mix dependencies and config: metrics consumption/export and VM polling are
  still absent. Asked for the monitoring destination before choosing an
  integration. Full precommit session 45215 exited 0: 1,607 tests, zero failures,
  155 typed routes and no Credo issues.

* Nutrition FoodWriter.create now uses one linear with chain for coach
  authorization, changeset construction, media authorization and insertion.
  RecipeWriter calls PlanReader.library_item_used? directly for deletion and
  cooked-weight protection, removing two single-use forwarding helpers.
  Query conditions, error ordering and transactions are preserved. Full
  precommit session 38049 exited 0: 1,607 tests, zero failures, 155 typed routes
  and no Credo issues.

* Food.copy_attrs and Recipe.copy_attrs now declare their fixed result fields,
  nullable schema values, serving-size attributes and ingredient Portion values.
  These are typed copy contracts rather than arbitrary map results; runtime
  copying is unchanged. Raw input/callback term types found in the bounded
  scan remain intentional, and other map-returning APIs still need individual
  assessment. Full precommit session 22626 exited 0: 1,607 tests, zero failures,
  155 typed routes and no Credo issues. The local release smoke predates only
  these type declarations.

* Rebuilt the current backend release with the repository Dockerfile on
  linux/arm64 (Elixir 1.15.7 / OTP 26). Build session 77317 exited 0; image
  easy-backend-quality:local is
  sha256:9b0bbd9e0a8c124954b2d2b64235966b664e3ecf02d85d3121674efbf379b331.
  The inspected /tmp/easy-release-smoke.py ran against temporary PostgreSQL 17
  containers on an internal Docker network, using dummy provider credentials.
  Session 33266 exited 0: migrations/seeds succeeded twice, readiness returned
  204, liveness returned status ok, and shutdown reported exit 0 / OOMKilled
  false. Temporary containers and network were removed. This closes the stale
  local release evidence; deployed-data upgrades and real providers remain
  outside what this smoke test proves. Docker emitted three pre-existing
  legacy ENV syntax warnings. No runtime source changed in this verification.

* Training Programming archive/restore now express idempotent states as
  function clauses, matching Nutrition's lifecycle structure. The write clauses
  contain only changeset construction and persistence. Inlined the single-use
  tenant query wrapper at the locked lookup. Revision and authorization ordering
  are unchanged. All 22 focused lifecycle/client-plan tests passed; full
  precommit session 59757 exited 0: 1,607 tests, zero failures, 155 typed routes
  and no Credo issues.

* Training PlanReader coverage and session-start prescription lookup now share
  covering_plan_query: tenant/client scope, active plans, date coverage and
  workout preloads have one definition. Removed the single-use plan_query
  forwarding helper. Existing behavior is preserved; all 21 focused plan,
  execution and rewrite tests passed. Full precommit session 44003 exited 0:
  1,607 tests, zero failures, 155 typed routes and no Credo issues.

* PerformedSets create/update/delete now have direct foreign-tenant,
  mismatched-tenant, missing-client and unknown-ID denial evidence. Rejected
  calls leave the session's persisted set records unchanged. The shared runtime
  authorization already satisfied these cases. Full precommit session 92531
  exited 0: 1,607 tests, zero failures, 155 typed routes and no Credo issues.
  Earlier session 42943 was unavailable when polled; its outcome is not claimed.

* Training session detail/update/complete/discard now share a direct denial
  matrix: other client, foreign tenant, mismatched business/client IDs, absent
  client identity and unknown session ID. Every rejected call preserves both
  the session and original client's activity record. Runtime code already
  satisfied these checks. All 16 focused history tests passed; after fixing
  the new test aliases' order, full precommit session 64974 exited 0:
  1,606 tests, zero failures, 155 typed routes and no Credo issues.

* ClientAccess.authorize_client_id now rejects nil with not_found. The earlier
  optional-ID exception is obsolete: current callers require a client;
  Attachments validates client_id as required, and plan templates have explicit
  authorization clauses outside ClientAccess. Updated the direct nil regression.
  Five callers that discarded loaded clients now use ID authorization:
  both PlanCopy modules, coach Training plan lists, coach Nutrition coverage,
  and form-assignment lists. Their tenant/visibility checks use existence queries
  rather than loading unused records. Full precommit session 12499 exited 0:
  1,605 tests, zero failures, 155 typed routes and no Credo issues.

* CheckIns deletion now has direct history-preservation evidence: a once-only
  schedule that generated an assignment is inactive but still cannot be deleted;
  schedule_has_assignments leaves both persisted records unchanged. Both
  focused CheckIns tests passed. Initial full gate 29287 had three failures;
  saved-failure rerun 20964 passed unchanged (two SweeperTest cases and one
  Workbench onboarding-queue case). No cause or production fix is claimed.
  Final full precommit session 93315 exited 0: 1,605 tests, zero failures,
  155 typed routes and clean Credo; full output is saved at
  /tmp/easy-precommit-schedule-history.log. A sandbox socket denial on the
  redirected command was resolved by the approved escalated rerun.

* CheckIns now has direct hidden-trainer and foreign-tenant coverage across
  list/create/update/delete. Denied operations preserve the original schedule
  and create no extras; owner listing retains the template preload. Runtime
  boundaries already satisfied the test. Focused test passed; full precommit
  session 98842 exited 0: 1,604 tests, zero failures, 155 typed routes and no
  Credo issues.

* Added direct OTP issuance state evidence. Invalid confirmation/authentication
  account states preserve their existing token; unknown accounts create none.
  Valid issuance replaces the selected token type, preserves another type and
  dispatches to the expected recipient. Unknown type input retains the existing
  authentication fallback. Five focused tests passed; full precommit session
  71575 exited 0: 1,603 tests, zero failures, 155 typed routes and no Credo
  issues. Runtime issuance and concurrency behavior are unchanged.

* Coach onboarding now translates both existing membership uniqueness indexes
  into user_id changeset errors. The new direct context test reproduced an
  Ecto.ConstraintError for a duplicate in the same business: the changeset
  declared coaches_user_id_index but not coaches_user_id_business_id_index.
  Added the second constraint mapping; the test verifies loaded successful
  creation, duplicate rejection in the same/different business and preservation
  of the sole existing membership. All 16 focused Coaches tests passed. Full
  precommit session 64450 exited 0: 1,598 tests, zero failures, 155 typed routes
  and no Credo issues. Database indexes and concurrency behavior are unchanged.

* CoachInvitations now resolves the owner's user through Identity.Users rather
  than calling Repo.get(User, ...) directly. The normalized self-invitation
  comparison and missing-user fallback are preserved; other inspected User
  aliases outside Identity describe trusted structures or schema associations.
  Existing normalized/string-keyed self-invitation tests pass. Full precommit
  session 26595 exited 0: 1,597 tests, zero failures, 155 typed routes and no
  Credo issues.

* Training muscle/equipment catalogs now have direct tests for trimmed,
  case-insensitive search, literal percent/underscore matching, empty results,
  nil/blank equivalence and alphabetical ordering. Their name columns have
  unique indexes in 20260703000300_create_training, so name ordering is already
  total. Added the missing unknown-ID exercise lookup assertion alongside
  existing foreign/system coverage. No runtime changes were needed. All ten
  focused library tests passed; full precommit session 41149 exited 0:
  1,597 tests, zero failures, 155 typed routes and no Credo issues.

* Inspected all current runtime Repo bang calls and exception handlers found
  under lib/easy. The three Repo.query! calls are parameterized advisory-lock
  operations in OneTimeTokens and SweeperLock, not expected missing-record
  lookups. Repo.snapshot translates only PostgreSQL serialization failures;
  CoachInvitations translates only the named coach-user uniqueness violation
  and reraises other PostgreSQL errors. Health handles connection failures and
  exits; Sweeper retries connection failures; MailerDelivery logs delivery and
  callback exceptions. These boundaries were retained rather than wrapped in
  generic domain errors. This is a source check of the named exception/bang
  sites, not proof of every possible runtime failure or callback exit. No code
  changed; precommit session 79203 remains the latest verified gate.

* Nutrition Library impact contracts now name the concrete food/recipe result
  shapes and plan references, including nullable client IDs, instead of lists
  of arbitrary maps. These types follow the existing select/projection code;
  no wire shape or runtime behavior changed. Full precommit session 79203
  exited 0: 1,595 tests, zero failures, 155 typed routes and no Credo issues.

* Nutrition impact reads now use scoped existence checks instead of loading
  food media or recipe ingredients that the impact response never consumes.
  Food visibility still includes system rows; recipes remain tenant-only.
  Snapshot and usage queries are preserved. Existing impact assertions pass;
  added unknown-food and unknown/foreign-recipe rejection assertions. The 13
  focused protection tests passed after the refactor; final precommit session
  97658 exited 0: 1,595 tests, zero failures, 155 typed routes, no Credo issues.
  The remaining nine defdelegates belong to Identity's workflow interface and
  Nutrition Library's writer boundary; inspection found no reason to remove
  those interfaces merely because individual methods delegate.

* Added direct Nutrition client-plan rejection checks for another client and
  another tenant, preserving own archived-plan readability. Clients detail and
  profile-write checks now exercise visible trainer success, hidden/foreign
  denial with unchanged persisted rows, and owner visibility across trainers
  without crossing tenants. Runtime code already satisfied these boundaries.
  The 36 focused tests passed; full precommit session 4233 exited 0:
  1,595 tests, zero failures, 155 typed routes and no Credo issues.

* Closed client-plan pagination evidence for Nutrition self reads and Training
  self/coach reads. Each case uses 101 non-overlapping plans with identical
  insertion timestamps and verifies default 20, minimum 1, maximum 100,
  negative-offset normalization, complete ordered page traversal and exclusion
  of other clients/tenants. Initial fixtures violated the one-incomplete-plan
  constraint; dated fixtures satisfy existing domain rules. All eight focused
  pagination tests passed. Full precommit session 56743 exited 0: 1,594 tests,
  zero failures, 155 typed routes and no Credo issues. Runtime code unchanged.

* Training batch-name evidence now covers distinct supplied client dates,
  omission outside each client's own date, foreign tenant IDs and empty input.
  Extended client-self detail reads to reject another client's plan and a
  foreign tenant's plan directly. Runtime behavior already satisfied these
  checks. All 12 focused client-plan tests passed; full precommit session
  42109 exited 0: 1,591 tests, zero failures, 155 typed routes, no Credo issues.

* Nutrition's batch covering-plan reader now uses the supplied client dates
  consistently. It previously selected current plans at those dates and then
  recomputed lifecycle using the wall clock, returning historical matches as
  ended. The regression reproduced that mismatch; matched plans now retain
  the established current lifecycle. The test also covers distinct client
  dates, per-client exclusion within the broad query window and foreign-tenant
  IDs. Focused coverage: 13 tests passed. Full precommit session 74194 exited
  0: 1,590 tests, zero failures, 155 typed routes and no Credo issues.

* Added lifecycle no-op evidence for both templates and assigned plans in
  Training and Nutrition. Repeated archive/restore calls preserve the entire
  persisted record, including revision and timestamps; Training also rejects
  stale revisions before an otherwise redundant action. All 17 focused
  lifecycle tests passed without runtime changes.
  Initial full gate 51113 hit the previously observed SweeperLockTest timer
  message deadline. Replaced its timer-message assertion with Process.sleep(200):
  the test needs elapsed time beyond the 50 ms query timeout, not prompt timer
  delivery. Lock exclusion, release and reacquisition assertions remain.
  Full precommit session 86154 exited 0: 1,589 tests, zero failures, 155 typed
  routes and no Credo issues. Production concurrency code remains unchanged.

* Billing checkout now shares apply_seat_change with webhook and sync
  transitions: update the billing row, record the delta, activate waiting
  clients. Activation accepts the updated billing record directly instead
  of re-fetching it through a forwarding helper. Existing provider placement,
  local transactions, capacity calculation and oldest-first selection remain.
  Billing's 67 focused tests passed after removing the re-fetch; the final
  shared-workflow change passed full precommit session 1967: 1,587 tests,
  zero failures, 155 typed routes and no Credo issues. Existing transaction
  tests exercise rollback after event failures for these entry points.

* Moved trainer-deactivation client reassignment from Coaches into Clients.
  The owner-only bulk operation scopes the source coach's clients by business
  and uses the trusted owner coach ID. Coaches retains the surrounding
  transaction and explicitly matches session revocation and reassignment
  results. Existing deactivation tests cover the complete workflow; a direct
  client-boundary test covers non-owner denial, foreign source isolation,
  unchanged unrelated clients and repeated reassignment. Focused checks:
  42 tests passed. Full precommit session 47411 exited 0: 1,587 tests, zero
  failures, 155 typed routes and no Credo issues.

* Error.unprocessable now uses input-shaped clauses instead of branching twice
  over the same value. Changesets reuse the map clause after field-error
  traversal; map details and string messages retain their response values.
  Nutrition.Plan.for_menu_item's spec now matches its reader contract:
  food/recipe kinds and map-or-nil portions. Remaining broad types found by
  the domain-source scan primarily describe raw inputs and library callbacks;
  this scan does not establish all type contracts as complete.
  Initial precommit session 24298 failed one SweeperLockTest assertion at its
  one-second message deadline. That test passed in isolation unchanged, and
  full precommit session 81576 exited 0: 1,586 tests, zero failures, 155 typed
  routes and no Credo issues. No concurrency behavior was changed or diagnosed.

* ClientAccess now shares one tenant/visibility query across single-record,
  single-ID and batch-ID authorization. Single-ID checks use Repo.exists?
  instead of loading/discarding the client row. Optional nil IDs, empty batches
  and all-or-nothing batch behavior are preserved. Existing read-boundary and
  domain authorization tests pass. `rtk mix precommit` exited 0 (session 84441):
  1,586 tests, no failures; 155 typed routes checked; no Credo issues.

* Moved onboarding-to-coaching persistence from ClientAccess to Clients.
  ClientAccess now owns only authorization; both PlanCopy workflows call
  Clients.advance_stage_to_coaching after authorizing the target and inserting
  the copied plan inside their transaction. The operation uses Client.for_stage
  and returns {:ok, updated_count}; tenant and onboarding-only filtering are
  preserved. Existing assignment success/rollback tests pass.
  `rtk mix precommit` exited 0 (session 63159): 1,586 tests, no failures;
  155 typed routes checked; no Credo issues.

* PaginationContractTest covers both Nutrition and Training template lists with
  101 same-timestamp rows plus a foreign template. Exact ID assertions verify
  default 20, minimum-one/negative-offset behavior, cap 100 and nonoverlapping
  continuation with stable ID ordering. Runtime code is unchanged.
  `rtk mix precommit` exited 0 (session 30340): 1,586 tests, no failures;
  155 typed routes checked; no Credo issues.

* Shared pagination bounds now live in Utils.pagination_bounds with an explicit
  minimum of zero or one. General pagination retains empty-page support; Training
  and Nutrition plan lists and Training history retain their minimum-one policy.
  Removed duplicated default/offset/max-limit calculations and Nutrition's
  private page helper. The default limit remains 20 and maximum 100; exercise
  listing still applies its own 20 cap. `rtk mix precommit` exited 0 (session
  82608): 1,584 tests, no failures; 155 typed routes checked; no Credo issues.

* Recorded the current nineteen Nutrition programming/read operations below.
  Corrected two stale test labels: template metadata updates require the expected
  revision, and batch coverage now has arity two. Assertions/runtime behavior are
  unchanged. `rtk mix precommit` exited 0 (session 49860): 1,584 tests, no failures;
  155 typed routes checked; no Credo issues.

* Nutrition.PlanReader batch coverage now exposes only the client-to-local-date
  map used by Clients. Removed the test-only list-plus-common-date overload;
  the batch query test passes the map directly and retains exact coverage,
  missing-client, preload and single-plan-query assertions. Empty-map handling
  remains covered. Nutrition.PlanCopy already performs one source lookup and
  needed no equivalent preload refactor. `rtk mix precommit` exited 0 (session
  50374): 1,584 tests, no failures; 155 typed routes checked; no Credo issues.

* Billing.TransactionTest also exercises sync with a successful provider fetch
  followed by a seat-event constraint failure. The persisted billing row stays
  identical and no local event survives. This closes the named sync event-failure
  rollback gap; provider reconciliation and other transition combinations remain
  separate. `rtk mix precommit` exited 0 (session 84353): 1,584 tests, no failures;
  155 typed routes checked; no Credo issues. Runtime code is unchanged.

* Billing.TransactionTest extends local event-failure injection to subscribed
  checkout and cancellation. Both tests observe a successful provider stub call,
  then assert a changeset error, unchanged persisted billing and no local events.
  The shared test-local trigger selects the failing event kind. These assertions
  prove local rollback, not reversal of the external provider operation.
  Three focused tests passed; `rtk mix precommit` exited 0 (session 18968):
  1,583 tests, no failures; 155 typed routes checked; no Credo issues.

* Billing.TransactionTest injects a test-local database constraint failure at
  payment-event insertion through the signed webhook entry point. It verifies
  rollback of billing state, prior seat event, waiting-client activation and
  receipt; removing the trigger allows the same event ID to succeed with two
  events and an active client. The trigger/function live in the rolled-back
  sandbox transaction. Focused test passed; `rtk mix precommit` exited 0
  (session 56140): 1,581 tests, no failures; 155 typed routes checked; no Credo
  issues. Runtime source is unchanged; this proves the charged-webhook failure
  path, not every checkout/cancellation/sync failure or provider reconciliation.

* ClientInvitations carries the resolved client through acceptance and passes
  that same value to Billing.seat_status_for_invitation. Removed the fabricated
  partial Client and reduced the private write helper from four arguments to
  three. Tenant/client IDs still come from the resolved invitation; membership,
  seat policy, conditional write and error behavior are unchanged.
  `rtk mix precommit` exited 0 (session 74732): 1,580 tests, no failures;
  155 typed routes checked; no Credo issues.

* Training.LibraryTest now verifies foreign and system exercise update/delete
  rejection with complete persisted-row equality. Foreign single reads and
  copies return not_found, no tenant copy is inserted, and system reads remain
  available. Runtime code is unchanged. `rtk mix precommit` exited 0 (session
  56983): 1,580 tests, no failures; 155 typed routes checked; no Credo issues.

* SessionFactory.refresh_session now owns expiry/revocation validation before
  role resolution and persistence. Removed the separate public validation step
  from AuthTokens; the helper is private and returns :ok on success. The refresh
  spec includes its session errors. AuthTokens still owns the outer transaction
  and now loads the associated user before invoking the complete refresh
  operation. Existing refresh rejection tests assert unchanged rows for expiry,
  revocation and both missing memberships; controller success verifies metadata.
  `rtk mix precommit` exited 0 (session 25283): 1,579 tests, no failures;
  155 typed routes checked; no Credo issues.

* AuthTokensTest covers refresh rejection for expired/revoked sessions and
  missing coach/client membership. Each attempt submits changed metadata and
  asserts the entire persisted session stays identical, including credentials,
  role, tenant and timestamps. Runtime code is unchanged. `rtk mix precommit`
  exited 0 (session 8932): 1,579 tests, no failures; 155 typed routes checked;
  no Credo issues.

* AuthTokensTest now verifies the actual OTP transaction after token deletion:
  missing coach and client memberships leave the same token persisted and no
  session inserted. A guest retry consumes that code and creates a session;
  subsequent reuse returns invalid_otp. This closes membership-failure rollback
  coverage for authentication OTP exchange without changing runtime code or
  concurrency behavior. `rtk mix precommit` exited 0 (session 59194):
  1,578 tests, no failures; 155 typed routes checked; no Credo issues.

* Training.Library writes now require a coach context, and create/copy stamp
  ctx.coach_id as the trusted creator. The existing exercise FK and schema,
  like food/recipe creators, reference coaches; plan creators separately
  reference users. This preserves the existing library model without a data
  migration. Copy changesets take the actor explicitly; insertion maps missing
  business/creator FK failures to changesets. A regression verifies submitted
  tenant/creator overrides are ignored, create/copy attribution is retained,
  and all four writes reject a client actor while client reads still succeed.
  `rtk mix precommit` exited 0 (session 95887): 1,577 tests, no failures;
  155 typed routes checked; no Credo issues.

* Training.Library reference loading now returns tagged results and rejects
  unknown muscle/equipment UUIDs with :not_found before writing. It checks the
  loaded cardinality against unique requested IDs, preserving duplicate-ID,
  omitted-list and explicit-clear behavior. A regression mixes valid and missing
  IDs for each association in create/update, then asserts exactly one unchanged
  exercise with both original association lists. `rtk mix precommit` exited 0
  (session 12121): 1,576 tests, no failures; 155 typed routes checked; no Credo issues.

* Nutrition.Programming's lifecycle now uses only the shared production plan
  operations. Removed four test-only template mutation APIs and their duplicate
  mutation/query helpers. Updated lifecycle, assignment, topology and diary
  tests to use the controller-facing operations. Preserved revision-checked
  metadata updates, archived-plan read-only errors, revision-free lifecycle
  operations and independent diary/source behavior. Template reads retain kind
  filtering; shared mutations explicitly reject foreign plans and client actors.
  `rtk mix precommit` exited 0 (session 79044): 1,575 tests, no failures;
  155 typed routes checked; no Credo issues.

* Training.Programming now has one lifecycle mutation path for templates and
  client plans, matching the existing controller contract. Removed test-only
  update_template/archive_template/restore_template/delete_template and their
  duplicate mutation/query helpers. Template lifecycle and rewrite tests now
  use the production plan operations. Tests retain template-read kind filtering,
  foreign-plan denial, stale revisions, independent-copy deletion and lifecycle
  outcomes; added client-actor rejection across all four shared mutation calls.
  Assigned client plans remain accepted by the shared route, and hidden-client
  authorization still precedes revision checks. get_template retains real
  create/duplicate response callers. `rtk mix precommit` exited 0 (session 87039):
  1,575 tests, no failures; 155 typed routes checked; no Credo issues.

* Training.PlanCopy loads its tenant-scoped prescription with the original
  locked, active-template lookup. Removed the second template fetch and its
  preload-only helper. include_workouts uses separate tenant-scoped child
  queries, preserving the parent-row lock and ordered workout/exercise/schedule
  loading. Existing duplication/assignment tests exercise independent IDs,
  prescribed sets and remapped schedules through Programming.
  Initial gate 39610 failed on SweeperTest's one-second retry-message wait;
  its isolated five-test file then passed (68899) without code changes.
  Final `rtk mix precommit` exited 0 (session 38690): 1,575 tests, no failures;
  155 typed routes checked; no Credo issues. The intermittent scheduler timeout
  was not diagnosed or claimed fixed.

* BillingTest now reads two businesses with distinct free/paid seats, active
  client counts, waiting counts and events through get_billing. Assertions verify
  each summary's capacity calculations and exact event IDs stay within its
  context business. Renamed the describe block to the public operation it tests.
  Runtime code is unchanged. `rtk mix precommit` exited 0 (session 76772):
  1,575 tests, no failures; 155 typed routes checked; no Credo issues.

* Billing's charged and quantity-updated transitions now share apply_seat_change:
  persist the event-specific changeset, record the persisted seat delta, then
  activate waiting clients. Charge status/period handling and subscribed-only
  quantity eligibility remain explicit in their callers. Quantity updates now
  persist before recording the delta, matching charges; both paths remain inside
  the existing webhook/sync transaction, so a later error rolls back local writes.
  No locking or provider-call policy changed. Existing sync tests assert active
  seats, waiting-client activation, cancellation preservation and ignored created
  state. `rtk mix precommit` exited 0 (session 42640): 1,574 tests, no failures;
  155 typed routes checked; no Credo issues. This does not establish a complete
  billing transition/error matrix.

* Signup's duplicate-email result handler now owns the uniqueness decision
  and existing-user lookup directly. Removed two forwarding helpers while
  retaining token rotation as the transaction-owning operation. Validation
  errors, missing-user propagation, confirmation policy and post-commit mail
  dispatch are unchanged. Existing SignupTest cases cover valid atom/string
  attributes, invalid/missing email and unconfirmed-email resend.
  `rtk mix precommit` exited 0 (session 95338): 1,574 tests, no failures;
  155 typed routes checked; no Credo issues.

* Identity session internals now keep refresh-token generation and role
  resolution private. The generator had no external callers; role resolution
  had only four direct test callers. Those tests now use SessionFactory's
  production create_session entry point and assert persisted owner/trainer
  scope or missing/inactive membership errors. Identity's facade retains its
  controller consumers. `rtk mix precommit` exited 0 (session 42530):
  1,574 tests, no failures; 155 typed routes checked; no Credo issues.

* PrescriptionInput's parsed contract now names workout, exercise and schedule
  entry types, including fields that remain optional until node validation.
  validate_nodes consumes that parsed workout type. Prescribed-set payloads
  remain raw maps because their schema casting occurs later. Runtime parsing,
  validation and persistence are unchanged. `rtk mix precommit` exited 0
  (session 64306): 1,574 tests, no failures; 155 typed routes checked;
  no Credo issues.

* Training.Library.get_owned_exercise is now private: backend reference search
  found only its declaration and the module's own update/delete callers.
  Public visible single/batch reads retain their production consumers.
  Ownership filtering and response preloads are unchanged.
  `rtk mix precommit` exited 0 (session 57215): 1,574 tests, no failures;
  155 typed routes checked; no Credo issues.

* Diary now exposes its three production operations: client day lists, coach
  day lists and client day saves. Moved the two test-only single-day convenience
  wrappers into existing DiaryFixtures; their callers now exercise the real
  date-filtered list interfaces. The existing Library snapshot test reads the
  list response directly. Assertions and behavior are preserved.
  Final `rtk mix precommit` exited 0 (session 85888): 1,574 tests, no failures;
  155 typed routes checked; no Credo issues.

* Diary.DayAssembler now exports only the list/4 and assemble/5 entry points
  used by production. Removed unused assemble/4 and folded the internally-only
  list/5 overload into list/4 while preserving one captured timestamp per list.
  Writes and midnight-boundary tests retain explicit-time assembly. Diary's
  save_error type now names read/source conflicts, inactive client, correction
  policy errors and changesets instead of accepting any atom.
  `rtk mix precommit` exited 0 (session 86523): 1,574 tests, no failures;
  155 typed routes checked; no Credo issues.

* Nutrition.PlanReader.get_plan now authorizes the loaded plan before menu
  item resolution. Renamed the resolving helper from ok_or_not_found to
  resolve_plan to expose its actual responsibility. A regression using an
  invalid stored serving reference first reproduced :invalid_portion for a
  hidden trainer; the same caller now gets :not_found while the assigned coach
  still gets :invalid_portion. Missing plans retain :not_found. This fixes
  error precedence at the read boundary without changing concurrency logic.
  `rtk mix precommit` exited 0 (session 46294): 1,574 tests, no failures;
  155 typed routes checked; no Credo issues.

* Nutrition.Library's seven snapshot-backed read/recipe-return specs now
  include the existing :conflict result from Repo.snapshot, including recipe
  create/update/copy paths that reload through get_recipe. PlanReader already
  includes :conflict in its shared read_error type. No transaction, retry or
  concurrency behavior changed. `rtk mix precommit` exited 0 (session 83756):
  1,573 tests, no failures; 155 typed routes checked; no Credo issues.

* Removed Nutrition.Library.recipe_nutrients, a test-only forwarding function
  to NutrientTotals.from_recipe. Production recipe responses and item resolution
  already call NutrientTotals directly. Recipe and existing snapshot tests now
  call that same pure calculation module; assertions and concurrency behavior
  are unchanged. Corrected test alias ordering/line length caught by Credo.
  Final `rtk mix precommit` exited 0 (session 96430): 1,573 tests, no failures;
  155 typed routes checked; no Credo issues.

* Removed unused Forms.Submissions.count_unreviewed_check_ins after a backend
  reference search found only its definition/spec. Review lists already return
  their count, and WorkbenchCheckInQueue counts the shared review query itself.
  Mapped the remaining 20 template, assignment and submission operations below.
  `rtk mix precommit` exited 0 (session 89723): 1,573 tests, no failures;
  155 typed routes checked; no Credo issues.

* Forms.Submissions no longer depends on Assignments' fully enriched client
  response when accepting answers. Its private lookup scopes the assignment
  by context business/client and joins the tenant-scoped template needed for
  validation and the snapshot. Prior submissions, review projections and their
  photo attachments are no longer loaded on this write path. The coach
  submission-list authorization lookup also stops preloading a template it
  never reads. Submission photo validation and response enrichment remain.
  Existing tests cover foreign-client/tenant rejection, mismatched template
  businesses, photos, weight provenance and assignment completion.
  `rtk mix precommit` exited 0 (session 13315): 1,573 tests, no failures;
  155 typed routes checked; no Credo issues.

* Forms.Submissions now exposes one client submission entry point:
  submit_client_assignment loads the client and assignment through scoped
  lookups before calling a private submit helper. Removed the exported
  preloaded-struct variant and its duplicate identity guard/fallback; its
  only external caller was SubmissionBoundaryTest. That test now exercises
  the production entry point with persisted same-tenant/other-client and
  foreign-tenant assignments, plus nil and missing context identities.
  Rejections leave submissions absent, assignments unchanged and client
  activity unchanged. `rtk mix precommit` exited 0 (session 7088):
  1,573 tests, no failures; 155 typed routes checked; no Credo issues.

* Mapped Chat's 13 public operations to production callers and behavior tests.
  Extended client-context rejection coverage across get/list/send/read with
  nil, missing and foreign-tenant client identities and no inserted rows.
  Added hidden-trainer and foreign-owner coverage across inbox/waiting lists,
  detail, message list/send and read markers, asserting unchanged message
  count, preview, waiting state and cursor, plus successful owner access.
  `rtk mix precommit` exited 0 (session 75586): 1,573 tests, no failures;
  155 typed routes checked; no Credo issues. Runtime source was unchanged.

* ChatMessages persists messages with a linear Repo.transact/with workflow.
  Removed Ecto.Multi result-map unpacking, attachment pass-through results,
  and Repo arguments threaded through private helpers. Message insertion,
  ordered attachment links and conversation updates remain in one transaction;
  broadcasts remain after successful persistence. Existing composition,
  validation, ordering, waiting-state and broadcast tests pass.
  `rtk mix precommit` exited 0 (session 34727): 1,572 tests, no failures;
  155 typed routes checked; no Credo issues. Chat's full operation coverage
  map remains unfinished; this change does not establish exhaustive coverage.

* Workbench snooze writes now have direct hidden-client, foreign-tenant and
  unknown-client rejection tests with no inserted rows, followed by successful
  owner access to the same in-business client. Queue schemas retain trusted
  identity stamping and constraint tests. Runtime behavior is unchanged.
  `rtk mix precommit` exited 0 (session 28114): 1,572 tests, no failures;
  155 typed routes checked; no Credo issues.

* Removed Workbench.programming_counts, which had only a test caller.
  The programming-count regression now reads the programming field from
  Workbench.counts, the production aggregate interface. Queue implementations
  remain separate read models behind shared Workbench response/preload handling.
  No queue policy changed. `rtk mix precommit` exited 0 (session 77198):
  1,571 tests, no failures; 155 typed routes checked; no Credo issues.

* Prospects now has a direct foreign-tenant regression across detail,
  update and enrollment, with unchanged status/client linkage afterward.
  Existing page replacement and enrollment rollback tests were inspected
  while mapping the Landing/Prospects boundary. No runtime source changed.
  `rtk mix precommit` exited 0 (session 87346): 1,571 tests, no failures;
  155 typed routes checked; no Credo issues.

* Prospects.update_prospect returns the updated, already-preloaded record
  instead of repeating the detail query after changing only status/notes.
  Prospect application and coach-edit changesets share varchar(255) limits
  for stored strings, counted as Unicode codepoints. A regression checks
  oversized public fields produce changeset errors without insertion,
  255-character names remain accepted, successful edits retain the page
  association, and invalid notes leave the previous value intact.
  `rtk mix precommit` exited 0 (session 41354): 1,570 tests, no failures;
  155 typed routes checked; no Credo issues.

* ClientAccount regressions now cover profile operations with missing,
  unknown and cross-business client identities, preserving persisted fields
  after rejected writes. Self-edit attempts cannot replace trusted identities
  or coach-managed status/notes. Active membership resolution has direct
  success/missing/foreign/inactive cases. Production behavior is unchanged.
  Full gate: 1,569 tests, no failures; 155 typed routes checked; no Credo
  issues. Log: /tmp/easy-mono-client-account-boundaries.log.

* Client invitation, coach-edit and self-edit changesets share stored-profile
  string length validation for email/name/phone/notes. Their varchar(255)
  columns are now enforced before persistence with codepoint counting.
  A self-service regression first reproduced Postgrex ERROR 22001 for an
  oversized name; it now receives a changeset error without modifying the row.
  Additional tests check 255/256 limits through invitation and coach edits.
  Logs: /tmp/easy-mono-client-profile-length-red.log (failure) and
  /tmp/easy-mono-client-profile-length.log (full gate success). Full gate:
  1,566 tests, no failures; 155 typed routes checked; no Credo issues.

* Removed Clients.get_client, a forwarding API used only by tests. The
  authorization regressions now call ClientAccess.authorize_client directly,
  matching production ownership. Clients keeps preloaded coach-facing reads,
  listing and mutations; ClientAccount keeps client self-service operations.
  No authorization or response behavior changed. Full gate: 1,564 tests,
  no failures; 155 typed routes checked; no Credo issues.
  Log: /tmp/easy-mono-client-access-interface.log.

* Coach invitation resend/revoke now have direct non-owner and foreign-tenant
  regressions that verify the invitation remains unchanged. Token-resolution
  tests also exercise preview's exact public fields and used/expired/invalid
  errors. Runtime acceptance and concurrency behavior were not changed.
  `mix precommit` passed: 1,564 tests, no failures; 155 typed routes checked;
  no Credo issues. Log: /tmp/easy-mono-coach-invitation-boundaries.log.

* Invitation test ownership now matches production: invite/resend/revoke,
  token resolution and acceptance groups moved from CoachesTest into
  CoachInvitationsTest with their assertions intact. CoachesTest keeps
  membership/profile/team lifecycle tests, including its deactivation-to-
  invitation integration case. Small local fixture helpers remain in each
  module rather than introducing a cross-domain test abstraction. No runtime
  behavior or race-condition policy changed. Full gate: 1,563 tests,
  no failures; 155 typed routes checked; no Credo issues.
  Log: /tmp/easy-mono-coach-invitation-test-ownership.log.

* Coaches.get_active_coach_by_user_id now returns tagged ok/not_found
  results, consistent with the context contract. Its sole production caller,
  SessionFactory, preserves coach_membership_not_found for missing/inactive
  coach login; existing login regressions now assert that exact error.
  Profile tests reject missing/foreign-business membership without updates,
  and the team-list test explicitly excludes a foreign coach. Full gate:
  1,563 tests, no failures; 155 typed routes checked; no Credo issues.
  Log: /tmp/easy-mono-coach-membership-results.log.

* LibraryMedia failure-path coverage now verifies that absent and foreign-
  business coach memberships cannot create media rows, even when a coach ID
  exists in the supplied context. Missing public storage configuration returns
  a nil URL for uploaded media while external system URLs remain available.
  Production behavior is unchanged. An alias ordering issue in the new test
  was corrected before the full gate passed: 1,562 tests, no failures;
  155 typed routes checked; no Credo issues. Log:
  /tmp/easy-mono-library-media-failures-fixed.log.

* LibraryMedia exposes authorization directly instead of a separate
  fetch_attachable API used only by tests. authorize_attach owns the same
  scoped lookup and returns :ok/not_found; tests exercise shared-system,
  same-business, cross-business, unknown and nil media through that interface.
  Upload and public representation remain separate responsibilities in the
  same small context. `mix precommit` passed: 1,560 tests, no failures;
  155 typed routes checked; no Credo issues. Log:
  /tmp/easy-mono-library-media-interface.log.

* Attachments regressions now cover denied coach uploads for another
  trainer's client and a foreign-business client without metadata insertion.
  Mixed-client download batches in either order return not_found rather than
  partial URLs, while the owned attachment remains downloadable alone.
  Existing context/schema boundaries were retained. `mix precommit` passed:
  1,560 tests, no failures; 155 typed routes checked; no Credo issues.
  Log: /tmp/easy-mono-attachment-boundaries.log.

* Ctx.t and both constructor specs now permit a nil business_id, matching
  guest sessions created by SessionFactory and passed through Authenticate
  during business onboarding. User identity remains required. This changes
  only the type contract; authentication and tenant checks are unchanged.
  Existing context and HTTP onboarding tests cover this path.
  `mix precommit` passed: 1,558 tests, no failures; 155 typed routes checked;
  no Credo issues. Log: /tmp/easy-mono-ctx-onboarding-type.log.

* Orgs context regressions now verify that profile reads/updates use the
  context tenant and ignore supplied identity fields, missing businesses
  return not_found from all three tenant operations, and onboarding rejects
  missing users/duplicate handles without inserting another business.
  Production behavior is unchanged. The initial test compilation exposed
  missing enforced Ctx keys in the new fixtures; fixtures were corrected.
  `mix precommit` passed: 1,558 tests, no failures; 155 typed routes checked;
  no Credo issues. Log: /tmp/easy-mono-orgs-boundaries-fixed.log.

* WeightEntries no longer exposes the test-only adherence/2,3 API or an
  unused configurable window. Production consumes adherence through history;
  one private 30-day policy now owns both the cutoff and reported window.
  Counting and upserted-date regressions exercise the public history API.
  Removed one redundant standalone authorization test; history authorization
  tests remain. `mix precommit` passed: 1,555 tests, no failures; 155 typed
  routes checked; no Credo issues. Log:
  /tmp/easy-mono-weight-history-interface.log.

* WeightEntries now has direct regressions for missing client identity and
  cross-business client contexts across list/upsert/delete, including preserved
  persisted values after rejected writes/deletes. Another regression checks
  cross-business history and adherence denial even for a business owner.
  The production code already enforced these boundaries; no new abstraction
  was needed. `mix precommit` passed: 1,556 tests, no failures; 155 typed routes
  checked; no Credo issues. Log: /tmp/easy-mono-weight-scope.log.

* MailerDelivery shares recipient/subject/metadata formatting across success,
  provider error, and exception logging. Recipient handling now follows
  Swoosh.Email's normalized list of mailbox tuples; Swoosh.to normalizes
  input through Recipient.format, and application callers use those builders.
  Removed the duplicated formatting and unsupported legacy recipient shapes.
  Provider reason inspection uses finite collection/string limits instead of
  limit: :infinity. A regression verifies that a 100 KB provider body produces
  a log smaller than 5 KB while callers receive the full original error.
  Delivery, callback, backpressure, and telemetry behavior remain covered by
  existing tests. `mix precommit` passed: 1,554 tests, no failures; 155 typed
  routes checked; no Credo issues.

* Release packaging now preserves the Dbgi BEAM chunk because typed routes
  read typespecs at runtime. The first isolated production smoke test applied
  migrations and seeds twice and reached readiness, but /api/health returned
  500: Code.Typespec.fetch_types returned :error after release stripping.
  With strip_beams: [keep: ["Dbgi"]], the rebuilt Elixir 1.15.7 / OTP 26
  linux/arm64 release passed the same smoke test against fresh PostgreSQL 17:
  bin/migrate completed twice, /ready returned 204, /api/health returned its
  expected JSON, and SIGTERM shutdown exited 0 without OOM. Docker networking
  was internal, credentials were dummy values, and all test containers and
  their database volume/network were removed afterward. This supersedes the
  packaging-only limitation below for local startup and fresh migrations;
  provider integrations and deployed database upgrades remain unverified.
  Logs: /tmp/easy-mono-release-smoke.log (failure),
  /tmp/easy-mono-release-smoke-fixed.log (success), and
  /tmp/easy-mono-release-build-types.log (rebuild). `mix precommit` passed:
  1,553 tests, no failures; 155 typed routes checked; no Credo issues.

* The current Dockerfile built successfully as easy-backend-quality:local
  on linux/arm64, compiling production dependencies and packaging the release
  with Elixir 1.15.7 / OTP 26. A network-disabled container evaluated the
  packaged release using dummy configuration and confirmed that runtime.
  DBConnection's proc_lib.set_label warning is guarded by function_exported?;
  calling its wrapper in that container returned :ok. The build also emitted
  Tesla's dependency deprecation warning. No application compiler warnings
  appeared. This verifies packaging and release evaluation, not application
  startup, database migrations, external integrations, or another architecture.
  No deployment or production credentials were used. Build log:
  /tmp/easy-mono-release-build.log. No runtime source changed in this check.

* Business owns the shared business-and-owner query used by Billing and
  SessionFactory. Both retain their database ownership checks while removing
  duplicated predicates from the contexts. Behavior is unchanged.
  `mix precommit` passed: 1,553 tests, no failures; 155 typed routes checked;
  no Credo issues.

* FormAssignment owns the open-status vocabulary used by its query builder
  and new pure open? predicate. Submissions uses that predicate for submission
  eligibility instead of repeating the statuses in a context guard. The enum
  is built from the same open statuses plus its closed states. Behavior is
  unchanged. `mix precommit` passed: 1,553 tests, no failures; 155 typed routes
  checked; no Credo issues.

* FormAnswers canonicalizes extracted photo UUIDs before ownership checks
  and attachment lookup. An existing submission regression reproduced a
  successful uppercase-UUID submission returning empty attachments; it now
  verifies canonical attachment rows in both the write response and later
  list response. Invalid answer values still fail FormAnswers.validate
  before the ownership check. `mix precommit` passed: 1,553 tests, no failures;
  155 typed routes checked; no Credo issues.

* Attachment owns download-ID parsing: bounded nonempty lists, UUID
  normalization, and duplicate rejection. Attachments retains ordered
  loading, complete-set checks, actor authorization, and URL signing.
  Existing tests cover canonical duplicate IDs, ordering, scope, and signing
  failure. `mix precommit` passed: 1,553 tests, no failures; 155 typed routes
  checked; no Credo issues. Parsing behavior is unchanged.

* Message exposes composable business and ID filters. Conversation-message
  selection, unread counts, and waiting counts reuse its business filter;
  ChatMessages uses both builders for the attachment page load instead of
  embedding message selection predicates. Tenant and conversation predicates
  are preserved. `mix precommit` passed: 1,553 tests, no failures; 155 typed
  routes checked; no Credo issues.

* ChatMessages now owns message pagination, scoped cursor resolution,
  attachment loading, and the shared page type alongside message sending.
  Chat's coach/client list entry points retain conversation authorization
  and pass the resulting conversation to that context. Page order, limit,
  cursor fallback, and has_more behavior are preserved. `mix precommit`
  passed: 1,553 tests, no failures; 155 typed routes checked; no Credo issues.

* Chat separates conversation loading from unread-count enrichment. Coach
  message operations use the shared visible lookup; client operations share
  one Ctx-based upsert path. Listing/sending messages and marking read no
  longer calculate an unread count they discard. Public conversation reads
  still add the count, and mark-read still returns zero with the client
  association loaded. Upsert retains its client check and transaction;
  read-response enrichment follows it. `mix precommit` passed: 1,553 tests,
  no failures; 155 typed routes checked; no Credo issues.

* Chat's conversation list, detail, waiting, and handled-state paths share
  one private tenant/coach-visibility query. Detail lookup applies visibility
  before loading its response and no longer queries the client separately
  for authorization. The shared schema predicate retains owner access,
  assigned-coach access, and denial for missing coach context. Existing
  visibility and channel tests remain in the full gate. `mix precommit`
  passed: 1,553 tests, no failures; 155 typed routes checked; no Credo issues.

* Retained Workbench's facade after tracing all six queue list paths: it owns
  option defaults, tagged results, and batch business preloads for client
  projections; Replies delegates its conversation projection to Chat. All
  six paths reach Utils.paginate, which defaults to 20, caps at 100, and
  clamps negative offsets to zero. Five do so directly and Replies does so
  through Chat.list_waiting_conversations. No new abstraction or runtime
  change was warranted; this is source evidence for those interface and
  pagination properties, not a claim of whole-domain compliance.

* WorkbenchProgrammingQueue shares the interval projection for training
  and nutrition instead of maintaining two identical select maps. Each
  schema still supplies its own covering_intervals query and policy; the
  service tag is the projection's explicit argument. `mix precommit` passed:
  1,553 tests, no failures; 155 typed routes checked; no Credo issues, including
  the existing Workbench coverage and representative query-plan tests.

* CheckInSchedule insertion casts only the creation fields, frequency and
  next_due_on; new schedules use the active default, matching the existing
  typed create contract. Updates retain active for pause/reactivate. Existing
  atom/string input tests now assert creation ignores active overrides.
  The due-today generation regression now derives its date from today rather
  than exercising an old fixed date. `mix precommit` passed: 1,553 tests,
  no failures; 155 typed routes checked; no Credo issues.

* After replacing Date.shift, checked 1,472 direct imports classified as
  Elixir/Logger/IEx standard-library calls across 362 compiled application
  modules against installed function documentation's since metadata. No
  remaining checked API is documented as introduced after Elixir 1.15.
  This bounds the finding to direct imports with available metadata; it
  does not cover dynamic calls, inlined APIs, dependency compatibility, or
  replace compiling and running the Docker release. No application startup
  or production-code change was needed for this check.

* Monthly check-in advancement no longer calls Date.shift/2, whose installed
  documentation marks it as introduced in Elixir 1.17, beyond the Docker
  builder's 1.15.7. The pure replacement uses Date functions available by
  1.11 and preserves day clamping. Regressions cover ordinary months,
  February, leap years, year rollover, and repeated catch-up past an explicit
  date. `mix precommit` passed on the local runtime: 1,553 tests, no failures;
  155 typed routes checked; no Credo issues. No Docker build was performed.

* CheckIns creation and reactivation share ensure_schedule_capacity instead
  of duplicating the active-schedule count comparison and cap error. The
  existing soft limit and transaction boundaries are unchanged. Existing
  routed tests reject both a fourth active schedule and reactivation past
  the cap, including persisted-state verification for the paused schedule.
  `mix precommit` passed: 1,552 tests, no failures; 155 typed routes checked;
  no Credo issues.

* Fixed Billing's unresolved Payload.subscription type reference by aliasing
  Easy.Razorpay.Payload. A compiled-domain scan found this one unresolved
  remote type in specs and declared types. Added an architecture test that
  verifies remote type module, name, arity, and public visibility throughout
  lib/easy; it does not prove value-level spec correctness or missing-spec
  coverage. `mix precommit` passed: 1,552 tests, no failures; 155 typed routes
  checked; no Credo issues. Runtime behavior is unchanged.

* Retained the cohesive nutrition usage-query structure: PlanReader scopes
  menu references by business before filtering, and RecipeIngredient scopes
  food-reference queries itself. Added a regression for the recipe-only
  serving-reference branch: replacing a used serving identity fails without
  persisting changes, while editing the same serving's weight succeeds.
  Production implementation is unchanged. `mix precommit` passed: 1,551 tests,
  no failures; 155 typed routes checked; no Credo issues.

* OneTimeTokens.with_issuance_lock preserves the callback's result and
  error types in its polymorphic spec; SweeperLock.run likewise ties its
  returned value to the callback result type. Implementations are unchanged.
  Traced Identity.Invitations error translation through membership, billing,
  and session creation; its declared errors cover those returned outcomes.
  `mix precommit` passed: 1,550 tests, no failures; 155 typed routes checked;
  no Credo issues.

* Removed twelve invitation forwarding APIs and duplicated specs from
  Clients and Coaches. Controllers, Identity.Invitations, and existing
  tests call ClientInvitations or CoachInvitations directly. Removed the
  redundant Clients invitation-error type; the owning context retains its
  contract. Updated a development-script comment without executing it.
  No invitation policy or HTTP contract changed. `mix precommit` passed:
  1,550 tests, no failures; 155 typed routes checked; no Credo issues.
  Backend source/test/script search finds no callers of the removed APIs.

* ClientAccount owns active-client membership lookup used by the HTTP plug
  and UserSocket. Renamed Client.accepted to Client.active because its
  predicate requires active status; invitation acceptance alone does not
  establish that status. SessionFactory uses the same renamed filter.
  Removed the now-unused Clients result helper. Authorization predicates
  and error responses are unchanged. `mix precommit` passed: 1,550 tests,
  no failures; 155 typed routes checked; no Credo issues.

* Client account profile reads and writes share profile assembly; updates
  use the persisted client returned by Repo instead of fetching it again.
  Removed the unused Clients stage-advancement wrapper and the required-
  services delegate whose only callers were tests. Those tests now exercise
  ClientAccount directly, matching the existing submission workflow.
  `mix precommit` passed: 1,550 tests, no failures; 155 typed routes checked;
  no Credo issues. No remaining backend callers use the removed wrappers.

* ClientAccount now owns client account profile reads, updates, response type,
  and assigned-coach lookup alongside its existing account authorization.
  The profile controller calls it directly; Clients no longer carries this
  self-service workflow or depends on Orgs. HTTP shapes are unchanged.
  `mix precommit` passed: 1,550 tests, no failures; 155 typed routes checked;
  no Credo issues. Compiler xref reports the same seven schema/framework
  cycles, with no context cycle introduced by the move.

* Coach invitation token, normalized-email, and pending-invitation queries
  now belong to the Coach schema. CoachInvitations composes those builders
  and no longer imports Ecto.Query; persistence, delivery, and acceptance
  outcomes remain in the context. Existing invitation tests cover normalized
  email reuse, token states, successful acceptance, and repeated acceptance.
  `mix precommit` passed: 1,550 tests, no failures; 155 typed routes checked;
  no Credo issues.

* Client status/stage and Prospect status query specs name their actual
  closed atom vocabularies while retaining string input and nil support.
  Consolidated Client.for_status's identical atom/string clauses under
  one guard. Existing empty-filter behavior and Ecto enum casting remain
  unchanged. `mix precommit` passed: 1,550 tests, no failures; 155 typed
  routes checked; no Credo issues.

* Client.expired_subscriptions/2 owns the active-client/end-date query.
  ClientSubscriptionSweeper accepts an explicit date with its existing
  UTC-today default, and no longer imports Ecto.Query. The existing
  regression now supplies a future sweep date, proving that argument
  controls expiry, and includes a client ending on that date to verify
  the inclusive subscription boundary. Process inspection retained
  reminder batch concurrency 10, batch reads 100, and async-mail cap 20;
  these are per-stream/per-supervisor bounds, not global mail durability
  guarantees. `mix precommit` passed: 1,550 tests, no failures; 155 typed
  routes checked; no Credo issues.

* Added /ready as an infrastructure readiness endpoint: 204 after a
  successful SELECT 1, 503 service_unavailable for database failure.
  Easy.Health owns the query with a 1,000 ms timeout, queue disabled, and
  query logging disabled; the controller only maps its tagged result.
  Connection errors and pool exits normalize to a bare domain error,
  and FallbackController omits database details. Fly's traffic probe now
  uses /ready; Docker and /api/health retain liveness behavior. Tests cover
  the actual test-database success path, simulated driver error/exception/
  exit paths, and 503 rendering separately. `mix precommit` passed: 1,550
  tests, no failures; 155 typed routes checked; no Credo issues. The route
  is outside frontend API prefixes, so no frontend files changed. This
  checks database connectivity, not pending migrations or external
  providers. Nothing was deployed and no database process was stopped.

* Bounded HTTP shutdown check: config.exs selects Bandit.PhoenixAdapter;
  runtime HTTP options do not override Thousand Island shutdown_timeout.
  Installed ThousandIsland.ServerConfig defaults to 15,000 ms and its
  connection child spec uses that timeout. Its shutdown listener stops
  accepting connections before existing handlers finish. Fly's checked-in
  kill_timeout is 30 seconds. Retained this compatible HTTP configuration;
  this does not prove total application drain time or durable email
  completion. No production process was stopped and no gate rerun was
  needed for this source-only check. Database readiness remains the next
  concrete deployment gap.

* Release tasks extract Ecto.Migrator.with_repo's operation result through
  one helper. Rollback previously returned the third tuple element
  (started applications), contrary to its migration-version result spec;
  installed Ecto source at migrator.ex:170 confirms the callback result
  is second. Migrate/seed now return per-repository operation results,
  with migrate's concrete version-list spec. Shell consumers ignore the
  returned values. `mix precommit` passed: 1,546 tests, no failures; 154
  typed routes checked; no Credo issues. No release migration, rollback,
  seed, Docker build, or deployment was executed. Deployment inspection
  confirms separate migration execution and runtime_tools inclusion;
  the current health endpoint/Fly probe tests liveness only, leaving
  database readiness and shutdown-timeout alignment unverified.

* Identity's facade now specifies each token grant's credential/error
  contract and reuses SessionFactory.session_opts for verification.
  Session options describe metadata and role, without unrelated token
  fields. EmailConfirmation passes options to SessionFactory with an
  enforced guest role, allowing its shared metadata defaults instead of
  requiring keys through dot access. A regression proves missing metadata
  succeeds and a requested coach role cannot change confirmation scope.
  Corrected its initial empty-string expectation to Ecto's persisted nil.
  Final `mix precommit` passed: 1,546 tests, no failures; 154 typed routes
  checked; no Credo issues.

* AuthTokens' OTP grant accepts email/code and owns hash construction.
  EmailConfirmation.verify_otp/3 owns confirmation-code hashing and
  invalid/expired OTP translation; Identity exposes that workflow.
  AuthController no longer depends on OneTimeTokens or translates token
  errors for OTP requests. Confirmation fixes its guest role internally;
  session metadata excludes email/code before persistence. Updated the
  existing consumption test helper to the new domain input contract,
  including two initially missed callers. Final `mix precommit` passed:
  1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* AuthController's six session-producing paths share session_options/2
  for trusted request IP and user-agent metadata. Replaced dotted tuple
  joining with :inet.ntoa, correcting IPv6 session IPs while preserving
  IPv4 formatting. Extended existing refresh and OTP tests to assert
  persisted IPv6/custom user-agent and IPv4/default user-agent values.
  Role/grant options remain separate inputs to the helper. `mix precommit`
  passed: 1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* TrainingExercise.copy_changeset/3 owns source-field copying, name-only
  request casting, copied associations, and insert constraints. Normal
  creation and copying share the insert constraint helper. Library no
  longer converts all keys or assembles copy attributes; removed the
  exposed copy_attrs helper. Existing tests cover atom/string name keys,
  copied equipment, preserved tracking, ignored overrides, and creation
  of a custom tenant exercise from a system source. `mix precommit`
  passed: 1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* RecipeWriter uses the recipe changeset's normalized params to obtain
  ingredient input, removing its whole-map key conversion and scalar/
  ingredient argument split. Create and update build one changeset;
  omitted ingredients remain unchanged, an empty list clears them, and
  invalid values still return errors and roll back metadata writes.
  Existing tests cover string-keyed ingredients, omission, clearing,
  atom-keyed invalid values, and rollback. `mix precommit` passed:
  1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* Chat.Message has one insert_changeset/5 for trusted scope and body
  validation. Removed the /6 variant and arity-dependent body requirement;
  put_content/3 now exclusively checks the completed content choice and
  applies resolved embeds. ChatMessages already resolves attachments and
  embeds before that step. Updated schema tests to exercise this actual
  sequence for empty, whitespace, attachment-only, embed-only, and invalid
  embed content; database constraint tests remain. `mix precommit` passed:
  1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* Client update/reassignment share expiry enrichment in their existing
  mutation loader. Reassignment previously returned the default false
  expiring_soon flag even when the same client's GET returned true;
  the shared loader now computes it after association loading. Removed
  update_client's separate enrichment step. Extended the existing
  reassignment test with an active subscription ending in seven days and
  explicit write/GET flag assertions. `mix precommit` passed: 1,545 tests,
  no failures; 154 typed routes checked; no Credo issues. Landing-page
  write/read program ordering already shares the association's
  position/id preload order, so that loading path was retained.

* Removed Landing's four prospect forwarding APIs and their duplicate
  result specs. The prospect controller calls Prospects directly; the
  existing enrollment concurrency test uses the same owner. Landing
  retains landing pages and public applications. Backend .ex/.exs source
  checks found no remaining calls through the removed APIs. Enrollment
  behavior is unchanged. `mix precommit` passed: 1,545 tests, no failures;
  154 typed routes checked; no Credo issues.

* Removed the Forms facade and its 26 forwarding functions. Fourteen
  caller files now use Templates, Assignments, Submissions, or CheckIns
  directly. Moved the sole submission orchestration function into
  Submissions.submit_client_assignment/3, preserving parsing, client
  authorization, assignment lookup, and submission order. Backend source
  checks found no remaining facade calls/imports. Fixed an alias-order
  finding; final `mix precommit` passed: 1,545 tests, no failures; 154 typed
  routes checked; no Credo issues. Compiler xref still reports the same
  seven schema/web cycles and no context cycle involving the new
  Submissions-to-Assignments dependency.

* Training template creation reuses PlanReader.get_template through the
  existing mutation finalizer; removed its duplicate reload query.
  Training and nutrition locked-plan mutations now sequence authorization,
  revision validation, and mutation directly with `with`. A nil clause
  handles missing plans; ClientAccess already returns the exact not_found
  error needed for denied clients, so training's extra error-normalization
  helper and nutrition's nested case are unnecessary. Existing mutation
  tests cover invisible clients and revision behavior. `mix precommit`
  passed: 1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* Removed Nutrition.Programming's twelve read forwarding declarations
  and its guidance/read_error type aliases. Three controllers, ten test
  modules, and the development nutrition builder now use PlanReader
  directly. Mutation reloads and error specs name PlanReader explicitly.
  Backend .ex/.exs source checks found no remaining calls through the
  removed Programming APIs. The development script was updated but not
  executed. `mix precommit` passed: 1,545 tests, no failures; 154 typed
  routes checked; no Credo issues. Read behavior and HTTP contracts are
  unchanged.

* Removed Training.Programming's nine read forwarding APIs and duplicate
  result specs. Three controllers and five training test modules now
  call Training.PlanReader directly. Programming retains mutations and
  explicitly calls PlanReader for mutation reloads. Bounded source
  checks found no remaining calls to the removed APIs in those training
  scopes; nutrition's separate Programming API is unchanged. Fixed the
  initial gate's long-line and alias-order findings. Final `mix precommit`
  passed: 1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* Client owns invitation-token, active-client-in-another-business, and
  pending-invitation query predicates. The latter two compose its existing
  user/business/status filters. ClientInvitations no longer imports
  Ecto.Query; it retains Repo operations, seat decisions, acceptance
  updates, and delivery orchestration. Existing predicates and selected
  acceptance rows are unchanged; no concurrency policy was changed.
  `mix precommit` passed: 1,545 tests, no failures; 154 typed routes
  checked; no Credo issues.

* Training.PlanReader now populates TrainingPlan's virtual lifecycle field
  for individual reads, lists, coverage, and startable prescriptions.
  The JSON formatter copies this value instead of reading the clock and
  invoking domain policy. Mutation responses already reload through these
  readers; newly created templates retain their nil lifecycle. Existing
  UTC-today behavior is preserved, including coverage responses. Added
  domain assertions for incomplete list and archived detail results;
  existing controller tests cover current, incomplete, and ended JSON
  labels. `mix precommit` passed: 1,545 tests, no failures; 154 typed
  routes checked; no Credo issues.

* Removed five obsolete FallbackController branches: invalid_schedule,
  invalid_day, invalid_element_ids, last_day, and max_options. Bounded
  source searches across backend lib, test, and priv found those names
  only in the removed handlers. Retained too_many_programs, which has
  a current LandingPage producer and test. This removes 37 lines of
  unused error translation. `mix precommit` passed: 1,545 tests, no
  failures; 154 typed routes checked; no Credo issues.

* Enabled Credo.Warning.UnsafeToAtom for lib/**/*.ex, adding enforcement
  for the documented runtime atom-creation rule. Its first run caught
  FallbackController's interpolated HTTP-status atom, missed by the earlier
  named-call search. Replaced it with the equivalent JSON template string;
  installed Phoenix source confirms both rendering paths resolve the
  template/format. Final `mix precommit` passed: 1,545 tests, no failures;
  154 typed routes checked; 70 Credo checks, no issues. Error payloads and
  status mappings remain unchanged.

* Business.dashboard_setup_hidden_reason/0 and QueueSnooze.queue/0 name
  the closed vocabularies already accepted by their schemas. Their public
  vocabulary/query specs no longer promise arbitrary atoms. Current queue
  consumers pass the declared quiet/expiring values. Generic atom lists
  remain appropriate for Utils.safe_to_atom and Application.config_change.
  Runtime behavior is unchanged. `mix precommit` passed: 1,545 tests, no
  failures; 154 typed routes checked; no Credo issues.

* Removed FormSubmission.validate_answers/2 and
  Diary.CorrectionPolicy.applied_timezone/1 forwarding APIs. Answer tests
  call FormAnswers.validate/2 directly; diary consumers and timezone tests
  call Client.applied_timezone/1. Validation and timezone selection stay
  with their existing owners, with no runtime policy change. Backend source
  checks found no remaining calls through the removed APIs. `mix precommit`
  passed: 1,545 tests, no failures; 154 typed routes checked; no Credo issues.

* Storage uses URI.char_unreserved?/1 instead of its duplicate five-clause
  character predicate; installed Elixir documentation confirms the same
  RFC 3986 character set. Signing specs now name expiry, timestamp, and
  private/public-store options. The signing module remains cohesive;
  existing tests cover stable signatures/encoding, ACL signing, invalid
  expiry/configuration, path prefixes, custom ports, and IPv6 authorities.
  `mix precommit` passed: 1,545 tests, no failures; 154 typed routes checked;
  no Credo issues.

* Razorpay returns Payload.subscription/0 values after response validation,
  adding plan_id to the existing normalized subscription contract. Billing
  consumes named fields directly and no longer knows provider JSON keys or
  performs subscription normalization after fetch. Webhook and HTTP paths
  share the same representation. Updated the adapter test to verify the
  complete normalized result, Unix-time conversion, and exclusion of an
  unrelated provider field. `mix precommit` passed: 1,545 tests, no failures;
  154 typed routes checked; no Credo issues. Public checkout JSON and
  provider error/identity validation remain unchanged.

* MailerDelivery's shared synchronous boundary emits
  [:easy, :mailer, :delivery, :start | :stop] spans with duration and an
  :ok/:error outcome. The private delivery/logging function retains
  provider-error and exception normalization; asynchronous delivery uses
  the same boundary. Telemetry omits email addresses, subjects, provider
  reasons, and caller metadata. A regression covers success, rejection,
  and provider exception, including span correlation and metadata shape.
  `mix precommit` passed: 1,545 tests, no failures; 154 typed routes checked;
  no Credo issues. Current Application/config/source inspection still
  shows no monitoring consumer/exporter or alert wiring; four-layer
  actionable monitoring remains unproven. No external mail was sent by
  the telemetry test; it uses the existing in-process fake adapter.

* Bounded ItemResolver structural check: read/write resolution shares one
  loader and map-building pass; canonical full references retain distinct
  portions and duplicate references are collapsed. The reducer directly
  builds the required map and stops on the first error, so retain it instead
  of introducing an intermediate list solely to reuse Result.traverse.
  Existing recipe tests verify duplicate/order independence, portion
  nutrient scaling, and foreign-business recipe denial. available/2 now
  specifies the food_id/recipe_id input fields and returned typed-ID set.
  Runtime logic is unchanged. `mix precommit` passed: 1,544 tests, no
  failures; 154 typed routes checked; no Credo issues.

* Removed Nutrition.Library's four item-resolution forwarding functions
  and five type aliases. Remaining recipe-resolution tests call
  ItemResolver directly. ItemResolver's specs reference the canonical
  ItemReference types, removing another five forwarding type aliases.
  Backend source checks found no remaining references to the removed
  APIs/types. Resolution logic is unchanged. `mix precommit` passed:
  1,544 tests, no failures; 154 typed routes checked; no Credo issues.

* Cross-domain consumers depend directly on the modules owning their
  operations: ChatMessages uses Forms.Submissions; ClientInvitations uses
  Forms.Assignments; diary EntryResolver and DayAssembler use ItemResolver.
  Removed their broad Forms/Library aliases and forwarding calls without
  changing operation arguments or results. `mix precommit` passed: 1,544
  tests, no failures; 154 typed routes checked; no Credo issues. Compiler
  xref still reports the seven existing web/schema-association cycles;
  these dependency changes introduce no reported context cycle.

* ArchitectureTest now checks compiled schema imports for direct reads
  through Date/DateTime/NaiveDateTime/Time UTC clocks and common
  System/Erlang/OS wall-clock APIs. It reports exact calling modules and
  functions, alongside the existing persistence/HTTP-boundary checks.
  Removed TrainingPlan.lifecycle/1's implicit date; its formatter supplies
  UTC today explicitly, preserving current response behavior. The check
  covers the listed direct imports, not dynamic calls or every possible
  indirect clock wrapper. `mix precommit` passed: 1,544 tests, no failures;
  154 typed routes checked; no Credo issues.

* Removed Nutrition.Plan.lifecycle/1's unused current-date default;
  lifecycle callers already provide their effective dates. OTP expiry
  checks now receive current time explicitly from AuthTokens,
  EmailConfirmation, and Invitations. OneTimeToken.expired?/2 retains
  its existing ten-minute boundary and deterministic boundary tests.
  `mix precommit` passed: 1,543 tests, no failures; 154 typed routes checked;
  no Credo issues. Token issuance and synchronization are unchanged.

* WeightEntry.insert_changeset/4 receives the validation date from its
  context and reuses the existing date_allowed?/2 rule without a schema
  clock read. Submission-derived entries share one context date per batch.
  Updated all direct callers and strengthened the existing future-date
  test with a supplied historical day, proving validation uses that input.
  An accidental fixture-date edit found by the initial gate was restored.
  Final `mix precommit` passed: 1,543 tests, no failures; 154 typed routes
  checked; no Credo issues. Upsert/locking behavior is unchanged.

* Client.update_changeset/3 receives the effective date from Clients or
  ClientAccount instead of reading today's date during reactivation
  validation. Updated direct schema callers. A regression uses one client
  to verify reactivation is allowed on its subscription end date and
  rejected on the following supplied date. Context behavior still uses
  UTC today and existing seat reservation is unchanged. `mix precommit`
  passed: 1,543 tests, no failures; 154 typed routes checked; no Credo issues.

* UserSession changesets accept the existing trusted scope value directly,
  reducing insert/update interfaces from six positional arguments to three
  and four. One private put_scope/2 stamps business, role, coach, and owner
  state outside editable metadata casting. Refresh time comes from
  UserSessions and is no longer cast from metadata; expiration checks take
  SessionFactory's current time explicitly. Expiry comparison and scope
  defaults are unchanged. Source checks found all three schema consumers
  updated. `mix precommit` passed: 1,542 tests, no failures; 154 typed routes
  checked; no Credo issues. No token rotation or locking behavior changed.

* FormAssignment.update_changeset/3 receives context time for coach-driven
  completion instead of reading the clock in sync_completed_at. Updated
  its context and direct schema-test callers. Existing completion stamps
  remain preserved while completed, and reopening clears them. Submission
  completion already uses submission.submitted_at and required no change.
  `mix precommit` passed: 1,542 tests, no failures; 154 typed routes checked;
  no Credo issues.

* TrainingPlan and Nutrition.Plan lifecycle changesets take the desired
  archive timestamp directly. Their programming contexts supply current
  time for archive and nil for restore; the schemas retain revision and
  constraint handling without reading the clock or translating action
  atoms. Existing context idempotency checks are unchanged. The full gate
  includes training/nutrition archive, restore, revision, and coverage
  conflict tests. `mix precommit` passed: 1,542 tests, no failures;
  154 typed routes checked; no Credo issues.

* Identity confirmation timestamps are explicit trusted arguments.
  User.insert_changeset/2 no longer casts confirmation_sent_at from input;
  Users.create/2 and create_if_absent/2 pass it separately, retaining their
  one-argument nil defaults. Signup removes key-stringification/timestamp
  injection; Invitations and the development client-user linking script
  use the explicit interface. User.confirm_email/2 and
  touch_confirmation_sent/2 receive context time instead of reading the
  clock in the schema. The development script was updated, not executed.
  Existing signup coverage verifies caller timestamps cannot override the
  server value. `mix precommit` passed: 1,542 tests, no failures; 154 typed
  routes checked; no Credo issues. OTP issuance/locking behavior is unchanged.

* Coach profile updates build one Coach.update_changeset/2 and use its
  normalized parameters for the business-field mapping. Removed the
  context's duplicated coach-field whitelist and key-stringification
  helper; persist_profile now accepts the coach and original attributes.
  The coach/business transaction and omission-versus-explicit-nil mapping
  remain intact. Existing tests cover combined updates, nullable-field
  clearing, and rollback when business validation fails. `mix precommit`
  passed: 1,542 tests, no failures; 154 typed routes checked; no Credo issues.

* Client.assigned_to/2 owns the assignment predicate shared by coach
  visibility and deactivation reassignment. Coaches composes it with
  Client.for_business/2 before its existing bulk update; removed its direct
  Ecto.Query import. Tenant scope and write behavior are unchanged. Existing
  tests cover reassignment/session revocation, owner protection, non-owner
  denial, foreign-business coaches, and invited/inactive states.
  `mix precommit` passed: 1,542 tests, no failures; 154 typed routes checked;
  no Credo issues.

* Message.attachment_ids/1 and embed_reference/1 own chat reference
  validation, reading normalized changeset parameters and the trusted
  sender field. ChatMessages no longer stringifies top-level parameters
  or validates attachment list shape/count/uniqueness, UUIDs, or embed
  shape/sender policy. It loads scoped records, assembles the authoritative
  embed snapshot, persists, and broadcasts. Existing tests cover both key
  formats, attachment order/errors, typed embed values, client embed denial,
  and cross-tenant content rejection. `mix precommit` passed: 1,542 tests,
  no failures; 154 typed routes checked; no Credo issues. No new concurrency
  behavior or additional extraction-only tests were introduced.

* ChatMessages builds one message changeset and enriches it with resolved
  content through Message.put_content/3. Message owns body trimming and
  the requirement for text when no attachment/embed supplies content.
  Removed the second insertion-changeset construction and context body
  normalization/content validation. A schema regression verifies trimming
  before the length limit and rejection of whitespace-only text. Existing
  chat tests exercise attachment/embed-only messages and invalid content.
  `mix precommit` passed: 1,542 tests, no failures; 154 typed routes checked;
  no Credo issues. Transaction/broadcast behavior is unchanged.

* TrainingExercise.reference_input/1 owns typed muscle/equipment/media
  reference parsing with Ecto.UUID. Create/update context workflows consume
  the parsed IDs without stringifying attributes or probing raw keys.
  Malformed IDs/list shapes return changeset errors before reference queries;
  nil entries in lists are rejected. Omitted/nil lists preserve update
  associations and empty lists clear them; creation retains empty defaults.
  Existing well-formed missing muscle/equipment IDs still follow the current
  reference-loading behavior. Regression coverage verifies rejected writes
  leave the original exercise and associations intact. All 10 focused tests
  and `mix precommit` passed: 1,541 tests, no failures; 154 typed routes
  checked; no Credo issues.

* TrainingExercise.copy_attrs/1 owns exercise duplication fields, derived
  from its editable-field inventory with source/import identity and name
  excluded. Library supplies the requested name and trusted tenant while
  retaining the existing association-copy workflow. This removes the
  context's second field inventory and fixes omitted tracking_type: copied
  duration exercises retain duration tracking. A regression duplicates a
  system exercise into a custom tenant exercise, preserving its definition
  and ignoring submitted tracking/tenant/source overrides. `mix precommit`
  passed: 1,540 tests, no failures; 154 typed routes checked; no Credo issues.

* PerformedSetController and its domain/test consumers call PerformedSets
  directly. Removed Execution's three performed-set forwarding functions
  and their aliases, leaving that context focused on session operations.
  Source checks found no remaining calls through those Execution APIs.
  The initial cutover passed all 1,538 tests before the input change below.

* TrainingPerformedSet owns exercise-reference parsing with Ecto.UUID and
  stored exercise identity/name assignment. PerformedSets no longer
  stringifies input keys or injects a name into request attributes; it
  resolves a visible exercise and passes that trusted record to the
  insertion changeset. Only explicitly named work casts exercise_name.
  Malformed IDs now return changeset errors before exercise lookup.
  A regression covers malformed references/no inserts; the existing
  stored-name test also covers an invalid submitted name being ignored.
  All 24 focused tests and `mix precommit` passed: 1,539 tests, no failures;
  154 typed routes checked; no Credo issues. Locking behavior is unchanged.

* Training session creation reuses the shared client-scoped session reload
  instead of maintaining a second query/preload implementation. Kept the
  lock-and-mutate helper: inlining it exceeded the repository nesting limit.
  SetVocab and the training session/exercise schemas now expose finite
  vocabulary types; session insertion names its required start data and
  optional prescription fields. The state filter spec includes its existing
  string input. No race handling changed. `mix precommit` passed: 1,538
  tests, no failures; 154 typed routes checked; no Credo issues.

* Repo.count_unique/2 owns the repeated distinct-projection/subquery count
  used by Chat and the onboarding, check-in, and programming queues.
  Removed four private counting implementations while retaining their
  scoped queries and identity fields. Repo.snapshot/1 now preserves
  callback result/error types and declares its added :conflict result.
  Runtime counting and snapshot behavior are unchanged. `mix precommit`
  passed: 1,538 tests, no failures; 154 typed routes checked.

* Bounded structural check of WorkbenchProgrammingQueue: counts and lists
  share service_facts/2; tenant/visibility filtering precedes service
  expansion, coverage uses schema interval builders, and priority ordering
  precedes SQL pagination with client ID as the final tie-break. Keep this
  query cohesive rather than duplicating priority/coverage policy in a
  separate Elixir assembly pass. Its seven existing tests cover overlapping
  service counts, coverage boundaries/successors/gaps, history, filtering,
  pagination, tenant/visibility denial, and local-midnight behavior. They
  were included in the latest passing 1,538-test precommit run. No code
  change or additional gate run was needed for this structural check.

* CoachInvitations builds one invitation changeset and uses its email for
  owner/existing-membership checks and insertion. Coach.normalize_email/1
  owns trimming and lowercasing, eliminating the previous mismatch between
  trimmed lookup and untrimmed inserts. Removed context key normalization
  and duplicate changeset construction. A regression covers both key
  formats, padded/mixed-case creation, repeat lookup, and self-invite denial.
  All 47 focused tests and `mix precommit` passed: 1,538 tests, no failures;
  154 typed routes checked.

* Removed unused Utils.safe_date/1, weekday_name/1, and
  weekday_number_to_name/1, plus WorkoutSchedule.normalize_weekday/1.
  Backend Elixir source checks found only their definitions/internal call;
  domain parsers and Ecto enum casting already own the active paths.
  This removes the obsolete second weekday-name inventory. `mix precommit`
  passed: 1,537 tests, no failures; 154 typed routes checked.

* Attachment and Media changesets derive storage keys from positional
  tenant/client/record IDs and cast content types; storage_key is no longer
  an editable input. Media also owns its existing atom-content-type
  normalization. Upload contexts now generate IDs, construct changesets,
  persist, and sign without assembling request-derived attribute maps.
  Schema regressions cover supplied key/identity overrides and media enum
  input. Existing focused upload tests and `mix precommit` passed:
  1,537 tests, no failures; 154 typed routes checked.

* MediaType owns the MIME-to-extension table used by attachment and
  library-media storage-key construction. Removed both schema lookup
  functions and their duplicated tables. Each schema retains its own
  allowed content types and size limits; supported upload paths keep
  their existing extensions. `mix precommit` passed: 1,535 tests,
  no failures; 154 typed routes checked.

* Removed Clients forwarding methods for authorize_client/2,
  authorize_client_id/2, get_client_account/1, and record_client_activity/2
  after internal consumers moved to ClientAccess/ClientAccount. Remaining
  local profile/reassignment calls and boundary tests now use the owning
  modules directly. Source checks found no remaining qualified calls to
  the removed methods in lib/test. `mix precommit` passed: 1,535 tests,
  no failures; 154 typed routes checked.

* Nutrition.Diary and Workbench call ClientAccess directly; diary account
  reads and activity writes call ClientAccount. The previous Clients
  methods were exact delegates to those implementations. `mix precommit`
  passed: 1,535 tests, no failures; 154 typed routes checked. Compiler xref
  before and after this cutover reports the same seven schema/framework
  cycles (lengths 47, 4, 4, 3, 2, 2, 2); recent helper, history, link, and
  email extractions introduced no context cycle in that graph.

* Attachments, Chat, and Training.Execution now call ClientAccess directly
  for authorization; execution activity recording calls ClientAccount.
  These remove dependencies on the broad Clients facade while preserving
  the exact delegated implementations. Attachment and LibraryMedia upload
  contracts declare string-to-string header maps. Initial upload changes
  and the final consumer cutover each passed `mix precommit`; final result:
  1,535 tests, no failures; 154 typed routes checked.

* Result.traverse/2 preserves callback input, output, and error types with
  type variables. Revision's parameterized mutation type preserves callback
  results, while locked/4 declares the not-found/changeset errors it adds.
  Scoped caller checks found no users of the old mutation/0 type. Runtime
  behavior is unchanged. `mix precommit` passed: 1,535 tests, no failures;
  154 typed routes checked.

* Email HTML templates share one private document layout for metadata,
  body styling, and the footer. Message content and dynamic-value escaping
  remain explicit in each template. Source checks found all backend
  html_body calls in Emails using Emails.HTML; Identity.Mailer composes
  through Emails. `mix precommit` passed: 1,535 tests, no failures;
  154 typed routes checked.

* Emails.HTML owns pure HTML rendering; Emails retains recipient/subject,
  plain-text composition, and link selection. Reminder markup shares one
  renderer, and all dynamic HTML text/attribute values are escaped with
  the existing Plug.HTML implementation. Names remain unchanged in plain
  text. New tests cover invitation names, all reminder variants, and link
  attribute injection. Phoenix.HTML was unavailable in this API project;
  the implementation uses Plug without adding a dependency. Focused tests
  and `mix precommit` passed: 1,535 tests, no failures; 154 typed routes checked.

* WeightEntry.date_allowed?/2 is the shared pure date predicate for schema
  validation and WeightEntries.Input, preserving the inclusive one-day
  timezone buffer and existing error forms. The client response formatter
  now uses Client.local_date/2, removing its duplicate timezone selection
  helper and using the domain's existing fallback behavior.
  `mix precommit` passed: 1,532 tests, no failures; 154 typed routes checked.

* WeightEntries.History owns pure goal/summary assembly, date selection,
  unit conversion, and rounded weight-change calculation previously in
  the web formatter. WeightEntries returns the complete history with
  concrete history/adherence types; both controllers now render that
  result directly. The obsolete formatter index function is removed.
  Existing response types, rounding, and date-tie behavior are preserved.
  Controller coverage includes empty histories and mixed-unit summaries.
  After correcting a missing do in the new module declaration, final
  `mix precommit` passed: 1,532 tests, no failures; 154 typed routes checked.

* AppLinks owns configured client-invitation, coach-invitation, and check-in
  URLs. Emails and the client response formatter share the same client
  invitation builder, removing duplicated configuration/path assembly and
  configuration access from the Client schema. Existing paths, defaults,
  and the pending-client/token condition for response links are preserved.
  Source checks confirm callers use AppLinks and old builders are removed.
  `mix precommit` passed: 1,532 tests, no failures; 154 typed routes checked.

* Coach inactive/invited subsets now belong to schema query builders used
  by reactivation and invitation lookup. Deactivation reuses the existing
  tenant-scoped active-coach lookup, removing its duplicate read/status
  branching. Owner protection and not-found behavior are unchanged;
  reassignment and invitation acceptance writes were not altered.
  `mix precommit` passed: 1,532 tests, no failures; 154 typed routes checked.

* Business.dashboard_setup_input/1 owns key normalization and the required
  presence check, removing input-shape branches and changeset construction
  from Orgs. Dashboard setup changesets receive the timestamp from the
  context. Missing input, explicit resets, completed-state latching, and
  profile-field exclusion retain their existing behavior. The first gate
  identified nesting and long test lines, which were corrected. All 27
  organization tests and the final `mix precommit` passed: 1,532 tests,
  no failures; 154 typed routes checked.

* Razorpay.Payload converts validated subscription/payment entities into
  concrete atom-keyed values for billing transitions. Unix period-end
  conversion and the existing paise-to-rupee truncation now belong to the
  provider boundary; webhook application and manual sync share the same
  subscription conversion. Unknown events carry nil entities and retain
  their receipt name. Webhook's callback type uses Payload.webhook/0.
  Payload regressions cover field/unit conversion and optional payment
  values. All 68 focused tests and `mix precommit` passed: 1,532 tests,
  no failures; 154 typed routes checked.

* BusinessBilling owns seat-increase casting/range validation and the
  subscribed-state predicate shared by checkout and quantity events.
  Billing no longer constructs an upper-limit-only input changeset or
  duplicates the active/past-due/cancellation-pending status list. Invalid
  seat increases return changeset errors before billing persistence or
  provider calls; a context regression checks both boundaries. Subscription
  transitions and transaction ordering are unchanged. All 62 billing tests
  and `mix precommit` passed: 1,532 tests, no failures; 154 typed routes checked.

* PrescriptionInput owns Ecto casting for root collections, workouts,
  prescribed exercises, and schedule entries. Both key formats produce
  atom-keyed input for the writer; editable fields are whitelisted and
  weekdays use WorkoutSchedule's existing enum type. Nested collection
  checks now run during parsing rather than in a separate validation pass.
  force_changes preserves explicit nil values so malformed collections
  cannot disappear into defaults. A context regression covers string keys,
  numeric casting, schedule references, and attempted tenant/parent overrides.
  Focused tests exposed and verified the nil distinction; the initial gate
  required a single-branch with to become case. Final `mix precommit` passed:
  1,531 tests, no failures; 154 typed routes checked.

* PrescriptionInput validates prescribed-set collection shapes alongside
  workout/exercise collections before persistence preparation. Missing
  sets retain existing handling; explicit non-lists and non-map entries
  return a changeset error. The context regression verifies existing
  workout names, prescribed sets, and plan revisions remain unchanged
  for malformed input. All 13 prescription tests and `mix precommit`
  passed: 1,530 tests, no failures; 154 typed routes checked.

* Client and Coach invitation creation changesets now receive sent_at as
  a trusted positional argument before attrs. Coach resending follows
  the existing Client resend signature. Invitation contexts capture the
  second-precision timestamp; schema callers in tests pass it explicitly.
  Token generation, rotation, validation, and delivery are unchanged.
  `mix precommit` passed: 1,529 tests, no failures; 154 typed routes checked.
  The stale coach test describe label was then updated to the new arity.

* Client and Coach invitation expiry predicates now accept an explicit
  timestamp supplied by their invitation contexts. The Client predicate
  also reuses invitation_expires_at/1 instead of duplicating the deadline
  calculation. Nil timestamps and the strict expiry comparison retain
  their existing behavior. `mix precommit` passed: 1,529 tests, no failures;
  154 typed routes checked.

* PrescribedExercise.copy_attrs/1 owns copied exercise/position/set values,
  removing nested set transformation from PlanCopy transaction orchestration.
  PlannedSet.to_attrs/1 derives string keys from its existing cast-field
  list, removing a second manually maintained field inventory. Values and
  snapshot conversion behavior are preserved. `mix precommit` passed:
  1,529 tests, no failures; 154 typed routes checked.

* ArchitectureTest now enforces the existing AGENTS.md database/HTTP
  boundaries using compiled BEAM imports: schemas and controller sources
  cannot call Easy.Repo, and domain sources cannot call Plug.Conn. Schema
  detection uses __schema__/1 and each scope asserts it is nonempty.
  Failures identify the source/module/call and remediation. This follows
  the selected elixir-patterns boundary-enforcement reference without
  introducing another skill or review workflow. Static calls through
  renamed aliases are covered; dynamic dispatch and tenant predicates
  are not. The deprecated Xref.calls API was inspected but not used.
  Focused tests and `mix precommit` passed: 1,529 tests, no failures;
  154 typed routes checked.

* CheckInSchedule.template_reference/1 owns creation-reference UUID casting
  and required-field validation. CheckIns authorizes the client before
  parsing and resolving the tenant-scoped template, replacing its atom-only
  function head. Regressions cover both key formats, trusted IDs, malformed
  references, and foreign-template denial. The first full gate exposed a
  ChatTest telemetry collector that accepted queries from every async test
  process; it now captures only the calling test process. All 49 focused
  tests and the final `mix precommit` passed: 1,526 tests, no failures;
  154 typed routes checked. No product concurrency behavior changed.

* Fresh compiler boundary evidence: `mix xref callers Easy.Repo` reports
  56 source files. None intersect the 42 source files declaring
  `use Ecto.Schema`, and none are under controllers.
  `mix xref callers Plug.Conn` reports 53 files, all outside lib/easy/.
  These checks strengthen the earlier literal-text boundary scans for
  compiler-recorded dependencies. They do not establish transitive purity,
  dynamic dispatch safety, or tenant scoping. No code changed in this
  verification step; the latest full gate remains 1,524 passing tests.

* Removed obsolete TrainingWorkout.days/day_names delegates and the old
  Portions Ecto.Type/codec/format delegates after source checks found no
  remaining consumers. Portions uses Portion.t directly and now only owns
  option selection and quantity resolution. This supersedes the temporary
  compatibility bridges recorded earlier; persisted values and current
  schema codecs remain on Portion. `mix precommit` passed: 1,524 tests,
  no failures; 154 typed routes checked.

* TrainingPlan.covering_intervals/2 and active_in_window/3 share the
  scheduled client-plan subset. WorkbenchProgrammingQueue composes that
  schema query instead of repeating training eligibility filters, matching
  its existing nutrition boundary. Queue counts use Ecto filtered distinct
  counts instead of raw count fragments. All seven focused queue tests and
  `mix precommit` passed: 1,524 tests, no failures; 154 typed routes checked.

* Landing page reads and upserts share one tenant-scoped, oldest-first
  page query using LandingPage.oldest/1. Program association preload order
  now includes id after position. A regression creates two draft pages
  with the same timestamp in reverse ID order and verifies that the upsert
  changes the page selected by the read. Focused tests and `mix precommit`
  passed: 1,524 tests, no failures; 154 typed routes checked.

* Conversation and unreviewed-check-in lists now use Utils.paginate/2,
  replacing duplicate twenty-row caps with the contract maximum of 100.
  Message history retains its cursor/extra-row algorithm and minimum of
  one, with the same default 20 and corrected maximum 100. New regressions
  verify expanded list pages and a 105-message traversal capped at 100
  with no duplicate IDs. Focused tests and `mix precommit` passed:
  1,523 tests, no failures; 154 typed routes checked.

* Current Credo configuration enables public specs for lib/**/*.ex,
  nesting, cyclomatic complexity, and function-arity checks. It has no
  custom architecture checks (requires/plugins are empty). A green gate
  therefore does not prove dependency direction or tenant query scoping.

* Clients and Prospects list operations now compose Utils.paginate/2,
  removing duplicated clamps and replacing their twenty-row maximum with
  the backend contract: default 20, maximum 100. Existing integer query
  schemas remain valid; response shapes are unchanged. Context regressions
  use 105 records each to verify default, requested 25, maximum, offset,
  and total count. All 29 focused tests and `mix precommit` passed:
  1,520 tests, no failures; 154 typed routes checked.

* Named result types replace broad maps for ClientInvitations.preview,
  Nutrition.PlanReader.usage, LibraryMedia.public_media, and CheckInSweeper
  counts. Clients/Programming delegates reuse the owning module types.
  Nullable media fields and invitation states retain their existing
  representation; runtime behavior and JSON are unchanged.
  `mix precommit` passed: 1,518 tests, no failures; 154 typed routes checked.

* Client owns applied_timezone/1 and local_date/2, combining existing
  client/business/default timezone precedence with explicit-instant date
  conversion. Client summaries, Nutrition.PlanReader, and diary correction
  policy reuse those pure functions. Clock capture stays with callers;
  the plan reader retains its existing loaded-business/default clauses.
  Existing calendar, plan, diary, and full-suite tests passed in
  `mix precommit`: 1,518 tests, no failures; 154 typed routes checked.

* Prospect.invitation_attrs/2 owns enrollment name splitting, contact
  defaults, and key normalization. Prospects retains invitation/link
  orchestration; string-keyed coach overrides now work like atom-keyed
  overrides. Prospects.enrollment names the shared result shape and both
  contexts use ClientInvitations.error directly instead of Clients facade
  types. A regression covers persisted overrides, defaults, and the client
  link for both key formats. Focused tests and `mix precommit` passed:
  1,518 tests, no failures; 154 typed routes checked.

* CheckInSchedule owns reactivation detection, the due-date predicate, and
  next-due/id ordering. CheckIns composes those rules for updates, immediate
  generation, sweeps, and listing; generation counters now use explicit
  generated/inactive tuple updates instead of numeric selector helpers.
  The existing soft-cap and due-date behavior are preserved. Existing
  schedule/sweeper and full-suite tests passed in `mix precommit`: 1,517
  tests, no failures; 154 typed routes checked.

* Training.PlanReader owns template/client-plan reads, pagination, coverage,
  startable-prescription lookup, and current-plan names. Programming retains
  mutations and public delegates; Execution and Clients summaries use the
  reader directly. Existing authorization, date selection, preload, and
  return behavior are preserved. After correcting alias order,
  `mix precommit` passed: 1,517 tests, no failures; 154 typed routes checked.
  Compiler xref reports the same seven schema/web cycles, with no reader
  dependency on Programming and no new cycle.

* Internal nutrition read consumers now depend directly on PlanReader:
  Diary, DayAssembler, Clients summaries, Library usage, FoodWriter, and
  RecipeWriter. Diary read-error types use the same boundary. Programming
  remains the public facade; internal read dependencies no longer pass
  through its mutation implementation. Existing coverage, diary, reference
  protection, and full-suite tests passed in `mix precommit`: 1,517 tests,
  no failures; 154 typed routes checked.

* Nutrition.PlanReader owns plan/template reads, coverage, library-usage
  queries, menu resolution, pagination, snapshots, and lifecycle presentation.
  Programming retains writes and public read delegates; read_error/guidance
  types point to the reader. Scoped authorization, resolution failures,
  dates, and locking behavior are preserved. Existing nutrition read,
  coverage, diary, library-protection, and full-suite tests passed in
  `mix precommit`: 1,517 tests, no failures; 154 typed routes checked.
  Compiler xref reports the same seven schema/web cycles; PlanReader has
  no reverse Programming dependency or new cycle.

* Prospect.select_status_counts/1 owns the pure status-summary query, using
  Ecto filtered counts instead of context-owned CASE fragments. Prospects
  composes tenant scoping and persistence; its public result and Landing
  delegate use the concrete Prospect.status_counts type. The aggregate
  returns zero counts for an empty business without an unreachable fallback.
  A context regression checks empty counts, all statuses, list-filter
  independence, and cross-business exclusion. Focused tests and
  `mix precommit` passed: 1,517 tests, no failures; 154 typed routes checked.

* LandingPage.application_program/2 owns requested-program UUID casting and
  lookup within the resolved page. Landing submission orchestration no longer
  probes atom-only attributes. Both key formats retain valid selections;
  missing, invalid, unknown, and foreign-page IDs retain the existing general
  application fallback. A context regression checks selection and trusted
  page/business identity. Focused tests and `mix precommit` passed: 1,516
  tests, no failures; 154 typed routes checked.

* LandingPage.program_inputs/1 owns program-collection casting, entry-shape
  validation, and the three-program limit before Landing starts its write
  transaction. String-keyed inputs now preserve programs; malformed lists
  and nil return changeset errors instead of raising. Omitted programs still
  clear the collection; too_many_programs remains the capacity error. New
  context regressions verify replacement and rejected-input persistence.
  Focused tests and `mix precommit` passed: 1,515 tests, no failures; 154
  typed routes checked.

* Forms.Assignments owns assignment creation, intake uniqueness, coach/client
  reads, updates, and intake reminder delivery. Forms retains public delegates
  and submission orchestration, with no Repo dependency. Assignments calls
  Templates directly; existing query scopes, locks, errors, preloads, and
  delivery behavior are preserved. `mix precommit` passed: 1,513 tests, no
  failures; 154 typed routes checked. Compiler xref still reports the same
  seven schema/web cycles, with no Forms/Assignments context cycle.

* WorkoutSchedule.weekday_names/0 supplies both SQL ordering and training
  schedule rendering. TrainingWorkout no longer keeps a duplicate weekday
  enum; its existing days/day_names helpers delegate to WorkoutSchedule,
  with a closed weekday return type. Serialized schedules are unchanged.
  `mix precommit` passed: 1,513 tests, no failures; 154 typed routes checked.

* Billing composes Client.occupying_seat/1 and Client.oldest/1 for seat
  counting and waiting-client activation. Client owns the status subset and
  chronological query order; Billing retains tenant scoping, capacity, and
  writes. Existing seat accounting/activation tests and `mix precommit`
  passed: 1,513 tests, no failures; 154 typed routes checked.

* TrainingPlan field restrictions use Ecto-normalized changeset params directly.
  Creation/update share kind-specific restrictions, removing duplicated key-set
  construction and the duplicate template-restriction helper. Kind, status, and
  lifecycle specs use closed domain types. Existing protected-field, atom/string
  input, lifecycle, and full-suite tests passed in `mix precommit`:
  1,513 tests, no failures.

* Monitoring destination clarification was requested asynchronously. No system
  has been selected or inferred; structural work continues independently.

* WorkoutSchedule owns weekday normalization and a closed weekday type.
  PrescriptionInput delegates normalization; Training.Programming coverage specs
  use the type. SQL weekday ordering derives its parameterized text array from
  the same enum list, retaining the id tie-break. Duplicate parser/SQL weekday
  lists were removed. Existing schedule validation, ordering, copying, coverage,
  and full-suite tests passed in `mix precommit`: 1,513 tests, no failures.

* Portion formatting/type consumers in ItemReference, Day, Diary input/entry
  resolution/slot presentation, Menu, RecipeWriter, and recipe rendering now use
  the pure Portion value module. Remaining production Portions callers perform
  food/recipe option selection or quantity resolution. This completes the value
  boundary without changing serialized values or the compatibility facade.
  `mix precommit` passed: 1,513 tests, no failures.

* Nutrition.Portion owns the Ecto type, casting, serialization, and formatting
  of portion values without Food/Recipe dependencies. Portion fields in recipe
  ingredients, menus, and Diary snapshots use it. Portions retains food/recipe
  resolution and delegates its existing codec API for compatibility; Recipe copy
  formatting uses the value type. Persisted JSON and API shapes are unchanged.
  `mix precommit` passed: 1,513 tests, no failures. Xref still reports seven
  cycles, but the nutrition cycle shrank from Recipe/RecipeIngredient/Portions
  to the Recipe/RecipeIngredient relationship; resolution is no longer in it.

* ClientAccount owns trusted client-self account lookup, activity stamping, and
  required-service updates. Clients retains delegates; Forms, Submissions, and
  WeightEntries use ClientAccount for those operations and ClientAccess for coach
  visibility. Guards, SQL, and error returns are preserved. Existing account,
  activity, intake, weight, visibility, and full-suite tests passed in
  `mix precommit`: 1,513 tests, no failures. Compiler xref cycles fell from eight
  to seven: the five-file ClientInvitations/Clients/Forms/Submissions/WeightEntries
  cycle disappeared. Remaining cycles involve schema relationships and the web
  route/spec layer; their presence alone does not establish a defect.

* Client.full_name/1 owns the existing reminder name formatting shared by intake
  and check-in delivery. Clients.account_profile/0 names the shared result shape
  of profile reads and updates. Formatting and profile payloads are unchanged.
  Existing reminder/profile and full-suite tests passed in `mix precommit`:
  1,513 tests, no failures.

* WeightEntries.Input owns pure attribute normalization, entry-date parsing,
  history-since parsing, and the existing tomorrow-inclusive future-date rule.
  Entry parsing takes today explicitly and returns a typed date/attribute result;
  WeightEntries retains identity checks, persistence, activity, and history reads.
  Existing atom/string input, date, trusted-field, and full-suite tests passed in
  `mix precommit`: 1,513 tests, no failures.

* PrescriptionInput validates that each workout contains a list of exercise
  maps before persisted-node/reference logic runs. Malformed nested collections
  now return the existing workouts changeset error instead of reaching Map.get
  on non-map values. A regression covers nil, non-list, and non-map entries and
  verifies existing workouts/revision survive each rejected replacement.
  `mix precommit` passed: 1,513 tests, no failures.

* RecipeWriter normalizes outer attribute keys once and preserves omitted versus
  explicitly replaced ingredient collections. RecipeIngredient.item_reference/1
  casts food UUIDs and portions through a changeset before item resolution.
  String-keyed ingredients are no longer ignored, malformed UUIDs return not_found,
  and invalid collections return changeset errors instead of function-clause
  failures. Regression coverage includes create, omitted/empty replacements,
  malformed input, and rollback of metadata/revision. `mix precommit` passed:
  1,512 tests, no failures.

* Current boundary/monitoring inventory: all 48 .ex files under the controller
  tree contain no literal Repo. references. As with the schema scan, this is a
  direct textual check, not a transitive dependency proof. Source/config searches
  found Plug.Telemetry endpoint events, Sweeper spans, mailer backpressure, and
  check-in generation errors. Application supervision has Repo, PubSub, task
  supervisors, sweepers, and Endpoint; no monitoring child. No telemetry attach
  handlers, metrics/exporter integration, or monitoring-named backend/docs files
  were found in the searched scopes. Four-layer actionable monitoring remains
  unproven and needs a concrete implementation/consumer, not more event emission.

* Client.reactivation?/1 owns inactive-to-active transition detection from the
  changeset. Subscription-date validation and Clients seat reservation share it;
  the context no longer inspects changeset internals. Existing date validation,
  atom/string status, capacity, and full-suite tests passed in `mix precommit`:
  1,510 tests, no failures.

* A bounded source scan of all 42 files containing `use Ecto.Schema` under
  backend/lib found no literal `Repo.` references. This confirms that direct
  textual boundary check only; it does not prove transitive dependency purity.

* CheckInSchedule shares required schedule fields, frequency constraints, and
  active-schedule uniqueness validation across insert/update changesets; insertion
  retains trusted identities and tenant foreign-key mappings. Its frequency set
  has a named type. CheckIns uses ClientAccess directly for visibility checks,
  retaining the same authorization implementation without the Clients facade
  dependency. Existing schedule creation/update/isolation and full-suite tests
  passed in `mix precommit`: 1,510 tests, no failures.

* CheckInReminders owns bounded concurrent email delivery, reminder selection,
  post-send timestamps, and sent/skipped batch counts. CheckIns keeps schedule
  management, assignment generation, and keyset paging. The existing concurrency
  limit, timeout, delivery ordering, and retry behavior are unchanged; the new
  module has no CheckIns dependency. Existing due/overdue, retry, stamping,
  multi-page, and full-suite tests passed in `mix precommit`:
  1,510 tests, no failures.

* Client owns the inclusive 14-day expiry policy as an explicit-date query and
  pure presentation update. Clients delegates flag calculation; WorkbenchExpiringQueue
  uses the schema query and retains visibility/snooze composition. The duplicate
  window constants are removed. A database-backed boundary test verifies query
  and flag agreement for no end date, past, today, day 14, day 15, and inactive/
  pending clients. `mix precommit` passed: 1,510 tests, no failures.

* FoodWriter builds each changeset once and uses its cast media/serving values
  for authorization and reference protection. Invalid changesets bypass those
  lookups and return normal persistence validation errors. Serving protection now
  applies equally to atom- and string-keyed requests; a referenced serving cannot
  be removed through the latter. Tests cover both key formats, invalid collection
  input without revision changes, and a valid string-keyed replacement. Final
  `mix precommit` passed: 1,509 tests, no failures.

* RecipeIngredient owns tenant-scoped food filtering and JSON portion matching.
  FoodWriter reuses these queries for deletion and serving-reference checks;
  Recipe.using_food/3 composes the food filter for Library impact reads. Recipe
  and ingredient tenant correlation, distinct results, and impact ordering are
  preserved. Existing nutrition protection/impact and full-suite tests passed in
  `mix precommit`: 1,508 tests, no failures.

* Nutrition.FoodWriter owns food creation, revision-checked updates, deletion,
  media authorization, and serving/menu/recipe reference protection. Library
  delegates writes and retains response media loading. The writer has no Library
  dependency; existing transaction and read-only-source behavior is preserved.
  Shared update-error types include the existing in_use outcome. Existing food
  ownership, serving, reference, media, and full-suite tests passed in
  `mix precommit`: 1,508 tests, no failures.

* Food.copy_attrs/1 and Recipe.copy_attrs/2 own pure copy transformations, reusing
  their editable scalar fields and rebuilding serving sizes/ingredient portions.
  Library keeps source loading, recipe name selection, and creation. Duplicated
  scalar-field lists were removed without copying identity/revision state. Existing
  system-food, serving-size, recipe-copy, and full-suite tests passed in
  `mix precommit`: 1,508 tests, no failures.

* Nutrition.RecipeWriter owns recipe create/update/delete workflows, ingredient
  replacement, cooked-weight reference protection, and their transactions/revision
  checks. Library retains reads and response reloads. Writer resolves ingredients
  directly through ItemResolver and has no Library dependency. Shared write-error
  types now include existing invalid_portion and in_use results. Existing recipe
  ownership, ingredient order, revision, reference, rollback, and full-suite tests
  passed in final `mix precommit`: 1,508 tests, no failures. The first gate caught
  an overlong alias line from the extraction; it was corrected before rerunning.

* Nutrition.Programming resolves menu items directly through ItemResolver for
  reads and writes. Library retains its public resolution delegates and calls
  Programming for usage queries; Programming no longer calls back into Library.
  This removes that context dependency cycle without changing the resolver,
  snapshot, or write-lock behavior. Existing menu resolution, read-error,
  reference-protection, and full-suite tests passed in `mix precommit`:
  1,508 tests, no failures.

* Client profile business reads use Orgs.get_business/1. Coaches owns tenant-
  scoped coach detail and active-coach lookups, which Clients uses for profile
  presentation and reassignment. Missing assigned coaches still render nil;
  invalid reassignment targets still return coach_not_active. A regression covers
  loaded profile associations, inactive membership, missing ids, and cross-tenant
  denial for both new lookups. Existing profile/reassignment and full-suite tests
  passed in `mix precommit`: 1,508 tests, no failures.

* Training.Programming and Training.PlanCopy call ClientAccess directly for
  visibility checks and onboarding advancement. Clients retains its public
  delegation facade. This removes their reverse dependency on Clients, which
  already calls training Programming to enrich client lists with plan names.
  The called implementation is unchanged; no new authorization path was added.
  Existing visibility, assignment, onboarding, and full-suite tests passed in
  `mix precommit`: 1,507 tests, no failures.

* BusinessBilling owns pure available-seat and invitation-status calculations.
  Billing summary, reservation checks, invitation acceptance, and awaiting-client
  activation reuse available_seats/2. Negative capacity remains visible, and an
  already-counted pending invitation may activate at exactly the seat limit.
  A boundary regression covers spare, full, and exceeded capacity. Database and
  payment-provider sequencing is unchanged. `mix precommit` passed:
  1,507 tests, no failures.

* Training.PrescriptionWriter accepts raw prescription attributes and owns input
  parsing, existing-node loading, node validation, exercise visibility, and
  persistence. Programming retains plan authorization, revision checks, and the
  surrounding transaction. The prepared map is now private implementation data;
  pure validation remains in PrescriptionInput. Existing reference, ordering,
  visibility, stale-revision, and rollback tests passed in final `mix precommit`:
  1,506 tests, no failures. An alias-ordering issue from the move was corrected
  after the first static-analysis gate.

* Training.PlanCopy owns complete template duplication and client assignment:
  coach/client authorization, source loading, name selection, transactions, child
  copying, and onboarding advancement. Programming delegates and reloads its
  public response. The row-copy operation is private, so callers cannot bypass
  the workflow transaction. Existing transaction/lock order is preserved. Existing
  complete-copy, independent-child, invalid-source, visibility, and onboarding
  tests passed in `mix precommit`: 1,506 tests, no failures.

* Training.PerformedSets owns client set creation, updates, and deletion, including
  active-session access, exercise visibility, frozen names, snapshot references,
  and position assignment. Execution delegates its existing public operations and
  retains session lifecycle/history. The extracted module has no dependency on
  Execution; transaction and locking order are preserved. Existing tests cover
  tenant/client isolation, terminal-session denial, editable fields, ordering,
  and snapshot validation. `mix precommit` passed: 1,506 tests, no failures.

* Forms.Submissions now also owns submission content/photo validation and the
  recording transaction: submission insertion, weight entries, intake services,
  assignment completion, and client activity. Forms keeps answer-envelope parsing
  and client/assignment access before delegating. The new boundary rejects loaded
  records whose client or tenant identity disagrees with Ctx before side effects.
  A regression covers these mismatches and unchanged persisted state. Its initial
  fixture used a template from another business; correcting that fixture resolved
  the failure. Final `mix precommit` passed: 1,506 tests, no failures.

* Forms.Submissions owns submission list/detail reads, pending-review count/list,
  and review marking, including authorization and photo loading. Forms retains
  its public facade and assignment/submission-creation workflows. The extracted
  module has no dependency on Forms; review marking uses one tagged-result
  chain. Existing submission visibility, photo, review-idempotency, and
  full-suite tests passed in `mix precommit`: 1,505 tests, no failures.

* FormAnswers owns answer-envelope parsing beside content validation. Forms
  delegates through from_attrs/1 and reuses named parsing/validation error
  types; FormSubmission's validation facade shares the same error contract.
  Existing answer validation/submission and full-suite tests passed in
  `mix precommit`: 1,505 tests, no failures.

* Forms shares one client-assignment query across coach lists, client lists,
  and client detail reads, preserving tenant scope and template/submission
  preloads. Photo attachment and latest-submission projection order stay at
  the existing call sites. Final `mix precommit` passed: 1,505 tests, no failures.
  The first gate (seed 272288) reported one failure whose detail was lost to
  output truncation; a saved-output rerun of that seed passed all 1,505 tests.
  The saved-output full gate then passed with seed 949829. The initial failure
  remains unidentified; these passes do not establish absence of suite flakiness.

* FormAssignment creation takes purpose positionally and owns its assigned
  initial state. Only priority/due-date attributes are cast; identity, purpose,
  status, and completion stamps cannot be supplied through attrs. Forms no
  longer reconstructs a server-field attribute map, and scheduled check-ins
  share the schema path. Existing status tests exercise update changesets;
  a creation regression covers trusted fields and string-key editable input.
  `mix precommit` passed: 1,505 tests, no failures.

* FormSubmission.awaiting_check_in_review/2 composes tenant scope, unreviewed
  status, check-in purpose, and client visibility. Forms count/list and the
  Workbench check-in queue reuse that definition. FormSubmission also names its
  closed actor type in the insertion contract. Existing forms, queue visibility,
  count/list, and full-suite tests passed in `mix precommit`:
  1,504 tests, no failures.

## Verified changes on 2026-09-08

* Clients owns client-self required-service persistence through a typed operation
  that checks the loaded client against Ctx business/client identities. Forms
  extracts intake service answers and delegates the write. Missing service
  answers retain the loaded client without a write. A regression covers tenant,
  client, and missing-client-context rejection plus successful persistence.
  Existing intake integration and full-suite tests passed in `mix precommit`:
  1,504 tests, no failures.

* WorkbenchProgrammingQueue shares required-service client/timezone projection
  between training and nutrition, with explicit service/rank parameters. It
  names its service, reason variants, item, page, and count types; Workbench
  reuses those contracts. Existing local-midnight, coverage-gap, ordering,
  visibility, pagination, and full-suite tests passed in `mix precommit`:
  1,503 tests, no failures.

* Onboarding, check-in, replies, expiring, and quiet queue modules define
  concrete row/reason/page types reused by Workbench's public list specs.
  Onboarding SQL ordering uses the same follow-up-days constant as eligibility
  and reason construction. Existing queue ordering, filtering, rendered-shape,
  and full-suite tests passed in `mix precommit`: 1,503 tests, no failures.

* FormAssignment owns latest-due-check-in selection per client as a composable
  query with deterministic date/inserted-at/id ordering. WorkbenchQuietQueue
  composes it with tenant scope, visible active clients, and snooze filtering.
  Existing latest-assignment, future-date exclusion, count/list, visibility,
  pagination, and full-suite tests passed in `mix precommit`:
  1,503 tests, no failures.

* Chat owns waiting-conversation count/list reads and reuses its unread-count
  loader for the replies queue. WorkbenchRepliesQueue only adds queue reasons
  and client status; it no longer queries conversations/messages directly.
  Message.waiting_counts/3 owns the composable tenant-scoped aggregation query.
  Existing waiting-clock, unread, queue visibility/order, count/list parity,
  and full-suite tests passed in `mix precommit`: 1,503 tests, no failures.

* Day owns pure summary calculation and display formatting alongside its value
  types. summarize/2 derives totals, status counts, and calorie adherence;
  format/2 hides unavailable Library links and rounds display numbers while
  preserving portion precision. DayAssembler delegates both after loading and
  merging slots. Existing summary and frozen-history tests passed with the
  full suite in `mix precommit`: 1,503 tests, no failures.

* Diary.SlotView owns pure slot projection: planned/logged totals, offered
  options, intake rows, and status classification. Its build/2 takes a stored
  or live DiarySlot and an explicit timestamp and returns Day.slot(). Both
  frozen and live DayAssembler paths use it. Source classification uses the
  pure ItemReference module. Existing diary read, correction, option, and
  full-suite tests passed in `mix precommit`: 1,503 tests, no failures.

* Programming menu resolution returns tagged results throughout template,
  client-plan, and coverage reads. Page assembly shares resolution/count logic;
  coverage projection has a named helper. Resolution failures propagate instead
  of failing success-only matches. Programming, DayAssembler, and Diary specs
  include the read errors, and guidance uses Menu.weekday(). A stored missing
  source regression exercises eight public read workflows. `mix precommit`
  passed: 1,503 tests, no failures.

* Nutrition.PlanCopy owns template duplication and client assignment, including
  source authorization/loading, copy-name selection, transactional insertion,
  and onboarding advancement. Programming retains public entry points and
  response loading. Transaction and lock order are preserved. Existing complete
  menu copying, invalid-source/client denial, and assignment rollback tests
  passed with the full suite: `mix precommit`, 1,502 tests, no failures.

* ItemReference.new/2 centralizes source identity and portion reference
  construction used by Menu and Diary.EntryResolver, preserving each caller's
  portion representation. The full gate passed with the PlanCopy extraction.

* ItemReference owns pure food/recipe classification and reference/resolution
  value types. Menu uses that module directly and no longer depends on Library
  for helpers or types. ItemResolver retains database resolution and aliases
  the shared value types; Library preserves its existing classification facade.
  Existing menu, diary, resolution, and full-suite tests passed in
  `mix precommit`: 1,502 tests, no failures.

* MealSlot defines ordinary/workout variants and a shared closed type used by
  diary requests, day responses, and menu selection. Menu names its weekday
  type; Plan names kind and lifecycle types and reuses them in query/projection
  specs. These type-contract changes preserve runtime behavior.
  `mix precommit` passed: 1,502 tests, no failures.

* Diary.Input owns whole-request duplicate-slot, duplicate-entry, and exclusive
  Library-reference validation behind a pure validate_slots/1 operation. It
  defines request, slot, and entry input types shared by Diary and EntryResolver.
  Diary retains authorization, transactions, and persistence orchestration.
  Existing diary validation, logging, correction, and full-suite tests passed
  in `mix precommit`: 1,502 tests, no failures.

* Recipe requires its trusted business identity and translates business/creator
  foreign-key failures. RecipeIngredient translates its business/recipe parent
  failures alongside its food reference. Recipe retains nullable creators in
  behavior and types, and shared name validation counts Unicode codepoints.
  Regressions cover positional identities, missing parents, nullable creators,
  and create/update name limits. `mix precommit` passed:
  1,502 tests, no failures.

* DiaryDay owns target-snapshot creation through an insert changeset with
  positional tenant/client/date identities, optional nonnegative targets, and
  database constraint translation. Diary persists the changeset and passes a
  tagged day result into slot initialization. Ecto generates ids and timestamps;
  the existing insert-on-conflict policy and frozen target behavior remain.
  New schema tests cover identity ownership, invalid targets, missing identities,
  and cross-tenant/missing clients. Existing diary snapshot and full-suite tests
  passed in `mix precommit`: 1,498 tests, no failures.

* Billing record loading consistently returns tagged results, including default
  creation and reservation loading. Summary, checkout, cancellation, invitation,
  and activation workflows propagate loading errors instead of assuming a record.
  Public error types include these results. A regression checks missing-business
  failures across four workflows and prevents the reserved callback from running.
  `mix precommit` passed: 1,495 tests, no failures.

* Billing defines concrete summary and checkout result types, including
  optional recent events and both checkout actions. BusinessBilling names its
  status type. reserve_seat preserves callback success/error types through
  type variables. `mix precommit` passed: 1,494 tests, no failures.

* BusinessBilling owns the charge changeset, including cancellation
  preservation, paid-seat fallback, and period end. Billing persists that
  changeset and derives seat-change events from the resulting paid seats.
  Existing webhook/sync and full-suite tests passed in `mix precommit`:
  1,494 tests, no failures.

* FormTemplate shares create/update content validation and enforces its
  stored name limit using Unicode codepoints. A regression covers the limit,
  invalid create/update persistence, and preservation after rejected updates.
  The purpose comment is positioned beside its update boundary.
  `mix precommit` passed: 1,494 tests, no failures.

* Forms.Templates owns template CRUD, default intake selection, and system
  check-in template upgrades. Forms retains its public facade and delegates
  template operations while owning assignment/submission workflows.
  FormTemplate owns its deletion constraint changeset. Existing default,
  upgrade, deletion, isolation, and full-suite tests passed in `mix precommit`:
  1,493 tests, no failures.

* FormAssignment owns its latest-submission projection beside the virtual
  fields it populates. Forms list/detail reads delegate that pure projection
  after loading ordered submissions, preserving empty and unloaded cases.
  Existing assignment/read tests and the full suite passed in `mix precommit`:
  1,493 tests, no failures.

* WeightEntries owns submission-derived weight recording, including
  extraction, unit precedence, and transactional insertion. Forms delegates
  through one operation and no longer queries WeightEntry or Business.
  The operation checks matching tenant/client identities; a regression covers
  mismatches. Existing unit fallback and submission integration tests passed
  with the full suite in `mix precommit`: 1,493 tests, no failures.

* Diary.EntryResolver owns entry-source selection, snapshot preservation,
  portion scaling, and Library resolution behind a typed resolve/4 API.
  Diary delegates this work and retains slot persistence, correction policy,
  and day assembly. The extraction preserves resolution order and snapshot
  behavior; inherited long expressions were expanded. `mix precommit` passed:
  1,492 tests, no failures.

* TrainingPlan owns metadata-update revisions and a revision changeset
  used after prescription replacement. Its lifecycle API accepts only
  archive/restore actions and constructs the corresponding state. Training
  Programming no longer imports Ecto.Changeset. Existing prescription,
  lifecycle, and full-suite tests passed in `mix precommit`:
  1,492 tests, no failures.

* Nutrition Plan owns menu replacement and update revisions. Its lifecycle
  changeset accepts only archive/restore actions instead of unrestricted
  attributes and constructs the archive timestamp and revision together.
  Programming delegates these writes while retaining authorization and
  no-op guards. Existing lifecycle/menu and full-suite tests passed in
  `mix precommit`: 1,492 tests, no failures.

* Food shares its create/update validation pipeline. Food and Recipe own
  update revision increments in their changesets, and Recipe assembles nested
  ingredient errors. Library no longer patches revisions or constructs that
  association changeset. Existing mutation, validation, and full-suite tests
  passed in `mix precommit`: 1,492 tests, no failures.

* RecipeIngredient owns ordered ingredient reads, food/media preloading,
  and the tenant-scoped recipe filter used for replacement. Recipe composes
  these builders and explicitly scopes child ingredient rows to the tenant.
  A regression proves foreign-tenant ingredient rows are excluded from recipe
  reads. `mix precommit` passed: 1,492 tests, no failures.

* Business creation takes a trusted owner ID instead of a User association,
  validates its presence, and maps its foreign-key failure. Orgs preserves
  the loaded owner in its result; all existing changeset callers use the
  explicit ID. A regression covers ignored owner attributes and missing
  owners. `mix precommit` passed: 1,491 tests, no failures.

* Client invitation changesets take trusted tenant/coach IDs explicitly and
  own creator/assignment stamping, required IDs, and foreign-key mapping.
  Client also owns resend timestamp and deletion-constraint changesets;
  FormAssignment owns due/overdue reminder timestamp changesets. Contexts
  retain authorization, delivery, and persistence. A regression covers
  ignored identity attributes and missing invitation references.
  `mix precommit` passed: 1,490 tests, no failures.

* Coach creation takes trusted business/user IDs as positional changeset
  inputs, validates their presence, and maps foreign-key failures. Coaches
  delegates identity stamping and active/inactive status changes to the
  schema while preserving its loaded creation result. Existing fixture
  callers use the new signature. Regressions cover trusted IDs, ignored
  membership attributes, missing IDs, and missing references.
  `mix precommit` passed: 1,489 tests, no failures.

* Business owns the full dashboard-setup state changeset: hidden reasons
  and timestamps change together, and completed state remains latched. Orgs
  retains authorization, request-presence checks, and persistence. A direct
  schema persistence regression covers dismissal, reset, and completion.
  `mix precommit` passed: 1,487 tests, no failures.

* OneTimeToken owns hash/type matching, issuance filters, and user preloading
  as pure query builders. OneTimeTokens composes them and shares one insert
  helper across user and invitation tokens. OtpDelivery eligibility checks
  return `:ok` directly. Existing token, signup, invitation, authentication,
  and full-suite tests passed in `mix precommit`: 1,486 tests, no failures.

* Attachment and library-media schemas own file extensions alongside their
  content-type rules. Upload contexts delegate extension lookup, preserving
  supported formats, storage paths, and the fallback extension. Actor types
  in insert changeset specs name the accepted values. `mix precommit` passed:
  1,486 tests, no failures.

* ClientAccess owns bulk client visibility checks with one scoped count
  query. Attachments delegates trainer authorization and no longer imports
  Ecto.Query or queries Client directly; its existing owner/client policies
  remain intact. A regression covers visible/hidden/foreign/missing clients,
  duplicate IDs, empty sets, and owner scope. `mix precommit` passed:
  1,486 tests, no failures.

* Attachment download parsing returns canonical UUIDs rather than
  discarding cast results. Loading and uniqueness checks use those same IDs,
  fixing uppercase lookup failures and mixed-case duplicate classification.
  A regression covers both actor entry points and duplicate normalization.
  `mix precommit` passed: 1,485 tests, no failures.

* Attachments shares one download workflow for ID validation, ordered
  loading, completeness checks, authorization, and signing. Public coach/client
  entry points supply their existing authorization functions. The download
  result now names its concrete ID/URL/expiry shape. Existing access, ordering,
  storage-error, and full-suite tests passed in `mix precommit`:
  1,484 tests, no failures.

* Nutrition Plan shares the scheduled-plan predicate across current/upcoming
  selection, interval lookup, and active date windows. Programming composes
  the window builder for batch coverage. Empty client maps/lists return an
  empty result before date aggregation; a regression covers both API arities.
  Coverage, Workbench query-plan, and full-suite tests passed in
  `mix precommit`: 1,484 tests, no failures.

* TrainingPlan.active_in_window centralizes active client-plan interval
  rules. Single-client coverage, multi-client coverage, and batched plan-name
  selection compose the same builder while retaining tenant/client filters.
  Existing coverage, plan-name, Workbench query-plan, and full-suite tests
  passed in `mix precommit`: 1,483 tests, no failures.

* Training Programming owns batched current-plan name selection for client
  dates. Clients calls the context instead of querying TrainingPlan directly,
  and no longer imports Ecto.Query. The operation retains page-sized keys,
  tenant scope, local dates, archive/window filtering, and deterministic
  selection. Existing plan-name enrichment and full-suite tests passed in
  `mix precommit`: 1,483 tests, no failures.

* Client owns its reassignment changeset, including the trusted coach ID,
  required-field validation, and existing coach foreign-key mapping. Clients
  retains owner/tenant/active-coach authorization and declares changeset errors
  in its return type. A schema regression verifies missing coaches return
  errors without changing the assignment. `mix precommit` passed:
  1,483 tests, no failures.

* Clients reuses one visible-client base for listing and status totals.
  Client.select_status_counts owns the pure count projection using Ecto
  aggregate filters, replacing raw CASE fragments and the redundant aggregate
  fallback. The list spec names the concrete status-count shape. Existing
  status summary, visibility, and full-suite tests passed in `mix precommit`:
  1,482 tests, no failures.

* Forms separates default system-template insertion from lookup/evolution
  and propagates insert errors instead of discarding them. The list return
  type includes changeset failures. A missing-business regression verifies a
  failed default insert cannot masquerade as a successful empty template list.
  `mix precommit` passed: 1,482 tests, no failures.

* FormTemplate owns default-intake flag changesets and their unique
  constraint mapping. FormTemplate and FormAssignment provide named oldest
  ordering; Forms reuses them for lists and default selection. Template lists
  now include the ID tie-break required by the backend contract. Existing
  default-intake, assignment, list, and full-suite coverage passed in
  `mix precommit`: 1,481 tests, no failures.

* Identity's issuance-lock callback contract now requires tagged results
  and uses Repo.transact. Updated all three callers together: signup rotation,
  OTP delivery, and invitation issuance. Invitation verification also returns
  explicit token/error results. Existing locks, operation ordering, error
  translation, and post-commit mail delivery are preserved. `mix precommit`
  passed: 1,481 tests, no failures. A source search under lib/easy finds only
  ChatMessages' Ecto.Multi Repo.transaction call and no Repo.rollback calls.

* AuthTokens returns explicit token/error results through Repo.transact for
  OTP issuance and refresh. Removed manual rollback/result unwrapping, retained
  the public missing-code mapping, and made email confirmation a simple guard.
  Token locks, deletion/session creation order, and credential behavior remain
  unchanged. Existing auth endpoint and full-suite tests passed in
  `mix precommit`: 1,481 tests, no failures.

* ChatMessages uses shared traversal for attachment-ID casting instead of
  maintaining a local accumulator and reversing it. Cast failures become the
  existing changeset error directly. Existing ordered attachments, duplicates,
  invalid IDs, size limits, and persistence tests passed in `mix precommit`:
  1,481 tests, no failures.

* Forms.Photos owns photo-answer ownership/type validation and batch
  attachment enrichment for submissions and assignments. Forms retains actor
  authorization and workflow orchestration. The helper accepts Ctx first,
  scopes attachment reads to its business, and associates rows by client/id.
  Existing owned-image, non-image, foreign-client, and response tests passed
  in `mix precommit`: 1,481 tests, no failures.

* DefaultCheckIn owns the pure default-section upgrade beside its question
  definitions. Forms only selects the stored version and persists the upgraded
  sections. Two pure tests cover absent Body sections, preservation of custom
  sections/questions, and idempotence; the existing persisted-upgrade test
  remains green. `mix precommit` passed: 1,481 tests, no failures.

* Forms uses Result.traverse for submission-derived weight insertion, with
  consistent tagged results for empty and populated collections. Submission
  orchestration directly propagates traversal failures, and post-transaction
  attachment loading uses a simple with. Existing derived-weight values,
  units, submission linkage, and full-suite coverage passed in `mix precommit`:
  1,479 tests, no failures.

* WeightEntry owns optional date filtering through for_since and shares
  required measurement, value bounds, and note validation across inserts and
  updates. WeightEntries composes the schema filter directly, removing its
  optional-filter wrapper. Existing schema, since-parsing, history, adherence,
  and controller tests passed in `mix precommit`: 1,479 tests, no failures.

* Billing state transitions return explicit :ok/error results for both
  webhook processing and manual sync. Sync uses Repo.transact; webhook
  callbacks propagate transition and event failures. Removed persistence and
  event rollback helpers; quantity and status guards are named transition
  clauses. Existing state rules, write order, locks, and post-update activation
  remain intact. Billing state, seat, receipt, provider-error, and full-suite
  coverage passed in `mix precommit`: 1,479 tests, no failures.

* Revision's mutation implementation is private after all context callers
  moved to explicit transaction boundaries or Revision.locked. The shared
  locking operation now uses Repo.transact and preserves tagged callback
  results. Removed the public rollback-based mutation API and corrected
  Revision.check's record type. Three focused tests cover absent/stale records,
  callback suppression, rollback after a write, and successful persistence.
  `mix precommit` passed: 1,479 tests, no failures.

* Training Programming uses Revision.locked for template mutations and
  explicit authorization/revision/mutation results through Repo.transact for
  client plans. One finalization helper now serves mutations, duplication, and
  assignment; removed duplicate response helpers and the local template lock
  wrapper. Existing training lifecycle, prescription, assignment, revision,
  and visibility coverage passed in `mix precommit`: 1,476 tests, no failures.

* Weight entry deletion/upsert and Chat conversation creation/handling use
  explicit results through Repo.transact. Removed manual success unwrapping
  and rollback branches; existing locks, activity stamping, unread enrichment,
  and handled/conflict semantics remain intact. Pending invitation revocation
  returns its single constrained delete directly. Existing context/controller
  coverage passed in `mix precommit`: 1,476 tests, no failures.

* Nutrition Programming returns tagged results for duplication, assignment,
  and authorized client-plan mutations through Repo.transact. Template creation
  performs its single insert directly, then reloads the response. Template
  mutations use Revision.locked; removed insertion, assignment, and revision
  wrappers. Source lookup returns explicit not-found results and copy naming
  has named intermediate values. Existing authorization, constraint rollback,
  revision, copy independence, and lifecycle tests passed in `mix precommit`:
  1,476 tests, no failures.

* Nutrition ItemResolver owns bulk food/recipe loading, availability, portion
  resolution, and nutrient results. Library retains the public API and type
  aliases while delegating these operations. Loading and resolution are separate
  private steps; existing snapshot, transaction precondition, tenant scope, and
  ordered reads are preserved. Existing duplicate-reference, portion, tenant,
  recipe, Programming, and Diary tests passed in `mix precommit`:
  1,476 tests, no failures.

* Nutrition Library reuses shared pagination bounds for foods and recipes.
  Recipe creation uses Repo.transact with explicit results, and ingredient
  replacement uses Result.traverse instead of a separate insertion loop.
  Validation still precedes replacement writes. Existing rollback coverage and
  expanded pagination bounds/count assertions passed in `mix precommit`:
  1,476 tests, no failures.

* Training Library pagination reuses shared bounds while retaining its existing
  twenty-item cap. Negative offset/limit values no longer reach SQL. A test
  covers negative bounds, visible count, and the maximum page size.
  `mix precommit` passed: 1,476 tests, no failures.

* PlanCopy uses Result.traverse for all three nested write collections. Each
  step returns its persistence result directly; original/copied workout pairs
  become the schedule lookup map after successful copying. Child order,
  fresh identities, and first-error propagation remain covered by template
  duplication and assignment tests. `mix precommit` passed: 1,475 tests,
  no failures.

* FormAssignment owns composable check-in reminder selection: open check-ins,
  due/overdue date windows, and unsent markers. CheckIns composes the query
  with client loading and batch delivery. The two-day handoff, resend behavior,
  and batch processing remain covered by existing sweep tests.
  `mix precommit` passed: 1,475 tests, no failures.

* Check-in creation and generation use explicit generated/inactive/no-op or
  error results through Repo.transact. Shared occurrence creation and schedule
  advancement no longer roll back implicitly. Creation uses one captured date;
  the soft cap, locking, sweep counts, and failure reporting are preserved.
  Existing sweep tests verify generation rollback and continued batch progress.
  `mix precommit` passed: 1,475 tests, no failures.

* QueueSnooze validates required trusted identities and maps existing business,
  client, and queue constraints into changeset errors. Three schema tests verify
  request identity overrides are ignored, missing fields return errors, and
  missing foreign references do not raise. `mix precommit` passed: 1,475 tests,
  no failures.

* Billing seat reservation, quantity updates, cancellation, and webhook receipt
  handling use tagged-result transaction boundaries. Removed local result
  unwrapping and rollback branches while retaining provider calls outside
  checkout/cancellation transactions and atomic local event writes.
  `mix precommit` passed: 1,472 tests, no failures.

* BusinessBilling shares required seat/status and nonnegative seat validation
  between writes, limits provider IDs to database character bounds, and maps
  missing-business foreign keys to changeset errors. Four schema tests cover
  trusted identity/defaults, null and negative values, Unicode length limits,
  and missing business references. `mix precommit` passed: 1,472 tests,
  no failures.

* BusinessBilling owns seat-limit arithmetic, and Client.awaiting_seat owns
  eligibility for pending capacity. Billing reuses the same tenant-scoped
  predicate for counting, oldest-first selection, and guarded activation.
  Existing tests cover capacity boundaries and oldest-client activation.
  `mix precommit` passed: 1,468 tests, no failures.

* Billing.Webhook owns signature verification, payload decoding/validation,
  fallback event identity, and transactional receipt handling. Billing passes
  its state-transition callback through one typed boundary. Receipt and billing
  changes still share a transaction; signature/payload failures precede receipt
  creation. The public error type includes existing changeset failures.
  `mix precommit` passed: 1,468 tests, no failures.

* Signup has one confirmation-delivery step after resolving either creation
  or pending-account OTP refresh. Its creation transaction and email
  confirmation return tagged results directly to Repo.transact. Existing
  issuance-lock behavior, token consumption order, and guest-session creation
  remain unchanged. `mix precommit` passed: 1,468 tests, no failures.

* Orgs creation/setup and Coaches profile/deactivation workflows return tagged
  results to Repo.transact. Removed hidden rollback helpers; profile and
  deactivation steps have explicit result flow. Completed setup remains a
  no-op, omitted business fields remain unchanged, and deactivation retains
  session revocation and client reassignment. Coach lifecycle specs now include
  existing changeset errors. `mix precommit` passed: 1,468 tests, no failures.

* Training execution mutations return tagged results to Repo.transact without
  intermediate unwrap/rollback branches. Existing locks and mutation order
  remain unchanged. TrainingSession date filters accept absent bounds and
  compose into for_date_range, replacing Execution's four-way dispatch.
  History validation, pagination, and session/set lifecycle tests pass in
  `mix precommit`: 1,468 tests, no failures.

* PrescriptionWriter uses Result.traverse for workout, exercise, and schedule
  writes. Removed four iteration-only helpers; persistence helpers now return
  domain results rather than reduce_while control tuples. The schedule map is
  assembled from ordered saved workouts, preserving persisted/local keys and
  first-error behavior. `mix precommit` passed: 1,468 tests, no failures.

* Training.PrescriptionWriter owns validated replacement writes: position
  staging, retained/omitted nodes, nested exercise persistence, schedules, and
  revision advancement. Programming retains actor authorization, transaction
  ownership, revision checks, input validation, and existing-node loading.
  The writer has one typed replacement entry point. Existing tests cover
  identity preservation, reordering, maximum positions, deletion, and invalid
  input atomicity. `mix precommit` passed: 1,468 tests, no failures.

* Training duplication and assignment share one source loader and propagate
  tagged failures to Repo.transact. Removed the separate assignment wrapper
  and hidden rollbacks from source lookup and plan creation. Lock order,
  authorization order, source preloads, and post-commit reloads are preserved.
  Existing tests cover hidden/archived sources, copied prescriptions, assignment
  constraints, and unchanged onboarding on failure. `mix precommit` passed:
  1,468 tests, no failures.

* Training.PlanCopy owns nested workout, prescribed-exercise/set, and schedule
  copying for both template duplication and client assignment. Programming
  retains source authorization/preloading, plan creation, transaction ownership,
  and client stage changes. Existing tests verify fresh child identities,
  preserved prescription values/order, and remapped schedule references.
  `mix precommit` passed: 1,468 tests, no failures.

* Message owns pure preview formatting for text, form shares, and attachments.
  ChatMessages retains persistence and broadcasting and uses Result.traverse
  for attachment-link insertion, preserving order and first-error propagation.
  Existing chat tests verify stored previews and attachment composition.
  `mix precommit` passed: 1,468 tests, no failures.

* Attachment and LibraryMedia upload steps return tagged results to
  Repo.transact, keeping rollback ownership at the transaction boundary.
  Attachment download signing reuses Result.traverse for ordered results and
  early failure. Existing tests verify absent rows after signing/public-origin
  failures, requested download order, and storage-error translation.
  `mix precommit` passed: 1,468 tests and no failures.

* Forms' default-intake, intake-assignment, and submission workflows return
  tagged results to Repo.transact instead of rolling back inside helpers.
  Intake and other assignments share insertion/loading. A single assignment
  update no longer has a redundant transaction wrapper. Prospect enrollment
  follows the same tagged-result boundary, preserving its lock and delivery
  after commit. Existing form and enrollment tests passed in `mix precommit`:
  1,468 tests, no failures, strict Credo and typed-route checks passing.

* Landing page replacement uses the repository's tagged-result transaction
  API and Result.traverse, removing a redundant rollback wrapper and custom
  traversal. Application submission resolves its selected program once and
  propagates insert errors directly. A regression test proves a failed second
  program insertion restores the page headline and every original program.
  `mix precommit` passed with 1,468 tests and no failures.

* ClientInvitations now owns the complete invitation lifecycle: creation,
  delivery, resend, revoke, token preview/resolution, and acceptance. Clients
  retains its public delegates and no invitation-specific private workflow.
  Resend reuses Coaches.get_coach and ClientAccess for the existing scoped
  lookups. Transaction boundaries, delivery timing, acceptance updates, and
  returned preloads remain unchanged. `mix precommit` passed: 1,467 tests,
  no failures, with strict Credo and the typed-route check passing.

* All six Workbench queues use `Utils.paginate/2` instead of duplicating page
  bounds. The existing three-argument utility remains available; zero limits,
  defaults, maximum size, ordering, and count queries are preserved. Quiet and
  expiring queues compose QueueSnooze's tenant, queue, and active filters while
  retaining their explicit parent correlation. Existing tests cover pagination,
  visibility, snooze expiry, and query plans. `mix precommit` passed with 1,467
  tests and no failures.

* Forms and WeightEntries reuse Clients' self-account and coach-visible client
  reads instead of maintaining duplicate access queries. Weight history and
  adherence response assembly share one helper fed by the authorized client.
  Tenant predicates, visibility rules, and returned data remain unchanged.

* Forms, weight logging, training completion, and nutrition saves use
  `Clients.record_client_activity/2` for the shared monotonic activity update.
  It resolves the trusted client ID from Ctx and returns an explicit recorded or
  not-found result. Callers propagate failures through their existing transaction
  boundary; empty nutrition saves remain unchanged. Tests cover timestamp
  monotonicity, missing identities, and cross-tenant denial.

* Training template, coach-client-plan, and self-plan lists share one bounded
  page loader for ordering, preloads, and counts. Public operations retain their
  explicit actor guards and differently scoped base queries. Limits, response
  keys, and query ordering are preserved.

* `Training.PrescriptionInput` separates pure collection, weekday/reference,
  persisted-node membership, local identity, and position validation from
  Programming's database loading and writes. Programming loads existing nodes
  explicitly between shape parsing and membership validation. Existing error
  precedence, normalized schedule data, and replacement behavior are preserved.

* Performed-set creation normalizes keys before exercise lookup and trusted
  name snapshotting. Both key forms now use the resolved exercise name and
  tenant visibility check. Tests cover string-keyed identity overrides, stored
  exercise names, and rejection of hidden exercise references without insertion.

* `Training.PrescriptionSnapshot` owns the pure versioned snapshot format and
  performed-set reference validation. Execution resolves the authorized source
  prescription, builds the snapshot once, and persists its declared version.
  Snapshot field layout, exercise/set order, and validation errors are preserved;
  execution no longer traverses the snapshot's internal exercise representation.

* Training library writes normalize attribute keys before association selection,
  media authorization, and duplicate-name selection. Muscle/equipment loading
  shares one helper while preserving omitted-versus-empty update behavior.
  Tests cover string-keyed creation, preserved/cleared associations, duplicate
  names, and media authorization/clearing across tenant boundaries.

* Session creation and refresh pass one resolved `UserSession.scope()` through
  UserSessions instead of expanding membership into positional arguments at
  every caller. SessionFactory shares metadata defaults, and email confirmation
  uses the same factory with an explicit guest role. Schema changesets retain
  positional trusted identities, keeping editable attributes separate from the
  resolved membership. Role resolution and refresh behavior are unchanged.

* Client and trainer invitation acceptance share OTP issuance, verification,
  confirmed-user creation, token consumption, session creation, and error
  translation. Role-specific token resolution and membership acceptance remain
  explicit function clauses. Public guards, role overrides, lock/write order,
  after-issuance mail delivery, and membership privacy policy are preserved.
  Existing invitation controller and identity tests exercise both roles.

* Prospect listing, updates, summaries, and enrollment now live together in
  `Easy.Prospects`. `Easy.Landing` owns page editing, public preview, and public
  applications, and retains the prospect API through delegates. Enrollment's
  invitation creation, transaction, and after-commit delivery remain together;
  the extraction preserves tenant predicates and existing behavior.

* Chat, attachment uploads, and library-media uploads use
  `Coaches.get_membership/1` instead of repeating the coach query across contexts.
  The lookup retains both tenant and user predicates without loading profile
  associations. Upload transactions use a single tagged-result chain for insert
  and signing, with one rollback path; the attachment transaction's identity
  result wrapper and the library-media wrapper comment were removed.

* Billing checkout, cancellation, and sync share owned-billing/subscription
  lookup instead of repeating authorization and nil-subscription branches.
  Mutation helpers derive subscription IDs and seat deltas from their billing
  record and target quantity, eliminating redundant arguments. Cancellation's
  spec includes its existing changeset error return. Provider calls and local
  transaction boundaries retain their existing order.

* Billing event construction and recent-event query primitives now belong to
  the Event schema. The context passes trusted business, kind, and occurrence
  time positionally; attributes carry event details only. The changeset validates
  required fields, nonnegative amounts/deltas, and currency length, and maps the
  business foreign key. Tests cover ignored identity overrides, validation, and
  expected foreign-key errors. Billing no longer inserts raw event structs.

* Razorpay webhook parsing is a pure boundary in `Razorpay.Payload`. It validates
  recognized event entities and returns one normalized shape before Billing
  claims a receipt. Billing transitions no longer unpack provider envelopes or
  recheck subscription IDs. Unknown events retain their receipt names and remain
  no-ops. Parser tests cover normalization, optional payments, malformed input,
  and unknown events; existing webhook/sync tests cover application behavior.

* Form submission persistence uses one explicit tagged-result chain and one
  rollback boundary. Submission, weight, service, assignment, and activity helpers
  return normal results instead of rolling back their caller's transaction.
  Weight insertion stops on its first error, and downstream interpretation uses
  the inserted submission snapshot instead of duplicate sections/answers args.
  Existing form and required-service tests cover the preserved successful flows,
  validation, unit fallback, provenance, and assignment effects.

* `Easy.FormAnswers` owns pure validation and interpretation of submitted answers.
  One question traversal feeds validation, required-service selection, weight
  values, and ordered photo IDs. Forms consumes those results for persistence
  and attachment enrichment; `FormSubmission.validate_answers/2` remains a
  delegate for existing callers. Pure tests cover question/attachment order,
  both supported service-map key forms, omitted values, and error precedence.

* Check-in schedule management, due generation, and reminder delivery now live
  together in `Easy.CheckIns`. `Easy.Forms` preserves its existing entry points
  through delegates, and the sweeper calls the lifecycle module directly.
  Creation reuses the client returned by authorization; schedule updates use one
  tagged-result chain. Pure recurrence advancement lives beside the frequency
  rules in `CheckInSchedule.advance_past/2`. Existing transactions, soft caps,
  batch bounds, delivery behavior, and return values are preserved.

* Chat conversation access, pagination, and read markers are separate from the
  message-send workflow in `Easy.ChatMessages`. The send boundary takes a sender
  role/id pair and derives embed permission from that role, removing the separate
  policy argument. Validation, attachment links, conversation metadata, and
  broadcasts stay together behind that boundary. Forms owns submission lookup
  and tenant-correlated assignment/template preloads; chat no longer joins Forms
  tables directly. Three lookup tests cover loaded context, missing/wrong-client
  submissions, coach visibility, and tenant denial. Existing chat composition,
  immutable snapshot, attachment, and broadcast tests cover the extraction.

* Coach invitation creation, resend, revocation, preview, and acceptance now live
  together in the flat `Easy.CoachInvitations` module. `Easy.Coaches` keeps its
  public API through delegates and concentrates on profiles and team membership.
  Creation and resend share one delivery-result handler. Existing tests cover
  the extraction; it does not introduce new invitation concurrency behavior.

* Email delivery uses a separate supervisor with at most 20 asynchronous tasks.
  When it is full, the producer performs delivery synchronously. The delivery
  boundary shares exception handling and invokes error callbacks once.
  `test/easy/mailer_delivery_test.exs` covers delivery, saturation, provider
  errors, provider exceptions, and callback exceptions.
* Both sweepers share `Easy.Sweeper` for scheduling, database-connection retries,
  and telemetry. Work completes before the next interval starts. Connection
  failures retry after one minute; programming errors reach supervision.
  `test/easy/sweeper_test.exs` covers retry, duration/outcome events, serial
  execution, and programming errors. The domain sweeper and database-lock tests
  also pass. Production lock names and daily intervals are preserved.
* Sweep work runs in a linked task with a five-minute deadline. Timeout kills
  the task before retrying, and scheduler exit also terminates its task.
  Session-lock checkouts last for the callback lifetime; the worker owns the
  deadline. An isolated connection-pool regression reproduced overlapping work
  after a 50ms checkout expired, then verified exclusion beyond that timeout.
  Runtime tests use real pooled connections to exercise lock release on worker
  death, rather than shared Sandbox transactions.
* Forms generation and due/overdue reminder queues use 100-row keyset pages.
  Successful rows leaving the query cannot cause offset skips, and failed rows
  cannot trap the scan on its first page. The 105-client regression proves all
  records are processed, repeat runs are idempotent, and reads return at most
  100 records. Reminder delivery retains its ten-worker concurrency limit.
* `NutrientTotals` validates values on dump and returns `:error` for non-map
  storage inputs. Its type includes the integers accepted by its cast function.
  `test/easy/nutrition/nutrient_totals_test.exs` covers invalid values and JSON
  storage round trips with unknown nutrients.
* Forms generation failures emit a log with the schedule id and a telemetry
  error event. Changeset reports include validation errors without the full
  data. A database-constraint regression verifies rollback, continued processing
  of another schedule, and retention of the failed schedule for retry.
* Failed due reminders remain eligible the following day until overdue delivery
  takes over after two days. Mixed-success adapter regressions verify due and
  overdue failures keep their stamps empty, successful sends are not repeated,
  retries stamp only the recovered assignment, and overdue delivery does not
  also send a late due reminder. Reminder test dates derive from today.
* All OTP flows share the schema's pure ten-minute expiry rule. Confirmation
  uses the token's issue time, so a fresh code works after an old signup and a
  fresh user timestamp cannot extend an expired code. Refresh credentials no
  longer enter application logs. Identity error specs describe returned domain
  atoms and changesets; invitation flows share confirmed-user creation.
* Signup normalizes attribute keys before adding its server-owned confirmation
  timestamp. Regressions reproduced Ecto.CastError for atom-keyed valid and
  invalid input, then verified successful creation, normal validation errors,
  and replacement of caller-supplied timestamps for both supported key forms.
* Access-token verification normalizes rejected tokens to `:invalid_token`,
  handles non-string socket input, and requires an integer expiry and the
  configured issuer and audience. Tests cover generated tokens, invalid input,
  expired tokens, a different signing key, missing claims, and invalid claims.
* All four OTP verification flows lock the token before validation and side
  effects. Real-connection regressions reproduced stale-entry exceptions for
  concurrent login and email confirmation, then verified one session and a
  normal invalid-code error for the loser. Confirmation resend deletes the old
  token before updating the user, preserving token-before-user lock order.
* OTP changesets validate database-required attributes and translate token-hash
  uniqueness and user foreign-key violations. Schema tests cover both constraint
  errors, required values, and ignored submitted user ids for invitation tokens.
* OTP issuance uses a transaction-scoped Postgres advisory lock per email.
  Authentication, confirmation, signup resend, and both invitation issuance
  paths serialize deletion and replacement even when no token/user row exists.
  Real-connection regressions reproduced competing resends returning a unique
  constraint error for the fixed development code. Both calls now succeed with
  one replacement token. A signup-versus-OTP-endpoint regression exercises the
  shared lock; existing single-consumption tests still pass. Delivery remains
  outside the transaction. Concurrent issuance with different random codes and
  invitation acceptance still needs dedicated behavioral coverage.
* Confirmation resends lock and reread the user after removing prior tokens,
  keeping token-before-user lock order consistent with consumption. Both signup
  and OTP resend previously issued another code after a waiting confirmation
  committed; regressions now verify their expected already-confirmed errors,
  no replacement token, and one session. Reverse-order regressions verify a
  winning resend invalidates the old code before a waiting verifier proceeds,
  leaving one replacement token, an unconfirmed user, and no session.
* Invitation user creation tolerates another transaction creating the same email
  after its lookup. An upsert targets the existing partial email index and only
  writes the identical email on conflict, returning the persisted user without
  replacing profile fields or timestamps. Both invitation acceptance flows use
  it and preserve existing confirmation timestamps. A real-connection regression
  reproduced the former unique-constraint error and now verifies the exact user
  committed by the competing transaction. Creation and invalid-input paths are
  covered separately; end-to-end invitation controller tests remain in the gate.
* Razorpay rejects non-object success responses and logs HTTP errors without
  provider bodies. Signed webhook JSON must contain a nonempty string event in
  an object before receipt processing. Tests cover malformed shapes and confirm
  that invalid payloads do not claim a receipt.
* Recognized billing webhooks validate subscription ids, optional quantities,
  timestamps, payment amounts, and currencies before receipt insertion. Missing
  payloads are rejected. Regressions verify invalid field types/ranges leave
  billing and events unchanged and that the same event id accepts a corrected
  payload. Existing billing, sync, and webhook-controller tests pass.
* A pure Razorpay payload module shares field validation between webhooks and
  synchronous responses. Fetch/update/cancel also require the returned id to
  match the requested subscription. Regressions verify rejected responses leave
  seats, events, and checkout identifiers unchanged. Unset or empty webhook
  secrets reject signatures; a regression reproduced the previous nil-key
  crypto exception.
* Client reactivation and invitation policy use cast changeset values. A
  regression reproduced string-keyed status bypassing seat capacity and invalid
  status maps raising; both now return expected errors. Self-invite and existing
  active-user email checks apply to both atom and string keys. Context specs
  now list the returned errors across Clients, Coaches, Orgs, Landing enrollment,
  and default intake assignment.
* Business profile and dashboard-setup writes use separate changeset field lists.
  Regressions reproduced general updates replacing completed setup state, setup
  writes renaming the business, and string-keyed setup input being rejected.
  Setup now accepts both key forms without editing profile fields; general
  updates preserve setup state. Missing/invalid reasons leave stored state
  unchanged, while explicit nil clears a dismissed state. Completed-state and
  non-owner tests remain in the gate.
* Business profile changesets preserve required name and default weight unit on
  update, while omitted fields retain their stored values and optional text can
  be cleared. Creation and updates validate profile strings against the actual
  varchar(255) columns using Unicode codepoint counts. Tests reproduced cleared
  required names and missing length/weight-unit validation, then verified normal
  errors without persistence, exact length boundaries, combining-character
  input, and valid partial updates. Controller tests remain in the gate.
* Coach profile and invitation contexts normalize attribute keys before field
  selection and policy checks. Regressions reproduced ignored string-keyed
  profile edits and successful string-keyed self-invites. Both key forms now
  share self-invite/existing-team checks and invitation reuse. Profile coverage
  verifies coach/business persistence, explicit clears, and rollback of coach
  edits when the business changeset fails.
* Coach changesets enforce the verified varchar(255) limits for names, phone,
  and invitation email using codepoint counts. Creation registers membership
  uniqueness and user/business foreign keys; invitations register their business
  and inviter foreign keys. Regressions reproduced missing validation and
  constraint exceptions, then verified changeset errors, Unicode boundaries,
  and rollback of business creation when its owner already has a coach membership.
* Library media rejects invalid content-type values through its changeset and
  rolls back uploads when the public storage origin is missing. The upload
  contract no longer succeeds with a nil public URL. Existing same-business,
  cross-business, shared-system media, and source-constraint tests pass.
* Chat normalizes message and embed keys at its context boundary. String-keyed
  inputs previously ignored attachment ids and embeds and skipped body trimming.
  Three regressions now verify ordered attachments, body normalization, invalid
  attachment rejection, client embed denial, and server-owned coach snapshots.
  Existing atom-keyed composition, tenant denial, pagination, and concurrency
  tests pass alongside these cases.
* Chat read-marker updates include the tenant predicate and handle concurrent
  deletion as `:not_found`. They return the updated database row with the loaded
  client, keeping message metadata consistent with the read cursor. Three
  real-connection regressions reproduced coach/client deletion exceptions and
  stale metadata after a waiting read; all now pass.
* Conversation creation locks the tenant-scoped client, checks the insert result,
  and limits conflict handling to the business/client uniqueness constraint.
  Missing or cross-tenant client contexts return `:not_found`; changesets register
  required fields and foreign keys. Separate migrations add the composite
  client/business foreign key as NOT VALID, then validate it, with a five-second
  lock acquisition timeout. Focused tests verify context denial and direct
  cross-business insert rejection without rewriting existing migration history.
* Messages now register business/conversation foreign keys and the existing
  sender-type check. A regression reproduced an exception for a missing
  conversation and now verifies changeset errors for both missing and
  cross-tenant parents. Separate migrations create the conversation identity
  index concurrently, add an unvalidated composite message/conversation foreign
  key, and validate it. Attachment preloads already correlate both link and
  attachment businesses with their message; their existing tests still pass.
* Client invitation creation is separate from delivery. Prospect enrollment
  locks the tenant-scoped prospect and creates the client, intake, and prospect
  link in one transaction, then dispatches the invitation after commit.
  A forced link-constraint failure leaves no client/intake/email. A committed
  real-connection regression verifies simultaneous enrollments produce one
  client and one intake, with the second caller receiving the linked client.
* Storage validates endpoint/public origins before URL construction: HTTP(S),
  host, valid port, and no embedded credentials, query, or fragment. Public URLs
  encode object keys and preserve a configured path prefix. Tests reproduce the
  former malformed-origin and unescaped-key results and cover local HTTP ports
  and bracketed IPv6 authorities. Private signing retains its existing tests.
* Production runtime configuration rejects missing/blank required storage,
  database, JWT, cookie, and Resend values through one loader. SMTP requires a
  relay, and unsupported mail adapters fail explicitly. Config.Reader tests use
  temporary synthetic environment values without starting services, verify
  valid values are preserved, and retain development/test defaults.
* Weight upserts lock the tenant-scoped client before reading/inserting, replacing
  the unique-violation/requery recovery branch. A real-connection regression
  verifies simultaneous first writes both succeed with one entry and an activity
  stamp. Writes accept either key form, preserve omitted values, clear explicit
  nil notes, reject blank required values, and ignore caller-supplied ownership
  and submission links. Existing coach visibility tests remain in the gate.
  Deletes use the same lock: a real-connection test reproduced a competing-delete
  stale-entry exception, then verified `:not_found` for the loser. Another test
  verifies a waiting delete returns the committed update. Coach history reads
  reuse their authorization result instead of querying the client twice.
* Added missing specs to 23 declared public functions and six macros. A temporary
  source AST audit found no remaining missing function specs in `lib/**/*.ex`.
  This checks presence, not type correctness or generated APIs. Credo's Specs
  check is enabled for `lib/**/*.ex`; removing the signup changeset spec caused
  a verified lint failure. Credo exempts implemented behaviour callbacks and
  does not enforce macro specs.

The earlier baseline `rtk mix precommit` exited 0 with 1,486 tests, zero failures,
warnings-as-errors compilation, formatting, strict Credo, and 154 typed-route
drift checks. `test/e2e/seed.exs` is explicitly ignored by test discovery because
it is a browser-fixture utility. This removes the unmatched-file warning while
retaining warnings for other unrecognized files. No commit or deployment was
performed by this audit.

## Completion requirements and current evidence

This table is the completion checklist. Earlier entries describe individual
changes; they do not establish whole-backend compliance. Status is scoped to
the evidence listed here, with deferred work kept separate from active work.

| Requirement | Current evidence | Status / remaining proof |
| --- | --- | --- |
| L0–L2: compilation, formatting, static analysis | Latest precommit 19039 exited 0 and checked 155 typed routes | Verified for current code: warnings-as-errors, formatting, strict Credo |
| L3: expected behavior and failure paths | Full suite 19039: 1,616 tests, zero failures | Latest suite passes; earlier intermittent Sweeper timing failures have no claimed fix, and named operation-level gaps remain |
| L4: public specs and concrete types | Current AST check covers source-written public def heads in all 264 backend lib files; ArchitectureTest checks exported remote domain type references | Partial: presence and valid references do not prove each argument/result type matches implementation |
| L5: security boundaries | RuntimeConfigTest, StorageTest, BillingWebhookValidationTest and WebhookControllerTest cover named configuration/signing/input cases | Partial: finish operation-level trusted identity, authorization, isolation, and failure mapping |
| L6: actionable observability | Delivery spans, pressure/sweeper events and framework telemetry exist | Deferred by user on 2026-09-09: consumer/poller/exporter and alert wiring remain incomplete; follow-up requirements are recorded at the top of this ledger |
| L7: documentation under repository rules | Backend contract forbids `@doc` and `@moduledoc`; implementation rationale and evidence live in this ledger | Apply the repository override; do not add forbidden documentation to satisfy the generic skill |
| Pure domain logic and layer boundaries | ArchitectureTest checks schema Repo/clock imports, controller Repo imports, and domain Plug.Conn imports | Those checks pass; they cover direct compiled imports, not every indirect dependency or workflow decision |
| Processes and bounded work | Application supervision, capped mail task supervisor, synchronous overflow and bounded sweeps have implementation/test evidence | Partial: global outbound concurrency and crash durability are not established; deferred concurrency work is not active scope |
| Release packaging and startup | Current Docker build 95083 and smoke 59472 exited 0; isolated PostgreSQL 17 migration/seed runs twice, readiness/liveness and clean SIGTERM shutdown | Verified for current runtime source on linux/arm64 with Elixir 1.19.1 / OTP 28.1.1 |
| Deployment and external integrations | Local release smoke uses dummy credentials and an internal Docker network | Actual provider behavior and upgrades from deployed database state are not established by the fresh-database test |

The operation map must cover Identity, Orgs, Coaches, Clients, Forms, Training,
Nutrition, Chat, Attachments, LibraryMedia, Billing, Landing, WeightEntries, and
Workbench. For each public operation, identify its actor/tenant boundary,
trusted identity source, expected errors, and the tests that exercise them.
Record concrete missing cases rather than treating an entire domain as untested.

## WeightEntries operation evidence

All five current public operation names in WeightEntries were inspected against their
authorization and persistence paths. This table maps the current evidence;
it is not a claim that every option or database error has exhaustive coverage.

| Operation | Boundary and expected failures | Test evidence |
| --- | --- | --- |
| list_client_weight_entries | ClientAccount loads ctx.client_id within ctx.business_id; Input parses since; not_found / invalid_since | WeightEntriesTest missing/cross-business context; WeightEntryTest since cases; client controller history/filter/empty-state responses |
| upsert_client_weight_entry | Ctx client identity; Input allowlists editable attributes; tenant-scoped client lock and entry lookup; date errors / changeset / not_found | WeightEntriesTest trusted IDs, omitted/nil fields and rejected-context persistence; WeightEntryTest insert/update/date validation; client controller write responses |
| delete_client_weight_entry | Tenant-scoped client lock and client+business entry lookup; not_found / changeset | WeightEntriesTest missing/cross-business context; WeightEntryTest owned delete; client controller same-business other-client denial |
| list_entries_for_client | ClientAccess authorizes owner/assigned coach in business before reading; not_found / invalid_since | WeightEntriesTest trainer visibility, owner success and cross-business denial; coach controller scope/filter/invalid-query responses |
| record_form_submission | Internal submission workflow passes trusted Client and FormSubmission; function head requires matching client/business; transactional writes; not_found / changeset | WeightEntriesTest mismatched identities and empty weights; FormsTest provenance/newest-unit and fallback-unit cases |

Form submission recording is an internal composition API, not an independently
authorized client endpoint. History is a dated series with a since filter;
it currently returns all matching entries. Generic pagination compliance still needs an explicit decision before
this domain can be marked fully compliant. The unused public adherence
window option has been removed; history owns its fixed 30-day window. Keep those distinct from the
tenant checks verified above. Concurrent write behavior remains deferred.

## Orgs operation evidence

| Operation | Boundary and expected failures | Test evidence |
| --- | --- | --- |
| create_business | Pre-tenant Ctx supplies user_id; existing user lookup, trusted owner changeset, business/coach transaction; user_not_found / changeset | OrgsTest missing user and duplicate handle; BusinessTest trusted owner/FK/validation; BusinessControllerTest successful onboarding response |
| get_business | Loads ctx.business_id; not_found | OrgsTest context tenant and missing business; BusinessControllerTest rendered current business |
| update_business | Loads ctx.business_id; profile changeset ignores ownership and setup state; not_found / changeset | OrgsTest supplied identities and missing business; BusinessTest required/partial fields; DashboardSetupTest completed state preservation; controller response |
| update_dashboard_setup | Rejects owner?: false; parses only setup input; locks context business; pure schema transition; not_owner / not_found / changeset | DashboardSetupTest owner denial, invalid/missing reasons, reset and completion latch; OrgsTest missing business; controller 403/422/success |

The current router permits coach actors to read/update the business profile;
only dashboard setup has an additional owner policy. This check preserves
that behavior. It does not establish that arbitrary internally constructed
Ctx values are authenticated; HTTP middleware owns Ctx construction.
The pre-tenant onboarding path is now represented by Ctx.t and both
constructor specs allowing a nil business_id.

## Attachments operation evidence

| Operation | Boundary and expected failures | Test evidence in AttachmentsTest |
| --- | --- | --- |
| create_upload_for_client | ClientAccess authorizes target, Coaches loads membership, schema stamps trusted IDs, transaction inserts/signs; not_found / changeset / storage_unavailable | Assigned trainer success, hidden/cross-business client rejection without insertion; shared upload validation/signing path tested through client operation |
| create_client_upload | Ctx supplies client_id; schema derives storage key and validates media; insert/sign transaction; not_found / changeset / storage_unavailable | Missing membership, trusted storage identity, supported media/bounds, successful URL/header output, signing failure rollback |
| get_downloads | Canonical bounded IDs, business-scoped complete-set lookup, owner or assigned-coach authorization, then signing; invalid_attachments / not_found / storage_unavailable | Owner/assigned success, hidden trainer and absent actor denial, canonical IDs; parsing/signing implementation shared with client downloads |
| get_client_downloads | Same parse/load/sign path plus all attachments must match ctx.client_id | Ordering/expiry, same-business mixed-client rejection in either order, cross-business denial, missing IDs, duplicates/oversize/empty lists, signing failure |

Storage signing is local computation, so upload transactions do not wait on a
provider network request. This evidence covers metadata and URL issuance;
it does not verify actual object-store upload contents or provider delivery.
The table distinguishes directly exercised entry points from shared helper
coverage and does not claim every branch was independently tested via both actors.

## LibraryMedia operation evidence

| Operation | Boundary and expected failures | Test evidence |
| --- | --- | --- |
| create_upload | Coach membership, trusted tenant/uploader IDs, media changeset, transactional public signing and URL construction; not_found / changeset / storage_unavailable | LibraryMediaTest identity-derived keys, supported types/sizes and missing public-origin rollback; LibraryMediaControllerTest response and unauthenticated/invalid request handling |
| authorize_attach | Nil means no attachment; Media.attachable scopes local or shared-system media; :ok / not_found | LibraryMediaTest same-business/system success, foreign/unknown rejection, nil; Training.LibraryMediaTest authorization through create/update and string-keyed writes |
| public_representation | Loaded media becomes public fields; external system URL or configured storage URL; nil media stays nil | LibraryMediaTest uploaded video representation and shared external image through food copy |

Upload metadata is tenant-owned; public URLs intentionally expose library
assets. This does not grant access to private client attachments, which use
their own context and bucket. Actual object-store behavior remains outside
these local tests. Direct absent/foreign-business membership upload failures and unavailable
storage representation fallback now have independent tests in LibraryMediaTest.

## Coaches operation evidence

The lightweight membership lookup is used by Attachments, LibraryMedia and
Chat. The preloaded profile lookup is used by profile rendering, invitations
and profile updates. The explicit coach-ID lookup serves client account
assignment display; active lookup serves client reassignment and deactivation.
These are distinct consumers, so their interfaces were retained.

| Operation | Boundary / behavior | Current test evidence |
| --- | --- | --- |
| create | Internal onboarding receives trusted User/Business; inserts coach and returns loaded parents | CoachesTest successful parent/identity values, same/different-business duplicate changeset errors and unchanged existing membership; Orgs/controller onboarding coverage |
| get_membership | Business+user query without rendering preloads; ok/not_found | LibraryMedia missing/foreign membership tests and successful upload paths |
| get_coach/1 | Same business+user scope plus user/business preloads | Coach profile reads and transactional update tests; direct missing/foreign-context rejection now covered |
| get_coach/2 | Business-scoped explicit coach ID; includes inactive rows and parents | CoachesTest active/inactive, foreign/unknown IDs, loaded parent assertions |
| get_active_coach | Business-scoped active subset | CoachesTest active/inactive and foreign/unknown lookups |
| update_profile | Preloaded current coach; changeset-normalized coach/business fields; transaction rolls back coach update if business validation fails | CoachesTest string-keyed update, explicit clearing and persisted rollback assertions |
| get_active_coach_by_user_id | Pre-tenant login lookup; tagged ok/not_found | SessionFactory is the sole production caller; tests cover owner/trainer success and exact errors for inactive/missing membership |
| list_team | Owner-only business query with stable newest ordering | CoachesTest ordering and non-owner denial; TeamControllerTest rendered owner marker; explicit foreign-row exclusion now covered |
| deactivate_trainer | Owner-only active tenant coach, owner-self protection, transactional status/session revocation/client reassignment | CoachesTest all effects, owner/non-owner/foreign/invited/inactive denial; controller status responses |
| reactivate_trainer | Owner-only inactive tenant coach; activates without moving clients | CoachesTest status and preserved client assignment, non-owner/foreign/active/invited denial; controller responses |

This is evidence for the current module structure, not a completed audit of
CoachInvitations, which has separate ownership. General list pagination and
deferred concurrent state transitions remain distinct from these checks.
No runtime or test source changed for this inspection; the latest successful
full gate still applies to the inspected code.

## CoachInvitations operation evidence

| Operation | Boundary / behavior | Current test evidence |
| --- | --- | --- |
| invite_trainer | Owner-only; normalized email and trusted tenant/inviter changeset; new invitation or rotation; already_on_team / not_owner / changeset | CoachInvitationsTest normalized/string input, self/existing active/inactive rejection, repeated invite and non-owner; TeamControllerTest invalid email/body |
| resend_invite | Owner-only invited coach in context business; rotates token; not_owner / not_found / changeset | Rotation, active rejection, non-owner and foreign-business rejection with unchanged token |
| revoke_invite | Same owner/tenant/invited lookup; deletes row; not_owner / not_found / changeset | Invited deletion, active preservation, non-owner/foreign rejection with unchanged row |
| resolve_invitation_token | Pre-auth token lookup; invited status and expiry; invalid / used / expired | Valid, unknown, active and expired token cases |
| invitation_preview | Reuses token resolution and loads business; exposes business name, email, first name | Exact successful projection plus invalid/used/expired outcomes |
| accept_invite | Internal identity handoff with resolved invitation and user ID; already_a_coach / race_lost | Linked active membership, repeat acceptance, existing coach denial; further race-condition work deferred |

Identity.Invitations selects this module for coach token resolution and
membership acceptance, and maps invitation errors at the identity boundary.
Provider email delivery uses the shared MailerDelivery boundary. These local
tests do not establish durable email delivery after process/node loss.

## Clients operation evidence

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| get_client_with_preloads | Business and Client.visible_to filters, parent preloads, explicit expiring flag; not_found | ReadBoundaryTest visible trainer, hidden/foreign denial, owner visibility, parent preload and reassignment expiry-flag consistency |
| list_clients | Same visible business scope; filters, count/summary, bounded pagination, stable ordering, optional batched plan projection | ReadBoundaryTest owner/trainer visibility, stage/status summary, 20-default/100-max pagination; ListPlanNamesTest optional names, archived/window filtering and tenant separation |
| update_client | Authorized preloaded client; schema input with effective date; reactivation reserves a seat; mutation result reloaded consistently | ReactivationTest atom/string status and invalid status; seat-limit behavior covered there; other editable-field denial cases still need mapping |
| reassign_client | Owner-only, active target coach in business, authorized client; trusted assigned coach ID | ReadBoundaryTest successful assignment/expiry flag, non-owner denial, inactive/foreign target coach and foreign client rejection |
| reassign_clients_to_owner | Owner-only, tenant/source-coach filtered bulk assignment to trusted ctx.coach_id; returns affected count | ReadBoundaryTest non-owner denial, foreign source, unaffected clients and repeated call; CoachesTest transactional deactivation workflow |
| advance_stage_to_coaching | Internal assignment transaction participant; tenant/id/onboarding conditional update, returns updated count; callers authorize first | Training and Nutrition assignment tests verify advancement and rollback; moved from ClientAccess without changing mutation policy |

ClientAccess owns single/bulk client authorization. Existing read-boundary
tests directly cover owner/trainer visibility and all-or-nothing bulk access,
including missing and foreign clients. ClientAccount and ClientInvitations
are separate operation sets and are not implicitly covered by this table.

## ClientAccount operation evidence

| Operation | Boundary / behavior | Current test evidence |
| --- | --- | --- |
| get_active_client | Pre-operation membership resolution by user+business+active status; not_found | ClientAccountTest matched active row and missing/foreign/inactive denial; socket inactive-client denial |
| get_client_account | Uses trusted ctx.client_id and business, without resolving user identity again; not_found | ClientAccountTest missing/unknown/foreign identities; WeightEntries self-history consumers |
| get_client_account_profile | Account lookup plus business defaults and tenant-scoped assigned coach; not_found | ClientAccountTest denied contexts; client ProfileControllerTest complete fields, assigned coach and no-coach results |
| update_client_account_profile | Same account lookup, self-edit allowlist and shared string validation, then loaded profile; not_found / changeset | ClientAccountTest denied writes, immutable identities/coach fields, oversized Unicode input; controller partial updates and response |
| record_client_activity | Trusted client and tenant; monotonic timestamp update; recorded/not_found | ActivityTest preserves newer timestamp and rejects absent/foreign clients |
| update_client_required_services | Loaded client must match context business/client; nil preserves existing value, otherwise schema update | RequiredServicesTest mismatched context, nil no-op and valid update; schema tests canonical/invalid service lists |

Membership resolution belongs to HTTP/socket setup; downstream self-service
operations consume the trusted client ID. This module has no pagination API.
Its scoped persistence and profile projection remain cohesive; no further
module extraction was required for these checks.

## ClientInvitations operation evidence

The create/deliver split is used by Prospects.enroll_prospect: client creation
and prospect linkage occur in one transaction, while delivery happens after
that transaction returns a newly enrolled client. Ordinary invite composes
the same operations. Removing this split would obscure that transaction boundary.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| invite | Composes create then deliver; returns preloaded client or domain error | ClientControllerTest successful email/phone-only invite and active-client email rejection |
| create | Coach membership, trusted identities, changeset validation, self/active-email rules, seat reservation and default intake assignment | Creation path traced through Billing.reserve_seat and Assignments; controller and required-service/string-boundary tests; prospect caller inspected |
| deliver | Uses preloaded creator/business; no-op without email; delegates shared mail delivery | Phone-only invitation path; shared MailerDelivery tests; no durable-delivery claim |
| revoke_invitation | ClientAccess authorizes target; only pending status can be deleted; database cascades own dependent cleanup | Controller pending deletion, active/inactive preservation, missing/foreign denial; ReadBoundaryTest training/nutrition cascades |
| resend_invitation | Authorized client and coach; pending status with email; updates sent timestamp and delivers | Controller pending success, missing-email/non-pending errors, foreign-business denial |
| resolve_invitation_token | Public token lookup, pending status and expiry; invalid/used/expired errors | Exercised through ShowInvitationTest valid, used, expired, unknown token cases |
| invitation_preview | Pending details or state-only response; loads business/creator and fallback coach name | ShowInvitationTest exact pending fields, phone-only email null, fallback name and invalid/used/expired state responses |
| accept_invite | Internal identity handoff, active-elsewhere rule, billing seat outcome and pending-row update | Normal OTP/identity/error handoff mapped below; capacity-loss integration remains a specific gap; concurrent behavior deferred |

Public preview intentionally returns an ok result containing a state for
unusable tokens; the identity acceptance flow maps token errors separately.
This difference represents distinct caller contracts, not duplicated policy.
No runtime code changed in this inspection; the latest full gate remains
the current code verification.

## Client acceptance handoff evidence

Identity.Invitations.verify_invitation performs OTP locking/freshness,
invitation resolution, confirmed-user lookup/creation, membership acceptance,
OTP deletion and session creation inside Repo.transact. ClientInvitations
owns membership updates; SessionFactory owns whether that membership permits
a client session. The orchestration returns AuthTokens only after those steps.

| Outcome | Boundary mapping | Existing evidence |
| --- | --- | --- |
| Successful acceptance | Links user, applies accepted email, activates client, creates client session and returns credentials | AcceptInviteTest active status, user link, changed email, existing/new user cases and returned scope |
| Missing/wrong OTP | token_not_found becomes invalid_otp | AcceptInviteTest wrong OTP and token/email binding cases |
| Expired OTP | otp_expired | AcceptInviteTest OTP older than ten minutes |
| Unusable invitation | invalid/used/expired become invitation_invalid/used/expired | AcceptInviteTest request errors and already-used verification response |
| Active client elsewhere | already_active_elsewhere becomes already_active_client | AcceptInviteTest 409 case after valid OTP issuance |
| Successful OTP consumption | Token deleted within transaction | AcceptInviteTest second verification fails after successful acceptance |
| Missing active membership during session creation | client_membership_not_found propagates and transaction rolls back | Source path traced; capacity-loss integration outcome remains unverified |

Capacity caveat: Billing.invitation_status can select inactive/awaiting_seat
when seats were reduced after an invitation. SeatEnforcementTest verifies
that result by calling ClientInvitations.accept_invite directly. The outer
identity workflow then asks SessionFactory for a client session, whose query
requires an active client. Source inspection therefore indicates the outer
transaction would reject and roll back that result; the direct membership
test does not prove a successful end-to-end awaiting-seat acceptance. This
is an explicit remaining integration/policy gap, not a claim that those two
paths are equivalent. Further capacity/concurrency changes remain deferred.

## Landing and Prospects operation evidence

| Operation | Boundary / behavior | Current test evidence |
| --- | --- | --- |
| Landing.get_landing_page | Context business; oldest page with ordered programs; ok nil before creation | LandingTest deterministic oldest draft; LandingFunnelTest empty response |
| Landing.upsert_landing_page | Trusted business; validates programs; transactional page and wholesale program replacement | LandingTest key forms and invalid collections; LandingFunnelTest child failure restores page/programs, caps and replacement |
| Landing.preview_landing_page | Public slug resolves published page and business; not_found | LandingFunnelTest published success, unpublished and unknown denial |
| Landing.submit_application | Trusted tenant/page from published lookup; selected program must belong to page, otherwise general application | LandingTest program ownership and key forms; funnel contact requirement; ProspectsTest string column limits |
| Prospects.list_prospects | Business scope, status filter, independent business summary, stable ordering and capped pagination | ProspectsTest default/max/offset, status summary and foreign exclusion; funnel list filters |
| Prospects.get_prospect | Business-scoped detail with page/program/client preloads; not_found | ProspectsTest own lookup and foreign denial; funnel business scope |
| Prospects.update_prospect | Scoped loaded record, status/notes only; validation error or updated record | ProspectsTest foreign denial, string limits and retained page association; funnel status update and unknown fields |
| Prospects.enroll_prospect | Locked scoped prospect, invitation creation/link transaction, delivery after commit; repeat enrollment returns existing client | ProspectsTest foreign denial and overrides; LandingFunnelTest success, duplicate enrollment and failed-link rollback without email |

The page/program replacement policy remains explicit and transactional.
Enrollment reuses ClientInvitations rather than duplicating client creation,
intake assignment or seat reservation. Concurrent enrollment behavior remains
outside this pass under the user's deferral.

## Workbench operation evidence

| Operation | Read-model ownership / boundary | Current evidence |
| --- | --- | --- |
| counts | Aggregates six queue implementations using the same facts as lists | LifecycleCommunicationQueuesTest count/list parity; ProgrammingQueueTest aggregate programming counts; individual quiet/expiry counts |
| list_onboarding_queue | Lifecycle reasons for visible tenant clients | LifecycleCommunicationQueuesTest due boundaries, draining actions, pagination and tenant/trainer denial |
| list_check_in_queue | Submission-based queue, oldest-first | Same suite: submission identity, client deactivation behavior, pagination/visibility parity |
| list_replies_queue | Chat waiting-conversation projection | Same suite: waiting clock, visibility, reply draining and count parity |
| list_programming_queue | Service requirements and coverage intervals; invalid_service for unsupported filter | ProgrammingQueueTest service sets, history/gaps/boundaries, local dates, pagination and tenant/trainer scope |
| list_expiring_queue | Renewal window and active snooze exclusion | ExpiringQuietQueuesTest inclusive boundaries, stable ordering, pagination, visibility and renewal/snooze behavior |
| list_quiet_queue | Latest due check-in and snooze exclusion | Same suite: due-assignment selection, completion/snooze behavior, pagination and visibility |
| snooze_queue_for_client | ClientAccess authorization plus trusted client/business changeset and unique-key upsert | QueueSnoozeTest hidden/foreign/unknown denial, owner success, identity/required/FK validation; controller supported/invalid queue and date bodies |

Five client queues batch-preload business records in Workbench; replies use
Chat's prepared projection. Pagination is shared through Utils (directly or
through Chat). QueryPlanTest exercises the public queue interfaces and checks
representative tenant-leading database plans. This verifies those fixtures,
not production latency or an operational monitoring setup.

## Chat operation evidence

Chat owns actor authorization and conversation lifecycle. ChatMessages owns
message composition, cursor pagination, attachment loading, persistence and
broadcasts. Its two exported operations are implementation entry points called
by Chat after authorization; they are not independent actor-authorizing APIs.
All 13 Chat operations have production callers in coach/client controllers,
ConversationChannel, or WorkbenchRepliesQueue. No forwarding API was removed.
Evidence uses source reads because graph tools were unavailable in this session.

| Operation | Boundary / behavior | Current test evidence |
| --- | --- | --- |
| list_conversations | Visible business clients, search, capped pagination, batched unread counts | ChatTest deterministic pages and one unread query; hidden/foreign exclusion; coach controller displayed-name search |
| count_waiting_conversations | Same visible waiting scope as waiting list | ChatTest hidden/foreign zero; LifecycleCommunicationQueuesTest aggregate/list parity |
| list_waiting_conversations | Oldest waiting clock, tenant/client visibility, batched counts since waiting start | LifecycleCommunicationQueuesTest ordering, inactive clients, offset and message-count window; ChatTest hidden/foreign empty |
| get_conversation | Shared visible conversation lookup, client preload, coach unread count | ChatTest assigned/hidden access; foreign denial; coach controller detail; ConversationChannel visible/hidden coach join |
| get_or_create_conversation_for_client | ClientAccess before tenant/client upsert | ChatTest idempotency, preload, hidden trainer and foreign client rejection |
| list_messages | Authorized conversation before ChatMessages cursor page and ordered attachments | ChatTest two-page round trip, attachment order, hidden/foreign denial; coach controller ascending results |
| send_message | Coach membership and visible conversation before content resolution and transaction | ChatTest text/attachment/embed combinations, invalid input, foreign references, hidden/foreign conversation denial and broadcasts |
| mark_read | Authorized conversation, cursor advances to stored latest message | ChatTest unread/cursor value, waiting-state preservation and hidden/foreign no-write denial |
| mark_conversation_handled | Visible locked conversation; observed sequence or conflict; already handled is idempotent | ChatTest success/idempotency, conflict, inactive client and trainer/tenant denial; coach controller response statuses |
| get_client_conversation | Trusted Ctx client within business; lazy upsert and client unread count | ChatTest unread success and nil/missing/foreign context rejection; client controller lazy creation; channel own/other-client join |
| list_client_messages | Same trusted client lookup before message page | Client controller send/list round trip and attachment/embed values; ChatTest nil/missing/foreign rejection |
| send_client_message | Trusted client sender, attachment validation, no client embeds | ChatTest lazy creation, waiting/unread transitions, invalid attachments/embeds, nil/missing/foreign no-write rejection |
| mark_client_read | Same trusted client lookup, client-side cursor | ChatTest unread reset and nil/missing/foreign rejection; client controller read response |

The message persistence transaction now uses tagged results directly rather
than Ecto.Multi operation maps. Existing tests cover content validation and
successful ordered links; they do not separately inject a late attachment-link
database failure. Message cursor handling defaults to the newest page for an
unknown cursor in source; that fallback and the 100-message cap do not yet have
dedicated context assertions. This map establishes the inspected coverage,
not exhaustive failures or production delivery guarantees. Race work remains
deferred under the user's instruction.

## Forms operation evidence

Templates owns definitions/default selection; Assignments owns allocation,
assignment response loading and reminders; Submissions owns answer acceptance,
submission reads and review. FormAnswers supplies pure validation/projection;
Photos resolves owned attachments. This map covers those three contexts, not
the separate CheckInSchedules generation/reminder lifecycle. Source reads and
reference searches were used because graph tools were unavailable.

| Operation | Boundary / behavior | Current test evidence |
| --- | --- | --- |
| Templates.list | Business scope, default weekly template creation/evolution, response counts | FormsTest creation failure, business isolation, identity retention and version evolution; template controller tenant-only list |
| Templates.create | Trusted business and section changeset validation | Template controller creation; FormTemplateTest structure/identity rules |
| Templates.get | Business-scoped detail | Template controller own and foreign lookup |
| Templates.update | Scoped template; editable content, fixed purpose | Template controller success, foreign denial and purpose rejection; FormsTest retained system identity |
| Templates.delete | Scoped template; reject assigned definitions | FormsTest assigned rejection and default fallback; template controller own/foreign deletion |
| Templates.set_default_intake | Active intake only; transactional flag replacement | FormsTest replacement, idempotency, invalid purpose/status/tenant and unchanged assignments |
| Templates.clear_default_intake | Scoped flag clear | FormsTest foreign denial and unchanged existing assignments; template controller clear |
| Templates.get_default_intake | Flagged active intake, otherwise oldest active or create | FormsTest through default assignment: chosen/archived/deleted fallback and shared template reuse |
| Assignments.assign_default_intake_to_client | Default selection followed by normal client assignment | FormsTest reuse and default selection; ClientInvitations production caller |
| Assignments.assign_form_template_to_client | Scoped template and visible client; intake uniqueness; trusted purpose/state/IDs | FormsTest trusted fields and hidden-trainer denial; assignment controller success and foreign client/template denial |
| Assignments.list_form_assignments_for_client | Visible client, ordered assignments and latest review projection | FormsTest hidden denial, owner success and latest review; template controller own/foreign list |
| Assignments.list_client_form_assignments | Trusted Ctx client, scoped template/submissions and photo enrichment | Client controller own-only list; FormsTest cross-business template exclusion |
| Assignments.get_client_form_assignment | Same client scope and response enrichment | Client controller own/other-client detail and latest answer snapshot |
| Assignments.update_form_assignment | Visible assignment; editable priority/status/date and consistent completion stamp | FormsTest hidden denial, owner success, completion/reopen/dismiss; template controller foreign denial and trusted purpose |
| Assignments.send_intake_reminder | Visible intake assignment and nonempty client email; asynchronous delivery | Assignment controller unchanged assignment/queue, foreign denial, wrong purpose and missing email |
| Submissions.submit_client_assignment | Parse, scoped client/assignment, answer/photo validation, transactional submission/weight/services/completion/activity | SubmissionBoundaryTest real foreign/other-client and nil/missing identity rejection; FormsTest photos/weight/completion; client controller required/unknown answers and closed assignment rejection |
| Submissions.list | Visible assignment; newest submissions with photo metadata | FormsTest hidden denial/owner success; assignment controller newest order, empty list, photos and foreign denial |
| Submissions.get_for_client | Visible client and tenant/client-scoped submission with assignment/template | SubmissionLookupTest own, unknown, other-client, hidden and foreign cases; Chat embeds use this operation |
| Submissions.list_unreviewed_check_ins | Shared visible review scope, oldest-first capped page and count | FormsTest order, offset/count, preloads and trainer visibility; Workbench uses the same schema query |
| Submissions.review | Visible submission; preserve first review identity/time and attach photos | FormsTest idempotency, assignment review projection and foreign denial |

The template list, both assignment lists and assignment submission history
currently return complete lists without the contract's capped pagination.
Their controllers expose list-shaped responses and reject unknown query keys;
silently truncating these results would change their existing contract.
The inspected tests do not separately establish hidden-trainer denial for
reminders/review or every late submission-transaction rollback branch.
These remain coverage/contract gaps, not claims of completed production
readiness. Provider durability and concurrent state changes remain separately
tracked and are not addressed by this structural pass.

## Check-in schedule and sweep evidence

CheckIns owns schedule persistence and occurrence transactions; CheckInSchedule
owns pure calendar/state/query rules; CheckInReminders owns bounded sends and
success stamps; CheckInSweeper composes generation, due reminders and overdue
reminders under the existing Sweeper/SweeperLock runtime. These boundaries were
retained after source inspection. All seven CheckIns operations have controller
or CheckInSweeper callers. This inspection changed no runtime code or tests;
the latest full gate remains session 89723 (1,573 tests, zero failures).

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| list_check_in_schedules_for_client | Client authorization; tenant/client scope and ordered template preload | Schedule controller create/list and multiple schedules; source uses ClientAccess and by_next_due |
| create_check_in_schedule_for_client | Visible client, parsed scoped template, check-in purpose, capacity, transactional immediate occurrence when due | CheckInInputTest both key forms, trusted IDs and foreign/invalid template; FormsTest due/future/once and wrong purpose/client; controller duplicate-template and fourth-schedule rejection |
| update_check_in_schedule | Scoped schedule, client authorization, reactivation cap and reloaded template | Schedule controller pause/update and cap rejection; source shares capacity rule with creation |
| delete_check_in_schedule | Scoped schedule, client authorization and used-schedule guard | Schedule controller unused deletion; used-schedule branch present in source but no dedicated assertion established in this inspection |
| generate_due_check_ins | Keyset pages of 100 IDs, per-schedule transaction, open occurrence expiry and schedule advancement | FormsTest due/future, missed predecessor, inactive client advancement and multiple schedules; CheckInSweeperTest 105-record traversal and constraint-trigger failure rollback without blocking later records |
| send_due_check_in_reminders | Open due assignments within two-day window, client preload, bounded delivery and success stamps | CheckInSweeperTest per-occurrence sends, retry only failed recipients, repeated sweep and transition to overdue |
| send_overdue_check_in_reminders | Open assignments at least two days overdue, independent success stamp | Same test module overdue boundary, retry behavior, multi-page processing and no repeat sends after success |

The 105-record test observes SELECT result sizes no larger than 100 and checks
generation plus due/overdue delivery totals. This proves the tested database
batching, not a global outbound concurrency ceiling. Source caps each reminder
async stream at 10 and kills timed-out tasks after 60 seconds; direct timeout
and stamp-failure assertions were not established by this inspection.

Used-schedule deletion rejection now has direct evidence. Complete list
pagination remains a gap: the active schedule cap does not bound retained inactive history.
Generation emits failure telemetry and logs; actionable production consumers
remain part of the unresolved observability setup. Provider-success/stamp
crash windows remain deferred with the other delivery/concurrency work.

## Nutrition programming boundary evidence

Programming owns plan mutations and response reloads; PlanCopy owns independent
template copies and client assignment; PlanReader owns resolved menu responses
and coverage projections. Menu parsing and Portion/NutrientTotals calculations
remain separate from persistence. These responsibilities were retained after
the authorization-before-resolution fix. The following is bounded evidence
from the named modules/tests, not a complete Nutrition domain map.

| Operation group | Boundary and evidence |
| --- | --- |
| Template create/update/archive/restore/delete | Trusted coach user and tenant/template scope. ProgrammingTemplateTest covers defaults and trusted fields; ProgrammingTemplateLifecycleTest rejects foreign templates and client-plan IDs across get/update/archive/restore/delete, and verifies independent assigned plans survive template deletion. |
| Template duplication and client assignment | PlanCopy transactions select active scoped templates; assignment authorizes the client and advances onboarding in the same transaction. ProgrammingTemplateTest covers active copy/invalid source; ProgrammingClientPlanTest covers copied menu independence, hidden sources/clients and failed-assignment rollback of onboarding. |
| Client-plan update/archive/restore/delete | Mutation locks the scoped row, authorizes before revision validation, then applies changes. ProgrammingClientPlanTest asserts former-coach rejection across all verbs and owner/current-coach success; ProgrammingCoverageTest covers restore overlap rejection. |
| Menu replacement | Menu.cast and ItemResolver validate the complete replacement before Repo.update. ProgrammingMenuItemsTest verifies foreign food/recipe and invalid portions leave menu/revision unchanged; topology tests exercise full document constraints and archive/revision rejection. |
| Template/client-plan reads | PlanReader resolves menus for loaded pages and carries read errors. ProgrammingReadErrorsTest exercises unavailable sources across detail/list/coverage and hidden-plan invalid-portion precedence; client-plan tests require Ctx client identity and scope self reads. |
| Coverage resolution | Source uses client-local lifecycle dates and scoped plan selection. ProgrammingCoverageTest covers inclusive dates, absent coverage, missing self identity, visible/foreign client lookup and overlap constraints. |
| Batch coverage | Tenant query uses caller-supplied client/date sets and returns prepared plan/client rows. ProgrammingCoverageTest verifies empty collections and a single nutrition-plan SELECT for a page; this helper does not independently authorize each requested client. |

PlanReader's private page normalization clamps limit to 1..100; Utils.paginate/2
allows zero. Replacing the former with the latter would alter existing behavior,
so that apparent duplication was retained. Impact/reference queries and batch
coverage are internal read-model helpers with narrower caller assumptions than
actor-facing detail operations. Their complete caller/visibility evidence,
page-boundary assertions and the Library/Diary operation maps remain pending.
No runtime or test files changed for this evidence update; latest full gate
remains session 46294 (1,574 tests, zero failures).

## Nutrition Diary operation evidence

Diary authorizes the client and coordinates persistence. DayAssembler prepares
live/frozen read responses; CorrectionPolicy owns date eligibility; Input
validates slot/entry identity collections; EntryResolver preserves or replaces
nutrient snapshots; Document owns stored option/entry shape. Public controllers
call the three operations below. Test single-day helpers now unwrap their
date-filtered list results, so existing detail tests cover these same reads.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| list_client_nutrition_days | Trusted client lookup; one captured clock; bounded exact/default/range dates; live guidance only for today/future and frozen history for past dates | DiaryReadsTest local timezone/fallback, midnight, full date range and invalid/incomplete/oversized ranges; frozen history survives plan/library deletion; client controller shape/query validation |
| list_nutrition_days_for_client | ClientAccess before the same day assembly | DiaryReadsTest equality for assigned coach/owner/client and hidden/foreign denial; coach controller bounded history, foreign client and malformed range denial |
| save_client_nutrition_day | Active trusted client; Input validation; transactional ordered slot writes, date/revision/selection rules, entry resolution, day response and activity | DiaryLoggingTest successful planned/extras, duplicate identity rejection, later-slot revision rollback, invalid final entry rollback and corrected retry, no coach-context save/inactive denial; option/correction tests cover frozen identity and nutrient basis |

Inspected rollback tests assert persisted slot counts/revisions after failures,
not only returned errors. Correction and history tests exercise retained data
after mutable plan/library changes. Direct coverage for every nil/foreign self
Ctx combination and every persistence constraint remains unproven by this map.
Date-range reads are bounded to 31 inclusive dates, rather than offset-paginated
records; individual days assemble all stored slots. Entry-volume bounds and
production telemetry consumers remain separate outstanding work. No new race
scenarios were introduced during this structural pass.

## Nutrition Library operation evidence

Library owns reads, copy orchestration and prepared responses. FoodWriter owns
food mutations/media authorization/serving protection; RecipeWriter owns recipe
mutations and transactional complete ingredient replacement. NutrientTotals
owns calculation. The existing split was retained after removing the test-only
calculation forwarder and correcting snapshot result specs.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| get_food | Tenant or system food, media preload | LibraryTest system-copy path and JourneyTest lookup; exhaustive direct lookup failures not established here |
| list_foods | Tenant/system scope, search/category filters, stable order and capped page | LibraryTest foreign exclusion and page bounds/count |
| list_food_categories | Distinct categories from visible foods | CategoryFilterTest asserts distinct sorted categories, excludes blanks and foreign categories, and includes system categories without duplicates |
| create_food | Coach membership, trusted tenant/coach/source, media authorization and changeset validation | LibraryTest identity/source/revision, serving defaults/amounts and unknown nutrient values |
| update_food | Revision-locked visible food, reject system edits, protect referenced serving identities | LibraryTest shared-business edits, stale/foreign/system rejection and invalid serving collection; LibraryProtectionTest menu/ingredient serving protection |
| delete_food | Reject system or structurally referenced food | LibraryTest system/shared-business behavior; LibraryDeleteTest ingredient blocking and surviving diary log; LibraryProtectionTest active/archived menu protection and foreign-menu exclusion |
| copy_food | Read visible source, create custom tenant food | LibraryTest system-to-custom copy with reset ownership/revision |
| get_food_impact | Snapshot of visible food's tenant recipes and plan references | LibraryProtectionTest recipe/template/client-plan references, archived plans and foreign exclusion |
| get_recipe | Tenant recipe with tenant ingredients and current food data in snapshot | LibraryRecipeTest tenant preload and current serving/nutrient values |
| list_recipes | Tenant search, newest capped page, ingredient preload and count | LibraryRecipeTest foreign exclusion and bounded page/count |
| create_recipe | Trusted coach/tenant, metadata and ordered ingredient transaction | LibraryRecipeTest trusted identity/revision, positive servings/weight, ordered visible foods, invalid collections and forbidden subrecipe identity |
| update_recipe | Revision lock, cooked-weight reference protection, atomic metadata/ingredient replacement | LibraryRecipeTest shared-business edit, stale/foreign rejection and persisted metadata/ingredient rollback; LibraryProtectionTest gram-reference pinning |
| delete_recipe | Reject menu references while preserving independent history | LibraryDeleteTest unused deletion; LibraryProtectionTest active/archived menu blocking and foreign-menu exclusion |
| copy_recipe | Visible source, generated copy name, ordered ingredients and fresh revision | LibraryRecipeTest distinguishable copy and retained serving portions; RecipeTest repeated copy naming |
| get_recipe_impact | Tenant template/client-plan references, including archived plans | LibraryProtectionTest returned identities and foreign exclusion |

Impact queries intentionally inspect the whole business in current source,
including client plans; they do not apply trainer-client visibility filtering.
Whether that product policy should differ from the business-wide library-edit
policy remains unresolved. Impact collections are not paginated. Other gaps
include dedicated category-query coverage and a complete matrix of direct
get/copy/delete unknown/foreign IDs and media write failures. This evidence
does not certify every failure path or production database workload.

No runtime/test changes were made for this map; latest full gate remains
session 85888 (1,574 tests, zero failures).

## Training execution operation evidence

Execution owns session start/close/history; PerformedSets owns set edits within
an active client session; PrescriptionSnapshot owns the immutable planned
prescription. All twelve context operations below have client/coach controller
callers. Session transitions use one mutation path and history reads share
validated date filters/pagination. This split was retained after source and
test inspection; no runtime/test changes were made for this map.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| start_client_session | Trusted Ctx client, freestyle or eligible workout, stored snapshot and active-session constraint | ExecutionTest freestyle/planned start, ordered snapshot, ineligible workout and second-active rejection |
| get_client_active_session | Scoped client active session with ordered sets, successful nil when absent | ExecutionTest absent/own-client cases; PerformedSetTest ordered active response |
| update_client_session | Locked client session; metadata edits only while active | ExecutionHistoryTest notes/soreness and terminal conflict |
| complete_client_session | Locked transition and client activity in one transaction; repeated completion preserves original data | ExecutionHistoryTest timestamps/activity and idempotency without a second activity write |
| discard_client_session | Locked transition without activity stamp; repeated discard succeeds | ExecutionHistoryTest discard/idempotency and conflicts for opposite terminal transition |
| get_client_session | Trusted client detail with sets | ExecutionTest snapshot after plan deletion; ExecutionHistoryTest frozen exercise name/reference after library deletion |
| get_session_for_client | ClientAccess before scoped history lookup | ExecutionHistoryTest hidden-trainer denial, owner access and retained snapshot |
| list_client_sessions | Scoped client history, stable newest order, count and date filters | ExecutionHistoryTest non-overlapping pages, 100 cap, inclusive dates, malformed/reversed errors |
| list_sessions_for_client | ClientAccess followed by same history query | ExecutionHistoryTest coach/client page equality, hidden-trainer denial and owner success |
| create_client_performed_set | Locked active client session, visible optional exercise, snapshot reference, server position | PerformedSetTest visible/explicit-name cases, malformed/foreign exercises, frozen name, reference rejection and ordering; HistoryTest terminal denial |
| update_client_performed_set | Scoped active-session set and parent lock; measurement edits preserve identity | PerformedSetTest immutable exercise/reference, notes limit, inactive/other-client denial |
| delete_client_performed_set | Same active-session authorization and parent lock | PerformedSetTest active deletion and other-client denial; HistoryTest terminal denial |

The inspected tests establish normal completion/activity behavior, but not a
separately injected activity-write failure after session closure. Session update,
completion and discard now have the direct denial matrix recorded above;
performed-set create/update/delete also directly reject foreign or mismatched
tenants, absent client identity and unknown IDs without changing stored sets.
Session date uses UTC in current source; whether it should follow client-local
coverage dates requires domain confirmation. Existing locking and concurrent
transition behavior were left unchanged under the user's deferral. Latest full
gate is session 92531 (1,607 tests, zero failures).

## Training prescription boundary evidence

Programming.replace_prescription is the actor-facing operation. It verifies
coach context, locks the tenant-scoped plan, authorizes client visibility,
checks revision and invokes PrescriptionWriter.replace inside the transaction.
The writer has only that production caller. Its preloaded-plan interface is
an internal transaction participant, not an independently authorized endpoint.

PrescriptionInput owns casting and pure validation of persisted/local node
identities, unique positions and complete weekday references. PrescriptionWriter
loads existing nodes, verifies Library visibility, stages retained positions,
deletes omitted nodes, saves replacements/schedule and increments revision.
These responsibilities were retained after inspection; moving persistence into
the parser or generalizing this graph-specific replacement was not warranted.

ProgrammingPrescriptionTest exercises string-keyed trusted-field rejection,
explicit order, stable retained IDs, sparse/max positions, omitted-node deletion,
unchanged final positions after staging, malformed collections, duplicate refs,
invalid positions/weekdays and cross-plan/invisible references. Its late invalid
set test confirms the changed workout name, position, plan revision and schedule
all roll back. Those assertions run through Programming rather than directly
calling the writer. The existing full gate includes these tests.

ProgrammingTemplateLifecycleTest separately checks template/foreign/client-plan
scope and authorization before revision comparison; client-plan tests cover
assignment independence and failed-assignment rollback of onboarding. The
Training library/plan operation maps are recorded below; input-size bounds remain
an open constraint. Parsed-node types were subsequently made explicit.
No code or tests were
changed for this evidence update; latest full gate remains session 57215
(1,574 tests, zero failures).

## Training plan operation evidence

After removing test-only template mutation variants, Programming exposes eight
operations and PlanReader nine. Programming owns authorization/transactions and
reloads; PlanCopy owns independent prescription copies; PrescriptionWriter owns
replacement. PlanReader owns scoped reads, preloads and lifecycle projections.
Coach/client controllers consume these operations, except get_template, consumed
by create/duplicate reloads, startable-prescription resolution, consumed by
Execution, and current-plan names, consumed by Clients' optional roster enrichment.
The latter receives IDs and local dates from the already scoped, visible client
page; it does not independently authorize arbitrary supplied client IDs.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| create_template | Coach required; trusted business/user; schema restricts editable fields | ProgrammingTemplateTest canonical identity, search/list scope and invalid fields/names |
| duplicate_template | Active tenant template, business copy-name lock, independent ordered prescription | ProgrammingTemplateTest new node IDs, preserved sets, remapped schedule, bounded distinguishable names and archived/client-plan/foreign rejection |
| assign_template_to_client | Visible client and active tenant template; copy plus onboarding in transaction | ProgrammingClientPlanTest complete independent copy, invalid/hidden source/client rejection and constraint failure without onboarding advance |
| update_plan | Coach and client visibility before revision check; schema owns kind-specific fields | ProgrammingTemplateLifecycleTest metadata/stale updates, rejected client fields on templates, valid client coverage update and hidden-plan denial |
| replace_prescription | Same authorized revision boundary; writer validates/replaces complete graph | ProgrammingPrescriptionTest node identity/order/schedule validation and rollback of earlier writes on invalid sets, detailed in preceding evidence section |
| archive_plan | Authorized revision boundary, no-op if already archived | ProgrammingTemplateLifecycleTest archive timestamp/revision and assigned-client-plan lifecycle access |
| restore_plan | Authorized revision boundary, no-op if already active; coverage constraint remains enforced | ProgrammingTemplateLifecycleTest restore/stale revision and overlapping client coverage rejection with unchanged persisted state |
| delete_plan | Authorized revision boundary; return deleted row without reload | ProgrammingTemplateLifecycleTest template deletion preserves independent client plan and clears source link; RewriteVerificationTest surviving execution history |
| list_templates | Coach required; tenant templates, search/archive filters, stable capped page | ProgrammingTemplateTest matching-template count and foreign/client-plan exclusion |
| get_template | Coach required; tenant template and ordered prescription | ProgrammingTemplateLifecycleTest populated shared-business read, client-plan/foreign filtering and client-actor denial |
| get_plan | Coach required; tenant lookup plus client visibility; lifecycle projection | ProgrammingTemplateLifecycleTest assigned client access and hidden-client denial before revision-related mutation tests |
| list_plans_for_client | Authorize target client; kind/archive filters and page | ProgrammingClientPlanTest visible archived filtering and hidden-trainer denial |
| list_client_plans | Trusted client ID; unarchived tenant client plans | ProgrammingClientPlanTest exact returned IDs exclude other clients/businesses, templates and archived plans; missing identity denied |
| get_client_plan | Same self scope; full prescription preload | ProgrammingClientPlanTest set/schedule payload, archived/template rejection and missing identity |
| resolve_client_coverage | Self scope, inclusive date coverage, scheduled workout or rest day | ProgrammingClientPlanTest bounded/open-ended dates, rest day, missing identity and nil for ineligible/foreign coverage |
| resolve_client_startable_prescription | Self coverage plus selected workout membership; schedule is guidance | ExecutionTest accepts an unscheduled workout from current plan and rejects outside-date/other-client workouts |
| current_plan_names_for_clients | Tenant plans intersecting supplied client/date window; per-client date filter | ProgrammingClientPlanTest asserts exact names for distinct client dates, uncovered/foreign omission and empty input |

Page-cap/tie-break tests now cover template and both client-plan list entry points.
Direct client-self foreign-plan rejection and batch-name behavior across distinct
supplied dates now have evidence above. Page length is capped at 100, but nested
prescription size and copy-name scans are not fixed bounds. Lifecycle projections
use UTC today while coverage queries accept an explicit date; that distinction
is recorded without inventing a different product policy. The Training library
operation map is recorded below. No runtime/test changes were
made for this map; latest full gate is 79044 (1,575 tests, zero failures).

## Training library operation evidence

All nine Library operations have production consumers: exercise controllers
read/write, muscle/equipment controllers read reference catalogs, and
PrescriptionWriter uses batch exercise visibility. Owned lookup remains private;
batch lookup intentionally returns raw exercises without response preloads.
Read access includes system exercises; updates/deletes use only tenant-owned
rows. Reference parsing/changesets stay in TrainingExercise, while Library owns
reference loading, media authorization and persistence.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| get_exercise | Tenant or system row, muscles/equipment/media preloaded | LibraryMediaTest verifies retained media; LibraryTest directly rejects unknown/foreign IDs and accepts a system exercise |
| get_exercises | Deduplicate requested IDs, load visible batch, require every requested ID | LibraryTest owned/system/duplicate IDs and rejection when one foreign ID appears |
| list_exercises | Visible rows, search/muscle/equipment filters, newest page capped at 20 | LibraryTest covers foreign exclusion, pagination bounds/cap, combined search/muscle/equipment filters, duplicate-free count, paginated identity, and association preloads |
| list_muscles | Global reference search, alphabetical order | LibraryTest trimmed/case-insensitive/literal-wildcard search, ordering, empty results and nil/blank equivalence |
| list_equipment | Global reference search, alphabetical order | LibraryTest trimmed/case-insensitive/literal-wildcard search, ordering, empty results and nil/blank equivalence |
| create_exercise | Parse reference payload, authorize media, load associations, trusted business changeset | LibraryTest string references and malformed values; LibraryMediaTest same/foreign-business media |
| update_exercise | Tenant-owned lookup; omitted lists preserve, empty lists clear; force refreshed media | LibraryTest reference preservation/clearing and rejected malformed edits; LibraryMediaTest replace/remove and foreign-media rejection without mutation |
| delete_exercise | Tenant-owned lookup; prescriptions block deletion, frozen performed-set history survives | ExerciseDeleteTest in-use rejection, unused deletion and surviving performed set with cleared live FK and retained name |
| duplicate_exercise | Visible source, custom tenant copy, preserved tracking/associations | LibraryTest ignores submitted tenant/source/tracking overrides when copying system exercise; LibraryMediaTest retained media |

Subsequent LibraryTest coverage verifies foreign/system update/delete rejection,
foreign read/copy rejection and unchanged stored rows. Catalog search tests now
cover both reference catalogs; exercise filter combinations remain open.
Subsequent reference-loading changes reject unknown
muscle/equipment UUIDs before writing, with create/update regression coverage.
Exercise creation/copy now stamp the trusted coach, matching their existing FK
and the food/recipe library model. Plan creators continue to reference users;
the generic user-creator contract does not describe these library schemas.
These are recorded gaps, not newly claimed product policies. Catalog reads and
batch input size are unbounded even though exercise list pages are capped.

No runtime/test changes were made for this map; latest full gate remains
79044 (1,575 tests, zero failures). The library operation map is now recorded;
the listed gaps still prevent a claim of complete domain compliance.

## Identity operation evidence

Identity's facade retains AuthController consumers. Trainer invitation actions
call Invitations directly; that module shares client/coach issuance and
verification workflows through explicit role clauses. Signup, OtpDelivery,
EmailConfirmation and AuthTokens each own their workflow/transaction boundary.
OneTimeTokens owns persistence; SessionFactory resolves current membership and
session metadata; UserSessions persists sessions; Token builds/verifies JWTs.
Refresh-token generation and role resolution remain private helpers.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| signup | User/token transaction, duplicate-email handling, mail after committed result | SignupTest atom/string input, trusted timestamp, invalid/missing email and unconfirmed resend |
| verify | Lock confirmation token, token-specific expiry, confirm user and create guest session atomically | AuthTokensTest independent code lifetime, expired-code rejection and forced guest role/default metadata; controller invalid-token response |
| verify_otp | Hash email/code and translate confirmation errors to OTP errors | AuthController TokenTest wrong-code response and accepted request shapes; successful confirmation workflow tested via verify |
| send_otp | Normalize token type, load/validate user confirmation state, replace code, dispatch after transaction | OtpDeliveryTest confirmation/authentication state rejection with preserved tokens, missing accounts, valid replacement, other-type preservation, recipient and fallback-type behavior |
| token refresh grant | Find/validate session, reload user, resolve role and refresh metadata in transaction | Controller TokenTest successful guest refresh and IPv6/user-agent persistence; AuthTokensTest missing session and credential log exclusion |
| token OTP grant | Lock authentication code, validate freshness/confirmed email, consume and create session in transaction | Controller TokenTest fresh success, wrong code and expired code; request contract rejects mismatched/garbage grant shapes |
| accept_invite | Resolve client invitation, replace acceptance OTP, dispatch after transaction; membership conflict deferred until verification | AcceptInviteTest asserts pending client/email preservation, token persistence for accepted email, prior-token deletion, 404/410 codes and the same 200 response for an existing active-client email |
| verify_accept_invite | Bind OTP to invitation/email, resolve/create confirmed user, accept membership and create client session | AcceptInviteTest asserts active client/auth response, existing-user identity and uniqueness, confirmed/new user data, 400 wrong/mismatched OTP, 410 expiry/used invitation, 409 active-client conflict and failed OTP reuse; capacity-to-session mismatch remains open |
| accept_trainer_invite | Same issuance workflow with coach invitation resolution | InvitationsTest persisted acceptance token and invalid invitation error |
| verify_accept_trainer_invite | Same verification workflow with coach membership and coach session | InvitationsTest activated linked coach, cleared invitation token, auth tokens, wrong and expired OTP |

SessionFactoryTest covers owner/trainer scope and unlinked/inactive coach denial
through create_session. TokenTest covers identity/scope claims, malformed input,
expiry/signature and required issuer/audience claims. This does not establish
every session role/refresh failure or later-write rollback branch. Prior
concurrency tests remain in the suite; further race-condition work is deferred.
Mail dispatch acceptance does not establish durable provider delivery. The
public HTTP body contracts validate shapes that internal workflow function
heads assume; no broad claim of arbitrary-map handling is made.

No runtime/test changes were made for this map. Invitation assertions were
subsequently inspected directly as recorded above. See the completion table
for the latest full-suite result.

## Nutrition plan operation evidence

Programming has eight operations after template-only mutation removal;
PlanReader has eleven after batch-overload removal. Programming owns coach/client
authorization, revision checks and transactions. PlanCopy owns active source
selection, distinct copy naming and assignment/onboarding; embedded Menu and Plan
changesets own nested shape/identity rules. PlanReader resolves current library
values in snapshots, and ItemResolver owns the batch source lookups. The same
reader serves actor-facing responses, diary guidance and internal library usage.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| create_template | Coach, trusted business/user, default embedded menu | ProgrammingTemplateTest and menu fixtures exercise canonical creation; earlier boundary evidence records identity validation |
| duplicate_template | Active tenant template, copy-name lock, independent embedded menu | ProgrammingMenuDuplicationTest and prior boundary inspection; copy uses a single source lookup |
| assign_template_to_client | Visible client, active source, copied menu and onboarding transaction | ProgrammingClientPlanTest complete copy, invalid/hidden source/client, constraint failure and source/copy edit independence |
| update_plan | Authorize before revision; archived rows read-only; kind-specific editable fields | ProgrammingTemplateLifecycleTest expected/stale revision and ignored client fields; ProgrammingClientPlanTest owner access and former-coach denial |
| replace_menu | Same mutation boundary; cast complete menu and resolve referenced portions before persistence | Menu/topology tests and prior boundary evidence; client-plan tests preserve source menu and reject hidden actors |
| archive_plan | Authorized, revision-free lifecycle write; already-archived no-op | ProgrammingTemplateLifecycleTest repeats archive for templates and client plans and asserts the entire persisted record is unchanged; archived read-only checks also exist |
| restore_plan | Authorized, revision-free lifecycle write; coverage constraints remain enforced | ProgrammingTemplateLifecycleTest repeats restore for templates and client plans with unchanged persisted records; ProgrammingCoverageTest covers overlapping-restore rejection |
| delete_plan | Authorized revision-free delete, no response reload | Lifecycle and assignment-independence tests preserve copied client plans; diary tests preserve historical logs after source deletion |
| list_templates | Coach, tenant templates, search/archive filters, count and bounded resolved page | Template tests; ProgrammingReadErrorsTest propagates missing menu sources |
| get_template | Coach and template kind; assigned-client count and menu resolution | Lifecycle/read-error tests; create/duplicate use it for response reloads |
| get_plan | Coach/client visibility before resolution | ReadErrorsTest hidden invalid-portion plan yields not_found; client-plan tests former-coach denial |
| get_coverage_for_client | Authorize client, client-local today, current/upcoming plans and resolved menus | ProgrammingCoverageTest checks empty/current/upcoming results, ordered future plans and exclusion of drafts, archived and ended plans |
| list_client_plans | Trusted client ID, default unarchived scope, bounded resolved page | ProgrammingClientPlanTest exact visible row excludes other clients/businesses; missing identity rejected |
| get_client_plan | Trusted tenant/client scope, permits own archived plan | ProgrammingClientPlanTest owned/archived success, template rejection and missing identity |
| resolve_client_coverage | Self scope, explicit date, optional write-lock resolution | ProgrammingCoverageTest inclusive/open-ended/absent coverage and missing identity; diary callers retain write-lock path |
| resolve_coverage_for_client | Authorize coach target before same date resolution | ProgrammingCoverageTest visible/hidden client behavior; Diary.DayAssembler consumes it |
| covering_plans_for_clients | Caller-supplied visible client/date map, tenant/window query, per-client filtering | Batch test asserts exact covered IDs, omission, one plan query and loaded client; Clients supplies visible page and local dates |
| library_usage | Tenant menu references, ordered compact identities | Library impact/protection tests detailed in the library map; no trainer-client visibility filter |
| library_item_used? | Tenant menu reference existence with optional portion match | FoodWriter/RecipeWriter callers and serving/gram-reference protection tests detailed in the library map |

This map completes the operation inventory, not every proof obligation. Direct
foreign single-client-plan rejection is now covered. Mixed-date batch selection and lifecycle evidence is recorded above;
the callers' timezone conversion is a separate concern. Lifecycle no-op evidence for templates
and assigned plans is recorded above. Current/upcoming
coverage, library usage and nested menu sizes are not fixed workload bounds.
The recorded business-wide library-impact policy and deployed/provider/monitoring
gaps remain unresolved. Latest full gate: 49860, 1,584 tests, zero failures.

## Billing operation evidence

Billing owns actor-facing commands, capacity coordination and local subscription
transitions. BusinessBilling owns pure capacity/status rules and changesets;
Webhook owns signature/payload validation and receipt/application transactions;
Razorpay owns provider I/O and normalized payloads. Source/reference inspection
found controller callers for get/checkout/cancel/sync/webhook, Clients and
ClientInvitations callers for reservation, and ClientInvitations for acceptance
status. grant_free_seats remains an explicitly documented console-only operation.
No interface was removed merely because its use is operational rather than HTTP.

| Operation | Boundary / behavior | Current evidence |
| --- | --- | --- |
| grant_free_seats | Trusted context business, initialize billing when absent, validate free-seat update; console-only, no owner check | BillingTest creation/summary and BusinessBillingTest nonexistent-business error; schema tests reject negative/missing seats |
| get_billing | Context business billing and client counts, persisted ownership fact, newest ten scoped events | BillingTest defaults, active/pending usage, inactive exclusion, non-owner flag and ten-event bound; BusinessBillingTest missing-business error |
| reserve_seat | Transaction owns billing-row capacity check and tagged callback | BillingTest callback rollback and callback skipped at capacity; SeatEnforcementTest invitation/reactivation paths; missing-business error prevents callback |
| seat_status_for_invitation | Trusted invitee business; pending already consumes a seat, so only overage produces awaiting_seat | Pure boundary tests at/below/above capacity; SeatEnforcementTest acceptance outcomes; missing-business error |
| checkout | Validate increase, require enabled billing and owner; create provider checkout or update subscribed quantity and local event/activation | CheckoutTest invalid input without provider/row creation, non-owner rejection, fresh/stale checkout, subscribed increase, waiting activation and provider failure |
| cancel | Owner and subscription required; provider call precedes local status/event transaction | CheckoutTest non-owner/no-subscription errors, retained paid seats and cancellation event |
| sync_billing | Owner/subscription lookup, provider fetch before local transaction, shared subscription transitions and refreshed summary | SyncBillingTest activation/event distinctions, preserved cancellation, ignored created state, past-due transition, malformed/mismatched provider rejection and sync-then-webhook delta idempotence |
| handle_razorpay_webhook | Verify signature and normalized payload before receipt; receipt and local application share transaction; subscription ID selects billing | BillingWebhookValidationTest invalid fields/shapes leave billing/events/receipt untouched and corrected payload can reuse event ID; BillingTest and SeatEnforcementTest charge activation/manual-inactive exclusion; disabled-secret rejection |

The reservation callback rollback test proves that operation's transaction only;
it is not direct evidence of late event/activation failure rollback for checkout,
cancellation, sync or webhook application. The subsequent TransactionTest proves
charged-webhook payment-event failure rollback and receipt retryability, plus
checkout/cancellation/sync event-failure rollback after provider success.
Other failure combinations remain open.
The subsequent two-business BillingTest closes summary/count/event isolation
coverage. Subsequent BillingTest additions cover quantity updates and pending,
halted and cancelled notifications across all five local statuses. Repeated
failure/cancellation notifications use distinct event IDs to verify transition
idempotency independently of receipt deduplication. These passed in final
precommit 20922 (1,617 tests, zero failures). Charged-event ordering and provider
reconciliation remain outside that evidence; do not recreate the completed
transition tests from this historical map. No new race-condition work follows
from these gaps. Waiting activation loads at most available capacity, which can
grow with purchased/free seats; that is not a fixed workload bound. Provider
success followed by local failure remains a reconciliation/durability concern.

This map records source and existing test assertions, not exhaustive compliance.
No runtime/test changes were made for it; the latest full gate remains session
42640 (1,574 tests, zero failures).

## Current remaining work and deferred limits

This section supersedes the older open-ended task list and historical pending
statements above. The completed dependency updates, adapter replacement, library
filter checks, and release checks must not be repeated because an older entry
still says they are pending.

Verified current implementation:
- Full precommit 20922: 1,617 tests, zero failures; compile, format, strict Credo,
  and 155 typed routes passed.
- ArchitectureTest checks compiled imports for schema persistence and clock
  access, controller persistence, HTTP connection use in domain modules, and
  validity of exported remote type references. It does not check indirect calls
  or infer every public type's semantic correctness.
- Domain operation maps above cover the named contexts and record direct tests
  separately from source inspection. Module ownership and embedded-schema splits,
  shared workflows, and removal of pass-through interfaces are implemented.
- Current release build 95083 and smoke 59472 passed on Elixir 1.19.1 / OTP 28.1.1.
  Resend adapter payload/error tests use Req.Test. Real provider delivery and
  upgrades from an existing deployed database were not exercised.

Explicitly deferred by the user:
- Monitoring consumers, exporter, dashboards and actionable alerts. Existing
  telemetry remains; L6 is incomplete.
- Further race-condition work, including intermittent Sweeper timing failures
  and invitation acceptance after seat capacity changes.

Remaining product/operational decisions must not be silently changed by a
structural refactor:
- Client invitation acceptance when capacity has fallen: awaiting-seat membership
  and active-client session eligibility need a consistent product policy.
- Business-wide library impact visibility versus trainer-assigned client scope.
- Pagination policy for weight and inactive check-in history, and limits on
  nested plan graphs, bulk references and copy-name scans.
- Training UTC dates versus client-local coverage dates.
- Durable outbound delivery and provider-success/local-failure reconciliation.

Further implementation proof still needed before claiming whole-backend
compliance: semantic type contracts beyond the fixed shapes already tightened,
and the named expected-failure/authorization gaps in the operation maps. A green
suite does not establish every untested combination. These are bounded follow-up
checks of actual contracts, not a requirement to invent arbitrary input support or
new abstractions for already-verified code.

Graph tools are unavailable in the current session. Current structural evidence
uses source and compiled-module checks; older graph-generation claims above are
historical and do not establish current coverage.
