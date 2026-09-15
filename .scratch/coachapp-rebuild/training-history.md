# Client training history

When a coach is preparing the next prescription, they need to see what the client actually performed and how the session felt. Enter through Client Overview. The main risks are mistaking an active or discarded session for completed work, confusing current plan targets with the historical prescription, and hiding load/duration/distance units.

Use a date-filtered client session list and a dedicated read-only session page. Prefer this to a calendar: the useful unit is a recorded session, including several on one date, and the coach needs its work and notes rather than empty days. Rows emphasize the saved workout name or Freestyle session, date and server state. Date filters live in the URL; use cursor pagination and server totals with retry and return-position preservation.

Detail emphasizes recorded work, then the captured prescription for comparison. Preserve performed-set order and frozen exercise names, including exercises no longer in the library. Show the full tracking vocabulary with explicit units, set type, RPE and notes. Missing targets or missing recorded sets are normal states, never zeroes. Soreness and session notes stay visible. Completed and discarded sessions are historical evidence; the coach has no write actions here. Active-session refresh shows changes from the client app.

Backend evidence inspected: `backend/lib/easy/training_execution.ex`, `backend/lib/easy/training/training_session.ex`, `backend/lib/easy_web/controllers/coaches/workout_session_controller.ex`, and `backend/lib/easy_web/types/training/{session,performed_set}.ex`. Current coach list uses offset pagination with inclusive from/to validation and authorized client scope; detail already includes the frozen prescription and ordered performed sets. Extend list pagination without changing existing offset callers. Do not compute persisted counts, exercise group selections or derived performance metrics from downloaded rows.

Acceptance: create and close real planned and freestyle sessions through the client API, inspect as coach, change the source prescription and verify history stays frozen, exercise active/discarded/empty/notes/unit states, date filters and malformed ranges, multiple cursor pages and retry, return navigation and tenant/trainer isolation at 375px and 1280px.

Verified 2026-09-12: browser scenarios pass at 375px and 1280px, including 46 sessions across three cursor pages, search, date validation, frozen prescriptions after library/plan edits, recorded units, active/discarded states, recovery, return position and account isolation. Backend `mix precommit` passes with 1,660 tests; frontend build, Biome and `just check-rm` pass. Browser verification used isolated ports because port 4000 was occupied by another app.


## Current route audit — 2026-09-15

Long saved plan names now wrap inside both the original-prescription reader and history list. Real-data probes failed in each location before its fix; the full training-history suite passes at 375px/1280px afterward, including frozen records, cursor history, dates and recovery. Build, scoped Biome, repository checks and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains. Full application coverage is tracked separately in ui-audit-coachapp-2026-09-15.md.
