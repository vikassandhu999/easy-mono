# Rich chat attachments and embeds implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add generic private attachments, media and voice-note chat messages, and form-submission embeds to the single coach-client conversation.

**Architecture:** `Easy.Attachments` is the seam for upload metadata, actor authorization, and signed URL issuance. `Easy.Chat` accepts message content as text plus attachment ids plus one optional backend-resolved embed; Postgres stores attachment relations and immutable embed snapshots. Both React apps keep their visual chat implementations local and share browser media primitives through `@easy/utils`.

**Tech Stack:** Elixir/Phoenix/Ecto/Postgres, OpenApiSpex, private Tigris S3 storage, Phoenix Channels, React 19, RTK Query generated clients, HeroUI, browser `MediaRecorder`, `XMLHttpRequest` upload progress.

**Spec:** `docs/superpowers/specs/2026-07-12-rich-chat-attachments-embeds-design.md`

## Global constraints

* `backend/AGENTS.md` is authoritative: Ctx-first public functions, tenant-scoped queries, trusted ids outside `cast/3`, bare-atom or changeset errors, and `@spec` on public functions.
* `backend/lib/easy/chat/` and `backend/lib/easy/attachments/` contain Ecto schemas only. Context functions remain in `backend/lib/easy/chat.ex` and `backend/lib/easy/attachments.ex`.
* Every tenant-owned child row carries `business_id`; every read query scopes it.
* Storage keys never leave backend responses. JSON modules never call `Easy.Storage`.
* No new dependency. Use native `MediaRecorder`, `XMLHttpRequest`, and installed `@easy/utils`.
* Accepted images: JPEG, PNG, WebP, HEIC, max 15 MB. Videos: MP4, WebM, QuickTime, max 50 MB. Audio: WebM, MP4, MPEG, max 10 MB. Voice UI caps recording at 300,000 ms.
* Message body max is 4,000 characters. A message carries zero to four unique attachment ids and zero or one embed. At least one of body, attachments, or embed is required.
* Only coach messages accept `form_submission` embeds. The submission must match the conversation business and client. Snapshot data comes from the backend.
* Download batch accepts one to fifty unique ids, preserves order, and returns `:not_found` for the complete batch if any row is missing or unauthorized.
* Signed PUT URLs expire after 15 minutes; signed GET URLs expire after 10 minutes.
* OpenAPI changes require `just gen-api`; never edit either `generated.ts` manually. Restart `phx.server` before regeneration.
* Frontend UI must work at 375 px and 1280 px. Interactive targets remain at least 44 px. Upload errors are visible and retryable/removable.
* Before each commit, skim `docs/agents/recurring-mistakes.md`; run the narrowest listed checks.

---

### Task 1: Generalize attachment storage and add rich-message persistence

**Files:**
* Create: `backend/priv/repo/migrations/20260712100000_generalize_attachments_and_rich_chat.exs`
* Create: `backend/lib/easy/chat/message_attachment.ex`
* Modify: `backend/lib/easy/attachments/attachment.ex`
* Modify: `backend/lib/easy/chat/message.ex`
* Modify: `backend/test/support/factory.ex`
* Test: `backend/test/easy/attachments_test.exs`
* Test: `backend/test/easy/chat_test.exs`

**Interfaces:**
* Produces `Attachment.duration_ms`, generic MIME/size validation, and no `purpose` field.
* Produces `Message.embed_type`, `Message.embed_id`, `Message.embed_snapshot`, nullable `body`, and ordered `Message.attachments` through `Chat.MessageAttachment`.
* Later tasks rely on `Message.include_attachments/1` returning attachment rows ordered by link position.

- [ ] **Step 1: Add failing schema tests**

Extend `backend/test/easy/attachments_test.exs`:

```elixir
test "accepts generic media metadata without a purpose" do
  client = insert_client()

  assert {:ok, upload} =
           Attachments.create_client_upload(client_ctx(client), %{
             "content_type" => "audio/webm",
             "byte_size" => 1_024,
             "duration_ms" => 30_000
           })

  assert upload.attachment.duration_ms == 30_000
  refute Map.has_key?(Map.from_struct(upload.attachment), :purpose)
end
```

Extend the schema section of `backend/test/easy/chat_test.exs`:

```elixir
test "allows attachment-only and embed-only message bodies" do
  assert Message.insert_changeset("biz", "conv", :coach, "coach", nil, %{}).valid?

  assert Message.insert_changeset(
           "biz",
           "conv",
           :coach,
           "coach",
           %{type: :form_submission, id: Ecto.UUID.generate(), snapshot: %{"title" => "Weekly check-in"}},
           %{}
         ).valid?
end
```

- [ ] **Step 2: Run tests and confirm red state**

Run: `cd backend && mix test test/easy/attachments_test.exs test/easy/chat_test.exs`

Expected: FAIL because `duration_ms`, the six-argument message changeset, and message attachment relation do not exist.

- [ ] **Step 3: Add the migration**

Create `backend/priv/repo/migrations/20260712100000_generalize_attachments_and_rich_chat.exs`:

