# Public library media design

Date: 2026-07-20
Status: approved for build
Related: `2026-07-12-rich-chat-attachments-embeds-design.md`

## Problem statement

Coaches can associate external image URLs with exercises and foods, but cannot
upload media directly. Exercise records hold an array of image strings and
render only the first; food records hold one image URL. Neither owns the
referenced bytes.

Uploaded media already exists as **attachments**, but attachments are private
client records: every attachment has a non-null `client_id`, access follows
client visibility, and downloads use short-lived signed URLs. Exercise and food
media instead belongs to the shared **business library** and is rendered
repeatedly across coach and client lists, pickers, plans, and detail screens.

Reusing the attachment table would weaken its non-null client invariant and put
public and private delivery behind one authorization path. Treating library
media as private would spread signed-URL refresh across every library surface
without protecting anything client-sensitive.

## Solution

Add business-owned **library media** for exercises and foods. A coach uploads
directly to a dedicated **public** object store via a short-lived signed PUT.
The media row is written when the upload is signed and may be referenced by a
same-business exercise or food. Bytes are served from a stable public CDN URL.

This mirrors the approved attachment flow exactly: **row-at-presign, reference
after PUT, no finalize call, no object HEAD.** A failed PUT can leave an
unreferenced row — the same accepted trade-off attachments make today. Orphan
cleanup is deferred until orphan volume is operationally relevant (see
Lifecycle).

Private attachments are unchanged. The two capabilities share storage signing
and the frontend transfer helper — not persistence, not authorization.

## Vocabulary

* **Attachment**: private client-scoped media (chat, check-ins).
* **Library media**: public business-scoped media referenced by an exercise or
  food.
* **Storage key**: backend-owned immutable object identifier. Rows store this,
  never a URL.
* **Public URL**: stable URL derived from the configured public CDN origin and
  the storage key. Derivable the moment the row exists — no round-trip.
* **Primary media**: the single library-media record on an exercise or food.

## Locked decisions

| Decision | Choice |
|---|---|
| Media scope | Business-owned library content |
| Supported domains | Exercises and foods |
| Supported kinds | Images and video (audio deferred — one MIME row to add later) |
| Domain cardinality | Zero or one primary media item per exercise or food |
| Upload permission | Authenticated coaches in the owning business |
| Read permission for bytes | Public to anyone possessing the URL |
| Read permission for metadata | Existing authorized exercise and food reads |
| Upload transport | Direct browser PUT using a short-lived signed URL |
| Delivery transport | Stable public CDN URL |
| Completion | None. Row-at-presign, reference-after-PUT (matches attachments) |
| Persistence | Separate `library_media` records; attachments stay separate |
| Storage | Dedicated public bucket, never the private attachment bucket |
| Object identity | Immutable UUID-based keys, no original filename |
| Immutability | Rows immutable; replacement creates a new row + new key |
| Orphan cleanup | Deferred (matches attachment spec); add a GenServer sweep when volume warrants |
| Attachment behavior | Unchanged and private |
| Existing seeded media | Existing external URL fields remain as read-only fallbacks |

## Architecture and module seams

`Easy.LibraryMedia` is the external seam. Its interface owns three things:

```elixir
LibraryMedia.create_upload(ctx, %{"content_type" => ..., "byte_size" => ...})
  :: {:ok, %{media:, upload_url:, upload_url_expires_at:, upload_headers:}}
   | {:error, :unsupported_media | :storage_unavailable}

LibraryMedia.fetch_attachable(ctx, media_id)
  :: {:ok, %LibraryMedia{}} | {:error, :not_found}

LibraryMedia.public_representation(media)
  :: %{id:, kind:, content_type:, byte_size:, url:}
```

Behind that surface it hides storage-key format, bucket selection, signing,
CDN-URL derivation, tenant scoping, content-type→kind mapping, and validation.
Callers construct none of it.

The **Exercises** and **Foods** modules keep their own editability and
visibility rules. When a create/update supplies `media_id`, the owning domain
calls `LibraryMedia.fetch_attachable/2` for a same-business row before
persisting the relationship. A cross-business or unknown id is reported as not
found and never linked.

`Easy.Storage` stays a signing implementation that knows keys and credentials,
not users or businesses. It gains one real seam: a **store selector**. Existing
calls default to the private attachment bucket; library media passes
`store: :public`. It also gains `Storage.public_url/1` for the public CDN
address of a key.

The frontend reuses `putFileToSignedUrl` from `@easy/utils`. One small
library-media field owns selection, local preview, progress, retry,
replacement, and removal for both forms.

## Data model

`library_media`:

