# Profile and business settings

When my contact details or business preferences change, I need to update them once so that my team and future clients have the right information. This is an occasional task, often on a phone. The costly mistake is changing business-wide data while intending to edit a personal profile.

The account menu opens Your profile or Business settings. Both pages share a short two-link navigation. Personal names and phone are editable; sign-in email is readable account information. Business details and defaults have a separate owner-only save action. Trainers can read business settings with an explanation of who can change them.

A combined settings worksheet would make it easy to confuse the two scopes and create partial saves across endpoints. Separate pages keep each save atomic, give each form a clear title, and work with a single column on mobile. Desktop pairs short name fields but keeps the same reading order. Use the existing shadcn controls and visible labels.

Business settings include name, about, WhatsApp contact, weight unit and default time zone. The immutable handle is readable. Time zone choices come from the server's supported reference list. A changed business time zone applies to subsequent client invitations; earlier client calendars and frozen nutrition history retain their own time zones. Personal coach time zones are not a persisted domain concept; do not invent a disconnected preference.

Only changed fields are sent. Success refreshes the account header and relevant cached preferences. Interrupted saves keep the draft and allow an idempotent retry. Navigation with unsaved changes offers Keep editing or Discard and leave; a pending save cannot be abandoned through that confirmation. An account change rejects late completions. Failed loading has a retry; trainers cannot submit business edits through either business or profile endpoints.

Verified on 2026-09-13 against the isolated real Phoenix API at 375px and 1280px: account-menu entry, profile/header persistence, changed-field profile writes, owner business edits and defaults, read-only trainer view, trainer personal edits, required-name and real server time-zone validation, initial business/time-zone load failure and retry, failed profile saves, lost business-save responses and idempotent retry, discard/keep-editing navigation, blocked departure during a save, and late business responses after switching to a different business. Account refresh failure retains the open draft and has a working retry. Screenshots of both forms and the trainer business view were inspected at both widths; this is browser verification, not a target-coach usability study.

Frontend build, scoped Biome, the former repository checks, and `git diff --check` passed. Auth and invitation browser regressions passed after the shared app-shell recovery fix. The API contract agent regenerated schemas and passed the focused backend tests and full `mix precommit` (1,697 tests, zero failures). Backend tests also cover immutable handles, cross-tenant body targeting, trainer business-field writes through both routes, atomic profile/business rollback, and future invitation time-zone inheritance without changing earlier clients.

Time-zone choices use the shadcn Select and the server's finite reference list.

Calendar ownership audit, 2026-09-15: the coach Client update and client self-profile update contracts expose no per-client time-zone change. The business default is stamped at invitation and subsequent business edits preserve existing client calendars. A separate client preference control would require a new domain policy, so the current settings surface remains the supported editor. The local-calendar and client-read boundary suites pass 34 tests, including different dates for the same UTC instant and invitation inheritance. The complete settings browser regression also passes at 375px and 1280px against the isolated API, covering both roles, recovery and account replacement.

## Current keyboard audit, 2026-09-15

The shared save/discard controls now use each form's state and registered field references. Failed writes focus their recovery error; server field validation waits for re-enabled inputs and selects. Save and discard confirmations receive focus, and dirty drafts suppress saved notices. The original profile-result focus probe failed.

The full settings suite passes at 375px/1280px, including required-name validation, a real server rejection of the time zone, retained drafts, lost responses, trainer read-only business settings and late account changes. Build, Biome, repository checks and backend precommit pass (1,778 tests, zero failures). One intermediate cleanup error was not reproduced; scenario diagnostics and consistent assertion timeouts now preserve clearer failure evidence.
