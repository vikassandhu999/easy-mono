# Rich chat attachments and embeds design

Date: 2026-07-12
Status: approved
Supersedes: the text-only message-content decision in `2026-07-08-coach-client-messaging-design.md`

## Summary

Keep one coach-client conversation and let each message combine text, uploaded
attachments, and one embedded domain record. Reviews and feedback do not get
their own comment threads. A coach gives check-in feedback by sending a normal
chat message with the form submission embedded as context.

`Easy.Attachments` owns private-file metadata, access checks, and signed URL
issuance. `Easy.Chat` owns message composition, attachment linking, embed
resolution, conversation previews, and realtime delivery. Storage keys never
leave the backend.

## Vocabulary

* **Attachment**: a private uploaded binary asset, such as an image, video,
  voice note, or document.
* **Attachment link**: a domain-specific relationship between an attachment
  and a record. Chat uses `chat_message_attachments`; check-ins continue to
  store attachment ids in answer snapshots until their storage model needs a
  separate relation.
* **Embed**: a backend-generated snapshot of a domain record carried by a chat
  message. The first embed type is `form_submission`.
* **Feedback**: a coach-authored chat message whose embed references the item
  being reviewed. Feedback is not a separate table or conversation.
* **Pin**: not part of this feature. Messages remain in chronological order.

## Locked decisions

| Decision | Choice |
|---|---|
| Human communication | One chat conversation per business and client |
| Message content | Optional text, zero to four attachments, zero or one embed |
| Empty message | Rejected; at least one content element is required |
| Attachment request shape | Callers send `attachment_ids`; database uses a relation with foreign keys |
| Attachment domain | Generic client-scoped private asset; no `purpose` column |
| First embed type | `form_submission`, coach-authored only |
| Feedback storage | Message body plus `form_submission` embed |
| Embed history | Immutable server-generated snapshot stored on the message |
| Download access | Centralized in `Easy.Attachments` |
| Download URL delivery | Single or batched authenticated request returns short-lived signed URLs |
| Batch behavior | One to fifty unique ids, request order preserved, all-or-nothing authorization |
| Redirect mode | None; Bearer-authenticated apps receive URLs as JSON |
| Storage transport | Browser uploads/downloads directly against private Tigris URLs |
| Voice recording | Native `MediaRecorder`; no recording dependency or waveform |

## Attachment model

The `attachments` row describes stored bytes and their tenant/client scope. It
does not describe which workflow first requested the upload.

```text
attachments
  id                  uuid PK
  business_id         uuid FK, non-null
  client_id           uuid FK, non-null
  uploaded_by_type    coach | client | system
  uploaded_by_id      uuid, non-null
  storage_key         text, unique, non-null
  content_type        text, non-null
  byte_size           bigint, non-null
  duration_ms         integer, nullable
  inserted_at
  updated_at
```

`client_id` stays non-null in this feature. All agreed uses are client-scoped:
check-ins, progress media, and coach-client chat. Business-library assets need
a separate design when a real workflow requires them.

Drop `purpose` and `attachments_purpose_check`. Existing rows and objects stay
in place; their storage keys do not need rewriting. Check-in validation changes
from `purpose == check_in_photo` to image content type plus business/client
ownership.

Storage keys for created uploads use this neutral form:

```text
businesses/<business_id>/clients/<client_id>/attachments/<attachment_id>.<extension>
```

Keys created under the earlier `check-in-photos` prefix remain valid.

### Accepted media

| Kind | MIME types | Maximum |
|---|---|---|
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/heic` | 15 MB |
| Video | `video/mp4`, `video/webm`, `video/quicktime` | 50 MB |
| Voice/audio | `audio/webm`, `audio/mp4`, `audio/mpeg` | 10 MB |

`duration_ms` is optional metadata. Voice recording UI caps recordings at five
minutes and sends the measured duration. The backend validates
`1..300_000` when duration is present. File size remains the backend-enforced
limit because the backend does not decode uploaded media.

The direct-upload sequence remains:

```text
authenticated metadata request
  -> attachment row + signed PUT URL
  -> browser PUTs raw bytes to Tigris
  -> caller references attachment id only after PUT succeeds
