# Check-in form improvements: multiple schedules and default intake selection

Status: resolved

Source research: `.scratch/checkin-form-assignment-research/research.md` (competitor and coach-workflow analysis, 2026-08-14). This spec covers the top two ranked improvements from that research, scoped against what the codebase already does.

## Problem statement

Two gaps keep coaches from running the industry-standard check-in stack:

1. A coach can only run one recurring check-in per client in the app. The standard coaching cadence is a short weekly check-in plus a deeper monthly progress review (both CoachRx and Healthie support this; the research found it is the canonical stack). The backend already permits one active CheckInSchedule per (client, form template) pair, but the coach-facing Check-ins tab renders only the first schedule, so a second schedule is unreachable in practice.

2. When a coach invites a client, an intake form is auto-assigned, but the coach has no say in which one: the system silently picks the oldest active intake template, creating a system default if none exists. A coach with more than one intake template (for example a general intake and a prenatal intake) cannot control which one new clients receive. CoachRx, Everfit, PT Distinction, and My PT Hub all let the coach configure the intake sent on client creation.

## Solution

1. Multiple check-in schedules per client. The client Check-ins tab shows all of a client's schedules as a list, with an add-schedule flow (pick a check-in template, frequency, and first due date) and per-schedule edit, pause, and delete. The backend caps active schedules at 3 per client to keep the client's task list and the coach's Workbench review load sane.

2. Business default intake template. A business-level setting names the intake template auto-assigned on client invite. When unset, behavior is unchanged (oldest active intake template, creating the system default if none exists). The coach edits this from the business settings surface.

Both ship independently.

## User stories

Multiple check-in schedules:

1. As a coach, I want to schedule a weekly check-in and a monthly progress review for the same client, so that I can run the standard coaching cadence without merging two instruments into one form.
2. As a coach, I want to see all of a client's active check-in schedules in one list on the client's Check-ins tab, so that I know exactly what recurring forms the client is on.
3. As a coach, I want to add a schedule by choosing a check-in template, a frequency, and the first due date, so that a new cadence starts on the day I intend rather than today by default.
4. As a coach, I want to edit the frequency of one schedule without touching the others, so that changing the monthly review does not disturb the weekly check-in.
5. As a coach, I want to pause (deactivate) one schedule while keeping the others running, so that I can suspend the deep review during a client's holiday without losing the weekly touchpoint.
6. As a coach, I want to delete a schedule that has not generated any assignments, so that a mistaken setup leaves no trace.
7. As a coach, I want to be stopped from adding a second active schedule for the same template to the same client, so that a client is never asked to fill the same form twice in one cadence.
8. As a coach, I want to be stopped from adding a fourth active schedule to a client, with a clear message, so that I do not bury the client in forms.
9. As a client, I want each scheduled check-in to appear as its own assignment with its own due date, so that my task list shows the weekly form and the monthly form as separate items.
10. As a coach, I want submissions from every schedule to flow into the same Workbench check-in review queue, so that reviewing stays in one place regardless of which cadence produced the submission.
11. As a coach, I want due and overdue reminders to work per assignment for every schedule, so that a client who ignores the monthly review gets nudged even if the weekly one is up to date.

Default intake template:

12. As a coach, I want to choose which intake form new clients automatically receive, so that my custom intake is used instead of whichever template happens to be oldest.
13. As a coach, I want to change the default intake template at any time, so that improving my onboarding does not require touching past clients.
14. As a coach, I want clients invited before I changed the default to keep their already-assigned intake, so that changing the setting never rewrites live assignments.
15. As a coach with no preference set, I want invites to keep working exactly as they do, so that the feature is opt-in.
16. As a coach, I want to be prevented from selecting an archived template or a check-in template as the default intake, so that the setting can never point at something clients cannot sensibly receive.
17. As a coach, I want the setting to clear itself gracefully if the chosen template is deleted, so that inviting a client never fails because of a stale reference.
18. As a coach, I want to see which template is the current default when browsing my forms, so that I do not have to open settings to remember.

## Implementation decisions

Multiple check-in schedules:

* The database already enforces uniqueness on (client, form template) for active schedules; no index change is needed. The changeset maps that unique violation onto the client field, which becomes misleading once several schedules per client are normal; remap the error to the form template field.
* Add a backend cap of 3 active schedules per client, enforced in the Forms context on schedule creation and on reactivation through update. Return a distinct error so the API can render a clear 422 message. The cap is a plain count check inside the existing creation transaction.
* The schedule list endpoint, the check-in sweeper (assignment generation and reminders), and the Workbench check-in queue already operate per schedule or per submission and need no behavioral change. The sweeper's handling of several due schedules for one client on the same day must be covered by tests, not rewritten.
* Coach app: the Check-ins tab replaces the single schedule card with a list of schedule cards plus an add-schedule action. The add flow collects template (check-in purpose only), frequency (once, weekly, biweekly, monthly), and first due date. Each card keeps the inline frequency and active controls the single card has today.
* API contract: the endpoints already exist and return lists; the OpenApiSpex schema gains the new cap error response, and both generated frontend schemas are regenerated.

Default intake template:

* Add a nullable default intake template reference on the business. A foreign key with nilify-on-delete satisfies the stale-reference story without any application code.
* Validation at write time: the referenced template must belong to the business, have intake purpose, and be active.
* The invite flow consults the setting first and falls back to the current oldest-active-or-create-default behavior when the setting is null or the referenced template has since been archived.
* The setting is read and written through the existing business update endpoint and surfaced in the coach app's settings surface; the forms list marks the default template.
* API contract: business schema gains the field; both generated frontend schemas are regenerated.

## Testing decisions

Test external behavior at the highest existing seams; no new seams are needed.

* Coaches API controller tests (ConnCase) are the primary seam, following the existing check-in schedule and client controller test files as prior art. New cases: creating a second schedule with a different template succeeds and both appear in the list; creating a second schedule with the same template returns 422 with the error on the template field; creating a fourth active schedule returns 422 with the cap error; pausing one schedule leaves the other generating assignments.
* Context-level tests (Forms context, following the existing forms test file) cover the sweeper: two due schedules for one client on the same date generate two assignments, each linked to its schedule, and reminders fire per assignment.
* Invite flow tests extend the existing client controller tests: invite with the setting set assigns the chosen template; invite with the setting null preserves today's behavior; invite after the chosen template is archived falls back; setting an archived or check-in-purpose template as default returns 422; deleting the default template nils the setting and later invites fall back.
* Good tests here assert on API responses and database effects visible through the API (assignments created, schedules listed), never on internal function calls or query shapes.
* Frontend: the Check-ins tab change is presentational over an endpoint that already returns lists; existing typecheck and build gates apply. No new frontend test seam is introduced.

## Out of scope

* Assignment-time question snapshots (rank #3 in the research) and template versioning (rank #7, deferred).
* Duplicate-template flow (rank #4).
* Per-client question overrides (rank #6, recommended against).
* Group, tag, or package-based auto-assignment triggers; per-invite template override (the business default is the only selection mechanism in this spec).
* Any change to the client app beyond what already renders multiple assignments.
* Schedule-count backfill or migration of existing data; no existing business exceeds the cap because the UI allowed only one schedule.

## Further notes

* The research file misread the schedule uniqueness constraint as one-per-client; source verification during spec writing showed it is one-per-client-per-template. The spec above reflects the verified state.
* The cap of 3 is a product guess with no competitor evidence either way (Healthie documents no limit). It is cheap to raise; the error message should not promise a specific number.
* The Workbench check-in queue keys on submissions, so multiple schedules increase queue volume linearly with cadence. No structural change, but worth watching after release.
