# Coach Workbench + required-services UI quality audit

Date: 2026-08-15
Branch: `ui-quality/coachapp-2026-08-10`
Baseline HEAD: `e6ff4a8b`
Status: complete
Commit authority: none

## Setup

- User-owned services: CoachApp `:2021` = 200; ClientApp `:1314` = 200; backend `:4000` reachable (root = 404).
- Browser: existing AXI session reused; storage must not be cleared.
- Worktree at start: clean.
- Required viewports: CoachApp 375×780 and 1280×800; ClientApp 375×780.
- Structural evidence: Codebase Memory project `mono`, index ready, 27,050 nodes / 130,515 edges, 10 parser gaps, blank indexed timestamp. Verified symbol coverage is recorded per material surface; exact-source fallback is required where graph results are partial.
- Authorities: feature spec/map and tickets 02/03/04/05/15/16/18; ticket 16/18 live evidence; `UI-CONTRACT.md`; app `AGENTS.md`; frontend recurring-mistakes ledger; locked prototypes under `src/clients/prototypes/`.

## In-scope route/state coverage

| route | role | viewport | states covered | result | finding ids |
| --- | --- | --- | --- | --- | --- |
| `/clients` | coach | 375×780 / 1280×800 | delayed counts; mobile Today menu/order/definitions/counts + drill URL; desktop first-nonempty Programming auto-selection; counts-error roster fallback; focus; no overflow | passed | — |
| `/clients?view=check-ins` | coach | 375×780 / 1280×800 | empty/loading/error; run-owned populated row; keyboard Review destination; answer review; confirmed Mark reviewed; drained result; focus/overflow | passed | — |
| `/clients?view=replies` | coach | 375×780 / 1280×800 | empty/loading/error; populated mobile inline + desktop split task; sequence facts/preview; read does not drain; Reply destination; confirmation/Cancel; Mark handled drains | passed after repair | UIQ-003 |
| `/clients?view=programming` | coach | 375×780 / 1280×800 | populated groups; All/Training/Nutrition overlap; full mobile facts; direct Training/Nutrition assignment destinations; hover/focus; no viewport overflow; delayed loading; forced error + Retry recovery | passed after repair | UIQ-001, UIQ-002 |
| `/clients?view=expiring` | coach | 375×780 / 1280×800 | empty/loading/error; populated reason/date; Renew destination; keyboard; 1-week snooze request/drain; focus/overflow | passed after repair | UIQ-011, UIQ-012 |
| `/clients?view=quiet` | coach | 375×780 / 1280×800 | natural empty; short-pane geometry; delayed skeleton; forced error + Retry recovery; run-owned populated Message destination/snooze drain; focus; no overflow | passed after repair | UIQ-011, UIQ-012 |
| `/clients?view=onboarding` | coach | 375×780 / 1280×800 | Riley Intake + run-owned invitation rows; locked compact layout; conditional Call; loading/error/Retry; confirmation/Cancel; keyboard/row navigation; confirmed Resend drains invitation row and resets clock; no overflow | passed | — |
| `/clients?view=all` | coach | 375×780 / 1280×800 | 60-row roster; all status filters; sort toggle; Nora row navigation; forced error/Retry; focus/overflow; Unclassified vs classified Needs-plan truth | passed after repair | UIQ-004 |
| `/clients/invite` | coach | 375×780 / 1280×800 | optional omission; Training/Nutrition/both; empty name/contact + mid-filled email validation; focus/overflow; run-owned omitted-services submit and success outcome | passed after repair | UIQ-005 |
| `/clients/:id` | coach | 375×780 / 1280×800 | Nora active Unclassified chip; edit affordance; delayed detail skeleton; forced error + Retry; focus; no overflow | passed | — |
| `/clients/:id/edit` | coach | 375×780 / 1280×800 | unclassified warning; delayed skeleton; empty services + mid-filled email validation; error/Retry; focus/overflow; run-owned Training+Nutrition save/reopen/request round-trip | passed after shared card repair | UIQ-005 |
| `/library/check-ins/:id` (Intake) | coach | 375×780 / 1280×800 | delayed skeleton; forced error/Retry; empty-save validation; one palette item/no preset; fixed required/no options; duplicate + second palette entry disabled; save/list/reopen persistence | passed after repair | UIQ-006, UIQ-007 |
| `/library/check-ins/:id` (Check-in) | coach | 375×780 / 1280×800 | existing Weekly check-in palette and common presets; Service type absent; no mutation; no console/network failures | passed | — |
| `/check-ins/:id` (due Intake) | client | 375×780 | delayed assignment GET; forced error + Retry recovery; empty required submit; Training/Nutrition/both control; generated request; successful list outcome | passed after repair | UIQ-008, UIQ-009 |
| `/check-ins/:id` (completed Intake) | client | 375×780 | purpose-aware submitted card; completion date; awaiting review; friendly Training · Nutrition answer; no overflow | passed after repair | UIQ-010 |
| `/clients/prototypes/required-services?context=*` | coach reference | 375×780 / 1280×800 | locked Invite/Intake/Edit/Unclassified specification; production behavior is judged against it, not edited | reference only | — |