```

This design does not add a finalize call or object HEAD request. Failed uploads
can leave unreferenced metadata rows. Add periodic orphan cleanup only after
orphan volume becomes operationally relevant.

## Attachment interface and access seam

Only `Easy.Attachments` may call `Easy.Storage.presign_put/2` or
`Easy.Storage.presign_get/2` for application attachments.

```elixir
Attachments.create_upload_for_client(ctx, client_id, attrs)
Attachments.create_client_upload(ctx, attrs)
Attachments.get_downloads(ctx, attachment_ids)
```

`get_downloads/2`:

* accepts one to fifty unique UUIDs;
* loads all rows in one business-scoped query;
* preserves request order;
* returns `{:error, :not_found}` if any id is missing or unauthorized;
* signs only after the full set passes authorization;
* returns `{:error, :storage_unavailable}` if signing fails.

Access uses current client visibility:

* client: every attachment belongs to the client resolved from
  `ctx.business_id + ctx.user_id`;
* business owner: every attachment belongs to `ctx.business_id`;
* trainer: every attachment's client is assigned to `ctx.coach_id`;
* malformed context or another tenant: denied as `:not_found`.

Reassignment follows chat visibility. A trainer loses attachment access after
the client is reassigned; the newly assigned trainer gains access to the
client's history. Business owners retain business-wide access.

`Easy.Storage` remains a signing implementation. It knows storage keys and
credentials, not users, clients, conversations, or forms. Controllers call one
`Attachments` function. JSON renderers serialize returned values and never
sign URLs.

### HTTP surface

Coach:

```text
POST /v1/coach/clients/:client_id/uploads
POST /v1/coach/attachments/download-urls
```

Client:

```text
POST /v1/client/uploads
POST /v1/client/attachments/download-urls
```

Upload request:

```json
{
  "content_type": "audio/webm",
  "byte_size": 482193,
  "duration_ms": 34120
}
```

Download request and response:

```json
{
  "attachment_ids": ["uuid-1", "uuid-2"]
}
```

```json
{
  "data": [
    {
      "id": "uuid-1",
      "download_url": "https://private-storage/...",
      "download_url_expires_at": "2026-07-12T10:10:00Z"
    }
  ]
}
```

URLs expire after ten minutes. Frontends request another batch after expiry.
No custom header, content negotiation, or redirect response changes this
behavior. Direct signed URLs preserve native image loading and audio/video
range requests; redirect-through-Phoenix does not work directly in media tags
because both apps use Bearer headers.

## Message model

`chat_messages` becomes a composable immutable record:

```text
chat_messages
  existing identity/sender fields
  body                text, nullable
  embed_type          text, nullable
  embed_id            uuid, nullable
  embed_snapshot      jsonb, nullable
```

`chat_message_attachments` stores message attachment ids with database
guarantees:

```text
chat_message_attachments
  id                  uuid PK
  business_id         uuid FK, non-null
  chat_message_id     uuid FK, non-null
  attachment_id       uuid FK, non-null
  position            integer, non-null
  inserted_at

unique(chat_message_id, attachment_id)
unique(chat_message_id, position)
index(business_id, chat_message_id)
```

Composite foreign keys `(chat_message_id, business_id)` and
`(attachment_id, business_id)` prevent cross-tenant links in Postgres, not only
in application validation.

The external `Chat` interface stays small:

```elixir
Chat.send_message(ctx, conversation_id, %{
  "body" => "Energy looks better this week.",
  "attachment_ids" => ["attachment-uuid"],
  "embed" => %{
    "type" => "form_submission",
    "id" => "submission-uuid"
  }
})

