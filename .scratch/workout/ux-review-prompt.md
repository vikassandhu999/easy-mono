Run a UX/UI review of the workout flows that were just built, and apply the fixes, in /Users/vikassandhu/Desktop/10x/easy-mono.

Use the dembrandt skills in `.agents/skills/`. Start with `dembrandt/SKILL.md`, the orchestrator, and follow its routing. At minimum, apply: `nielsen-usability-heuristics`, `form-design`, `visual-emphasis-and-hierarchy`, `ui-density`, `operational-expert-tool-ui`, `status-colors-and-errors`, `notifications-and-recovery`, `loading-states-and-perceived-performance`, `modal-and-overlay-patterns`, `responsive-paradigms`, `sticky-and-fixed-elements`, `repeated-component-alignment`, `gestalt-ui-organisation`, `user-flows-and-guided-paths`, and `wcag-accessibility`.

**Screens in scope:**

Coach app (`frontend/apps/coachapp`, http://localhost:2022):
- the exercise library and exercise editor (`src/exercises/`)
- the workout builder (`src/workout-builder/`)
- the client training week with Recent sessions and Start session (`src/workout-week/`)
- the coach session recording screen (`src/workout-session/`)

Client app (`frontend/apps/clientapp`, http://localhost:1315, phone only):
- Today
- the workout logger (`src/today/`)

**Product decisions that are settled. Respect them; do not reopen them:**
- `.scratch/workout/concept.md` (builder UX U1–U14, client week V1–V7)
- `docs/adr/0015-exercise-log-and-set-details.md` (recorded / skipped / not-recorded slots, overall result plus optional intervals, non-blocking mismatch, optional feedback)
- `frontend/apps/coachapp/AGENTS.md` and `frontend/apps/clientapp/AGENTS.md`: their design system, the visual-hierarchy rules, and pickers as centered modals

Copy stays plain and literal.

**Process:**
1. Make sure the servers are running: Phoenix on 4000, coach on 2022, client on 1315. They may already be up. If not, start them with `just backend`, `just web`, and `just client`.
2. Log in with the seeded test accounts, using OTP `123456`:
   - coach: `today-coach@example.test`
   - client: `today-client@example.test`

   If you need fresh data, reseed from `backend/` with `rtk mix run ../frontend/apps/clientapp/tests/today/fixtures.exs`.
3. Walk each flow end to end with Playwright and take screenshots: coach at 1280px and 375px, client at 375px. The flows are:
   - create an exercise
   - build a workout with a superset and per-side targets
   - schedule it
   - client: start, record, skip, swap, overall result plus an interval, finish, reopen
   - coach: start session, record, view a client session
4. Write the findings to `.scratch/workout/ux-review.md`. Group them by screen. Rank each by user impact, cite the skill and rule it violates, and attach before screenshots.
5. Implement the fixes, high impact first. Keep the changes in the existing components and shared `ui/` primitives. Shared pure logic stays in `@easy/workouts`. Do not add new product features.
6. Take after screenshots and add them to the review file next to each finding.

**Gates before you finish:**
- `rtk pnpm -C frontend lint:ci`
- `rtk pnpm -C frontend/packages/workouts check`
- `rtk pnpm -C frontend/apps/coachapp build` and `rtk pnpm -C frontend/apps/clientapp build`
- `rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy`
- `test:exercises`, `test:workout`, and `test:workout-session` (coach), and `test:today` (client)

If a backend change becomes necessary, `cd backend && rtk mix precommit` must also pass. Update the browser tests when the UI changes on purpose.

**Hard rules:**
- Prefix shell commands with `rtk`.
- No commits, no `git add`, stash, reset, or restore.
- Do not touch `frontend/apps/clientapp-v2`, `skills-lock.json`, or the prototype folders and routes (`coachapp/src/*-prototype/`, `clientapp/src/today-prototype/`).

**When finished, reply with:**
1. the findings fixed, and any deferred with the reason
2. each gate command and its result
3. the changed files
