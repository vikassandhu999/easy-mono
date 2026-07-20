# Public library media design

Date: 2026-07-20
Status: draft for review
Related: `2026-07-12-rich-chat-attachments-embeds-design.md`

## Problem statement

Coaches can currently associate external image URLs with exercises and foods,
but they cannot upload and manage media directly. Exercise records accept
multiple string references while the product renders only the first one. Food
records accept one image URL. Neither workflow owns the referenced bytes, can
confirm that an upload exists, or can reliably remove abandoned media.

The product already supports uploaded attachments, but attachments are private
client records. Every attachment belongs to a business and client, access
follows client visibility, and downloads use short-lived authorized URLs.
Exercise and food media instead belongs to the shared business library and is
shown repeatedly across coach and client lists, pickers, plans, and detail
screens.

Using the attachment table for library media would weaken its non-null client
ownership invariant and put public and private delivery behind the same
authorization branches. Treating all library media as private would spread
signed-URL refresh behavior across every library surface without protecting
client-sensitive information.

## Solution

Add business-owned **library media** for exercise and food content. An
authenticated coach uploads media directly to a dedicated public object store
using a short-lived signed PUT. After the backend confirms that the object
exists and matches the declared size and content type, the media becomes ready
and can be referenced by a business-owned exercise or food.

Ready library media is delivered through a stable public CDN URL. The bytes are
publicly readable to anyone who possesses the unguessable URL, while library
records, uploads, replacements, removals, and deletion remain authenticated and
tenant-scoped.

Private attachments remain unchanged. The two capabilities share storage
signing and frontend transfer primitives, not persistence or authorization.

## Vocabulary

* **Attachment**: private client-scoped media used by chat, check-ins, and other
  client workflows.
* **Library media**: public business-scoped media referenced by an exercise or
  food.
* **Pending media**: library media whose upload authorization was issued but
  whose object has not been confirmed.
* **Ready media**: confirmed library media that may be attached to an exercise
  or food and exposed through a public URL.
* **Storage key**: the backend-owned immutable object identifier. Database
  records store this rather than an upload URL or CDN URL.
* **Public URL**: a stable URL derived from the configured CDN origin and the
  storage key.
* **Primary media**: the single library-media record associated with an
  exercise or food in this version.

## Locked decisions

| Decision | Choice |
|---|---|
| Media scope | Business-owned library content |
| Supported domains | Exercises and foods |
| Supported kinds | Images, video, and audio |
| Domain cardinality | Zero or one primary media item per exercise or food |
| Upload permission | Authenticated coaches in the owning business |
| Read permission for bytes | Public to anyone possessing the URL |
| Read permission for metadata | Existing authorized exercise and food reads |
| Upload transport | Direct browser PUT using a short-lived signed URL |
| Delivery transport | Stable public CDN URL |
| Persistence | Separate `library_media` records; attachments stay separate |
| Storage | Dedicated public bucket, never the private attachment bucket |
| Object identity | Immutable UUID-based keys with no original filename |
| Attachment behavior | Unchanged and private |
| Completion | Explicit confirmation before media can be referenced |
| Existing seeded media | Existing external URL fields remain as read-only fallbacks |

## Architecture and module seams

`Easy.LibraryMedia` is the external seam for library-media behavior. Callers do
not construct storage keys, decide bucket visibility, or attach unverified
media themselves. Its interface owns:

1. creating a pending business-scoped upload;
2. confirming that the uploaded object matches its declaration;
3. resolving a ready media record that may be attached by the current
   business;
4. deriving the public representation of ready media;
5. identifying unreferenced media eligible for cleanup.

The Exercises and Foods modules remain responsible for their own editability
and visibility rules. When a create or update request supplies a media id, the
owning domain asks `LibraryMedia` for a ready, same-business record before
persisting the relationship.

`Easy.Storage` remains storage infrastructure rather than an authorization
module. It gains named-store support so existing calls continue to use private
attachment storage by default while library media explicitly selects public
library storage. It signs storage operations but knows nothing about users,
businesses, exercises, foods, or client visibility.

The frontend reuses the existing direct-upload transport helper. A small
library-media field owns selection, local preview, progress, retry, completion,
replacement, and removal for both forms. Chat and check-in composers keep their
existing attachment behavior.

## Data model

`library_media` stores:

* UUID identity;
* non-null business ownership;
* nullable uploader attribution, retained if the coach later leaves;
* unique immutable storage key;
* declared content type and byte size;
* `pending` or `ready` status;
* nullable `unreferenced_at` used by cleanup;
* timestamps.

Exercises and foods each gain a nullable `media_id`. A database constraint
prevents system-owned records without a business from referencing uploaded
business media. Business scoping is validated again through the
`LibraryMedia` interface before every write. A pending or cross-business id is
reported as not found and is never linked.