```elixir
defmodule Easy.Repo.Migrations.GeneralizeAttachmentsAndRichChat do
  use Ecto.Migration

  def up do
    drop constraint(:attachments, :attachments_purpose_check)

    alter table(:attachments) do
      remove :purpose
      add :duration_ms, :integer
    end

    create constraint(:attachments, :attachments_duration_ms_check,
             check: "duration_ms IS NULL OR duration_ms BETWEEN 1 AND 300000"
           )

    create unique_index(:attachments, [:id, :business_id])

    alter table(:chat_messages) do
      modify :body, :text, null: true
      add :embed_type, :string
      add :embed_id, :binary_id
      add :embed_snapshot, :map
    end

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check: "embed_type IS NULL OR embed_type = 'form_submission'"
           )

    create constraint(:chat_messages, :chat_messages_embed_complete_check,
             check: "(embed_type IS NULL AND embed_id IS NULL AND embed_snapshot IS NULL) OR " <>
                      "(embed_type IS NOT NULL AND embed_id IS NOT NULL AND embed_snapshot IS NOT NULL)"
           )

    create unique_index(:chat_messages, [:id, :business_id])

    create table(:chat_message_attachments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false

      add :chat_message_id,
          references(:chat_messages,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :chat_message_attachments_message_business_id_fkey
          ),
          null: false

      add :attachment_id,
          references(:attachments,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :chat_message_attachments_attachment_business_id_fkey
          ),
          null: false

      add :position, :integer, null: false
      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:chat_message_attachments, [:chat_message_id, :attachment_id])
    create unique_index(:chat_message_attachments, [:chat_message_id, :position])
    create index(:chat_message_attachments, [:business_id, :chat_message_id])
  end

  def down do
    drop table(:chat_message_attachments)
    drop unique_index(:chat_messages, [:id, :business_id])
    drop unique_index(:attachments, [:id, :business_id])
    drop constraint(:chat_messages, :chat_messages_embed_complete_check)
    drop constraint(:chat_messages, :chat_messages_embed_type_check)

    execute("UPDATE chat_messages SET body = '' WHERE body IS NULL")

    alter table(:chat_messages) do
      remove :embed_snapshot
      remove :embed_id
      remove :embed_type
      modify :body, :text, null: false
    end

    drop constraint(:attachments, :attachments_duration_ms_check)

    alter table(:attachments) do
      remove :duration_ms
      add :purpose, :string, null: false, default: "check_in_photo"
    end

    create constraint(:attachments, :attachments_purpose_check,
             check: "purpose = 'check_in_photo'"
           )
  end
end
```

- [ ] **Step 4: Update schemas and factories**

In `Attachment`, cast `:duration_ms`, remove `:purpose`, expose MIME lists and size lookup:

```elixir
@image_content_types ~w(image/jpeg image/png image/webp image/heic)
@video_content_types ~w(video/mp4 video/webm video/quicktime)
@audio_content_types ~w(audio/webm audio/mp4 audio/mpeg)

@spec content_types() :: [String.t()]
def content_types, do: @image_content_types ++ @video_content_types ++ @audio_content_types

@spec image_content_types() :: [String.t()]
def image_content_types, do: @image_content_types

@spec max_byte_size(String.t()) :: pos_integer() | nil
def max_byte_size(type) when type in @image_content_types, do: 15 * 1024 * 1024
def max_byte_size(type) when type in @video_content_types, do: 50 * 1024 * 1024
def max_byte_size(type) when type in @audio_content_types, do: 10 * 1024 * 1024
def max_byte_size(_type), do: nil
```

Validate byte size using `validate_change/3`; validate duration with
`validate_number(:duration_ms, greater_than: 0, less_than_or_equal_to: 300_000)`.

Create `Easy.Chat.MessageAttachment` with trusted-id `insert_changeset/4` and
`for_messages/3`. Add `many_to_many :attachments` to `Message`, the embed
fields, and `include_attachments/1`. Change message insertion interface to:

```elixir
@spec insert_changeset(String.t(), String.t(), :coach | :client, String.t(), map() | nil, map()) ::
        Ecto.Changeset.t()
def insert_changeset(business_id, conversation_id, sender_type, sender_id, embed, attrs)
```

Only `body` is cast. Embed fields come from the trusted `embed` argument.
Normalize blank body before this function in `Easy.Chat`.

Update `attachment_factory` to remove `purpose` and add `duration_ms: nil`.
Add `chat_message_attachment_factory` using the message and attachment's shared
business/client fixtures.

- [ ] **Step 5: Run migration and schema tests**

Run: `cd backend && mix ecto.migrate && mix test test/easy/attachments_test.exs test/easy/chat_test.exs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/priv/repo/migrations/20260712100000_generalize_attachments_and_rich_chat.exs \
  backend/lib/easy/attachments/attachment.ex backend/lib/easy/chat/message.ex \
  backend/lib/easy/chat/message_attachment.ex backend/test/support/factory.ex \
  backend/test/easy/attachments_test.exs backend/test/easy/chat_test.exs
git commit -m "feat(backend): generalize attachments and rich messages"
```

---

### Task 2: Deepen the attachment interface and centralize access

