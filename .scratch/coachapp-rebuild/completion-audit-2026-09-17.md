# Whole-app completion audit

The objective remains the complete coachapp, built screen by screen from [the UX plan](plan.md). This audit reconciles the [completion ledger](completion.md) with the current router and fresh browser results. It uses current coachapp and backend sources only.

## Verified local evidence

The source inventory has 70 named routes, each registered in `src/router.tsx`, plus the fallback. All 71 appear in the route audit; there are no unmatched route rows or broken local document links. This proves the inventory correspondence. The browser suites establish the interactions listed below.

All 56 distinct browser scripts referenced by coachapp's package scripts have passing results. The first batch passed 53 scripts; three fixture corrections passed separate reruns. [Recorded results](regression-results-2026-09-17.json) preserve the original exits and each successful recheck. Duplicate command aliases run only once. The run uses each suite's configured local API/app pair and its disposable fixtures. Normal services remain on 4000/2022/1314; fixtures that require an isolated database use 44000/22022. Billing uses the local provider simulator on 44002 with dummy credentials.

The run manifest, individual logs and recorded exit codes are under `/tmp/coachapp-final-regression-2026-09-17`. Every script has a recorded successful exit, either in the initial batch or a corrected rerun. There are no unresolved suite failures. Fresh screenshots are archived in that directory's `screenshots/` folder; regenerated tracked captures were restored after archiving.

The final production build and `just check-rm` pass. Backend `mix precommit` exits successfully with 1,784 tests and zero failures. Logs: `/tmp/coachapp-completion-build-2026-09-17.log` and `/tmp/coachapp-completion-precommit-2026-09-17.log`. The build retains its recorded bundle-size warning.

## Failures resolved during the run

Three suites assumed a different catalog or database. Training templates expected 43 total exercises, but the normal API correctly returned 43 custom fixtures alongside 417 shared exercises. The test checks the unfiltered API count, searches a unique fixture prefix, then verifies 20/40/43 loaded rows, failure/retry and the exact filtered count. The worksheet test also uses unique fixture names so searches do not match shared movements with common names. Exercise authoring defaults to 44000/22022, matching the isolated database its reference seed already populated. These are harness corrections; application behavior is unchanged.

All three corrected suites pass at 375px and 1280px. Original failed logs remain in the regression directory; `rechecks.json` records their successful reruns and reasons. The other 53 suites passed their initial run.

## Requirement coverage

| Required coaching outcome | Verified browser suites |
| --- | --- |
| Sign up, sign in, recover verification and resume the intended destination | `auth/auth`, `auth/invitations`, `auth/deep-links`, `auth/accessibility`, `navigation/production` |
| Reach each section with the correct role and visible keyboard focus | `navigation/navigation`, `settings/settings`, `team/team` |
| Browse with server search, filters, counts and opaque cursor pages; retain results after failure | `lists/lists`, resource listing/management suites, `foods/categories` |
| Create, edit, preview and manage Intake/Check-in forms | `forms/forms`, `forms/creation-recovery`, `forms/management` |
| Invite a client, accept in the client app, review/follow up intake, assign a missing intake | `clients/invite`, `clients/invitation-recovery`, `clients/intake-follow-up`, `intake-assignment/assignment` |
| Edit client details and manage lifecycle/coach ownership | `clients/profile`, `team/team` |
| Author training with clear exercise names, compact sets/variations and recoverable saves | `training/templates`, `training/compact-sets`, `training/shared-targets`, `training/workspace`, `training/worksheet-audit` |
| Author nutrition with foods/recipes, portions, alternatives, variations and server nutrition | `nutrition/plans`, `nutrition/recovery`, `nutrition/menu-editing`, `nutrition/menu-order`, `nutrition/worksheet-audit` |
| Assign and personalize independent client plans | `training/assign`, `training/personalize`, `nutrition/assignment`, `nutrition/personalize` |
| Copy/archive/restore/delete templates and manage client coverage without losing history | `plans/management`, `plans/client-management` |
| Author, search and manage exercise/food/recipe libraries, with media | `exercises/exercises`, `exercises/management`, `exercises/media`, `foods/foods`, `foods/categories`, `foods/media`, `recipes/recipes`, `nutrition-library/management` |
| Schedule check-ins, adjust individual requests and review client answers | `check-ins/schedules`, `check-ins/delete-schedule`, `check-ins/requests`, `check-ins/review` |
| Read training/nutrition history and weight progress | `training/history`, `nutrition/history`, `weight-progress/progress` |
| Read/reply to client conversations, share answers and use photo/audio/video with recovery | `conversations/conversations` |
| Complete the daily Workbench queues | `workbench/workbench` |
| Manage business/profile settings, team membership and seat capacity | `settings/settings`, `team/team`, `team/invitation-recovery`, `billing/billing` |
| Publish a coaching page, receive/review applications and enroll a client | `acquisition/acquisition`, `acquisition/prospects`, `acquisition/authoring-audit` |
| Run the built app and observe startup under controlled throttling | `navigation/production`, `navigation/startup-audit` |

Each name resolves to `frontend/apps/coachapp/tests/<name>.browser.mjs`. Exact states and viewport coverage are in the [route audit](ui-audit-coachapp-2026-09-15.md); a listed suite is not proof of every possible interaction. WebKit evidence is recorded separately for the production journey, conversations and both worksheets.

The server-value ownership review is in [the final audit](final-audit.md). The subsequent application change is the conversation button's positioning class; worksheet changes affect the test harness. Counts, persisted calculations, business selection and shared cursor behavior retain that evidence. Local arrays remain available for rendering and unsaved drafts.

## Evidence limits

The plan calls for a target-coach usability review; no such session has been performed. Physical mobile keyboard/microphone behavior and actual Safari permissions are not established by desktop browser engines at mobile widths. The local storage and billing simulator do not prove deployed storage or payment-provider configuration. These limits remain explicit and are not converted into passing checks. No push or deployment is part of this audit.
