# Coach app completion

Objective: complete the new coachapp end to end, screen by screen, with clear mobile-first UX. Use the backend contract and the new app's primitives. Never consult coachapp-v2 UI or handwritten code. Keep search, totals, business selections and persisted calculations on the server; use cursor lists, generated types, shadcn controls, recoverable writes and session guards.

This is an implementation ledger, not a claim of completion. Existing slices have recorded verification; the final audit must rerun the complete product journeys against current code. Source inventory: `backend/lib/easy_web/router.ex` and `frontend/apps/coachapp/src/router.tsx`, inspected 2026-09-12. Additional requirements discovered while using each task join this ledger.

| Coaching task | Current state | Remaining work / completion evidence |
| --- | --- | --- |
| Sign in, register, accept team invitations | Implemented | Final auth/session regression and account recovery audit |
| Invite a client and review intake | Implemented | Add intake reminder/dismissal/priority and client lifecycle editing where appropriate; verify acceptance through client app |
| Client roster and overview | Partial | Profile/contact/preferences, required services, engagement dates, deactivate/reactivate/delete, coach reassignment; permissions and recovery |
| Training Templates and Client Plans | Core authoring/assignment implemented | Audit archive/restore/delete/duplicate, coverage edits and all prescription fields; media and reuse |
| Nutrition Templates and Client Nutrition Plans | Core authoring/assignment implemented | Audit archive/restore/delete/duplicate, coverage edits and all menu fields |
| Exercise library | Core authoring implemented | Media upload, copy shared exercise and deletion constraints |
| Food and recipe libraries | Core authoring implemented | Copy, deletion/impact, complete editable fields and reuse after updates |
| Forms | Authoring and default intake implemented | Archive/restore/delete/default clearing, usage constraints, one-off assignment |
| Check-in schedules | Implemented | Final end-to-end regression with submitted answers |
| Check-in review and history | Implemented and verified 2026-09-12 | Global/client history, frozen answers, review recovery, cursor lists and intake regression pass at 375px/1280px; see check-in-review.md |
| Client training history | Implemented and verified 2026-09-12 | Frozen prescriptions, recorded sets and units, session states, date filters, cursor pagination and recovery pass at 375px/1280px; see training-history.md |
| Client nutrition history | Implemented and verified 2026-09-12 | Daily intake, server totals, frozen meal guidance, date navigation, unknown/zero nutrients, recovery and account isolation pass at 375px/1280px; see nutrition-history.md |
| Client progress | Implemented and verified 2026-09-12 | Server-owned weight trend, mixed units, form provenance, date filters, cursor history, recovery and account isolation pass at 375px/1280px; see weight-progress.md |
| Conversations | Pending | Client thread and inbox, pagination, text/media sending, read/handled state, realtime updates, failed-send recovery |
| Daily Workbench | Pending | API-owned queues/counts, onboarding/programming/expiry/quiet/review/reply actions and snooze; no frontend derivation |
| Coach profile and business settings | Pending | Profile/timezone, business details and persisted preferences, owner permissions |
| Team | Pending | Invitation, resend/revoke, deactivate/reactivate and client reassignment |
| Billing | Pending | Seats/plan/current state, checkout/sync/cancel, permission and provider recovery; test without real charges |
| Landing page and applications | Pending | Authoring/preview/publish state, prospect lists/detail/status/enrollment, public application journey |
| Cross-cutting completion | Pending | Navigation and deep links, no orphan actions, role/session isolation, form accessibility, mobile overflow/focus, page/error recovery, API drift, production build and full backend precommit |

Sequence: finish check-in review → client activity/history → conversations → client lifecycle → Workbench → business/team/billing → acquisition → complete library actions and full application audit. Reorder only when a dependency makes the next task more useful. No automatic commits or production deployment are implied.