Chat.send_client_message(ctx, %{
  "body" => "Here is today's set.",
  "attachment_ids" => ["attachment-uuid"]
})
```

Coach messages accept text, attachments, and the supported embed. Client
messages accept text and attachments. Clients cannot create
`form_submission` embeds in this feature.

`Chat.send_message/3` and `Chat.send_client_message/2` atomically:

1. authorize the conversation;
2. normalize blank body to `nil`;
3. validate one to four distinct attachment ids against the same business and
   client;
4. resolve and authorize the optional embed;
5. generate the embed snapshot from backend data;
6. reject a message with no body, attachments, or embed;
7. insert the message and attachment links;
8. update the conversation timestamp and preview;
9. load the complete message shape;
10. commit, then broadcast the complete message.

Attachment ids remain reusable by other domains. The chat relation does not
change or claim the attachment row.

### Conversation preview

Preview selection:

1. non-blank body, truncated to 200 characters;
2. embed title, prefixed with `Shared`;
3. one attachment: `Photo`, `Video`, `Voice note`, or `Attachment`;
4. several attachments: `<count> attachments`.

## Embed model

The first resolver supports `form_submission`. The coach must already have
access to the conversation's client, and the submission must match the same
business and client.

Stored snapshot:

```json
{
  "form_assignment_id": "assignment-uuid",
  "title": "Weekly check-in",
  "submitted_at": "2026-07-12T08:30:00Z"
}
```

The request never accepts snapshot data. The backend constructs it from the
submission, assignment, and template. Message history remains readable if the
template name changes. The source id remains available for navigation while
the source exists.

Adding another embed type means adding one resolver inside `Easy.Chat`, its
typed OpenAPI schema, and its renderer. It does not add another conversation,
feedback table, or comment interface.

## Message contract

```json
{
  "id": "message-uuid",
  "conversation_id": "conversation-uuid",
  "sender_type": "coach",
  "sender_id": "coach-uuid",
  "body": "Energy looks better this week.",
  "attachments": [
    {
      "id": "attachment-uuid",
      "content_type": "image/jpeg",
      "byte_size": 234921,
      "duration_ms": null
    }
  ],
  "embed": {
    "type": "form_submission",
    "id": "submission-uuid",
    "snapshot": {
      "form_assignment_id": "assignment-uuid",
      "title": "Weekly check-in",
      "submitted_at": "2026-07-12T08:30:00Z"
    }
  },
  "inserted_at": "2026-07-12T09:00:00Z"
}
```

HTTP create responses, paginated message responses, and Phoenix
`message_new` events use this same shape. Realtime consumers do not perform a
second message fetch.

## Frontend behavior

Both composers support:

* image and short-video selection;
* native microphone recording with elapsed time, Stop, and Cancel;
* upload progress and local preview;
* removing an upload before send;
* Send disabled while an upload is active;
* retry or removal after upload failure;
* attachment-only messages;
* maximum four attachments.

Coach composer also renders one dismissible embed preview when entered from a
domain workflow. The check-in review action changes from query-prefilled text
to a message draft containing:

```text
body: empty
embed: form_submission/<submission id>
```

The coach writes feedback in the normal composer. Sending feedback does not
mark the submission reviewed; review state remains owned by `Easy.Forms`.

Message bubbles render:

* images inline;
* videos with native controls;
* voice notes with native audio controls and stored duration;
* embeds as compact context cards;
* text above or below the media according to each app's chat styling.

Conversation screens collect attachment ids from loaded messages and request
download URLs in batches of at most fifty. URLs live in component/query state,
not in persisted message data. Expired or failed URLs are refreshed through
the same batch interface.

Shared browser-only code belongs in `@easy/utils`:

* signed PUT with progress;
* MIME-to-media-kind mapping;
* `MediaRecorder` MIME selection and stream cleanup.

Coachapp and clientapp keep their visual composers and message bubbles local.

## Migration and compatibility

* Existing text messages remain valid after `body` becomes nullable.
* Existing attachment rows keep ids, tenant/client ownership, and storage
  keys; only `purpose` is removed.
* Existing check-in answers keep attachment id arrays.
* Check-in response attachments stop carrying signed read URLs. They carry
  metadata; coachapp obtains URLs through the download batch.
* Generated frontend clients change only through `just gen-api`.
* Restart `phx.server` before regeneration because OpenApiSpex caches the spec.

## Verification

Backend tests cover:

* attachment upload validation by MIME-specific size;
* client, owner, assigned-trainer, reassigned-trainer, and cross-tenant
  downloads;
* batch ordering, duplicate/empty/over-limit input, all-or-nothing failure,
  and storage failure;
* text-only, attachment-only, embed-only, and combined messages;
* wrong-client, wrong-business, unknown, duplicate, and over-limit attachment
  ids;
* coach-only form-submission embeds and immutable snapshots;
* complete HTTP and channel message shapes;
* check-in image validation without `purpose`.

Frontend verification covers coachapp and clientapp at 375 px and desktop:

* photo upload/send/render in both directions;
* video upload/send/play with seek;
* voice record/cancel/send/play;
* upload failure and retry/removal;
* attachment-only send;
* check-in feedback embed from review into chat;
* expired URL refresh;
* realtime receipt without duplication.

## Out of scope

* parallel review or feedback conversations;
* message pinning, replies, edit, delete, reactions, or rich text;
* multiple embeds in one message;
* client-authored domain embeds;
* PDF or arbitrary document UI;
* transcoding, compression, thumbnails, waveforms, or virus scanning;
* business-library attachments without a client;
* upload finalization and orphan cleanup;
* redirect or permanent download URLs.