**Files:**
* Modify: `backend/lib/easy/attachments.ex`
* Modify: `backend/lib/easy_web/controllers/fallback_controller.ex`
* Test: `backend/test/easy/attachments_test.exs`

**Interfaces:**
* Produces `create_upload_for_client/3`, updated `create_client_upload/2`, and `get_downloads/2`.
* `get_downloads/2` returns `{:ok, [%{id: id, download_url: url, download_url_expires_at: DateTime.t()}]}` in request order.
* Later controllers call these functions directly; no other module signs attachment URLs.

- [ ] **Step 1: Write failing access tests**

Add tests for client self, owner, assigned trainer, unassigned trainer,
cross-tenant rows, ordering, duplicate ids, empty ids, 51 ids, missing ids, and
storage failure. Representative assertions:

```elixir
assert {:ok, downloads} = Attachments.get_downloads(client_ctx(client), [second.id, first.id])
assert Enum.map(downloads, & &1.id) == [second.id, first.id]
assert Enum.all?(downloads, &(&1.download_url =~ "storage.example.test/easy-test/"))

assert {:error, :not_found} = Attachments.get_downloads(trainer_ctx(unassigned), [first.id])
assert {:error, :invalid_attachments} = Attachments.get_downloads(client_ctx(client), [])
assert {:error, :invalid_attachments} = Attachments.get_downloads(client_ctx(client), [first.id, first.id])
```

- [ ] **Step 2: Run focused tests and confirm red state**

Run: `cd backend && mix test test/easy/attachments_test.exs`

Expected: FAIL because `get_downloads/2` and coach upload do not exist.

- [ ] **Step 3: Implement upload paths**

Keep one private insertion/signing path. Public functions resolve actor and
target first:

```elixir
@spec create_upload_for_client(Ctx.t(), String.t(), map()) :: upload_result()
def create_upload_for_client(%Ctx{} = ctx, client_id, attrs) do
  with :ok <- Clients.authorize_client_id(ctx, client_id),
       {:ok, coach} <- get_coach(ctx) do
    create_upload_transaction(ctx.business_id, client_id, :coach, coach.id, attrs)
  end
end

@spec create_client_upload(Ctx.t(), map()) :: upload_result()
def create_client_upload(%Ctx{} = ctx, attrs) do
  with {:ok, client} <- get_client(ctx) do
    create_upload_transaction(ctx.business_id, client.id, :client, client.id, attrs)
  end
end
```

Normalize attrs before adding the neutral storage key. Remove all purpose
handling. Extend content-type-to-extension mapping for approved video/audio
types.

- [ ] **Step 4: Implement batched authorization and signing**

Add:

```elixir
@spec get_downloads(Ctx.t(), [String.t()]) ::
        {:ok, [map()]} | {:error, :invalid_attachments | :not_found | :storage_unavailable}
def get_downloads(%Ctx{} = ctx, ids) do
  with :ok <- validate_download_ids(ids),
       attachments <- load_ordered_attachments(ctx.business_id, ids),
       :ok <- require_complete_set(attachments, ids),
       :ok <- authorize_attachments(ctx, attachments) do
    sign_downloads(attachments)
  end
end
```

Use one query with `Attachment.for_business/2` and `Attachment.with_ids/2`.
Authorize owner directly, trainer through one visible-client query, and client
through the client resolved from `ctx.user_id`. Fail closed when neither actor
shape resolves. Sign only after the whole set passes.

Change fallback copy from "Photo storage" to "File storage" and map
`:invalid_attachments` to a 422 attachment field error.

- [ ] **Step 5: Run focused tests and backend checks**

Run:

```bash
cd backend
mix test test/easy/attachments_test.exs
mix format --check-formatted
mix credo --strict
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy/attachments.ex backend/lib/easy_web/controllers/fallback_controller.ex \
  backend/test/easy/attachments_test.exs
git commit -m "feat(attachments): centralize access and downloads"
```

---

### Task 3: Publish upload and download contracts for both actors

**Files:**
* Create: `backend/lib/easy_web/open_api/schemas/attachments.ex`
* Create: `backend/lib/easy_web/controllers/coaches/upload_controller.ex`
* Create: `backend/lib/easy_web/controllers/coaches/upload_json.ex`
* Modify: `backend/lib/easy_web/controllers/clients/upload_controller.ex`
* Modify: `backend/lib/easy_web/controllers/clients/upload_json.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Modify: `backend/lib/easy_web/router.ex`
* Test: `backend/test/easy_web/controllers/coaches/upload_controller_test.exs`
* Test: `backend/test/easy_web/controllers/clients/upload_controller_test.exs`

**Interfaces:**
* Produces generated operations `createCoachClientUpload`, `getCoachAttachmentDownloadUrls`, `createClientUpload`, and `getClientAttachmentDownloadUrls`.
* Upload request fields: `content_type`, `byte_size`, nullable `duration_ms`.
* Download request field: `attachment_ids`; response carries id, URL, and expiry.

- [ ] **Step 1: Write failing controller tests**

Coach tests authenticate owner and trainer, create upload for an authorized
client, reject an unassigned client, and fetch two URLs in input order. Update
client tests to omit `purpose`, accept audio metadata, and test download URLs:

```elixir
conn =
  post(conn, "/v1/client/attachments/download-urls", %{
    "attachment_ids" => [second.id, first.id]
  })

