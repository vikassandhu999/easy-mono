# Messaging

Owner: Messaging

## Supported outcome

An active client and the coaching team members currently permitted to work with that client can exchange durable text, private media, voice notes, and coach-originated check-in references in the client's single coaching conversation.

## Available information

* Coach conversation collection: conversations already created for visible clients, ordered by newest activity, with client identity, last-message time, last-message preview, coach-side unread count, and total visible conversation count.
* Conversation: one stable identity for a business and client. The client has this single conversation rather than a recipient list or inbox.
* Message: stable identity, conversation identity, sender side and identifier, sent time, optional text, ordered media information, and an optional check-in reference.
* Check-in reference: the submission identity, check-in occurrence identity, title, and submission time captured when the coach sends it. Submitted answers are not included in the message.
* History: messages older than an optional cursor, returned in chronological order within each page, with whether older messages remain.
* Read state: the unread count for the viewing side. The message that defines the read position is not returned.
* Real-time events: a complete new message for an open conversation and an identity-only conversation update for the coach collection.

## Supported actions

* A business owner can access conversations for every client in the business. A trainer can access conversations for clients they coach.
* A coach can inspect the visible conversation collection, open or create a visible client's conversation, load older messages, and mark the conversation read.
* An active client can open or create their one coaching conversation, load older messages, and mark it read.
* Either side can send trimmed text, private media, a recorded voice note, or a supported combination.
* A coach can also send one check-in reference alone or together with text and media. A client can open a received reference but cannot originate one.
* Either side can receive new messages while connected. The coach collection can refresh the affected conversation after an activity signal.
* A consumer can recover missed activity after reconnecting, merge refreshed history, and deduplicate messages by their stable identities.

## Lifecycle

* A conversation is created when an authorized actor first opens or sends to it. Merely having a client relationship does not add an untouched conversation to the coach collection.
* A successful send stores one immutable message, its ordered attachment references, and the conversation preview together before announcing the new activity.
* The preview uses trimmed message text when present, otherwise the check-in title, otherwise the first attachment category.
* A sent check-in reference keeps the title and submission time captured at send time. Later check-in changes do not rewrite the message.
* Marking the conversation read advances the viewing side's shared cursor. Unread counts include only messages sent by the opposite side after that cursor.
* Coach read state is shared by the permitted coaching team. One coach marking the conversation read clears the coach-side unread count for the others.
* Messages and conversations have no supported edit, delete, archive, or restore lifecycle.

## Conditions

* Conversation visibility follows current business membership and client assignment. The business owner sees all business clients; a trainer sees currently assigned clients.
* Active clients can participate in messaging. A visible inactive client's existing history may remain available to a coach, but composing new messages for inactive or pending relationships is outside the supported product flow. Coach-side sending does not currently enforce that status boundary, so the product must block it unless the capability is deliberately expanded and the boundary is enforced.
* Text is trimmed and limited to 4,000 characters. A message needs at least one of text, media, or a coach-originated check-in reference.
* A message accepts at most four distinct attachments, all belonging to the conversation's business and client. Attachment order is preserved.
* A message accepts at most one check-in reference. It must belong to the same business and client as the conversation.
* The supported reference target is a completed check-in. Reference resolution currently accepts other same-client submissions, including onboarding, so the product must limit selection unless that capability is explicitly approved and enforced.
* Coach conversation collection pages contain up to 100 conversations and include the total conversation count. Message history pages contain up to 100 messages and include only whether more history remains.
* Media creation, supported formats, limits, temporary access, and availability follow Attachments.

## UX-relevant constraints