## Router accounting — CoachApp

Every `frontend/apps/coachapp-v2/src/router.tsx` entry is accounted for below.

| router entry | disposition |
| --- | --- |
| `/clients` | in scope through the seven Workbench states plus roster |
| `/clients/invite` | in scope: required-services Invite capture |
| `/clients/prototypes/required-services` | reference-only locked prototype; excluded from production repair |
| `/clients/:id` | in scope only for Unclassified truth/edit entry |
| `/clients/:id/edit` | in scope: accepted-client required-services edit |
| `/library/check-ins/:id` | in scope for Intake and Check-in builder vocabulary |
| `/login` | excluded: authentication is support-only for this audit |
| `/signup` | excluded: outside Workbench/required-services scope |
| `/verify-login` | excluded: authentication is support-only for this audit |
| `/verify-signup` | excluded: outside scope |
| `/accept-invite` | excluded: invitation acceptance is not required-services capture |
| `/accept-invite/verify` | excluded: outside scope |
| `/register-business` | excluded: outside scope |
| `/dashboard` | excluded: queue-count consumer only; will be seam-checked if shared queue code changes |
| `/clients/:clientId/sessions/:sessionId` | excluded: outside scope |
| `/clients/:id/weight` | excluded: outside scope |
| `/clients/:id/intake` | excluded: coach intake-response detail is not the ClientApp completed-answer surface named by ticket 15 |
| `/clients/:id/check-ins/:assignmentId` | excluded: ordinary coach review route; queue navigation may be exercised from Workbench |
| `/clients/:id/nutrition/:date` | excluded: outside scope |
| `/clients/:id/photos` | excluded: outside scope |
| `/clients/:id/messages` | excluded as a full route audit; destination may be asserted for Replies/Quiet actions |
| `/library` | excluded: outside scope |
| `/library/exercises` | excluded: outside scope |
| `/library/exercises/create` | excluded: outside scope |
| `/library/exercises/:id` | excluded: outside scope |
| `/library/exercises/:id/edit` | excluded: outside scope |
| `/library/foods` | excluded: outside scope |
| `/library/foods/create` | excluded: outside scope |
| `/library/foods/:id` | excluded: outside scope |
| `/library/foods/:id/edit` | excluded: outside scope |
| `/library/recipes` | excluded: outside scope |
| `/library/recipes/create` | excluded: outside scope |
| `/library/recipes/:id` | excluded: outside scope |
| `/library/recipes/:id/edit` | excluded: outside scope |
| `/library/nutrition-plans` | excluded: outside scope |
| `/library/nutrition-plans/create` | excluded: outside scope |
| `/library/nutrition-plans/:id` | excluded as a route audit; Programming navigation outcome may open it indirectly |
| `/library/nutrition-plans/:id/edit` | excluded: outside scope |
| `/library/training-plans` | excluded: outside scope |
| `/library/training-plans/create` | excluded: outside scope |
| `/library/training-plans/:id` | excluded as a route audit; Programming navigation outcome may open it indirectly |
| `/library/training-plans/:id/edit` | excluded: outside scope |
| `/library/check-ins` | limited in-scope support surface: identify run-owned builders and verify the Default Intake picker that controls new-client Intake assignment; the full Forms library remains excluded |
| `/library/check-ins/review/:id` | excluded as a full route audit; Check-ins queue destination/outcome may be asserted |
| `/library/check-ins/create` | excluded: service question is added in the builder after creation |
| `/library/check-ins/:id/edit` | excluded: details-only form, not the question builder |
| `/settings` | excluded: outside scope |
| `/settings/landing-page` | excluded: outside scope |
| `/settings/:tab` | excluded: outside scope |
| `*` | excluded: catch-all behavior outside feature scope |

