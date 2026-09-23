# Exercise copying and deletion

When a coach needs a different cue or movement variant, they need an independent copy so that other plans keep their exercise. When a library item is unused, they need to remove it without damaging planned workouts or logged history.

This is occasional maintenance from the saved exercise editor, on phone or desktop. A separate management page adds navigation for two short actions; inline confirmations keep the source visible. Choose Copy exercise beside the editor heading and keep Delete exercise in a collapsed maintenance section below the form. Save or discard edits before either action so the saved source is unambiguous.

Copy asks only for a name, copies saved details through the server, and opens the independent exercise. Shared exercises can be copied. Duplicate-name errors stay on the name field. An interrupted copy shows server-search results for explicit review before another attempt; a name match alone is not a receipt.

Delete names the exercise and explains permanence, planned-workout protection and preserved history. The database foreign key determines whether deletion is allowed, including concurrent plan writes. A lost response is checked by reading the same resource; only 404 confirms absence. Return to the searched library with a success notice.

Pending requests block dismissal and navigation. Account changes must not populate the replacement session or navigate to another account's exercise. Failed detail refresh retains the draft and provides retry, with maintenance disabled until refreshed.

Verify copying and independent edits, duplicate names, unsaved protection, interrupted copy/delete, in-use deletion, shared copy, pending/session guards and library return at 375px and 1280px. Media editing remains a separate exercise-library task.

## Verification, 2026-09-14

Real API browser scenarios pass at 375px and 1280px on both the isolated 44000/22022 pair and normal 4000/2022 pair. They cover copy field validation, preserved details, independent edits, interrupted copy review without automatic retry, deletion cancellation, failed and committed-but-lost deletion, searched-library return, real planned-workout deletion rejection, pending dismissal and account replacement. The normal pair also verifies retained draft recovery after a failed detail refresh. Shared read-only presentation is injected at the browser boundary; the backend library test independently verifies copying an actual system exercise into the coach's tenant while preserving tracking and preventing source mutation.

The exercise authoring regression passes at both widths, including references, cursor pages/search, interrupted saves and training-plan reuse. Backend `mix precommit` passes with 1,759 tests and zero failures; app build, scoped Biome and `just check-rm` pass. The existing Vite bundle-size warning remains.

Screenshots reviewed at phone and desktop widths. A browser check caught the mobile save bar covering the removal control; maintenance sits inside the form's bottom padding. Target-coach usability and physical-device checks remain part of the application audit.

Graph tools were unavailable and the CLI graph backend timed out. Evidence uses exact source reads of the exercise controller, context, schema, generated contract and restrictive prescription foreign key. No handwritten code from the retired coach implementation was consulted. No API contract changed.