* The conversation belongs to the client and coaching business, not to one named coach. Messages identify the sender side and identifier but do not provide a coach display name or avatar.
* There is no presence information. Online indicators, last-seen claims, and typing state cannot be derived from real-time message delivery.
* Coach unread state is shared rather than per coach. There is no per-message read receipt, delivered state, or real-time read-state event.
* The coach collection supplies a total conversation count, not a total unread-message count. It has no supported search, unread filter, exact first-unread marker, or custom sorting.
* A conversation preview does not identify its last sender, so it cannot reliably be attributed to the coach, client, or current user.
* History is cursor-based and has no total message count. Consumers must preserve chronological order and deduplicate when merging pages or real-time activity.
* A successful send can arrive both as the direct result and as real-time activity. Both represent the same message and must be merged by stable identity.
* Sending has no duplicate-request protection. While a send is pending, repeat actions must be blocked. After an uncertain result, refresh before offering a manual retry because the first attempt may have succeeded.
* Confirmed send failure must retain entered text and ready media for recovery. The local composition must block sending while media is failed or unfinished because stored attachment information has no transfer-completion state and can be accepted before its media exists.
* Reconnection requires a refresh because activity may have been missed. Assignment or relationship changes also require refreshed authorization before relying on cached conversation state.
* Live conversation access is checked when a connection joins, but an existing subscriber is not immediately removed when a client becomes inactive or a trainer loses assignment. Immediate live-access revocation is not currently guaranteed.
* Coach collection activity is announced business-wide using only a conversation identity. A trainer may receive an identity they cannot access; the signal must only trigger a visibility-filtered refresh and must never be rendered directly.
* An unavailable attachment or check-in reference needs its own retry or unavailable state without hiding the rest of the message.

## Related capabilities

* Attachments: owns private media creation, transfer, temporary access, supported formats, and stored-media availability.
* Check-in review and messaging: owns review and the handoff that prepares a completed check-in as message context. Messaging owns sending and receiving that reference.
* Client relationships: supplies active or inactive status, trainer assignment, client visibility, and client identity.
* Training plan authoring and assignment: may lead a coach to discuss a client's training, but no training-plan reference is supported.
* Nutrition plan authoring and assignment: may lead a coach to discuss a client's nutrition, but no nutrition-plan reference is supported.

## Unsupported assumptions

* Group conversations, broadcasts, scheduled messages, separate trainer conversations, and client recipient selection are not supported.
* Presence, online status, last seen, typing indicators, delivery receipts, per-message read receipts, and individual coach read state are not supported.
* Message editing, deletion, reactions, replies, forwarding, pinning, threads, moderation, and message search are not supported.
* Conversation archive, mute, folders, labels, search, unread filtering, custom sorting, and an authoritative coach-wide unread total are not supported.
* Persisted drafts, offline sending, a send queue, duplicate-safe retry, and scheduled delivery are not supported.
* Push notifications, email notifications, SMS, and notification preferences are not supported messaging effects.
* Arbitrary files, captions, transcripts, generated media previews, and a reusable media library are not supported.
* Clients cannot originate check-in references. Workout, training-plan, nutrition-plan, payment, and other rich message references require approval and product work.

## Verification evidence

* `backend/lib/easy/chat.ex`, `backend/lib/easy/chat/conversation.ex`, `backend/lib/easy/chat/message.ex`, and `backend/lib/easy/chat/message_attachment.ex`: conversation ownership, visibility, composition, ordering, preview, unread state, pagination, and transactional sending.
* `backend/lib/easy_web/controllers/coaches/conversation_controller.ex`, `backend/lib/easy_web/controllers/clients/conversation_controller.ex`, and `backend/lib/easy_web/open_api/schemas/chat.ex`: actor-specific actions, returned information, limits, and error behavior.
* `backend/lib/easy_web/channels/conversation_channel.ex`, `backend/lib/easy_web/channels/inbox_channel.ex`, and `backend/lib/easy_web/channels/user_socket.ex`: real-time delivery, collection refresh signals, and connection authorization.
* `backend/lib/easy_web/router.ex`, `backend/lib/easy_web/plugs/ensure_active_client.ex`, `backend/lib/easy/clients.ex`, and `backend/lib/easy/clients/client.ex`: active-client participation, client status, coach visibility, and trainer assignment.
* `backend/lib/easy/attachments.ex`, `backend/lib/easy/attachments/attachment.ex`, and `backend/lib/easy/storage.ex`: private media validation, access, and temporary transfer lifecycle.
* `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`, `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`, and `frontend/apps/clientapp-v2/src/messages/coach-chat.tsx`: history merging, live updates, reconnection, composition recovery, read behavior, and current product gaps.
* `backend/test/easy/chat_test.exs`, `backend/test/easy_web/controllers/coaches/conversation_controller_test.exs`, `backend/test/easy_web/controllers/clients/conversation_controller_test.exs`, `backend/test/easy_web/channels/conversation_channel_test.exs`, and `backend/test/easy_web/channels/inbox_channel_test.exs`: source-backed messaging, isolation, unread, reference, pagination, and real-time behavior.