Media records are immutable after becoming ready. Replacing media creates a new
record and atomically changes the exercise or food reference. Copying an
editable record within the same business may reuse the same immutable ready
media. Removing media clears the relationship; it does not synchronously delete
the object. Completion sets `unreferenced_at`; attaching clears it. Removing or
replacing the final reference sets it again.

The existing exercise image strings and food image URL remain available for
seeded system and imported records. Responses prefer ready uploaded media, then
fall back to the existing external reference. Coach forms stop offering
arbitrary URL entry. A future import can move external objects into managed
storage without blocking this feature.

## Supported media

| Kind | MIME types | Maximum size |
|---|---|---|
| Image | JPEG, PNG, WebP | 15 MB |
| Video | MP4, WebM | 50 MB |
| Audio | MPEG audio, MP4 audio, WebM audio | 10 MB |

Media kind is derived from content type rather than stored separately.

HEIC and QuickTime are not accepted because the product does not transcode and
cannot promise browser playback. SVG, HTML, documents, archives, and arbitrary
files are rejected. Duration may be returned by the player but is not trusted
or required as persisted metadata in this version.

## Upload and completion flow

1. A coach selects an accepted file in an exercise or food form.
2. The frontend performs immediate type and size checks for feedback.
3. The backend repeats those checks at the trust boundary, creates a pending
   media row, and returns a signed PUT plus required headers.
4. The browser uploads directly to the public library bucket.
5. The frontend requests completion for the media id.
6. The backend performs a signed object metadata request and verifies that the
   object exists and its content length and content type match the pending row.
7. The backend marks the media ready and returns its stable public
   representation.
8. The form submits the ready media id with the exercise or food mutation.

The save action is disabled while transfer or completion is active. A failed
upload leaves the form values and local preview intact and offers retry or
remove. The entity mutation never accepts a pending id, even if the browser PUT
reported success.

Upload object keys use the business id and generated media id. They never use
the original filename or a user-controlled path. Upload responses set an
immutable public cache policy because replacement always creates a new key.

## Public delivery and security

Public delivery is a deliberate content classification, not a relaxation of
write authorization:

* only authenticated coaches can request uploads;
* only a coach in the owning business can attach, replace, or remove media;
* no public endpoint lists businesses, exercises, foods, or media records;
* bucket listing is disabled;
* object keys contain generated UUIDs;
* the public bucket contains no attachments or client data;
* UI copy warns coaches not to upload client photos or private material as
  library media.

Public media URLs are stable and cacheable. This supports native image loading,
audio/video playback, byte-range requests, and repeated rendering in lists
without signed-URL refresh hooks.

Possession of the URL grants read access to the bytes. Deletion may not
immediately remove copies from intermediary caches. Content that is licensed,
client-identifying, confidential, or required to become inaccessible
immediately belongs in private attachments or a future private library-media
capability, not this public store.

## Exercise and food behavior

Both domains expose a consistent primary-media representation containing the
media id, kind, content type, byte size, and URL. Existing external images
remain a fallback representation until migrated.

Exercise and food list items:

* render an image thumbnail for image media;
* render a media-kind placeholder for video or audio;
* never autoplay media.

Detail screens:

* render images normally;
* use native controls for video and audio;
* show a recoverable unavailable state when the browser cannot render the
  object.

Create and edit forms:

* accept one file;
* show a local preview and progress;
* allow retry, replace, and remove;
* prevent saving while upload or completion is active;
* preserve all non-media form values after an upload error.

Supporting ordered galleries, separate cover images, or several media roles
requires a later domain design. This version intentionally keeps one primary
media relationship because current product surfaces display one item.

## API contract

Coach library-media operations:

* create an upload from content type and byte size;
* complete a pending upload by id.

Exercise and food create/update requests gain nullable `media_id`. Supplying a
new id replaces the current relationship. Supplying null explicitly removes
managed media. Omitting the field leaves the relationship unchanged on update.

Exercise and food responses gain a nullable media representation. Existing
image-string response fields remain during the compatibility period for seeded
external media. Consumers prefer managed media when present.

Errors follow the existing conventions:

* malformed or unsupported metadata: validation error;
* missing, cross-business, or unauthorized media: not found;
* pending media supplied to an entity mutation: validation error;
* upload signing or object metadata access unavailable: storage unavailable;
* object metadata does not match the declaration: validation error and the
  media remains pending.

## Lifecycle and cleanup

Pending uploads older than 24 hours are abandoned. Ready media becomes
unreferenced when no exercise or food points to it. A periodic sweeper following
the existing application sweeper pattern deletes:

