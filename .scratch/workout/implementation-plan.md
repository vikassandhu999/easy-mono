> Superseded on 2026-10-19 by [activity-logging-plan.md](activity-logging-plan.md). Kept as the record of the W1–W37 build.

# Workout implementation plan

Sources: concept.md (W1–W37, U1–U14, V1–V7), CONTEXT.md, both retained prototypes, and nutrition commits 4eccb21a / c61e11a1.

Constraints: current branch; no commits or staging; preserve skills-lock.json, clientapp-v2, both prototype folders and routes, and tracker behavior.

## Tasks

- [x] Backend: replace training storage with exercises, workouts, exercise_groups, workout_exercises and workout_schedules. Build tenant-scoped catalogue, library/client workouts, repeating schedules, past-date copy/split history and signed Undo. Add typed routes in /v1/coach; test public tenancy, targets, constraints, history and ordering.
- [x] Coach builder/catalogue: API-backed exercise catalogue/editor and card workout builder from the prototype, including per-round targets, rest transfer, reordering, removal Undo and persistent autosave/retry.
- [x] Coach week/removal: API-backed training week from the prototype and nutrition sibling. Share reusable UI; remove old coach/client training routes, screens, API hooks, and training-only shared code.
- [x] Integration: update vocabulary, generated API, fixture reset scripts, browser tests and package scripts. Preserve trackers and remove old training from record views, journals, reviews and chat.
- [x] Verify: backend precommit, frontend lint, both maintained builds, API generation with clientapp-v2 restored, workout browser suite three consecutive runs at both widths, nutrition browser suite, and screenshot review.

## Ownership

Backend worker owns backend files and tests, including old backend training removal. Builder worker owns new workout-builder/, workouts/, exercise catalogue files and api/workouts.ts / api/exercises.ts. Week worker owns workout-week/, api/workout-week.ts, shared ui extraction, coach routing/API keys/navigation, old frontend training removal, and clientapp removal. Root owns browser tests, fixtures/scripts, vocabulary, integration and final verification. Workers coordinate interfaces before writing consumers and never revert another worker's edits.

## Decisions to record

- The user supplied an agreed architectural spec and explicitly requested implementation; proceed from that spec without a second approval round.
- W37 settles the previous open history mechanism. Today has no facts while logging is absent.
- Program, logging, max, percent, skips and one-off tables/flows are excluded.
- Keep working-tree changes unstaged; preserve the existing staged skills-lock.json exactly.

## Verification record

Completed. The final commands and decisions are in verification-report.md.

- Backend precommit: 613 tests, zero failures; Credo clean; 135 typed routes checked.
- Frontend lint and both maintained builds: passed.
- Final API generation and clientapp-v2 restore: passed.
- Workout browser: three consecutive final passes at 375px and 1280px.
- Nutrition browser: passed at both widths.
- Visual hierarchy: 12 screen and viewport combinations passed.
- Old-name search: no matches in the three requested source trees.
- Screenshots inspected against both retained prototypes. Mobile uses shared Nutrition day tabs as requested.
- Current branch remains prototype/workout-layout. No commits or staging. Original skills-lock.json file and staged diff hashes are unchanged.

Review fixes include typed list and nested formatter responses, accessible target labels, phone table width, canonical child IDs and frozen snapshots, cross-card moves, schedule merging, Undo dependencies, W37 route and draft recovery, and a single removal Undo action.

