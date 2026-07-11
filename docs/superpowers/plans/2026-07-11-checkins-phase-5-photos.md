# Check-ins Phase 5: Photo attachments implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task.

**Goal:** Let clients securely upload progress photos inside check-ins and let coaches view those photos during review, using private Tigris object storage without proxying file bytes through Phoenix.

**Architecture:** Attachment metadata is tenant/client-scoped in Postgres; bytes live in a private Tigris bucket. The backend issues short-lived AWS Signature V4 URLs for raw PUT and GET requests using OTP `:crypto`, with no new package dependency. A photo answer stores up to four attachment ids. Submission validation checks shape plus ownership, then submission JSON includes metadata and fresh read URLs so the coach UI never receives storage keys or credentials.

**Tech stack:** Elixir/Phoenix/Ecto/Postgres, OpenApiSpex, OTP `:crypto`, Tigris S3 compatibility, React 19, RTK Query, HeroUI v3, `XMLHttpRequest` upload progress.

## Global constraints

* `backend/AGENTS.md` remains authoritative: Ctx-first public functions, tenant-scoped query builders, bare-atom domain errors, no Repo calls in controllers/views, and `@spec` on public functions.
* Tigris/Fly configuration uses `BUCKET_NAME`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`. Region defaults to `auto`; the endpoint defaults to the current canonical `https://t3.storage.dev` outside production.
* Production boot fails loudly when any storage credential is missing. Dev/test use inert deterministic credentials and never contact storage during automated tests.
* Buckets remain private. Stored rows contain `storage_key`, never a public or signed URL. Upload URLs expire after 15 minutes; read URLs expire after 10 minutes.
* Allowed types are JPEG, PNG, WebP, and HEIC. Maximum size is 15 MB. One photo question accepts one through four distinct attachment ids.
* Upload rows belong to the authenticated client and can only be submitted by that client. Cross-client, cross-business, wrong-purpose, duplicate, unknown, or more-than-four ids are rejected as `:invalid_answer_values`.
* The backend never accepts or proxies file bytes. The client uploads the raw `File` directly with the signed PUT URL.
* Generated clients come from OpenAPI. Do not hand-edit `generated.ts`.
* Per the user's instruction, this phase ends with automated tests/builds only; manual browser testing is explicitly deferred.

---

### Task 1: Add deterministic Tigris URL signing

**Files:**
* Create: `backend/lib/easy/storage.ex`
* Modify: `backend/config/config.exs`
* Modify: `backend/config/dev.exs`
* Modify: `backend/config/test.exs`
* Modify: `backend/config/runtime.exs`
* Test: `backend/test/easy/storage_test.exs`

**Interfaces:**
* `Easy.Storage.presign_put(storage_key, opts \\ [])` and `presign_get/2` return `{:ok, %{url, expires_at}}` or `{:error, :storage_unavailable}`.
* Signing uses path-style `<endpoint>/<bucket>/<encoded-key>`, SigV4 service `s3`, `UNSIGNED-PAYLOAD`, and only the `host` signed header.
* Test-only `:now` and `:expires_in` options make the signature deterministic.

- [ ] Add red tests for canonical encoding, stable signatures, PUT/GET separation, expiration bounds, endpoint paths, and missing configuration.
- [ ] Implement URI encoding, canonical query ordering, HMAC key derivation, and constant lowercase hex output with OTP modules only.
- [ ] Add dev/test inert config and strict production environment loading using Fly/Tigris variable names.
- [ ] Run focused tests, formatter, and strict Credo.
- [ ] Commit: `feat(backend): sign private Tigris object URLs`.

---

### Task 2: Persist attachments and expose client uploads