assert %{"data" => [second_download, first_download]} = json_response(conn, 200)
assert second_download["id"] == second.id
assert first_download["id"] == first.id
refute Map.has_key?(second_download, "storage_key")
```

- [ ] **Step 2: Run controller tests and confirm red state**

Run: `cd backend && mix test test/easy_web/controllers/coaches/upload_controller_test.exs test/easy_web/controllers/clients/upload_controller_test.exs`

Expected: FAIL because coach routes and download operations do not exist.

- [ ] **Step 3: Define OpenAPI schemas**

Move upload schemas out of `client_profile.ex` and define generic schemas in
`attachments.ex`:

```elixir
AttachmentUploadRequest
AttachmentUpload
AttachmentUploadResponse
AttachmentDownloadRequest
AttachmentDownload
AttachmentDownloadsResponse
ChatAttachment
```

`AttachmentDownloadRequest` uses `minItems: 1`, `maxItems: 50`, and
`uniqueItems: true`. Set request schemas `struct?: false`. `ChatAttachment`
contains only `id`, `content_type`, `byte_size`, and nullable `duration_ms`.

- [ ] **Step 4: Add thin controllers, JSON, and routes**

Coach actions:

```elixir
def create(conn, _params) do
  client_id = conn.path_params["client_id"]

  with {:ok, upload} <- Attachments.create_upload_for_client(conn.assigns.ctx, client_id, conn.body_params) do
    conn |> put_status(:created) |> render(:show, upload: upload)
  end
end

def download_urls(conn, _params) do
  with {:ok, downloads} <- Attachments.get_downloads(conn.assigns.ctx, conn.body_params.attachment_ids) do
    render(conn, :downloads, downloads: downloads)
  end
end
```

Use map access matching actual `CastAndValidate` output (`conn.body_params` is
atom-keyed). Client controller uses the same download action and its existing
create action. Both JSON modules serialize identical safe shapes.

Add routes:

```elixir
post "/clients/:client_id/uploads", UploadController, :create
post "/attachments/download-urls", UploadController, :download_urls
```

under coach, and:

```elixir
post "/attachments/download-urls", UploadController, :download_urls
```

under client.

- [ ] **Step 5: Run contract tests**

Run:

```bash
cd backend
mix test test/easy_web/controllers/coaches/upload_controller_test.exs \
  test/easy_web/controllers/clients/upload_controller_test.exs \
  test/easy_web/controllers/open_api_route_coverage_test.exs
mix format --check-formatted
```

Expected: PASS and both write routes covered by controller-local
`CastAndValidate`.

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy_web/open_api/schemas/attachments.ex \
  backend/lib/easy_web/open_api/schemas/client_profile.ex backend/lib/easy_web/router.ex \
  backend/lib/easy_web/controllers/coaches/upload_controller.ex \
  backend/lib/easy_web/controllers/coaches/upload_json.ex \
  backend/lib/easy_web/controllers/clients/upload_controller.ex \
  backend/lib/easy_web/controllers/clients/upload_json.ex \
  backend/test/easy_web/controllers/coaches/upload_controller_test.exs \
  backend/test/easy_web/controllers/clients/upload_controller_test.exs
git commit -m "feat(api): expose private attachment URLs"
```

---

### Task 4: Compose rich messages and form-submission embeds

**Files:**
* Modify: `backend/lib/easy/chat.ex`
* Modify: `backend/lib/easy/chat/message.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/chat.ex`
* Modify: `backend/lib/easy_web/controllers/coaches/conversation_controller.ex`
* Modify: `backend/lib/easy_web/controllers/coaches/conversation_json.ex`
* Modify: `backend/lib/easy_web/controllers/clients/conversation_controller.ex`
* Modify: `backend/lib/easy_web/controllers/clients/conversation_json.ex`
* Modify: `backend/lib/easy_web/channels/conversation_channel.ex`
* Test: `backend/test/easy/chat_test.exs`
* Test: `backend/test/easy_web/controllers/coaches/conversation_controller_test.exs`
* Test: `backend/test/easy_web/controllers/clients/conversation_controller_test.exs`
* Test: `backend/test/easy_web/channels/conversation_channel_test.exs`

**Interfaces:**
* Coach request: nullable `body`, `attachment_ids`, nullable `{type: form_submission, id}` embed.
* Client request: nullable `body`, `attachment_ids`; no embed property.
* Every message response/event includes `attachments: []` and nullable `embed`.

- [ ] **Step 1: Write failing context tests**

Cover text-only, attachment-only, embed-only, combined content, blank content,
duplicate/unknown/cross-client/cross-business/over-limit attachments,
coach-only form-submission embeds, immutable snapshot fields, preview fallback,
pagination preloads, and broadcast shape. Representative test:

