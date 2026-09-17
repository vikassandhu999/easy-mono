# Exercise library and editor

When preparing a workout, a coach needs to create a missing exercise or improve its coaching instructions so that clients can follow the prescribed movement. This is an occasional task on mobile and desktop. The name identifies the movement; instructions explain execution. Equipment and muscles help distinguish similar movements.

Choose a dedicated, short editor over a multi-step wizard or a crowded catalog-management screen. Enter through Training → Exercise library. Keep name and instructions visible. Put optional description, equipment, muscles, mechanics and force below, with searchable selection for the server's reference catalogs. Use shadcn selects for the two small classifications. Save returns to the saved exercise, which is immediately available in the training picker.

Exercise search and counts remain server-owned and use shared cursor pagination. The reference catalogs already have server search and return their whole matching vocabulary; do not synthesize counts or client filters. Shared system exercises are read-only. Existing images, media and tracking type are preserved; media authoring is a separate slice.

The current exercise API has no revision precondition. Send only changed fields on updates to preserve unrelated concurrent changes; do not pretend this provides same-field conflict protection. Keep drafts on failures, map validation errors to fields, offer explicit saved-version recovery, and check saved exercises after an uncertain create. Protect unsaved navigation and late responses after account changes.

Use the existing API without contract changes. Verify creation, editing, optional field clearing, reference selection, duplicate names, interrupted saves, read-only exercises, server paging/search, return navigation and training-plan integration at 375px and 1280px.


## Verification

The graph CLI timed out. Task-directed source reads covered the new app's exercise picker, generated contract, exercise controller, training library, exercise schema and reference catalogs. No old app implementation was consulted.

Real API browser scenarios passed at 375px and 1280px. They cover creation, equipment selection across searches, keyboard checkboxes, reference-load retry, optional field clearing, duplicate-name validation with focus recovery, preserving an unrelated concurrent edit and existing images, interrupted create/update recovery, read-only shared exercises, failed detail loading, 45 business exercises across cursor pages, page retry, server search beyond page one, URL reload, return scroll restoration, training-plan reuse and account replacement during a pending save. The fixture script adds reference vocabulary only to `easy_coachapp_auth_dev`.

The existing training template, compact-set and worksheet browser suites also passed at both widths. App build, Biome and repository shape checks passed. Backend `mix precommit` passed before committing the preceding work (1,645 tests, zero failures); this slice changes no backend production code or API contract. Vite reports its existing large-bundle warning. Screenshots were reviewed at both widths; a target-coach usability review remains outstanding.


## Current authoring and recovery audit, 2026-09-15

Movement type and Force now show server field errors, associate the explanation with their select, and open the optional section when invalid. Save and saved-version load confirmations receive focus. During uncertain creation, fields and media stay fixed so saved-result lookup uses the submitted name. After reviewing results, Create a separate exercise re-enables the draft and focuses the name without sending another request.

The missing-message, saved-result focus and editable-uncertain-name probes fail before their fixes. The full authoring suite passes at 375px/1280px, including failed saved-version reload, retained drafts, reference selection, remote search/paging, independent training reuse and session isolation. Copy/delete and actual photo/video upload/playback regressions also pass at both widths. Build, Biome, repository checks and backend precommit pass (1,778 tests). Screenshots are archived under `/tmp/coachapp-exercise-ux-audit-2026-09-15`.


## Fixture database, 2026-09-17

`test:exercises` defaults to the isolated API44000/app22022 pair because `seed-catalog.exs` populates `easy_coachapp_auth_dev`. Its reference choices must come from that same database. The full-app regression exposed the earlier default-to-normal-server mismatch; the corrected suite passes at 375px/1280px. Environment overrides require a matching fixture database.
