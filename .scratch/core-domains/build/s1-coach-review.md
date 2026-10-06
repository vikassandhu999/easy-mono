# Coach app slice 1 review

Reviewed the current working tree against `.scratch/core-domains/build/s1-foundation-training.md`, `decisions.md`, `training.md`, `frontend/AGENTS.md`, and `frontend/apps/coachapp/AGENTS.md`. This review did not write to the server or database. No source files were changed. The final scoped recheck included the owner's saved session screenshot.

Spec verdict: no open finding in the reviewed coach scope. Quality verdict: no open documented contract issue in the reviewed coach changes. The findings found during review are resolved in current source.

## Spec

No open finding. The final scoped recheck confirmed that performed-set read names reach the existing coach consumers. See the resolved finding below.

## Quality

No open finding. The duplicate week-date helpers now use `addDays` and `getCurrentWeekRange` from `@easy/utils`, as required by `frontend/AGENTS.md`.

## Confirmed implementation

- The builder sends the name, description, workouts, typed sets, and schedule in one POST or PATCH. The old details-plus-prescription two-write flow is removed.
- Existing node IDs are preserved when editing. Workout duplication gives new workout, block, item, and set IDs. Schedule entries have IDs and support several workouts per weekday.
- Straight, superset, and circuit blocks and the required typed set fields have edit controls.
- Client plan publication supports today and a selected date. Scheduled revisions have a withdrawal action and the P4 notice.
- Assignment sends the template revision and dates. The backend creates revision 1 from a copy of the template document.
- The client week view reads expected occurrences and extra sessions from the API. It shows Done and Not recorded and links to session detail.
- Session detail matches actual sets to prescribed sets by `set_id`; missing sets show Not recorded and sets without `set_id` show Extra.
- The PR view uses the exercise-history API and explains policy P2. The backend PR query filters completed sessions, working sets, done outcomes, and non-deleted sets.
- Exercise creation uses measures, bodyweight, and media. Existing exercise measures/bodyweight controls are disabled; update bodies omit these fixed fields. No training consumers of `tracking_type`, images, or soreness remain in the coach source search.

## Findings resolved during review

Recorded library exercise names were initially blank in the coach session and conversation record. `backend/lib/easy/training_execution.ex:285` now maps loaded sets through `set_name/2`. Lines 289–300 retain free-text names, use the copied prescription name for a matching item, and otherwise read the library name with a tenant check. This is read derivation; the stored canonical set field remains null. The existing consumers at `training-session.tsx:169`, `:239`, and `conversations/record-detail.tsx:80` now receive a name. I inspected `.scratch/core-domains/build/s1-screens/11-coach-session-375.png`: Recorded work shows `S1 Squat`, `S1 Row`, and the extra `S1 Squat`; the Extra row also shows `S1 Squat`. This finding is resolved.

The assigned training plan management screen initially offered Delete plan, but the new backend permits template deletion only. The owner changed the screen to hide deletion for training at `client-plan-management.tsx:409`. The latest source also locks the start date of a started training plan and explains that archive keeps its past. The deletion mismatch is no longer an open finding.

The set editor initially changed blank load/distance targets and cleared rep fields to zero. Decision M14 states: "Unknown is not zero." The corrected editor keeps blank unit preferences in local form state, preserves null rep fields, and starts the blank unit preference from the saved entered unit. A cleared range endpoint remains null when the coach edits the other endpoint.

I executed the current `SetEditor` callbacks after an in-memory TypeScript compile, with UI element stubs and a small hook-state stub. No request was sent. The corrected callbacks passed these checks:

```text
Blank target unit change: no document write; selected lb retained.
Clear saved 100 lb and re-enter 100 => {"kg":45.359237,"entered_unit":"lb"}
Clear min then change max => {"type":"range","min":null,"max":10}
```

The owner will also assert these cases in the real browser scenario. The duplicate date-helper finding is resolved by the shared calendar imports.

## Verification limits

Generated contracts and a passing coach build were supplied as review context. I did not repeat those checks. The callback probe above is a controlled local reproduction, not a complete browser test. I inspected the owner's real session screenshot for the final display-name recheck; I did not independently run the full browser scenario. This review does not prove backend immutability, journal concurrency, or database coverage rules; those require their own tests and backend review.
