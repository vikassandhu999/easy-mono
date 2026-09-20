# Connected client audit

This pass checks remaining transitions in the mobile rebuild. It does not replace the
workflow evidence or establish physical-device behavior and client usability.

## Verified transitions

Today opens the assigned workout directly. An active workout has Resume near the top;
resuming keeps the same session, saved sets and notes. Finishing removes Resume from
Today. The training browser scenario exercises these paths at 375, 768 and 1280px,
including its existing lost-response and frozen-prescription assertions.

Unknown routes return signed-in clients to Today and signed-out clients to Login.
Both states pass at all three widths. The app retains the same mobile composition.

Real coach updates create dismissed and missed form assignments. They leave To complete,
appear with their status in History, have no Send action or saved-response claim, and
return to the History segment. A visual review found the shared success checkmark was
misleading. Only saved submissions receive the success panel; unsaved terminal requests
use a neutral clipboard panel. RM-245 records this distinction. Full forms and recovery
browser suites pass, including all question types, conflict handling and cursor retry.

The iPhone messaging test selects MP4/MP3 through Files, retains their bytes through
process restart, uploads them, then physically taps each player. Both clocks advance
from zero to the one-second fixture duration. The video screenshot shows Pause while
playing. This adds playback evidence to the earlier selection/opening checks.

## Evidence

* Today/training: `/tmp/easy-clientapp-connected-today.log` and
  `evidence/connected-today-*`.
* Closed/missed and full forms browser regression:
  `/tmp/easy-clientapp-connected-forms-final.log` and `evidence/connected-form-*`.
* iOS playback: `/tmp/easy-clientapp-ios-playback-final.log`, result
  `Test-ClientUITests-2026.09.20_14-57-13-+0530.xcresult`, and
  `evidence/connected-ios-{video-playing,audio-played}.png`.
* Updated iOS form draft, keyboard submission and saved restart:
  `/tmp/easy-clientapp-connected-ios-forms.log`, result
  `Test-ClientUITests-2026.09.20_14-59-40-+0530.xcresult`.

Fixtures are separate clients/businesses in the isolated task database. The manual
preview account was not changed. A first signed-out fallback assertion expected a
redundant root return parameter; the implementation deliberately uses `/login`, and
the assertion was corrected. No auth routing change was needed.

## Checkpoint gates

Build/native sync, Biome, check-rm and diff checks pass. Both native builds pass and
are installed. Android auth/profile, offline form/workout recovery and durable sign-out
pass in `/tmp/easy-clientapp-connected-android-forms.log`. The iPhone messaging test
passes in 97.061 seconds; the updated form regression passes in 52.916 seconds.
Full backend `mix precommit` passes all 1,846 tests with zero failures in
`/tmp/easy-clientapp-connected-precommit.log`. Localhost:1315 returns 200, and the
unauthenticated protected API read on 4100 returns its expected 403. Real authenticated
browser/native operations also succeeded.

## Final audit and external validation

The requirement-by-requirement source/evidence review is in final-audit.md. Startup
storage failures now have an explicit mobile Try again action with verified same-account
and draft recovery. Today rest-day/read-state checks pass; credential-storage.md records
the native vault and migration checks. The final connected native regressions pass on both platforms; results and gates are in final-audit.md.
Physical-device and human usability checks are separate in device-and-client-checks.md. Notification
delivery and owned-domain link association retain their external dependencies. The local implementation and available-environment verification are complete.

Today rest-day/read-state evidence: `tests/today/today.browser.mjs` and
`/tmp/easy-clientapp-today-states.log` pass at 375/768/1280. Artificial delay/503 covers
the request boundary; missing guidance and the seven-day rest schedule use real API data.
The first fixture correctly failed validation because schedules require every weekday;
the final fixture includes all seven weekdays with no workout reference.

Native credential migration/refresh and logout now pass on both platforms. The account
regression also exposed a keyboard-open first-tap Save failure; details uses the verified
focus-preserving submit option, with strict keyboard geometry in its iPhone regression.
See credential-storage.md. The old text-only startup handler first failed the new
browser probe. The corrected mobile recovery passes at 375/768/1280, including repeated
read failures, focus, touch bounds and restoration of a real private draft.


Final secure-session bundle: iPhone goal/meal/messages/weight pass as a combined suite
with separate invitations (four tests, zero failures); Android nutrition/progress/goal
and messages/media pass. Build/native sync, Biome, repository shape and full backend
precommit pass (1,846 tests). See final-audit.md for exact logs, result bundle and the
verification corrections made after the initial combined run.