```elixir
assert {:ok, message} =
         Chat.send_message(coach_ctx(coach), conversation.id, %{
           "body" => "Energy improved.",
           "attachment_ids" => [attachment.id],
           "embed" => %{"type" => "form_submission", "id" => submission.id}
         })

assert Enum.map(message.attachments, & &1.id) == [attachment.id]
assert message.embed_type == :form_submission
assert message.embed_id == submission.id
assert message.embed_snapshot["title"] == submission.form_assignment.form_template.name
```

- [ ] **Step 2: Run context tests and confirm red state**

Run: `cd backend && mix test test/easy/chat_test.exs`

Expected: FAIL because message composition and embed resolution do not exist.

- [ ] **Step 3: Implement one transactional composition path**

Both actor functions resolve actor/conversation, then call one private function:

```elixir
insert_message(ctx, conversation, sender_type, sender_id, attrs, embed_policy)
```

Inside it:

* trim body and convert `""` to `nil`;
* read distinct attachment ids from validated attrs;
* load attachments by business/client and require exact count;
* resolve coach embed through `FormSubmission` joined/preloaded with assignment
  and template; reject embeds in client sends;
* reject no-content as an `Ecto.Changeset` body error;
* insert message and ordered `MessageAttachment` rows inside one transaction;
* calculate preview using body, embed title, or attachment MIME kind;
* reload through `Message.include_attachments/1` before returning;
* broadcast only after commit.

Use `Repo.rollback(changeset | :not_found)` for expected failures. Do not call
`Attachments.get_downloads/2` while sending; message responses carry metadata,
not signed URLs.

- [ ] **Step 4: Update HTTP and realtime contracts**

Split request schemas into `CoachChatMessageCreateRequest` and
`ClientChatMessageCreateRequest`. Add:

```elixir
ChatMessageEmbedRequest
FormSubmissionEmbedSnapshot
ChatMessageEmbed
```

`ChatMessage.body` becomes nullable; `attachments` is required and defaults to
an empty list; `embed` is required but nullable. Both JSON modules render the
same fields. Extract shared pure rendering into
`EasyWeb.OpenApi.Schemas` only if required by OpenApiSpex; do not add a runtime
rendering abstraction for two short functions.

Channel continues using `ConversationJSON.message_data(message)`, so the event
inherits the complete HTTP shape.

- [ ] **Step 5: Add controller and channel assertions**

Assert exact attachment metadata and embed snapshot values on create, list,
and `message_new`. Assert client request with `embed` returns 422 due to
`additionalProperties: false`.

Run:

```bash
cd backend
mix test test/easy/chat_test.exs \
  test/easy_web/controllers/coaches/conversation_controller_test.exs \
  test/easy_web/controllers/clients/conversation_controller_test.exs \
  test/easy_web/channels/conversation_channel_test.exs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy/chat.ex backend/lib/easy/chat/message.ex \
  backend/lib/easy_web/open_api/schemas/chat.ex \
  backend/lib/easy_web/controllers/coaches/conversation_controller.ex \
  backend/lib/easy_web/controllers/coaches/conversation_json.ex \
  backend/lib/easy_web/controllers/clients/conversation_controller.ex \
  backend/lib/easy_web/controllers/clients/conversation_json.ex \
  backend/lib/easy_web/channels/conversation_channel.ex backend/test/easy/chat_test.exs \
  backend/test/easy_web/controllers/coaches/conversation_controller_test.exs \
  backend/test/easy_web/controllers/clients/conversation_controller_test.exs \
  backend/test/easy_web/channels/conversation_channel_test.exs
git commit -m "feat(chat): compose attachments and embeds"
```

---

### Task 5: Move check-in reads onto the attachment seam

**Files:**
* Modify: `backend/lib/easy/forms.ex`
* Modify: `backend/lib/easy/forms/form_submission.ex`
* Modify: `backend/lib/easy_web/controllers/coaches/form_assignment_json.ex`
* Modify: `backend/lib/easy_web/controllers/clients/form_assignment_json.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Create: `backend/lib/easy_web/controllers/attachment_json.ex`
* Test: `backend/test/easy/forms_test.exs`
* Test: relevant coach/client form-assignment controller tests under `backend/test/easy_web/controllers/`

**Interfaces:**
* Submission attachments contain metadata only: id, content type, byte size, duration.
* Check-in validation accepts owned image attachments and rejects non-image media.
* `EasyWeb.AttachmentJSON.data/1` is the one safe attachment serializer used by forms and chat JSON modules.

- [ ] **Step 1: Change tests before implementation**

Replace signed-URL assertions with metadata assertions and add rejection for
owned `audio/webm` in a photo answer:

```elixir
assert Enum.map(submission.attachments, & &1.id) == ids
refute inspect(submission.attachments) =~ "storage_key"

assert {:error, :invalid_answer_values} =
         Forms.submit_client_form_assignment(client_ctx(client), assignment.id, %{
           "answers" => %{"photos" => [audio.id]}
         })
```

- [ ] **Step 2: Remove purpose and signing from Forms**

Delete `Attachment.for_purpose/2` usage and `Storage.presign_get/1` calls.
Validate attachments by business, client, ids, and
`content_type in Attachment.image_content_types()`. Populate the virtual
attachment list with rows, not maps containing URLs.

Create:

```elixir
defmodule EasyWeb.AttachmentJSON do
  alias Easy.Attachments.Attachment

  @spec data(Attachment.t()) :: map()
  def data(%Attachment{} = attachment) do
    %{
      id: attachment.id,
      content_type: attachment.content_type,
      byte_size: attachment.byte_size,
      duration_ms: attachment.duration_ms
    }
  end
