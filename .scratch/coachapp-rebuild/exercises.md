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