## Router accounting — ClientApp

Every `frontend/apps/clientapp-v2/src/router.tsx` entry is accounted for below.

| router entry | disposition |
| --- | --- |
| `/check-ins/:id` | in scope for due Intake completion and completed review |
| `/check-ins` | excluded as a full route audit; used only to locate an Intake assignment |
| `/login` | excluded: authentication is support-only |
| `/verify-login` | excluded: authentication is support-only |
| `/invite/:token` | excluded: outside scope |
| `/invite/:token/verify` | excluded: outside scope |
| `/` | excluded: outside scope |
| `/training` | excluded: outside scope |
| `/training/workout/:workoutId` | excluded: outside scope |
| `/nutrition` | excluded: outside scope |
| `/nutrition/history` | excluded: outside scope |
| `/progress` | excluded: outside scope |
| `/messages` | excluded: support-only for creating a Replies row if needed |
| `/workout` | excluded: outside scope |
| `/history` | excluded: outside scope |
| `/history/:sessionId` | excluded: outside scope |
| `/settings` | excluded: outside scope |
| `*` | excluded: catch-all behavior outside feature scope |

## Findings

### UIQ-001 — Programming request failure renders a false success-empty state

- Route/state/viewport: `/clients?view=programming`, forced queue request failure, 375×780 and 1280×800.
- Severity/class: high behavioral/error-state defect and canonical-component inconsistency.
- Evidence: the failed request produced `Everyone's programmed` with no error or Retry control; the same run logged `net::ERR_FAILED`. `programming-view.tsx` branches to its empty state before the nested `BrowseListBox` can render `isError`.
- Probe control: the other queue views pass their query error directly to one top-level `BrowseListBox`; their forced-error sweeps must show Retry.
- Status: fixed in `programming-view.tsx`; pre-fix error probe had no Retry and post-fix has friendly error + working Retry at both widths.

### UIQ-002 — Programming loading state is blank instead of a list skeleton

- Route/state/viewport: `/clients?view=programming`, delayed first queue response, 375×780 and 1280×800.
- Severity/class: objective visual defect / UI-contract loading inconsistency.
- Evidence: while `list.isLoading` and groups are empty, the group map renders no children; the page shows only heading/filter chrome and zero list skeleton nodes.
- Probe control: the repaired state must render the canonical `ListSkeleton`, while a deliberately removed loading condition must return zero skeleton rows.
- Status: fixed in `programming-view.tsx`; the same delayed-response probe changed from zero to 24 canonical skeleton nodes at both widths.

### UIQ-003 — Drained desktop Replies renders a second impossible empty instruction

- Route/state/viewport: `/clients?view=replies`, empty/loading/error, 1280×800.
- Severity/class: system inconsistency / copy and objective empty-state defect.
- Evidence: `replies-1280.png` shows “Replies cleared” beside “Choose a reply · Select a waiting conversation…” when zero conversations exist. The stale right pane also renders while the left pane is loading or showing a fetch error.
- Root cause: the desktop split surface is unconditional; `selected` is absent for all zero-item states, but its fallback assumes a selectable row exists.
- Probe control: the 375px single-pane empty state is correct; the post-fix desktop DOM must contain exactly one empty heading and no “Choose a reply” until a populated row exists.
- Status: fixed in `replies-view.tsx`; the same desktop probes changed from two state panes to one for empty/loading/error, while mobile stayed unchanged.

### UIQ-004 — Unclassified roster rows falsely claim a plan is required