end
```

Use it in coach/client form JSON and coach/client conversation JSON. Update
OpenAPI submission attachment schema to match `ChatAttachment`; reuse the
schema module rather than duplicating properties.

- [ ] **Step 3: Run focused backend tests**

Run:

```bash
cd backend
mix test test/easy/forms_test.exs test/easy_web/controllers/coaches/form_assignment_controller_test.exs \
  test/easy_web/controllers/clients/form_assignment_controller_test.exs
mix format --check-formatted
```

Expected: PASS; no `presign_get` remains in Forms or JSON modules:

```bash
rg "presign_get" lib/easy/forms.ex lib/easy_web/controllers
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add backend/lib/easy/forms.ex backend/lib/easy/forms/form_submission.ex \
  backend/lib/easy_web/controllers/attachment_json.ex \
  backend/lib/easy_web/controllers/coaches/form_assignment_json.ex \
  backend/lib/easy_web/controllers/clients/form_assignment_json.ex \
  backend/lib/easy_web/controllers/coaches/conversation_json.ex \
  backend/lib/easy_web/controllers/clients/conversation_json.ex \
  backend/lib/easy_web/open_api/schemas/client_profile.ex backend/test/easy/forms_test.exs \
  backend/test/easy_web/controllers/coaches/form_assignment_controller_test.exs \
  backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs
git commit -m "refactor(forms): read files through attachments"
```

---

### Task 6: Add shared browser media primitives

**Files:**
* Create: `frontend/packages/utils/src/media.ts`
* Modify: `frontend/packages/utils/src/index.ts`
* Modify: `frontend/apps/clientapp-v2/src/api/uploads.ts`

**Interfaces:**
* Produces `putFileToSignedUrl`, `mediaKind`, `voiceRecordingMimeType`, and `startVoiceRecording` from `@easy/utils`.
* `startVoiceRecording()` returns `{mimeType, stop(): Promise<File>, cancel(): void}` and always stops microphone tracks.
* Regenerates both frontend clients once so Tasks 7 and 8 compile against the backend contract.

- [ ] **Step 1: Regenerate frontend contracts**

Fully restart `phx.server`, then run:

```bash
just gen-api
```

Expected: `frontend/openapi/easy-openapi.json` and both generated clients
contain the four attachment operations plus rich chat request/response types.

- [ ] **Step 2: Create MIME and upload primitives**

Create constants matching backend MIME lists and:

```typescript
export type MediaKind = 'audio' | 'file' | 'image' | 'video';

export function mediaKind(contentType: string): MediaKind {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'file';
}

export function voiceRecordingMimeType(): 'audio/mp4' | 'audio/webm' | null {
  if (typeof MediaRecorder === 'undefined') return null;
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return null;
}
```

Move `putFileToSignedUrl` unchanged from clientapp. Implement
`startVoiceRecording` with `getUserMedia({audio: true})`, chunk collection,
`stop()` resolving a named `File`, and `cancel()` discarding chunks. Both paths
stop every `MediaStreamTrack`; recorder errors reject `stop()`. Frontend has no
test runner, so Task 9's live record/cancel/stop checks are the runnable check
for MediaRecorder lifecycle behavior.

- [ ] **Step 3: Export and switch clientapp import**

Export `./media` from `frontend/packages/utils/src/index.ts`. Remove the local
XHR implementation from `clientapp-v2/src/api/uploads.ts` and import
`putFileToSignedUrl` from `@easy/utils` in `photo-answer-field.tsx`.

- [ ] **Step 4: Verify package and existing check-in build**

Run:

```bash
cd frontend
pnpm -C packages/utils build
pnpm -C apps/clientapp-v2 build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/openapi/easy-openapi.json frontend/apps/coachapp-v2/src/api/generated.ts \
  frontend/apps/clientapp-v2/src/api/generated.ts \
  frontend/packages/utils/src/media.ts frontend/packages/utils/src/index.ts \
  frontend/apps/clientapp-v2/src/api/uploads.ts \
  frontend/apps/clientapp-v2/src/checkins/photo-answer-field.tsx
