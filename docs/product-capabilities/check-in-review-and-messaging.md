# Check-in review and messaging

Owner: Check-ins

## Supported outcome

A coach can find submitted check-ins awaiting attention, inspect the saved answers, acknowledge the review, and carry the check-in into the client's single coach-client conversation for feedback.

## Available information

* Review queue: every unreviewed check-in submission for clients visible to the coach, ordered from newest to oldest.
* Client identity: first name, last name, and email when present.
* Check-in context: the current check-in name, occurrence state, due date when present, completion time, and submission time.
* Submitted content: the saved question snapshot, answers, and photo metadata.
* Review record: whether the submission was reviewed, when it was reviewed, and the reviewing user's identifier. A display-ready reviewer name is not available.
* Conversation reference: the submission identifier plus the check-in occurrence identifier, check-in title, and submission time captured when the reference is sent.

## Supported actions

* A business owner can inspect and review submissions for every client in the business. A trainer can do so only for clients they coach.
* A coach can mark an unreviewed check-in submission reviewed, recording the review time and acting user.
* A coach can revisit reviewed answers through the client's check-in and submission history after the item leaves the review queue.
* A coach can continue into the client's single coach-client conversation with the check-in prepared as message context. The coach may remove it, send it alone, or combine it with supported message content.
* An active client can see whether their completed check-in has been reviewed and can open a check-in reference sent by a coach in their conversation.

## Lifecycle

* A successful check-in submission enters the review queue. An onboarding submission does not.
* Marking a submission reviewed adds its review time and reviewing user without changing the completed check-in or its schedule. The submission then leaves the review queue.
* Repeating a completed review request returns the recorded review without changing its time or reviewer. There is no supported action to undo the review.
* Review and feedback are independent. Sending feedback does not mark the submission reviewed, and marking it reviewed does not create a message or notify the client.
* Preparing a check-in reference does not persist or send anything. It becomes message content only when the coach sends it; removing it before sending creates no record.
* A sent reference keeps the check-in title and submission time captured at send time. A later rename does not rewrite the message. The reference does not copy the submitted answers into the message.

## Conditions

* Review access follows client visibility at the time of access. Reassigning a client transfers an unreviewed submission from the former trainer's scope to the new trainer's scope; the business owner retains access.
* A visible submission remains reviewable after the client becomes inactive. Client access to the reviewed state and any feedback follows the active-relationship conditions of Client relationships and Messaging.
* Only check-in submissions belong in the review queue. Onboarding is not a supported review target.
* Only a coach can originate a message reference to a submission. The submission must belong to the same business and client as the conversation.

## UX-relevant constraints

* The review queue is one unpaginated collection with no supported search, filtering, custom sorting, or review assignment. Its count can be derived from the returned collection.
* There is no claim or version check while a coach reviews an item. Another coach may review it while it is open, and simultaneous review requests do not guarantee which reviewer is retained.
* The check-in name shown before review comes from the check-in at load time. Saved question labels and answer definitions come from the submission snapshot.
* The review queue and reviewed state have no real-time event. A consumer must refresh to discover a submitted check-in or a review completed elsewhere.
* Photo answers require private download access. Each unavailable photo needs its own recoverable loading or retry state without blocking the remaining answers.
* The reviewed state does not mean approved, accepted, or answered. It records only that a coach acknowledged the submission.
* A message reference contains identifying context, not the answers themselves. Opening the referenced submission still requires access to that client's saved submission.
* Message delivery, pending state, failure recovery, unread state, and real-time conversation updates follow the Messaging capability.

## Related capabilities

* Completion and submissions: supplies the completed check-in, saved question snapshot, answers, photos, and client-visible review fields.
* Check-in lifecycle: supplies the occurrence, due state, completion state, and schedule that remain unchanged by review.
* Client relationships: supplies client visibility, trainer assignment, active or inactive state, and client identity.
* Messaging: owns the single coach-client conversation, message composition, attachments, delivery, unread state, read state, and real-time updates.
* Attachments: owns private photo access and stored-file availability.

## Unsupported assumptions

* Onboarding review, onboarding feedback status, and an onboarding review queue require approval and product work.
* Approval, rejection, scoring, automated interpretation, recommendations, and generated summaries are not review states or effects.
* Internal review notes, reviewer assignment, claiming, priority, snooze, escalation, bulk review, and review reminders are not supported.
* Undoing, reopening, or changing a recorded review is not supported.
* Marking reviewed does not prove that feedback was sent or read, and sending feedback does not prove that review was recorded.
* Review does not automatically send an email, push notification, or conversation message.
* A separate check-in comment thread or feedback inbox is not supported. Feedback uses the existing client conversation.
* The product cannot show a reviewer's name from the review record alone.
* Clients cannot attach check-in references to messages they originate.

## Verification evidence

* `backend/lib/easy_web/router.ex`, `backend/lib/easy_web/controllers/coaches/check_in_review_controller.ex`, and `backend/lib/easy_web/controllers/coaches/check_in_review_json.ex`: coach review operations and returned queue context.
* `backend/lib/easy/forms.ex` and `backend/lib/easy/forms/form_submission.ex`: queue inclusion, ordering, visibility, review recording, sequential retry behavior, and submission history.
* `backend/lib/easy_web/open_api/schemas/client_profile.ex`, `backend/lib/easy_web/controllers/coaches/form_assignment_json.ex`, and `backend/lib/easy_web/controllers/clients/form_assignment_json.ex`: review, assignment, answer, client, and photo information exposed to each actor.
* `backend/lib/easy/chat.ex`, `backend/lib/easy/chat/message.ex`, and `backend/lib/easy/chat/conversation.ex`: the single client conversation, submission references, immutable message context, same-client checks, unread state, and real-time message events.
* `backend/lib/easy_web/open_api/schemas/chat.ex`, `backend/lib/easy_web/controllers/coaches/conversation_controller.ex`, and `backend/lib/easy_web/controllers/clients/conversation_controller.ex`: message composition and actor-specific submission-reference support.
* `frontend/apps/coachapp-v2/src/checkins/list-checkins.tsx`, `frontend/apps/coachapp-v2/src/checkins/review-checkin.tsx`, and `frontend/apps/coachapp-v2/src/checkins/review-answers.tsx`: queue states, answer review, photo recovery, review mutation, and conversation handoff.
* `frontend/apps/coachapp-v2/src/messages/client-conversation.tsx`, `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`, and `frontend/apps/clientapp-v2/src/messages/message-embed.tsx`: prepared reference behavior, explicit sending, and client access to a sent reference.
* `backend/test/easy/forms_test.exs`, `backend/test/easy/chat_test.exs`, `backend/test/easy_web/controllers/coaches/check_in_review_controller_test.exs`, and `backend/test/easy_web/controllers/coaches/conversation_controller_test.exs`: source-backed review, isolation, message reference, and delivery behavior.
