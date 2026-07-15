# Design Envelope: Messaging

Derived from: [Messaging](../messaging.md) and [Attachments](../attachments.md)

## Supported outcome

An active client and the coaching team members permitted to work with that client can maintain one durable coaching conversation using text, private media, voice notes, and coach-originated check-in references.

## Available information

* For coaches: conversations already created for visible clients, ordered by newest activity, with client name, last-message time and preview, unread count, and total conversation count.
* For a client: one coaching conversation rather than an inbox or coach selector.
* For each message: sender side and identifier, sent time, optional text, up to four ordered media attachments, and an optional check-in reference.
* For a check-in reference: the captured check-in title and submission time. Submitted answers are available only after opening the referenced check-in with current access.
* For media: content type, byte size, and optional duration. Image, video, or audio category is derived from the content type. Original filename, caption, dimensions, thumbnail, poster, waveform, and transcript are unavailable.
* For history: a chronological page and whether older messages remain. A total message count is unavailable.
* For read state: the viewing side's conversation-level unread count. Coach read state is shared across the permitted coaching team.

## Supported actions

* A coach can inspect visible conversations, begin a visible active client's conversation, load older activity, send a message, and mark the conversation read.
* An active client can use their one coaching conversation, load older activity, send a message, and mark it read.
* Either side can send trimmed text, up to four private images, videos, or audio items, a voice note, or a supported combination.
* A coach can also send one completed check-in reference alone or with text and media. A client can open a received reference but cannot originate one.
* Either side can retry failed media transfer, remove selected media before sending, recover from a confirmed send failure, and request fresh access for unavailable media.
* New activity can appear while connected. Missed or duplicated activity can be reconciled using each message's stable identity.

## Lifecycle

* A conversation begins when messaging is first retrieved or used for the client. Creating a client relationship alone does not add it to the coach's conversation collection.
* Media transfers before the message is sent. Only ready media can be included.
* Sending creates an immutable message and updates the conversation's latest activity and preview.
* A sent check-in reference keeps the title and submission time captured at that moment, even if the check-in changes later.
* Marking a conversation read advances the shared state for that side. One permitted coach doing so clears the coach-side unread count for all permitted coaches.
* Relationship and trainer-assignment changes affect subsequent access. Existing history has no supported archive or deletion action.

## Conditions

* Messaging participation belongs to an active coaching relationship. A coach may retain access to a visible inactive client's history, but composition is not supported for inactive or pending relationships.
* Message text is limited to 4,000 characters after surrounding whitespace is removed.
* A message needs text, at least one ready media item, or a coach-originated check-in reference.
* At most four distinct media items and one check-in reference may be sent in one message. Every item must belong to the same client and business as the conversation.
* Supported images are JPEG, PNG, WebP, and HEIC up to 15 MB. Supported videos are MP4, WebM, and QuickTime up to 50 MB. Supported audio is WebM, MP4, and MPEG audio up to 10 MB. Voice recording is limited to five minutes.
* Private media access is temporary and renewable while the actor remains authorized.
* The business owner can participate for every business client. A trainer can participate for clients they currently coach.

## UX-relevant constraints

* This is one client-and-business conversation, not a strict direct conversation with one named coach. A coach display name or avatar is not available on a message.
* Presence, online state, last seen, typing, delivery status, and per-message read receipts are unavailable and must not be implied.
* The coach collection has no search, unread filter, folders, custom sorting, or authoritative total unread count. Its count is the number of visible conversations.
* A conversation preview does not identify its last sender, so it cannot reliably be labelled as sent by the coach, client, or current user.
* History has no total count or exact first-unread marker. Older activity loads in pages and must remain in chronological order.
* Creating or opening an empty conversation is valid. Empty coach collection, empty conversation, loading, and recoverable failure states all need intentional treatment.
* Media transfer progress, local preview, retry, recorder state, and an unsent composition exist only on the current device. Navigation or refresh can discard them.
* Failed or unfinished media blocks sending but must not discard ready media or text. Removing selected media detaches it from the composition; it does not delete stored media.
* Media access can expire. One unavailable item needs focused refresh, retry, or unavailable treatment without blocking the rest of the message.
* A send can be reported twice through direct completion and connected activity; stable identity prevents duplicate display.
* A pending send must block repeats. A confirmed failure keeps the composition available. An uncertain result requires refreshing the conversation before manual retry because the message may already exist.
* Reconnection can miss activity, so refreshed history must reconcile with retained messages. Access changes also require refreshed state.
* Shared coach read state means one coach can clear unread for the team. It cannot communicate which individual coach has read a message.

## Related capabilities

* Client relationships supplies active or inactive status, trainer assignment, client visibility, and client identity.
* Check-in review and messaging supplies submitted check-in context and the handoff that prepares a reference. This capability owns sending and receiving it.
* Attachments supplies private media transfer, limits, temporary access, and availability behavior.
* Training and nutrition capabilities may motivate conversation, but neither has a supported rich message reference.

## Unsupported assumptions

* Group conversations, broadcasts, scheduled messages, separate trainer conversations, and choosing a recipient are outside the supported product.
* Message edits, deletion, reactions, replies, forwarding, pinning, threads, moderation, and search are unsupported.
* Conversation archive, mute, folders, labels, search, unread filtering, and custom sorting are unsupported.
* Persisted drafts, offline sending, a send queue, duplicate-safe retry, push notifications, email notifications, and SMS are unsupported.
* A media library, arbitrary files, permanent sharing, captions, transcripts, generated thumbnails, cropping, and media editing are unsupported.
* Client-originated check-in references and references to workouts, plans, payments, or other product objects require explicit approval and product work.

## Example content

* Aisha sends, "Energy was low today," with a 42-second voice note. The text and ready recording remain available if sending fails.
* Her coach replies with text and a reference to Aisha's submitted "Weekly progress" check-in. The reference shows its captured title and submission time, not her answers.
* Creating a new client relationship does not add a conversation to the coach collection. When messaging is first retrieved or used, the new conversation can correctly have no messages.
* One of three progress images has expired access. The two available images remain usable while fresh access is requested only for the unavailable item.
* A trainer reads Aisha's latest message. The coach-side unread count also clears for the business owner because coach read state is shared.
* The connection returns after an interruption. Refreshed history adds one missed message and merges a repeated message by its stable identity.
