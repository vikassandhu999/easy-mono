# Client overview

When a client joins and submits intake, the coach needs to read their goals and constraints and record the review before preparing plans. This extends the existing `/clients/:id` route in the new coach app.

## Screen brief

- Entry: client row, or successful invitation. Keep the same URL through onboarding.
- Invited: acceptance status, invitation link, resend, and assigned intake preview.
- Accepted: intake pending, with a clear explanation that answers appear after submission.
- Submitted: saved question labels and grouped answers, submission date and author, then Mark intake reviewed. Persist the review through the existing API; show failure beside the action and allow retry.
- Reviewed: retain the answers and review date. Explain plan preparation as the next onboarding step; use neutral plan-update wording for clients already in coaching.
- Exceptions: inactive access pauses pending intake; dismissed and missing assignments are explicit. Query failures expose retry and must never masquerade as pending or empty data.

Use one mobile column with client status first and answers below. Desktop places the compact client summary beside the intake. A separate review route was considered, but keeping the answers here preserves client context and the existing durable link. Questions stay expanded for reading and keyboard navigation.

## Implementation

`client-overview.tsx` owns client, assignment, and submission reads. `client-invitation.tsx` keeps the invitation actions; `client-intake.tsx` renders intake state and review; `intake-answers.tsx` renders the submission snapshot, preserving false, zero, missing, multi-select, and service answers. Photo access uses the authorized download-URL endpoint on demand.

All implementation is new coachapp code or its existing shared primitives. No coachapp-v2 UI was copied. No new shadcn primitive was needed; the installed controls and surfaces cover this screen. The app's AGENTS.md records the rebuild rule and CLI requirement.

No API contract change. Review invalidates both assignment and submission queries and rejects late completions after an account change. Refresh reloads client, intake, and answers. Plan creation, editing intake templates, reminders, and historical submission navigation remain separate slices.

## Verification

The real API browser suite covers invitation acceptance, intake submission, question-snapshot preservation after template edits, grouped answers, failed assignment/answer/review requests and recovery, and persisted review at 375px and 1280px. Supplemental response fixtures exercise inactive, dismissed, absent-intake, coaching-stage copy, external review refresh, and photo-download recovery. Media storage itself is external to this local test.

Review found inactive access was initially described as ready and missing detail-endpoint plan names were being treated as absent plans. Both were corrected with supported client state and protected by browser assertions.


## Real intake photo verification — 2026-09-15

The intake regression now uploads a real photo as the client and includes its attachment ID in the submitted answer. The coach recovers a failed signing request, loads the original image and verifies downloaded bytes. This replaces the former synthetic photo response and data URL. Both the invitation/intake and check-in review suites pass at 375px/1280px against normal API/app and local storage. The shared reader also exposes storage image failures, verified through the check-in response journey.