- Route/state/viewport: `/clients?view=all`, active Nora Field (`required_services: []`), 375×780 and 1280×800.
- Severity/class: behavioral/domain-copy defect and coordinated-cutover inconsistency.
- Evidence: the live row rendered “Needs a plan assigned” / “Needs plan”; the DOM contained zero `Unclassified` labels. The Workbench authority defines an empty service set as Unclassified and excludes that client from Programming until a service is selected.
- Root cause: `client-list-item.tsx` derives attention from the absence of both plan names and ignores `required_services`, preserving the retired generic plan predicate in presentation code.
- Probe control: Nora's pre-fix row produced `Unclassified: 0`; after repair it must say Unclassified at both widths, while a classified client with missing required coverage must retain “Needs plan.”
- Status: fixed in `client-list-item.tsx`; Nora/Freya now render Unclassified while classified Gina retains Needs plan.

### UIQ-005 — Required-service toggle cards clip their descriptions

- Route/state/viewport: `/clients/invite` with Training and Nutrition selected, 375×780 and 1280×800; shared by `/clients/:id/edit`.
- Severity/class: objective visual defect / shared canonical-component sizing defect.
- Evidence: each selected card retained the theme's compact ToggleButton height while containing a 40px icon, label, description, and padding; the description crossed the bottom edge in both screenshots.
- Root cause: the shared field styled a compact-height toggle as a multi-line content card without releasing its fixed height.
- Probe control: before repair each card's content exceeded its client height and text visibly crossed the border; after repair both lines must fit with `scrollHeight <= clientHeight` at both widths.
- Status: fixed in `required-services-field.tsx` by releasing the shared cards to content height.

### UIQ-006 — Intake builder keeps an obsolete empty-form error after a question is added

- Route/state/viewport: run-owned `/library/check-ins/:id` Intake builder after Save on an empty form, then Add Service type; 375×780 and 1280×800.
- Severity/class: behavioral validation-feedback defect.
- Evidence: “Add at least one question” remained visibly red while the header and section both showed one valid Service type question.
- Root cause: builder validation state changed only on the next submit; question draft changes never cleared it.
- Probe control: the empty Save must first display the error; adding Service type must then remove it without a second submit.
- Status: fixed in `checkin-builder.tsx` by clearing stale validation when a section draft changes.

### UIQ-007 — The locked Service type question exposes editable identity controls

- Route/state/viewport: run-owned Intake builder with Service type expanded, 375×780 and 1280×800.
- Severity/class: accepted-spec/domain-invariant defect.
- Evidence: both the Question text and Answer type selector were enabled even though ticket 15 records one fixed, required special question; changing either would erase or mislabel the capture contract.
- Root cause: only Required and Duplicate were disabled for `service_type`; the shared editors were left enabled.
- Probe control: an ordinary question keeps both editors enabled; Service type must render Question and Answer type disabled, Required selected/disabled, no Options editor, no Duplicate, and no second palette item.
- Status: fixed in `checkin-builder.tsx` by locking both identity controls for the special question.

### UIQ-008 — Due Intake loading has no form-shaped feedback

- Route/state/viewport: ClientApp run-owned `/check-ins/:id`, delayed assignment GET, 375×780.
- Severity/class: objective loading-state/UI-contract defect.
- Evidence: the route rendered the generic Check-in title with no skeleton blocks while waiting; source used a lone centered spinner rather than stable form geometry.
- Root cause: `FillCheckin` hand-rolled its route-level loading branch before the ClientApp's canonical state conventions existed.
- Probe control: post-repair delay must expose multiple `.skeleton` blocks before the same successful form renders.
- Status: fixed in `fill-checkin.tsx` with content-shaped HeroUI Skeleton blocks.

### UIQ-009 — Due Intake request failure has no recovery action

- Route/state/viewport: ClientApp run-owned `/check-ins/:id`, forced assignment GET failure, 375×780.
- Severity/class: behavioral error-recovery defect / canonical-component inconsistency.
- Evidence: the page showed “Check-in couldn't load” and Back, but no Retry; the same app already owns a shared `ErrorState` with Retry.
- Root cause: the route used a bespoke error card and did not destructure query `refetch`.
- Probe control: the forced failure must render the shared friendly message and Retry; releasing the route and pressing Retry must recover to Test Intake.
- Status: fixed in `fill-checkin.tsx` with shared ErrorState and query refetch wiring.

### UIQ-010 — Completed Intake claims a Check-in was submitted

