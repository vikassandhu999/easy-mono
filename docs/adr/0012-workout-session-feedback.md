---
status: accepted
date: 2026-10-18
---

# Use optional client feedback to support the next workout decision

How might we help a coach understand the client's experience of a session without making workout completion depend on a feedback form? Collect optional whole-session effort, a separate pain/discomfort answer, and one shared note. The client supplies the experience; a coach can enter the client's answers.

## Selected fields

| Field | Meaning and rules |
|---|---|
| effort | Optional integer from 1 to 5: Very easy, Easy, Moderate, Hard, Very hard. Null means unanswered. |
| pain | Optional boolean: true means pain/discomfort reported, false means none reported, null means unanswered. |
| text | One optional plain-text note for all session context, including pain. Trim surrounding whitespace, turn blank input into null, and preserve internal text and line breaks. Maximum 10,000 characters on creation and edits. |

All three fields have no preselected answer and may remain null when the log is completed. Feedback can be corrected while the log is active, including after reopening a completed log. A reported pain flag does not require a note. The note stays attached to the workout; sending a message to the coach is a separate action.

Session effort describes how demanding the whole session felt. An intentionally easy session can be successful. It is entered separately from exercise-level effort and is not calculated by averaging sets. The five-point session scale has fewer choices than the proposed 1–10 scale. It does not change the exercise-level effort metric's existing range.

## Alternatives and trade-offs

We considered a note alone, effort plus a note, suitability plus a note, effort plus discomfort and a note, and asking for explanations only when the client changes the prescribed workout.

The selected direction gives the coach two distinct signals while leaving room for context. The old too_easy/just_right/too_hard values judge suitability; they do not answer the same question as perceived effort. One shared note avoids separate comment boxes for pain and general context. The trade-off is that pain-specific detail is no longer a separate text field.

## Assumptions to check

- Coaches use effort and discomfort feedback when deciding the next workout. Review a small set of completed logs with coaches and ask what each answer changes in their decision.
- Clients can distinguish the five effort labels. Try the choices with clients after different kinds of physical activity and ask how they selected their answer.
- One shared note supplies enough context. Check whether coaches repeatedly need separate pain details before considering another field.

## Scope

This slice adds no custom questionnaires, automatic prescription changes, computed effort scores, separate coach-observation fields, or required feedback. It does not infer no pain from a missing answer.

The [review draft](../../.scratch/workout/models.ex) replaces difficulty with effort and removes pain_note, keeping text for all session context. Its [log changesets](0014-workout-log-validation-and-lifecycle.md) now validate these fields on creation and edits and allow completion with no feedback. Writer integration remains pending. The runtime backend, API, and completion UI still use the previous fields and requirements.

A future migration must preserve historical difficulty answers and both existing note fields without truncation. There is no approved automatic conversion from the old suitability categories to the new effort scale. Resolve that migration before changing stored data.

This records W71–W73 in the [workout concept](../../.scratch/workout/concept.md).