* `id` uuid PK (passed in, matching the attachment convention);
* `business_id` uuid FK, **non-null**;
* `uploaded_by_type` / `uploaded_by_id` — nullable attribution, retained if the
  coach leaves;
* `storage_key` text, unique, non-null;
* `content_type` text, non-null;
* `byte_size` bigint, non-null;
* timestamps.

No `status` column (no pending/ready — every row is attachable). No
`unreferenced_at` (unreferenced is a LEFT JOIN over two tables, computed only
when a sweep is eventually added).

Exercises and foods each gain a nullable `media_id` FK. A CHECK constraint
`business_id IS NOT NULL OR media_id IS NULL` prevents a system-owned record
(no business) from referencing business media. Business scoping is validated
again through `fetch_attachable/2` before every write.

Rows are immutable. Replacing media inserts a new row and atomically repoints
`media_id`. Removing media sets `media_id` to null. Neither synchronously
deletes the object. Duplicating an exercise or food (the existing `/copy`
endpoints) carries `media_id` forward as a shared reference — safe because copy
only ever sources same-business or system records, and the LEFT-JOIN cleanup
treats media as referenced while any record points to it.

Existing exercise `images` strings and food `image_url` remain as read-only
fallbacks for seeded/imported records. Responses prefer managed media, then
fall back to the external reference. Coach forms stop offering arbitrary URL
entry. A future import can move external objects into managed storage without
blocking this feature.

## Supported media

| Kind | MIME types | Maximum size |
|---|---|---|
| Image | `image/jpeg`, `image/png`, `image/webp` | 15 MB |
| Video | `video/mp4`, `video/webm` | 50 MB |

Kind is derived from content type, not stored. HEIC, QuickTime, SVG, HTML,
documents, archives, and arbitrary files are rejected — the product does not
transcode and cannot promise browser playback.

## Upload flow

1. A coach selects an accepted file in an exercise or food form.
2. The frontend does immediate type/size checks for feedback.
3. `POST .../library-media/uploads` — the backend repeats the checks at the
   trust boundary, inserts a `library_media` row, and returns a signed PUT plus
   required headers. The row's public URL is already derivable and returned.
4. The browser PUTs directly to the public library bucket.
5. On PUT success the form holds the `media_id`; on failure it keeps all form
   values and the local preview and offers retry or remove.
6. The exercise/food mutation submits the `media_id`. `fetch_attachable/2`
   confirms same-business before linking.

The save action is disabled while a transfer is active. Object keys use the
business id and generated media id — never the filename or a user path. The
public object is written with an immutable cache policy because replacement
always creates a new key.

## Public delivery and security

Public delivery is a content classification, not relaxed write authorization:

* only authenticated coaches can request uploads;
* only a coach in the owning business can attach, replace, or remove;
* no public endpoint lists businesses, exercises, foods, or media;
* bucket listing is disabled; keys are generated UUIDs;
* the public bucket holds no attachments or client data;
* UI copy warns coaches not to upload client photos or private material.

Public URLs are stable and cacheable — native image loading, video playback,
byte-range requests, and repeated list rendering without signed-URL refresh.
Possession of the URL grants read access; deletion may not immediately purge
intermediary caches. Licensed, client-identifying, or confidential content
belongs in private attachments, not here.

## Exercise and food behavior

Both domains expose a consistent primary-media representation: `{id, kind,
content_type, byte_size, url}`. Existing external images remain a fallback until
migrated.

List items render an image thumbnail for image media, a media-kind placeholder
for video, and never autoplay. Detail screens render images normally, use
native controls for video, and show a recoverable unavailable state when the
browser cannot render the object.

Coach surfaces (coachapp) implement this fully — upload field on both forms,
media in list items and detail. **Client rendering is deferred**: clientapp
currently shows exercises and foods as text-only rows (no thumbnails exist to
swap), so surfacing media there is a net-new design, not part of this change.
The backend already returns `media` on client responses for when that UI lands.

Create/edit forms accept one file, show a local preview and progress, allow
retry/replace/remove, block saving during upload, and preserve all non-media
form values after an upload error.

Ordered galleries, cover images, and multiple media roles are a later design.
This version keeps one primary relationship because current surfaces show one
item.

## API contract

Coach library-media operations:

* `POST /v1/coach/library-media/uploads` — create an upload from content type
  and byte size; returns the media row, signed PUT, headers, and public URL.

Exercise and food create/update gain nullable `media_id`. A new id replaces the
relationship; explicit null removes it; omitting the field leaves it unchanged
on update.

Exercise and food responses gain a nullable media representation. Existing
image-string fields remain during the compatibility period. Consumers prefer
managed media when present.

Errors follow existing conventions:

