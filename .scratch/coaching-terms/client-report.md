# Client app

The maintained client app now uses Coaching terms, full/preferred names, and client unit systems. Joined clients see one starts-soon screen on every authenticated route, with sign-out. Ended clients see the final term date and can read workout, meal, chat, plan, and profile history. Workout, meal, profile, and message editors are unmounted while access is read-only, so persisted drafts cannot expose retries or editing controls. Drafts remain intact. Ending-soon clients retain active controls, including on the final coaching day.

Invitation verification uses `POST /v1/auth/invites/:token/accept` with email and OTP only. Offline cache version was advanced to discard obsolete profile contracts. Clientapp-v2 was not edited.

Verification:

- Client build passed against the regenerated contract, including all existing unit suites. Vite retains the existing large-chunk advisory.
- `tests/coaching/access.browser.mjs` passed at 375px: joined deep links and sign-out; ended completed/in-progress workouts, meals, chat, details; pending draft preservation; active controls and units.
- Real Phoenix browser checks passed at 375px for joined/active/ended states, including a preferred-name save/reload, saved workout history, and the actual stored coach message. The final repeat passed after backend integration. The message screenshot was inspected and the ended subtitle reads "Conversation history" while live updates remain enabled.
- Free-seat invitation acceptance passed through the browser OTP flow. The account immediately received a current term and remained active after reload.
- Full-seat invitation acceptance passed through the client browser OTP flow for both coach scenarios. The account remained on "Coaching starts soon" after reload; the coach saw "No free seat" and the derived joined state.
- The assigned backend profile/calendar suites passed: 25 tests, zero failures.
- Client Biome checks and whitespace checks passed. The final frontend `lint:ci` passed after the formatting corrections.

Screenshots and browser results are in `frontend/apps/clientapp/tests/coaching/artifacts/`. Native selectors and fixtures were updated, but native runtime and physical-device checks were not run.

Browser commands run from `frontend/apps/clientapp`: `rtk proxy node tests/coaching/access.browser.mjs`, `rtk proxy node tests/coaching/connected.browser.mjs`, and `rtk proxy node tests/coaching/acceptance.browser.mjs`. Full-seat acceptance runs in the coach suite described in `coach-report.md`. Screenshots are ignored by git. Full backend precommit remains with the root integration owner.
