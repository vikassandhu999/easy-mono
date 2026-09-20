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

## Remaining audit

Finish the requirement-by-requirement review, including applicable read/loading/error
states, Today rest-day guidance, credential-storage evaluation and the connected native
flows. Record the physical-device and human usability checklist separately. Notification
delivery and owned-domain link association retain their external dependencies. The full
goal remains active.
