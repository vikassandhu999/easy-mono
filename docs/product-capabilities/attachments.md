# Attachments

Owner: Attachments

## Supported outcome

A visible coach or active client can add private client-scoped images, videos, or audio to a supported product flow and later access that media while they remain authorized for the client.

## Available information

* Attachment identity, content type, byte size, and optional duration. Image, video, or audio category is derived from the content type rather than stored separately.
* A temporary upload authorization for transferring the selected media.
* Temporary download access for up to 50 authorized attachments at a time, returned in the requested order.
* The consuming capability's relationship to the attachment, such as its position in a message or photo answer.
* Stored attachment information does not include an original filename, caption, dimensions, thumbnail, poster image, waveform, transcript, or processing state.

## Supported actions

* A business owner can create and access attachments for any client in the business. A trainer can do so for a client they coach.
* An active client can create and access attachments that belong to them.
* An authorized actor can transfer media after attachment creation and request fresh temporary access when displaying or playing it.
* A supported product flow can reference an attachment by its identity. Messaging preserves the selected order; check-in photo answers apply their own question limits.
* Local selection, preview, transfer progress, retry, and removal from an unsent composition are supported interaction states.

## Lifecycle

* Attachment information is created before the media transfer begins. If upload authorization cannot be created, the attachment information is not retained.
* The transferring device can observe a successful transfer and treat the media as locally ready. Stored attachment information has no completion record, processing phase, or object-existence check.
* Temporary upload access lasts 15 minutes. Temporary download access lasts 10 minutes and can be renewed while the actor remains authorized.
* Referencing an attachment in a message or check-in does not consume it. The same attachment can technically be referenced again, although there is no user-facing attachment library.
* Removing media from an unsent composition removes only that reference. Abandoning a composition, failing a later action, or removing a reference does not delete the stored attachment.
* Deleting the owning client or business removes attachment information, but no supported action removes the corresponding stored media. Client or business deletion therefore does not guarantee media erasure.

## Conditions

* Every attachment belongs to one business and one client. Access follows current business membership, client ownership, and trainer assignment.
* Supported images are JPEG, PNG, WebP, and HEIC up to 15 MB.
* Supported videos are MP4, WebM, and QuickTime up to 50 MB.
* Supported audio is WebM, MP4, and MPEG audio up to 10 MB.
* Duration is optional. When supplied, it must be between 1 millisecond and 5 minutes; it is descriptive information rather than proof of the media's actual duration.
* A request for temporary download access must contain 1 to 50 distinct attachment identities. The request is all-or-nothing: one missing or unauthorized identity fails the complete request, with no partial access or per-item error result.
* Each consuming capability owns its content limits. A message accepts up to four distinct attachments, while a check-in photo answer accepts one to four distinct supported images.

## UX-relevant constraints

* Creating attachment information does not prove that the media transfer completed. A consumer must retain local transfer progress and failure state until its own transfer finishes; later message and check-in validation checks attachment information rather than stored-media existence.
* A failed or unfinished transfer must block the consuming action that depends on it while leaving other ready media and entered content recoverable.
* Temporary access can expire while content is open. Refreshing access and retrying one unavailable item must not discard or block otherwise available content.
* Accepted media has no generated preview assets or conversion. A format that cannot be rendered directly needs a recoverable unavailable state.
* There is no supported list, search, rename, replace, or delete action for stored attachments.
* Removing media before submission is not deletion and must not be presented as deleting a stored file.
* Transfer progress, local previews, and recorder state exist only on the current device and are not recoverable after navigation or refresh.
* Attachment access is private and temporary. A temporary access address is not a permanent sharing link.

## Related capabilities

* Messaging: owns message composition, ordered media, voice notes, sending, and attachment-only messages.
* Completion and submissions: owns photo-question answers, their cardinality, and final submission.
* Check-in review and messaging: owns authorized viewing and recovery for submitted check-in photos.

## Unsupported assumptions

* An attachment library, recent-media picker, cross-client reuse, browsing, search, folders, tags, rename, replace, and deletion are not supported.
* Arbitrary documents, archives, executable files, and media outside the listed formats are not supported.
* Permanent public links, access sharing, expiration controls, and offline availability are not supported.
* Resumable or chunked transfer, background transfer recovery, persisted transfer progress, and server-confirmed upload completion are not supported.
* Cropping, editing, compression controls, transcoding, thumbnail generation, virus scanning status, captions, transcripts, and automatic cleanup are not supported.
* Creating attachment information does not guarantee that its media exists or can be rendered.

## Verification evidence

* `backend/lib/easy/attachments.ex`, `backend/lib/easy/attachments/attachment.ex`, and `backend/lib/easy/storage.ex`: attachment ownership, validation, temporary upload and download access, ordering, expiry, and lifecycle boundaries.
* `backend/lib/easy_web/controllers/coaches/upload_controller.ex`, `backend/lib/easy_web/controllers/clients/upload_controller.ex`, and `backend/lib/easy_web/open_api/schemas/attachments.ex`: actor-specific creation, batch access, accepted information, and error responses.
* `backend/lib/easy/chat.ex` and `backend/lib/easy/chat/message_attachment.ex`: same-client checks, message limits, uniqueness, and ordered message references.
* `backend/lib/easy/forms.ex` and `backend/lib/easy/forms/form_submission.ex`: check-in photo ownership, media restrictions, uniqueness, and per-answer limits.
* `frontend/packages/utils/src/media.ts`, `frontend/apps/coachapp-v2/src/messages/attachment-composer.tsx`, `frontend/apps/coachapp-v2/src/messages/use-attachment-composer.ts`, and `frontend/apps/clientapp-v2/src/messages/attachment-composer.tsx`: direct transfer, local progress, retry, previews, and voice recording.
* `backend/test/easy/attachments_test.exs`, `backend/test/easy/storage_test.exs`, `backend/test/easy/chat_test.exs`, and `backend/test/easy/forms_test.exs`: source-backed validation, authorization, association, and failure behavior.