* malformed/unsupported metadata → validation error;
* missing, cross-business, or unauthorized media → not found;
* upload signing unavailable → storage unavailable.

## Lifecycle and cleanup

**Deferred**, matching the approved attachment spec ("add periodic orphan
cleanup only after orphan volume becomes operationally relevant"). Failed PUTs
and replaced/removed media leave unreferenced rows and objects, exactly as
attachments do today. The dataset is small and mostly static (hundreds of
exercises, ~1k seeded foods, occasional coach uploads), so orphan volume is
negligible at launch.

When a sweep is warranted it follows the existing GenServer sweeper pattern
(`subscription_sweeper.ex` / `check_in_sweeper.ex`, **not** Oban): one query for
`library_media` older than a grace period that no exercise or food references
(LEFT JOIN both tables), delete object then row. No `status`/`unreferenced_at`
bookkeeping is needed for that — the join computes it.

Business deletion does **not** synchronously delete public objects (that would
couple deletion to storage availability for pennies of orphaned bytes). Rows go
with the business; objects are reaped by the eventual sweep. Attachment cleanup
is untouched.

## User stories

1. As a coach, I upload media while creating an exercise, so I need not host it
   elsewhere.
2. As a coach, I upload media while creating a food, so it has a useful visual.
3. As a coach, I use an image or video, so the media matches what I teach.
4. As a coach, I get upload progress and retry, so a network failure does not
   discard my form.
5. As a coach, I replace or remove media, so library content stays accurate.
6. As a coach, I am warned that library media is public by URL, so I do not
   upload client-sensitive material.
7. As a client, exercise and food media loads reliably without expired links.
8. As a client, I get native video controls.
9. As a business owner, another business cannot attach my media id to its
   records.
10. As an operator, public and private objects live in separate stores, so a
    public policy cannot expose client attachments.
11. As a maintainer, attachments keep their client invariant.

## Testing decisions

* `LibraryMedia` context tests: type/size validation, storage-key and
  public-URL derivation, and same-business `fetch_attachable` gating (unknown
  and cross-business → not found).
* Exercises and Foods context tests: only same-business media attaches, and
  replace/remove preserves other fields.
* Controller tests: the upload contract and the entity `media_id` contract.
* Storage tests: `store: :public` signing and `public_url/1` without changing
  existing private signing.
* Existing attachment, chat, and form tests pass unchanged.
* Compatibility: seeded external images still render when managed media is
  absent.
* Frontend: file validation and save-blocking; live upload/retry/replace/remove
  and image/video rendering across coach and client surfaces.

Storage HTTP behavior is replaced at its existing seam; no live bucket in the
ordinary suite.

## Alternatives rejected

**Generalize attachments with nullable client ownership** — weakens a
security-critical invariant and forks every attachment query, key, download
path, and validation into public/private branches.

**Keep library media private** — these reusable library assets are not client
records; private delivery forces expiring-URL refresh across lists, pickers,
and long-lived video playback.

**Two-phase confirm + orphan sweeper at launch** — the approved attachment
spec, sharing the same storage, explicitly deferred both. Library media is a
smaller, lower-churn dataset; the confirm step buys only detecting a failed PUT
at attach-time instead of render-time (the same broken-reference the attachment
flow already tolerates), and the public URL is derivable at create time without
it. Deferred for consistency.

**Store only public URLs on exercises and foods** — URLs alone lose business
ownership, object identity, and referential integrity.

**Universal polymorphic media relationship** — exercises and foods need one
primary item; a nullable domain FK gives a stronger constraint and a smaller
interface. Revisit when a real ordered multi-media workflow exists.

## Out of scope

* Multiple media, galleries, ordering, captions, roles, cover images, posters.
* Audio (deferred — add MIME rows + a player when a use case exists).
* Cropping, compression, transcoding, thumbnail variants, HEIC/QuickTime.
* Media search/browse/reuse picker, folders, tags, standalone library.
* Copying a record's media to another record (introduces shared references).
* Anonymous upload or unauthenticated library metadata.
* Converting private attachments to public; migrating all seeded URLs.
* Orphan sweeping and synchronous business-deletion object cleanup (deferred).
* Immediate global cache purge; moderation, malware scanning, copyright.

## Verification gates

Complete only when:

* backend migrations roll forward and back;
* the OpenAPI document regenerates without drift;
* backend precommit passes;
* both frontend apps pass task-specific checks and builds;
* generated-file and diff checks pass;
* exercise and food create/edit/list/detail flows are exercised live;
* image and MP4 uploads and playback are verified;
* a cross-business media id is rejected;
* existing chat and check-in attachments remain private and operational.