**Files:**
* Create: `backend/priv/repo/migrations/20260711150000_create_attachments.exs`
* Create: `backend/lib/easy/attachments/attachment.ex`
* Create: `backend/lib/easy/attachments.ex`
* Create: `backend/lib/easy_web/controllers/clients/upload_controller.ex`
* Create: `backend/lib/easy_web/controllers/clients/upload_json.ex`
* Modify: `backend/lib/easy_web/router.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Modify: `backend/test/support/factory.ex`
* Test: attachment schema/context/controller tests

**Interfaces:**
* Adds tenant-safe `attachments` with client, uploader actor, storage key, content type, byte size, and `check_in_photo` purpose.
* `Attachments.create_client_upload(ctx, attrs)` resolves the authenticated client, validates metadata, inserts a UUID-derived storage key, and returns the attachment plus signed PUT URL.
* Adds `POST /v1/client/uploads` as `createClientUpload`.

- [ ] Add red tests for allowlist/size bounds, storage-key opacity and uniqueness, actor stamping, tenant/client isolation, response schema, auth, and signer failure rollback.
- [ ] Add and rollback/reapply the composite-tenant migration with a populated row.
- [ ] Implement schema query builders and Ctx-first context functions; controller only delegates and renders.
- [ ] Add OpenApiSpex request/response schemas with `upload_url`, expiry, and required PUT headers.
- [ ] Run focused tests, route/OpenAPI coverage, formatter, and strict Credo.
- [ ] Commit: `feat(api): create check-in photo uploads`.

---

### Task 3: Validate photo answers and mint read URLs

**Files:**
* Modify: `backend/lib/easy/client_profiles/form_template.ex`
* Modify: `backend/lib/easy/client_profiles/form_submission.ex`
* Modify: `backend/lib/easy/client_profiles.ex`
* Modify: coach/client form-assignment JSON views
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Test: client-profiles and controller tests

**Interfaces:**
* Form question types gain `photo`; stored answer shape is a list of one to four UUID strings.
* `FormSubmission` gains a virtual `attachments` list populated by contexts for submission lists, review queue, and submit responses.
* Submission JSON adds `attachments: [{id, content_type, byte_size, purpose, read_url, read_url_expires_at}]`.

- [ ] Add red answer-shape tests and context tests for valid ownership, cross-client/business ids, wrong purpose, duplicates, unknown ids, and over-limit lists.
- [ ] Validate shape first, then resolve every referenced attachment through tenant/client query builders before opening the submission transaction.
- [ ] Batch-load referenced attachments for read paths and mint fresh GET URLs outside views.
- [ ] Add attachment metadata/read URLs to JSON and OpenAPI without exposing storage keys.
- [ ] Run focused context/controller/OpenAPI tests and strict Credo.
- [ ] Commit: `feat(backend): secure check-in photo answers`.

---

### Task 4: Add photo questions to coach authoring and review

**Files:**
* Modify: `backend/lib/easy/default_check_in.ex`
* Modify: `frontend/apps/coachapp-v2/src/api/checkins.ts`
* Modify: `frontend/apps/coachapp-v2/src/checkins/question-presets.ts`
* Modify: `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`
* Modify: `frontend/apps/coachapp-v2/src/checkins/review-answers.tsx`

**Interfaces:**
* Builder type list gains `Photo`; photo questions cannot map to profile fields.
* Presets gain `Progress photos (front/side/back)` in Body.
* The existing system default receives one optional photo question by updating the stored system template only when it still has the known system key and lacks that stable id.
* Review renders photo answers as responsive linked thumbnails using attachment read URLs.

- [ ] Add the photo type to draft/request mappings and preset bank.
- [ ] Evolve existing system defaults idempotently without overwriting coach edits to other questions.
- [ ] Match answer ids to response attachment metadata and render inline images with useful alt text and safe external-link attributes.
- [ ] Run focused Biome and coach production build.
- [ ] Commit: `feat(coachapp): author and review check-in photos`.

---

### Task 5: Upload photos in the client fill flow

**Files:**
* Create: `frontend/apps/clientapp-v2/src/checkins/photo-answer-field.tsx`
* Create: `frontend/apps/clientapp-v2/src/api/uploads.ts`
* Modify: `frontend/apps/clientapp-v2/src/api/base.ts`
* Modify: `frontend/apps/clientapp-v2/src/checkins/checkin-field.tsx`
* Modify: `frontend/apps/clientapp-v2/src/checkins/fill-checkin.tsx`

**Interfaces:**
* Photo field offers camera and library inputs, uploads each selected raw file directly to its signed PUT URL, shows per-file progress/preview/error, and emits only successfully uploaded attachment ids.
* Remove revokes the local preview and removes the id from the pending answer. Submit is blocked while any upload is in progress or failed.

- [ ] Add generated upload hook tags and a small XHR PUT helper with progress callback and required headers.
- [ ] Validate MIME, 15 MB size, and four-photo limit before requesting upload metadata.
- [ ] Manage object-URL cleanup on remove/unmount; HEIC may show a generic preview when the browser cannot decode it.
- [ ] Thread upload readiness to the fill screen and preserve the backend answer shape.
- [ ] Run focused Biome and client production build.
- [ ] Commit: `feat(clientapp): upload check-in photos`.

---

### Task 6: Regenerate and verify Phase 5 automatically

- [ ] Run `just gen-api`; accept the documented generated-file Biome tail while confirming both clients regenerate.
- [ ] Confirm photo enums, upload hooks, and attachment response types exist in generated clients.
- [ ] Run `mix precommit` and confirm the full backend suite is green.
- [ ] Run focused Biome, both production builds, and `just check-rm`.
- [ ] Verify migration rollback/reapply and deterministic signer tests; do not contact real Tigris in automated tests.
- [ ] Document the five required Fly/Tigris environment variables in the deployment guide.
- [ ] Do not use browser/Chrome tools; report manual photo-flow verification as deferred to the user.
- [ ] Commit verification fixes: `chore: verify check-ins phase 5 integration`.