git commit -m "feat(frontend): share private media helpers"
```

---

### Task 7: Add coach media composer, rendering, URL refresh, and feedback embed

**Files:**
* Create: `frontend/apps/coachapp-v2/src/api/attachments.ts`
* Create: `frontend/apps/coachapp-v2/src/messages/attachment-composer.tsx`
* Create: `frontend/apps/coachapp-v2/src/messages/message-attachments.tsx`
* Create: `frontend/apps/coachapp-v2/src/messages/message-embed.tsx`
* Create: `frontend/apps/coachapp-v2/src/messages/use-attachment-download-urls.ts`
* Modify: `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`
* Modify: `frontend/apps/coachapp-v2/src/messages/client-conversation.tsx`
* Modify: `frontend/apps/coachapp-v2/src/messages/conversation-page.tsx`
* Modify: `frontend/apps/coachapp-v2/src/checkins/review-checkin.tsx`
* Modify: `frontend/apps/coachapp-v2/src/checkins/review-answers.tsx`

**Interfaces:**
* `ConversationView` gains `clientId` and nullable `initialEmbed` props.
* Attachment composer emits uploaded ids and local pending state; it never emits an id before PUT succeeds.
* Download hook accepts metadata ids, chunks by fifty, and returns URL lookup plus `refresh(ids)`.

- [ ] **Step 1: Add generated-hook wrappers**

Create `api/attachments.ts` from Task 6's generated operations, exporting coach
upload/download hooks and generated types. Do not define duplicate response
shapes.

Implement `useAttachmentDownloadUrls(ids)` with the generated download
mutation. Deduplicate ids, split with `slice(index, index + 50)`, merge results
by id, and refresh URLs whose expiry is within sixty seconds. Clear URLs when
ids disappear.

- [ ] **Step 2: Build upload and recording composer**

`attachment-composer.tsx` owns selected-file inputs, upload progress, local
object URLs, voice state, five-minute timer, Stop, Cancel, retry, and remove.
It accepts:

```typescript
type AttachmentComposerProps = {
  clientId: string;
  disabled: boolean;
  onChange: (state: {attachmentIds: string[]; busy: boolean; failed: boolean}) => void;
};
```

Use `putFileToSignedUrl`, `startVoiceRecording`, generated upload mutation,
and backend-matching MIME/size constants. Revoke every object URL on remove and
unmount. Keep camera/library and microphone controls at least 44 px.

- [ ] **Step 3: Render attachments and embeds**

`message-attachments.tsx` maps `mediaKind` to `<img>`, `<video controls>`, or
`<audio controls>`. On media error, call `refresh([attachment.id])` once before
showing a compact unavailable state.

`message-embed.tsx` renders `form_submission` snapshot title and submitted
date as a compact card. Coach link uses
`ROUTES.CHECKIN_REVIEW.replace(':id', embed.id)`; snapshot remains visible if
navigation later returns not found.

- [ ] **Step 4: Compose rich send requests**

In `ConversationView`, hold uploaded ids and optional embed. Send when any
content exists:

```typescript
await sendMessage({
  id: conversationId,
  coachChatMessageCreateRequest: {
    ...(trimmed && {body: trimmed}),
    attachment_ids: attachmentIds,
    ...(embed && {embed}),
  },
}).unwrap();
```

Use the exact generated argument name after regeneration. Disable Send during
uploads, failed uploads, or send mutation. Clear body, attachment state, and
embed only after success. Pass `clientId` from both conversation entry points.

- [ ] **Step 5: Replace check-in text prefill with embed draft**

`review-checkin.tsx` navigates with:

```typescript
new URLSearchParams({embed_type: 'form_submission', embed_id: item.id})
```

`client-conversation.tsx` validates those exact params and passes:

```typescript
{type: 'form_submission', id: embedId}
```

as `initialEmbed`. Remove the `prefill` query path. Sending feedback remains
independent of `reviewFormSubmission`.

- [ ] **Step 6: Move check-in photo reads to batch URLs**

Collect attachment ids in `ReviewAnswers`, call the shared coach download hook,
and render thumbnails/links from its lookup. No generated submission type
contains `read_url` after regeneration.

- [ ] **Step 7: Run coach checks**

Run:

```bash
cd frontend
pnpm biome check apps/coachapp-v2/src/api/attachments.ts \
  apps/coachapp-v2/src/messages apps/coachapp-v2/src/checkins/review-checkin.tsx \
  apps/coachapp-v2/src/checkins/review-answers.tsx
pnpm -C apps/coachapp-v2 build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/apps/coachapp-v2/src/api/attachments.ts \
  frontend/apps/coachapp-v2/src/messages frontend/apps/coachapp-v2/src/checkins/review-checkin.tsx \
  frontend/apps/coachapp-v2/src/checkins/review-answers.tsx