- Route/state/viewport: ClientApp run-owned completed `/check-ins/:id`, 375×780.
- Severity/class: domain-copy/system-consistency defect.
- Evidence: the page title was Test Intake and the answer was Service type, but the success card heading read “Check-in submitted.”
- Root cause: the shared completed state hard-coded the Check-in noun despite receiving `assignment.purpose`.
- Probe control: the ordinary Check-in branch keeps “Check-in submitted”; the run-owned Intake must render “Intake submitted” without changing its completed layout or answer review.
- Status: fixed in `fill-checkin.tsx` with purpose-aware completion copy.

### UIQ-011 — Mobile Expiring row clips the end date that explains Renew

- Route/state/viewport: `/clients?view=expiring`, run-owned populated row, 375×780.
- Severity/class: mobile behavioral-fidelity / objective text clipping defect.
- Evidence: “Engagement ending soon · Ends 20 Aug” rendered as “Engagement ending s…” once Renew and Snooze occupied the row; the absolute date was unavailable.
- Root cause: shared `QueueRow` applied `truncate` to reason facts at every breakpoint.
- Probe control: desktop retains single-line truncation behavior; at 375px the same row must wrap and expose “Ends 20 Aug,” and a populated Quiet row must expose its missed due date.
- Status: fixed in `queue-row.tsx` with mobile wrapping and `sm:truncate`.

### UIQ-012 — Long queue names paint underneath mobile controls

- Route/state/viewport: populated `/clients?view=expiring` and `/clients?view=quiet`, run-owned long client name, 375×780.
- Severity/class: objective visual overlap / shared responsive-row defect.
- Evidence: `Test Workbench Client` painted behind Renew and Message even though its grid column used `minmax(0, 1fr)`; the text column did not contain the label's paint.
- Probe control: desktop retained the full name; after repair mobile must show an ellipsis before the control group with no overlapping pixels while leaving the two-line actionable fact visible.
- Status: fixed in `queue-row.tsx` with text-column overflow containment and an explicit block-width truncation boundary.

### UIQ-013 — Default Intake picker bypasses the canonical row spacing

- Route/state/viewport: Forms header's Default Intake picker, shared Intake assignment control.
- Severity/class: low design-system / UI-contract defect.
- Evidence: the final contract gate rejected the picker's private quarter-step `py-2.5`; every entity picker row is required to use the canonical list-row treatment.
- Probe control: the shared `LIST_ITEM_CLASS` already owns whole-step spacing, separators, responsive gutters, hover, and press behavior for the same ListBox primitive.
- Status: fixed in `default-intake-control.tsx` by adopting the canonical row class instead of private spacing.

## Fixtures and cleanup

| entity | id / locator | created for | cleanup state |
| --- | --- | --- | --- |
| `Test Workbench Client` | `7acdba78-ab46-4449-b270-ea303fede96a`; `test.workbench.20260815@example.com` | Invite omission/post-action; invitation Onboarding; accepted edit round-trip; client Intake/check-in; populated Replies/Expiring/Quiet | deleted; exact client/email checks return zero |
| `Test Client` user | `2e067b85-305a-47c9-ba9c-c6843548c852`; `test.workbench.20260815@example.com` | ClientApp invitation acceptance/authentication side effect | deleted with its sessions/tokens; exact email check returns zero |
| `Test Intake` | `6271a882-a572-473d-a440-745eef10f3c5` | Intake builder Service type add/save; assignment; ClientApp due/completed answer | deleted; exact id check returns zero |
| `Test Intake` assignment | `4196c101-e8fb-4c82-ab44-f3cba0001353`; client `7acdba78-ab46-4449-b270-ea303fede96a` | ClientApp due/completed Service type answer | deleted with Test Client; exact id check returns zero |
| `Test Intake` submission | `f2c15973-f9d8-44ed-ba8c-6d20d394f8e3` | generated Service type request + friendly completed answer | cascade-deleted; exact id check returns zero |
| `Test Check-in` | `86154381-64c3-46bb-b4c7-ace19ac5242c` | Check-in request exclusion; populated review and Quiet queues | deleted; exact id check returns zero |
| `Test Check-in` schedule | `3c9de20e-7285-417f-8864-46f011eebf84`; client `7acdba78-ab46-4449-b270-ea303fede96a` | generate run-owned due/missed assignments | deleted; exact id check returns zero |
| `Test Check-in` assignment | `7da5ff1e-9442-44f0-84bc-3723a73cff28` | populated Check-ins review queue | deleted with Test Client; exact id check returns zero |
| `Test Quiet assignment` | `aea3887b-0867-4031-b263-2a9a4f72b8a2`; client `7acdba78-ab46-4449-b270-ea303fede96a` | populated Quiet Message/snooze queue | deleted with Test Client; exact id check returns zero |
| `Test Check-in` submission | `e7867263-67d0-4f83-bbb0-274c11f95f8e` | populated Check-ins review queue | cascade-deleted; exact id check returns zero |
| `Test Workbench reply` | message `f1d0f904-1631-4cf1-bf94-fac5cab269c5`; conversation `e1d7b395-9cca-49b5-b966-83e52e6995d8` | populated Replies split/inline task and drain | cascade-deleted; exact ids return zero |

