# Slice 3 frontend review

Final verdict: **spec compliance passed; code quality passed**. Both findings below are addressed. The focused re-review evidence is recorded at the end of this file.

## Initial review

Spec compliance: changes required. Code quality: changes required for two concrete correctness defects. The source otherwise implements the required Tracker flows without a second domain model. No change to application code was made in this review.

## Findings

### P2: A second correction loads an empty draft with revision zero

Location: `frontend/apps/clientapp/src/ui/tracker-recording.tsx:170`.

After a successful correction, the form stores `trackerDraft(resource, tracker, date, system)` without the accepted entry. The resource still contains the corrected entry ID (line 37). When the client selects Correct entry again, `useDurableDraft` reads this saved draft instead of the entry supplied as its initial value. The draft has an empty value, today's date and `expectedRevision: 0`. A second save therefore sends revision zero. The correction API requires a positive revision (`backend/lib/easy_web/types/trackers.ex:136`). Its validation failure does not show the revision-conflict recovery action, which only appears for HTTP 409.

Reproduction: record a number; correct and save it; select Correct entry on the same entry again. The value is empty. Enter another value and save. The request has `expected_revision: 0` and cannot succeed through the normal correction path. Reloading retains the same invalid draft.

Evidence: a Node check ran the production `trackerDraft` and `parseTrackerDraft` functions with the exact success-path call. For an accepted entry with value 80, date 2026-10-05 and revision 2, the normal correction seed was `{value: "80", date: "2026-10-05", revision: 2}`. The draft loaded after the success-path reset was `{value: "", date: "2026-10-06", revision: 0}`. This was a model-level reproduction, not a browser claim.

Use the accepted correction response when resetting the entry-specific draft, or remove that completed draft so the next correction starts with the saved entry. Keep the uncertain request until the response is confirmed.

### P2: Coach photo and report Notes make an otherwise valid save fail

Location: `frontend/apps/coachapp/src/client-trackers/entry.ts:65`; Notes control in `frontend/apps/coachapp/src/client-trackers/record-tracker.tsx`.

The photo/document form has a Notes field. When this field contains text, `entryBody` adds `text_value` to the attachment entry. The backend permits no scalar value fields for these two kinds: `backend/lib/easy/trackers/records.ex:84` selects `allowed = []` and rejects non-null `text_value` with "does not apply to this tracker". Thus the exposed Notes action prevents a valid file entry from saving.

Reproduction: in Record for client, select a document or photo Tracker, add a valid file, type `Lab notes` in Notes, and select Record entry. The generated body contains both `attachment_ids` and `text_value: "Lab notes"`; the kind validation rejects it. Clear Notes and the same attachment body satisfies this value rule.

Evidence: a Node check ran production `entryBody` with a document Tracker and printed the unsupported `text_value` field. The rejection was traced through the current backend validation. No live upload or browser rejection is claimed by this review. Remove the unsupported Notes control and field from these kinds; the frozen kind model does not require file notes.

## Scope and checks

Read the root and retained app contracts, the Slice 3 coach/client reports, API contract, screen briefs, frozen decisions, and the Trackers and request rules in `.scratch/check-ins/spec.md`. Reviewed the new Tracker library, template, settings, client assignment/request, recording, metrics/history, selectors, API hooks and query keys. Read the changed workout/meal prompt integration and the shared draft, account storage and attachment upload paths.

All six value kinds have input and display paths. Built-in unit input remains in the selected unit; display divides base values by the API factor. Custom units remain literal. The client retains an exact pending request and ordered attachment IDs for retry. Drafts and file storage use account scope. Workout prompts use completed session IDs. Meal prompts use the saved meal ID, and a failed prompt read retains the saved meal route. Tracker mutations invalidate the related Tracker queries. Archived history has an entry path. Template writes send the complete list with a revision. Business settings render the default control only for `is_owner`; applying it to existing clients starts unchecked.

These are source findings, not full live-flow verification. The root agent owns browser checks and screenshots. The previously reported successful builds and frontend lint were not repeated. Native verification was not run. No commit, push, or clientapp-v2 change was made.

## Re-review of the two findings

Both findings are ADDRESSED. Spec compliance and code quality pass for these fixes. This verdict supersedes the initial verdict for the two findings above.

1. Repeated client correction: ADDRESSED. `tracker-recording.tsx:173` keeps the accepted mutation response. The durable reset at line 182 passes `accepted.data` to `settledTrackerDraft`. In `tracker-draft.ts:156`, a correction retains the accepted entry value, local date, entered unit and revision; a creation starts an empty draft. Settlement occurs only after a confirmed response. The added test in `tests/trackers/draft.test.ts:113` serializes and restores a settled correction, checks value 80, date 2026-10-05 and revision 2, then prepares a second correction with value 79, revision 2 and a different request ID. It also checks that an unconfirmed correction retains its pending identity and revision.

2. Coach file Notes: ADDRESSED. `entry.ts:65` sends only the shared entry fields and ordered attachment IDs for photo/document kinds. The file form no longer has the Notes control. The document and photo cases in `tests/trackers/entry.test.ts:44` and line 61 compare the complete outgoing body with literal expected values while the input form contains nonempty text. These checks cover the rejected field found in the review.

Read both updated implementation reports and the changed source/tests. The reported successful builds and full frontend lint were not repeated. No additional scope was reviewed, and no application code was edited.