git commit -m "feat(coachapp): send media and embedded feedback"
```

---

### Task 8: Add client media composer and rendering

**Files:**
* Create: `frontend/apps/clientapp-v2/src/messages/attachment-composer.tsx`
* Create: `frontend/apps/clientapp-v2/src/messages/message-attachments.tsx`
* Create: `frontend/apps/clientapp-v2/src/messages/message-embed.tsx`
* Create: `frontend/apps/clientapp-v2/src/messages/use-attachment-download-urls.ts`
* Modify: `frontend/apps/clientapp-v2/src/api/uploads.ts`
* Modify: `frontend/apps/clientapp-v2/src/messages/coach-chat.tsx`

**Interfaces:**
* Client composer matches coach upload/recording behavior but uses the client upload operation and accepts no embed draft.
* Client message renderer displays coach embeds read-only and links form submissions through the snapshot's `form_assignment_id`.

- [ ] **Step 1: Export client upload/download hooks**

Update `api/uploads.ts` to export generated `createClientUpload` and
`getClientAttachmentDownloadUrls` hooks/types. Keep upload transport in
`@easy/utils`.

- [ ] **Step 2: Implement client composer and URL hook**

Use the same state contract, limits, URL chunking, expiry refresh, object URL
cleanup, recorder cleanup, and media-error retry as Task 7. Client upload
request has no `clientId` path argument.

Keep code local because generated hook signatures and visual composition differ
between apps. Do not create a shared React chat package.

- [ ] **Step 3: Compose client message requests**

Send:

```typescript
await sendMessage({
  clientChatMessageCreateRequest: {
    ...(trimmed && {body: trimmed}),
    attachment_ids: attachmentIds,
  },
}).unwrap();
```

Use exact generated names. Support attachment-only messages. Clear draft only
after successful response append.

- [ ] **Step 4: Render received coach embeds**

Render embed snapshot inside the normal message bubble. Link
`form_submission` to:

```typescript
ROUTES.CHECKIN_FILL.replace(':id', embed.snapshot.form_assignment_id)
```

The client page is read-only for completed assignments; if the route rejects a
completed item, render snapshot without a link instead of adding a new review
screen.

- [ ] **Step 5: Run client checks**

Run:

```bash
cd frontend
pnpm biome check apps/clientapp-v2/src/api/uploads.ts apps/clientapp-v2/src/messages
pnpm -C apps/clientapp-v2 build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/apps/clientapp-v2/src/api/uploads.ts frontend/apps/clientapp-v2/src/messages
git commit -m "feat(clientapp): send and play chat media"
```

---

### Task 9: Regenerate contracts and verify the complete flow

**Files:**
* Generated: `frontend/openapi/easy-openapi.json`
* Generated: `frontend/apps/coachapp-v2/src/api/generated.ts`
* Generated: `frontend/apps/clientapp-v2/src/api/generated.ts`
* Review: `docs/agents/recurring-mistakes.md`
* Modify only if a repeatable new violation is found: `docs/agents/recurring-mistakes.md` and its mechanical check.

**Interfaces:**
* Confirms generated names used in Tasks 7 and 8 and the identical HTTP/channel message shape.
* Produces no handwritten generated-client edits.

- [ ] **Step 1: Restart backend and regenerate**

Stop the running `phx.server`, restart it, then run:

```bash
just gen-api
```

Expected: OpenAPI dump and both RTK clients regenerate. The documented final
Biome noise on generated files may appear; no OpenApiSpex schema or route error
may remain.

- [ ] **Step 2: Confirm generated surface**

Run:

```bash
rg "createCoachClientUpload|getCoachAttachmentDownloadUrls|createClientUpload|getClientAttachmentDownloadUrls" \
  frontend/apps/*/src/api/generated.ts
rg "attachment_ids|attachments|embed|duration_ms" frontend/apps/*/src/api/generated.ts
```

Expected: operations and fields exist in the correct actor clients.

- [ ] **Step 3: Run backend gates**

Run:

```bash
cd backend
mix test test/easy/attachments_test.exs test/easy/chat_test.exs test/easy/forms_test.exs
mix precommit
```

Expected: PASS, zero failures and warnings.

- [ ] **Step 4: Run frontend gates**

Run:

```bash
cd frontend
pnpm -C packages/utils build
pnpm -C apps/coachapp-v2 build
pnpm -C apps/clientapp-v2 build
pnpm biome check apps/coachapp-v2/src/messages apps/clientapp-v2/src/messages \
  apps/coachapp-v2/src/checkins/review-checkin.tsx apps/coachapp-v2/src/checkins/review-answers.tsx \
  packages/utils/src/media.ts
cd ..
just check-rm
```

Expected: PASS. Review any Biome writes before continuing.

- [ ] **Step 5: Verify migration rollback and reapply**

Run against the test database:

```bash
cd backend
MIX_ENV=test mix ecto.rollback --step 1
MIX_ENV=test mix ecto.migrate
mix test test/easy/attachments_test.exs test/easy/chat_test.exs
```

Expected: rollback, reapply, and tests PASS.

- [ ] **Step 6: Exercise live flows**

Run `just dev`. Verify at 375 px and 1280 px:

1. Client sends photo; coach receives realtime and opens it.
2. Coach sends video; client receives, plays, and seeks.
3. Each actor records, cancels, records again, sends, and plays a voice note.
4. Upload failure leaves draft visible and retryable/removable; no message is created.
5. Attachment-only message sends.
6. Coach opens check-in review, chooses Reply in chat, sees embed draft, writes feedback, sends, and does not mark review automatically.
7. Client receives feedback with check-in embed in the same conversation.
8. Force URL expiry or replace cached expiry with a past value; media refreshes through download batch.
9. Realtime echo does not duplicate sender messages.
10. Reassign client; former trainer download request returns 404, assigned trainer succeeds.

- [ ] **Step 7: Commit generated output and verification fixes**

```bash
git add frontend/openapi/easy-openapi.json frontend/apps/coachapp-v2/src/api/generated.ts \
  frontend/apps/clientapp-v2/src/api/generated.ts
git commit -m "chore: verify rich chat attachments"
```

Do not include unrelated dirty-worktree files in this commit.