Only this run-owned entity may be mutated. Any additional `Test <Noun>` form/assignment is recorded here before use and deleted before completion.

## Validation log

- Programming root-cause group: focused Biome passed; `just check-rm` passed with RM-212; `git diff --check` passed.
- Live re-test: populated interactions remained correct at both widths; forced error rendered Retry and recovered; delayed response rendered list skeletons. Expected console failure exists only for the deliberately aborted control request. Screenshots: `evidence/ui-audit-2026-08-15/programming-{375,1280}.png`.
- Onboarding Intake state: delayed loading, populated layout, forced error/Retry recovery, confirmation/Cancel, row navigation, and grid keyboard control path passed at both widths. Existing Riley was not mutated. Screenshots: `evidence/ui-audit-2026-08-15/onboarding-{375,1280}.png`.
- Check-ins empty state: correct non-stretched empty card, delayed skeleton, forced error/Retry recovery, focus order, and no viewport overflow at both widths. Screenshots: `evidence/ui-audit-2026-08-15/check-ins-{375,1280}.png`.
- Replies empty-state group: focused Biome, `just check-rm` with RM-213, and diff hygiene passed. The pre-fix desktop probe found two empty headings; the post-fix empty/loading/error probes contain one canonical state and no “Choose a reply.” Screenshots: `evidence/ui-audit-2026-08-15/replies-{375,1280}.png`.
- Expiring empty state: truthful 14-day copy, non-stretched card, delayed skeleton, forced error/Retry recovery, focus, and no overflow passed at both widths. Screenshots: `evidence/ui-audit-2026-08-15/expiring-{375,1280}.png`.
- Quiet empty state: truthful missed-check-in copy, non-stretched card, delayed skeleton, forced error/Retry recovery, focus, and no overflow passed at both widths. Screenshots: `evidence/ui-audit-2026-08-15/quiet-{375,1280}.png`.
- Workbench landing: mobile renders the six-queue Today menu and drills to `?view=programming`; desktop auto-selects the first nonempty queue; an unavailable counts request falls back to the roster without claiming “Clear.” Focus/order and overflow passed. Screenshots: `evidence/ui-audit-2026-08-15/workbench-landing-{375,1280}.png`.
- Roster Unclassified group: focused Biome, `just check-rm` with RM-214, and diff hygiene passed. The live probe changed from zero Unclassified labels to Nora/Freya labels at both widths; classified Gina still renders Needs plan. Filters, sort, error/Retry, focus, navigation, and viewport overflow passed. Screenshots: `evidence/ui-audit-2026-08-15/roster-{375,1280}.png`.
- Client detail: Nora renders one active Unclassified chip and a clear Edit client affordance; delayed detail loading, forced error/Retry recovery, focus order, and viewport overflow passed at both widths. Screenshots: `evidence/ui-audit-2026-08-15/client-detail-unclassified-{375,1280}.png`.
- Client edit validation: Nora's edit form renders the Unclassified explanation, blocks empty services, clears the service error after Training is chosen, then blocks an invalid email. Delayed loading and forced error/Retry recovery passed at both widths without mutating Nora. Screenshots: `evidence/ui-audit-2026-08-15/client-edit-unclassified-validation-{375,1280}.png`.
- Invite validation: optional omission and every Training/Nutrition selection combination report the expected pressed state; empty name/contact and a mid-filled invalid email are blocked at both widths. UIQ-005's shared service cards changed from 34px client height / 41px scroll height to 80px / 80px, with both text lines visible. Focus and viewport overflow passed. Focused Biome, `just check-rm` with RM-215, and diff hygiene passed. Screenshots: `evidence/ui-audit-2026-08-15/invite-validation-{375,1280}.png`.
- Invite post-action + Onboarding invitation: the run-owned client was created by submitting the live Invite form with services intentionally omitted (201, `required_services: []`) and rendered the success state. After its invitation clock was aged, both widths rendered the compact invitation row with Call and Resend; confirmation/Cancel and ArrowRight-to-Call passed. Confirmed Resend returned 200, removed the row, reset the follow-up clock, and preserved the empty services set. The refreshed invite was accepted in ClientApp (200); CoachApp then rendered the active Test Client as Unclassified. Screenshots: `evidence/ui-audit-2026-08-15/onboarding-invitation-test-client-{375,1280}.png`, `onboarding-invitation-drained-375.png`, and `test-client-accepted-unclassified-375.png`. The first Invite success screenshot was intentionally discarded because it contained the live invite token.
- Accepted-client edit round-trip: the Test Client opened with both services unpressed, saved canonical `required_services: [training, nutrition]` in a 200 PATCH, and reopened with both pressed at mobile and desktop widths. A fresh detail read no longer rendered Unclassified. No console errors or viewport overflow were present. Screenshots: `evidence/ui-audit-2026-08-15/test-client-services-roundtrip-{375,1280}.png`.
- Test Intake creation: the live Create form route surfaced empty-name validation, accepted Intake type, returned 201, and opened the new builder with its empty Intake section. Screenshot: `evidence/ui-audit-2026-08-15/test-intake-created-375.png`.
- Intake builder: delayed loading rendered four skeletons and forced failure rendered “Couldn't load form” + Retry at both widths. Empty Save first displayed validation; adding Service type now clears it. The special question appears once in the Intake palette and never in presets, then renders locked Question/Answer type, selected+disabled Required, no Options, disabled Duplicate, and no second palette entry. UIQ-006/UIQ-007 focused Biome, `just check-rm` with RM-216, and diff hygiene passed. The live save returned to Forms with “Form saved”; a 200 reopen persisted exactly `{id: service_type, label: Service type, required: true, type: service_type}`. Screenshots: `evidence/ui-audit-2026-08-15/test-intake-builder-service-type-{375,1280}.png`, `test-intake-save-outcome-375.png`, and `test-intake-persisted-375.png`.
- Check-in builder exclusion: the existing Weekly check-in palette contains neither a Service type new-question tile nor preset at both widths, with no mutation, console error, or failed response. Screenshots: `evidence/ui-audit-2026-08-15/checkin-palette-no-service-type-{375,1280}.png`.
- Test Intake assignment: Client detail's picker was filtered to the one exact `Test Intake · 1 question` option; the live POST returned 201 with assignment `4196c101-e8fb-4c82-ab44-f3cba0001353`, the surface closed, and detail refreshed to “Assigned, not submitted yet.” The stock Intake assignment automatically created during invite acceptance was removed from the run-owned Test Client before this exact assignment; no pre-existing client was touched. Screenshot: `evidence/ui-audit-2026-08-15/test-intake-assigned-375.png`.
- ClientApp due Intake: UIQ-008/UIQ-009 changed the delayed state from no skeleton blocks to four and the forced failure from no Retry to shared copy + a working Retry that recovered. Empty submit showed the required error and the first selection cleared it; omitted, Training-only, Nutrition-only, and both pressed states all matched. The 201 submission sent exactly `{answers: {service_type: {services: [training, nutrition]}}}` and returned to Check-ins. The only aborted request was the list refetch cancelled by the deliberate immediate navigation to completed detail. Focused Biome, `just check-rm` with RM-217, and diff hygiene passed. Screenshots: `evidence/ui-audit-2026-08-15/client-test-intake-due-375.png`, `client-test-intake-selected-375.png`, and `client-test-intake-submit-outcome-375.png`.
- ClientApp completed Intake: the pre-fix live result said “Check-in submitted” while showing Test Intake and Service type. After UIQ-010/RM-218, the same completed assignment renders “Intake submitted,” its completion date, Awaiting coach review, and friendly `Training · Nutrition`, with no overflow, console errors, or failed responses. Screenshot: `evidence/ui-audit-2026-08-15/client-test-intake-completed-375.png`.
- Test Check-in request exclusion: the live builder palette contained zero Service type entries and its 200 save request contained only `{id: test_response, label: Test response, type: text, required: false}`. No `service_type` field reached the Check-in request. Screenshots: `evidence/ui-audit-2026-08-15/test-checkin-created-375.png` and `test-checkin-save-outcome-375.png`.
- Test Check-in due/completed control: the run-owned weekly schedule generated assignment `7da5ff1e-9442-44f0-84bc-3723a73cff28`; ClientApp submitted `answers.test_response` only (201) and its completed branch correctly retained “Check-in submitted” while excluding the Intake noun. The two aborted GETs were navigation-cancelled immediately before explicit destination loads. Screenshots: `evidence/ui-audit-2026-08-15/test-checkin-scheduled-375.png`, `client-test-checkin-due-list-375.png`, `client-test-checkin-filled-375.png`, and `client-test-checkin-completed-375.png`.
- Populated Check-ins queue: both widths rendered the Test Client row and keyboard Review path, and the Review action opened the exact submission with its answer plus Mark reviewed/Reply in chat actions. Confirmed Mark reviewed set `reviewed_at`, navigated to the dashboard, and the refreshed queue drained at both widths. Screenshots: `evidence/ui-audit-2026-08-15/checkin-review-test-client-{375,1280}.png` and `check-ins-{375,1280}.png`.
- Populated Replies queue: the Test Client's 201 message created one waiting sequence. Both widths rendered the preview and truthful one-message/read facts without draining on read; mobile used the locked inline task and desktop the split task. Confirmation/Cancel copy passed, Reply opened the exact client conversation, and confirmed Mark handled returned 204 and drained to the single canonical empty state. The request-failed event paired with the successful 204 no-content response is a browser transport artifact, not a failed mutation. Screenshots: `evidence/ui-audit-2026-08-15/client-test-reply-sent-375.png`, `replies-test-client-{375,1280}.png`, and `replies-drained-after-handled-375.png`.
- Populated Expiring queue: both widths expose `Engagement ending soon · Ends 20 Aug`; keyboard focus reaches Renew, Renew opens the exact Test Client Coaching access dialog, and a one-week snooze sends `{queue: expiring, snoozed_until: 2026-08-22}` with 204 before draining. The shared mobile row now keeps the absolute date visible and truncates the long name before the controls without overlap. Screenshots: `evidence/ui-audit-2026-08-15/expiring-test-client-{375,1280}.png` and `expiring-drained-after-snooze-375.png`.
- Populated Quiet queue: the run-owned latest already-due missed assignment produces `Missed check-in · Missed check-in due 15 Aug` at both widths; keyboard focus reaches Message, Message opens the exact Test Client conversation, and a one-week snooze sends `{queue: quiet, snoozed_until: 2026-08-22}` with 204 before draining. The shared mobile row preserves the due date and contains the long name before Message/Snooze. Screenshots: `evidence/ui-audit-2026-08-15/quiet-test-client-{375,1280}.png` and `quiet-drained-after-snooze-375.png`.
- Fixture cleanup: a transaction removed the three run-owned assignments before the schedule, then deleted the exact Test Client (cascading its submissions, conversation/message, and snoozes) and both exact form templates; the invite-created user and its auth rows were removed separately. Post-cleanup checks returned zero for the exact email, every recorded id, and every dependent table.
- Default Intake picker: after adopting `LIST_ITEM_CLASS`, the live picker renders one stock Intake row at both widths with `scrollHeight === clientHeight` (60px), canonical separators/press treatment, no clipped text, no console errors, and no failed responses. Screenshots: `evidence/ui-audit-2026-08-15/default-intake-picker-{375,1280}.png`.
- Final gates: focused Biome passed for all nine changed UI source files; `scripts/check-rm.sh`, `scripts/check-ui-contract.sh`, and `git diff --check` passed. `pnpm --filter coachapp-v2 build` and `pnpm --filter clientapp-v2 build` both passed their real TypeScript projects, embedded checks, and Vite production builds. Vite retained only the repository's existing HeroUI-generated empty-`:is()` CSS and chunk-size warnings. No commit was created.
