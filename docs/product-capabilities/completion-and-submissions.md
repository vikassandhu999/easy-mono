# Completion and submissions

Owner: Check-ins

## Supported outcome

An active client can answer their onboarding questions or an open check-in occurrence and submit a durable response that completes the item.

## Available information

* Completion context: onboarding or check-in, the live question-set name, ordered sections and questions, answer types, required settings, options, item state, and due or completion date when present.
* Saved submission: the full question snapshot, submitted answers, submission time, and photo metadata.
* Client access: the latest saved submission for each completed item.
* Coach access: the submission history for an item, ordered from newest to oldest.

## Supported actions

* An active client can load and answer their own onboarding questions or check-in occurrence while its state is to do or in progress.
* A client can leave optional questions unanswered and can add or remove eligible photo answers before submission.
* A client can submit an open item early, on its due date, or while it is overdue. A successful submission completes the item at the submission time.
* A client can revisit the latest saved submission for a completed item.
* The business owner can inspect submissions for every client in the business. A trainer can inspect submissions only for clients they coach.

## Lifecycle

* An open item uses the live question set. Edits to that question set change the questions and validation until the client submits.
* Submission validates against the live question set. After validation, one transaction saves the answers and full question snapshot, creates any weight-history entries, and marks the item completed.
* A saved question snapshot keeps its section order, question order, labels, answer types, required settings, and options. Later question-set edits do not rewrite it.
* The snapshot does not keep the question-set name or a unit for a weight answer. A later rename can change the name shown beside historical answers.
* Completed, dismissed, and missed items cannot be submitted. A successful submission cannot be edited, withdrawn, deleted, or submitted again through supported product actions.
* Completing onboarding clears incomplete-onboarding attention. It does not change the client from onboarding to coaching, create a plan, or copy answers into client profile fields.
* Completing a check-in does not change its schedule. The submission becomes available to the Check-in review and messaging capability; onboarding submissions do not enter the check-in review queue.
* Photo files upload before final submission. Those uploads are separate from the completion transaction and are not removed if submission fails or the client leaves the completion flow.

## Conditions

* Client access requires an active coaching relationship. An inactive client cannot load or submit onboarding questions or check-ins, even when an open item remains recorded.
* A client can load and submit only their own items. Another client's item is not disclosed.
* Due state does not control submission eligibility. To do and in-progress items are open; completed, dismissed, and missed items are closed.
* Only the client can submit answers. Coaches can read permitted submissions but cannot complete an item or change its saved answers on the client's behalf.
* Weight and photo side effects apply only to questions with the weight or photo answer type. A number question whose label mentions weight does not create a weight-history entry.

## UX-relevant constraints

* Required answers reject a missing value, empty text, or an empty selection. Optional answers may be omitted. Whitespace-only text is accepted as answered.
* Answers must use known question identifiers and match their answer type. Dates use `YYYY-MM-DD`; single-select and multi-select values must match configured options; a multi-select answer must contain at least one option.
* Ratings are integers from 1 through 5. Weight is greater than 0 and less than 1,000. General number answers have no configurable bounds.
* A photo answer accepts one to four distinct JPEG, PNG, WebP, or HEIC images, each no larger than 15 MB. Each image must belong to the client and cannot be reused in another photo answer within the same submission.
* The supported client flow waits for every photo upload to finish before submission. Final validation checks the stored photo record but cannot confirm that its file transfer succeeded.
* Submission errors identify the answer collection, not the individual question. Entered answers must remain available so the client can recover from a rejection.
* If the question set changes while a client is answering, previously entered answers can become unknown or a newly required answer can be missing. There is no version check or merge flow.
* Answers are not saved before final submission. Navigation, refresh, or a closed session can discard all entered answers, and opening an item does not move it to in progress.
* Every answered weight question creates a weight-history entry dated with the UTC submission date. The unit comes from the client's newest weight entry, then goal-weight unit, then the business default; the number is not converted.
* The saved submission contains only the numeric weight answer. Displaying its historical unit requires the related weight-history entry; the submission alone is not enough.
* Invalid answers leave the item open and create no submission or weight entries. Uploaded photo files are the exception because they exist before final submission.
* Submission has no duplicate-request token. The pending action must block repeat requests, and an uncertain result must be resolved by reloading the item before retrying.

## Related capabilities

* Check-in library: supplies the live question set and supported answer definitions.
* Check-in lifecycle: supplies check-in occurrences, due state, dismissal, missed state, and schedules.
* Client relationships: supplies active client access, onboarding attention, and coaching stage.
* Check-in review and messaging: supplies review state, the review queue, answer review, and conversation handoff for check-ins.
* Weight tracking: owns unit-bearing weight entries, history, trends, progress against the relationship-owned goal, and later edits.
* Attachments: owns private photo upload, download access, authorization, and stored-file lifecycle.

## Unsupported assumptions

* Drafts, autosave, partial submission, offline completion, and preserved answers after navigation require approval and product work.
* Editing, withdrawing, deleting, reopening, or resubmitting a completed response requires approval and product work.
* Coach completion or answer editing on behalf of a client requires approval and product work.
* Automatic profile mapping, goal-weight updates, coaching-stage changes, plan creation, scores, recommendations, and calculated summaries are not supported completion effects.
* Per-question server error locations and automatic conflict recovery after a question-set edit are not supported.
* A selectable or snapshotted weight unit and automatic unit conversion require approval and product work.
* Video answers, arbitrary file answers, more than four photos per photo question, captions, cropping, and post-submission replacement require approval and product work.
* Removing an uploaded photo from an unanswered item does not provide stored-file deletion.
* Completion does not send a coach email or chat message by itself.

## Verification evidence

* `backend/lib/easy_web/router.ex`, `backend/lib/easy_web/plugs/ensure_active_client.ex`, and `backend/lib/easy_web/controllers/clients/form_assignment_controller.ex`: active-client access and client completion actions.
* `backend/lib/easy/forms.ex`, `backend/lib/easy/forms/form_submission.ex`, and `backend/lib/easy/forms/form_assignment.ex`: validation, submission transaction, snapshots, completion state, photo checks, and weight side effects.
* `backend/lib/easy_web/open_api/schemas/client_profile.ex`, `backend/lib/easy_web/controllers/clients/form_assignment_json.ex`, and `backend/lib/easy_web/controllers/coaches/form_assignment_json.ex`: returned completion context and saved submission information.
* `backend/lib/easy/attachments.ex`, `backend/lib/easy/attachments/attachment.ex`, and `backend/lib/easy/fitness/weight_entry.ex`: photo transfer limits, ownership, private access, and weight-history records.
* `backend/lib/easy/clients.ex` and `backend/lib/easy/forms/form_submission.ex`: incomplete-onboarding attention and check-in-only review eligibility.
* `frontend/apps/clientapp-v2/src/checkins/fill-checkin.tsx`, `frontend/apps/clientapp-v2/src/checkins/checkin-field.tsx`, and `frontend/apps/clientapp-v2/src/checkins/photo-answer-field.tsx`: answer entry, local validation, completion states, and photo upload behavior.
* `frontend/apps/coachapp-v2/src/clients/components/client-checkins.tsx` and `frontend/apps/coachapp-v2/src/checkins/review-answers.tsx`: coach submission reading and presentation gaps that are not product constraints.
* `backend/test/easy/forms_test.exs`, `backend/test/easy/attachments_test.exs`, and `backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs`: source-backed validation, completion, snapshots, photos, weight effects, and isolation.
