# Weight tracking

Owner: Weight tracking

## Supported outcome

An active client can maintain a dated weight history, including measurements supplied through completed check-ins, while permitted coaches can inspect that history and its current progress context.

## Available information

* A weight entry has a stable identity, date, value, unit in kilograms or pounds, optional client note, creation time, and origin.
* A check-in-derived entry includes a check-in submission reference. It does not include the check-in title or question label.
* History is ordered from oldest to newest and can be narrowed from an inclusive date. It is not paginated.
* The current relationship-owned weight goal is available when both its value and unit exist.
* A history summary provides earliest and latest summary points converted into the latest point's unit, total change as latest minus earliest, and that summary unit. A summary point contains only date, converted value, and unit.
* Coach history also provides a coverage summary labelled as a 30-day window. It counts distinct entry dates from the lower date boundary without an upper boundary.

## Supported actions

* An active client can view their history and current goal.
* An active client can save a self-logged weight for a chosen date with an optional note.
* Saving another self-logged weight on the same date replaces that self-log's value and unit while retaining its identity. A supplied note can replace the earlier note, but an omitted or null note preserves it.
* A client can permanently delete any of their entries, including a check-in-derived entry. Deleting a derived entry does not change the completed check-in.
* A business owner can view the weight history of visible accepted clients. A trainer can view visible accepted clients currently assigned to them.
* Coaches cannot add, edit, or delete a client's weight entries.
* Completing a check-in appends one derived entry for each answered weight question.

## Lifecycle

* At most one self-logged entry exists for a client and date. Any number of check-in-derived entries can coexist on that date, including alongside the self-log.
* A check-in-derived entry is created together with check-in completion. Its date is the submission date in UTC.
* The derived entry's unit comes from the newest existing entry, otherwise the current goal unit, otherwise the business default. The entered numeric answer is not converted when that unit is assigned.
* A self-log has no separate edit action. Saving the same date updates it; changing its date requires deletion and recreation.
* Deleting a check-in-derived entry leaves its completed check-in answer intact.
* Goal changes do not convert earlier entries or preserve a goal history.
* Narrowing history recalculates its change summary over that result. Coach logging coverage remains tied to its own lower date boundary.

## Conditions

* Client access requires an active coaching relationship and is limited to that client.
* Business owners can read visible active or inactive clients. Trainers can read visible active or inactive clients currently assigned to them. Pending relationships do not expose weight history.
* Values must be greater than zero and less than 1,000.
* Units are limited to kilograms and pounds.
* Notes are optional and limited to 500 characters.
* Dates through tomorrow in UTC are accepted as a timezone buffer. Later dates are rejected.
* Goal value and unit must both exist or both be absent. Goal values use the same numeric bounds.
* Logging coverage counts distinct dates from its lower boundary, so multiple entries on one date count once. An accepted entry dated tomorrow also counts and can make the reported 30-day coverage exceed 30 days.

## UX-relevant constraints

* Weight direction is neutral. The model does not say that loss is good, gain is bad, or that every client is pursuing weight loss.
* Mixed-unit history is valid. Individual points are not supplied as one normalized series, so they must be converted before being plotted on a shared scale.
* The current goal and latest entry can use different units. Raw subtraction does not produce a valid distance to goal.
* There is no saved preferred display unit.
* Multiple entries can share the latest date. The summary orders by date without a same-date tie-breaker, so its latest entry is not reliably the newest reading from that date.
* A same-date self-log save replaces the earlier self-log rather than creating a second one. That replacement must be understandable before submission.
* Omitting or clearing the note currently preserves an earlier note on a same-date save. A reliable clear-note action is not supported.
* Deletion is permanent and has no restore. A derived entry can be deleted even though its source check-in answer remains.
* A check-in submission reference proves origin but does not supply a check-in name or a supported direct-open action.
* Empty history, goal without history, one-entry history, several entries on one date, missing goal, validation failure, and read failure all require intentional treatment.
* Fewer than two usable measurements cannot establish a trend.
* The recorded shapes for goal, summary, and logging coverage are currently weakly described, and decimal values are represented inconsistently between the declared information and delivered values. Consumers must confirm and normalize these values before calculation.
* Check-in weight labeling and stored unit choice can disagree when the newest entry uses a different unit from the goal or business default. Weight questions must not silently imply a unit that may be recorded differently.

## Related capabilities

* Client relationships owns the current weight goal and the active relationship that permits access.
* Completion and submissions owns check-in answers and creates check-in-derived weight entries during completion.
* Check-in lifecycle owns the assigned occurrence whose completion can supply a measurement.
* Authentication and invitation acceptance includes choosing the business's default weight unit during owner onboarding.

## Unsupported assumptions

* Generic custom trackers, body measurements, body-fat tracking, and a dedicated progress-photo gallery are unsupported.
* Coach-authored measurements and client-owned goal editing are unsupported.
* Goal history, target dates, desired direction, achieved state, and automatic goal updates are unsupported.
* BMI, medical interpretation, recommendations, and healthy-weight judgments are unsupported.
* Prescribed logging cadence, reminders, streaks, notifications, and coach alerts are unsupported.
* Entry restore, direct date editing, bulk actions, export, pagination, and a saved display-unit preference are unsupported.
* Deleting a derived entry does not synchronize back to its completed check-in answer.
* An onboarding target-weight answer does not automatically become the relationship's weight goal.

## Verification evidence

* `backend/lib/easy/weight_entries.ex` and `backend/lib/easy/fitness/weight_entry.ex`: entry ownership, same-date self-log replacement, history, summary, unit handling, bounds, deletion, and logging coverage.
* `backend/lib/easy/forms.ex` and `backend/priv/repo/migrations/20260711140000_add_check_in_weight_provenance.exs`: check-in-derived entry creation, origin, unit selection, and deletion relationship.
* `backend/lib/easy/clients/client.ex`: relationship-owned goal value and unit.
* `backend/lib/easy_web/controllers/clients/weight_entry_controller.ex`, `backend/lib/easy_web/controllers/coaches/client_weight_entry_controller.ex`, and `backend/lib/easy_web/open_api/schemas/logging.ex`: actor-specific actions, returned information, filters, and documented value shapes.
* `frontend/apps/clientapp-v2/src/progress/`, `frontend/apps/clientapp-v2/src/checkins/fill-checkin.tsx`, and `frontend/apps/coachapp-v2/src/clients/components/client-weight.tsx`: supported product use and mixed-unit, direction, empty-history, and check-in-labeling gaps.
* `backend/test/easy/fitness/weight_entry_test.exs`, `backend/test/easy/weight_entries_test.exs`, `backend/test/easy/forms_test.exs`, `backend/test/easy_web/controllers/clients/weight_entry_controller_test.exs`, and `backend/test/easy_web/controllers/coaches/client_weight_entry_controller_test.exs`: source-backed entry, access, summary, provenance, and coverage behavior.
