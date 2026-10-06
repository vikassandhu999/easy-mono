# Slice 3 coach app

The Coach app has Tracker library, template, client assignment, request, recording, and history screens. The generated API contract supplies all resource types. Training and Nutrition routes remain in place.

## Screen choices

The main navigation has Trackers. Its Library and Templates links separate the two tasks. The library uses server search, kind and archive filters, counts, and cursor pages. Custom Trackers permit name edits, archive and restore, and an attempt to delete when there are no entries. The server checks all uses before deletion. Built-in Trackers are read-only. The editor explains that kind, unit, and scale are fixed.

Templates edit name, description, and the complete item list in one request. Each item has a timing. The weekday field appears only for weekly timing and starts at Sunday. The form blocks duplicate Trackers in its draft. A revision conflict preserves the draft and provides an explicit reload action. The business owner can select or clear the default template in Business settings. The separate Apply to existing clients too choice starts unchecked.

Client Trackers starts from the client overview. Assignment, template application, request, and coach recording actions stay together. Changing timing or ending an assignment does not remove entries. Open requests display Waiting on client since with the request date and a cancel action. Applying a template requires selecting the template and confirming the resulting list replacement.

The recording form supports number, rating, yes/no, text, photo, and document Trackers. It starts with the client's local date and unit system. The server converts numeric input. Files retain their order and completed upload ids through a failed entry save. The coach can move files up or remove a file before saving. Captured on is optional. A lost save response retains the exact outgoing body and request id and changes the submit action to Check entry save. It disables value edits until that attempt has a known result. Successful entries display Recorded by coach.

History starts with the last 30 client-local dates. The coach can select a Tracker and change the date range. Server fields supply counts, average, minimum, maximum, change, chart points, and distinct workout and meal coverage. Coverage appears only when its total is greater than zero. Unit factors only convert displayed values. The chart has numeric labels in the selected unit, horizontal tick lines, and a fixed 192 px plot height at both widths. Labels stay at normal text size on narrow screens. Photo comparison selects latest versus previous or first. Report files use private view and download URLs in server order. Entry links can open metrics for an archived Tracker. Empty, loading, refresh-error, and retry states keep loaded results visible.

Review found that Notes on photo and document entries sent a scalar value the server rejects. That field and value were removed. Regression tests verify that attachment entries contain only their supported values, even if the form model contains text. A completed assignment or template operation closes only the action that started it. A late result cannot close another picker that the coach opened.

## Source layout

* `src/api/trackers.ts` owns resource hooks and mutation invalidation. Keys are in `src/api/keys.ts`.
* `src/trackers/` owns the library and Tracker editor.
* `src/tracker-templates/` owns the template list and editor.
* `src/client-trackers/` owns assignment/request controls, recording, history, and display/input transformations.
* Shared selectors are in `src/ui/tracker-picker.tsx` and `src/ui/tracker-timing.tsx`.
* `src/settings/tracker-default.tsx` owns the business default form.

## Checks

* `rtk pnpm -C frontend/apps/coachapp build` passed against the generated 165-route contract. TypeScript, app behavior checks, and Vite passed.
* Five Tracker behavior tests passed. They check imperial input versus base-unit display, zero and No values, ordered attachments and request identity, absence of scalar values on photo and document entries, and literal custom units with missing metrics. The attachment tests failed before the fix and passed afterward.
* `rtk pnpm -C frontend lint:ci` passed for the integrated source: Biome checked 458 files and design lint passed.
* The root agent owns the live Tracker browser flow at 1280 px and 375 px, plus the Training and Nutrition regression flows. Root reported that the Coach operations passed. Screenshot review led to the chart, coverage, and wording changes above. The final browser evidence belongs to the root report.

## Limits

An unsent Coach recording form remains in page memory. This work does not add storage of File objects across a full browser reload. An uncertain entry save retains its request identity while the form remains open. Native devices were not tested. Vite reports the existing large-chunk warning and exits successfully.

No commit, push, branch, or worktree was created. This work did not edit the backend, the generated schema, or clientapp-v2.