* pending objects and rows older than 24 hours;
* ready objects and rows that have remained unreferenced for 24 hours.

The grace period protects form cancellation, retries, replacements, and
concurrent updates. Cleanup locks each candidate and checks both domain
references again immediately before deletion. Object deletion succeeds before
the database row is removed; failed object deletion is retried on the next
sweep.

Business deletion asks `LibraryMedia` to delete the business's public objects
before deleting their metadata. A storage failure aborts business deletion
rather than losing the storage keys needed for cleanup. This synchronous
approach is acceptable for the initial volume; move it to a durable deletion
queue if measured deletion time becomes a problem. Attachment cleanup remains
a separate concern and is not silently changed by this feature.

## User stories

1. As a coach, I want to upload media while creating an exercise, so that I do
   not need to host it elsewhere.
2. As a coach, I want to upload media while creating a food, so that the food
   has a useful visual or playable reference.
3. As a coach, I want to use an image, video, or audio file, so that the media
   type can match the content I am teaching.
4. As a coach, I want upload progress and retry, so that a network failure does
   not discard the rest of my form.
5. As a coach, I want to replace or remove media, so that library content stays
   accurate.
6. As a coach, I want to be warned that library media is public by URL, so that
   I do not upload client-sensitive material.
7. As a client, I want exercise and food media to load reliably, so that I can
   understand my plan without expired links.
8. As a client, I want native video and audio controls, so that playback and
   seeking work normally.
9. As a business owner, I want another business to be unable to attach my media
   id to its records, so that tenant metadata remains isolated.
10. As an operator, I want public and private objects in separate stores, so
    that a public bucket policy cannot expose client attachments.
11. As an operator, I want abandoned uploads removed, so that storage does not
    grow indefinitely.
12. As a maintainer, I want attachments to retain their client invariant, so
    that existing privacy rules remain easy to reason about.

## Testing decisions

Tests exercise the highest stable interfaces:

* `LibraryMedia` context tests cover type and size validation, pending-to-ready
  completion, object metadata mismatch, stable public representation, and
  cleanup eligibility.
* Exercises and Foods context tests prove that only ready same-business media
  can be attached and that replace/remove semantics preserve other fields.
* Controller tests cover the generated upload, completion, and entity
  contracts.
* Storage tests cover named-store signing without changing existing private
  attachment behavior.
* Existing attachment, chat, and form tests must pass unchanged, proving that
  client authorization and signed downloads were not broadened.
* Frontend tests or focused checks cover file validation and save blocking.
  Live verification covers upload, retry, replace, remove, list rendering, and
  native image/video/audio rendering in both coach and client surfaces.
* Compatibility coverage proves that seeded external exercise and food images
  still render when managed media is absent.

No test bypasses the `LibraryMedia` interface to assert private implementation
details. Storage HTTP behavior is replaced at its existing seam rather than
requiring a live bucket in the ordinary test suite.

## Alternatives rejected

### Generalize attachments with nullable client ownership

Rejected because it weakens a security-critical invariant and adds public versus
private branching to attachment queries, storage keys, download authorization,
chat validation, form validation, and deletion behavior.

### Keep library media private

Rejected because these reusable business-library assets are not client records.
Private delivery would require expiring URL refresh behavior throughout lists,
pickers, plan builders, and long-lived audio/video playback.

### Store only public URLs on exercises and foods

Rejected because URLs alone do not preserve business ownership, upload state,
object cleanup, replacement history, or referential integrity.

### Create a universal polymorphic media relationship

Rejected because exercises and foods currently require one primary item.
Domain-owned nullable references provide stronger foreign keys and a smaller
interface. A relationship table becomes justified only when a real ordered
multi-media workflow exists.

## Out of scope

* Multiple media items, galleries, ordering, captions, and media roles.
* A separate cover image or generated video poster.
* Cropping, editing, compression controls, transcoding, and thumbnail variants.
* HEIC and QuickTime conversion.
* Media search, browsing, reuse picker, folders, tags, and a standalone media
  library.
* Anonymous upload or unauthenticated library metadata.
* Converting existing private attachments into public media.
* Migrating all seeded external URLs into managed storage.
* Immediate global cache purge after deletion.
* Licensed-content enforcement, moderation, malware scanning, and copyright
  workflows.

## Verification gates

Implementation is complete only when:

* backend migrations roll forward and back;
* the OpenAPI document regenerates without drift;
* backend precommit passes;
* both frontend applications pass their task-specific checks and builds;
* repository generated-file and diff checks pass;
* the exact exercise and food create/edit/list/detail flows are exercised live;
* image, MP4, and audio uploads and playback are verified;
* a cross-business media id is rejected;
* existing chat and check-in attachments remain private and operational.
