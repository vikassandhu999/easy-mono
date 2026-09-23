# Exercise demonstrations

When a coach needs to explain a movement, they need a photo or short video beside their written cues so clients can recognize and perform it. Editing is occasional and happens on a phone as well as desktop. Replacing a demonstration must not erase a saved file before the coach saves the exercise.

Use one demonstration field below Coaching instructions. A separate upload dialog adds a navigation step without a decision to make; an inline preview keeps the movement and cues together. Choose the inline field: Add photo or video, then compact preview with Replace and Remove. Existing reference photos remain visible and individually removable. Save exercise applies every draft change; removing a file from the draft does not delete the shared storage object.

Upload directly to the server-authorized public library store. Accept the API's JPEG/PNG/WebP photos up to 15 MiB and MP4/WebM videos up to 50 MiB. Tell coaches the files are public and to use movement demonstrations without private client information. Upload cancellation, failures, and account changes retain the saved demonstration. Only a completed upload enters the draft. Block saving/navigation during the upload and abort the transfer on unmount. The coach can cancel the upload explicitly.

Reuse the preview in the exercise picker and expose exercise details on demand from workout authoring and plan previews. Load details only when opened so a workout does not trigger one request per exercise. Failed media loading has a retry action and does not block written instructions or exercise selection. Use native video controls without autoplay.

Verify real upload and anonymous playback with local MinIO, replacement, clearing, legacy-photo removal, copied-media reuse, unrelated-field preservation, failed/aborted upload and failed save, pending/session guards and plan reuse at 375px and 1280px. Keep the whole-app ledger active for remaining library, plan lifecycle and final audit work.

## Verification, 2026-09-14

`test:exercise-media` passes at 375px and 1280px against the normal API/app on 4000/2022 and real MinIO on 9000. The suite uploads actual PNG and WebM bytes, checks anonymous object reads byte-for-byte, plays the video, replaces the photo, handles failed PUT and PATCH requests, retries media reads, removes/restores reference photos, saves explicit clearing, and preserves copied demonstrations. It checks both workout authoring and assignment previews, cancellation after storage accepts a transfer, account replacement during a transfer, and unsupported/oversize files. Picker videos are absent until their details open.

Exercise authoring and management regressions pass at both widths on the isolated API/app, including unrelated-field preservation, cursor lists and interrupted writes. Training template, compact-set, worksheet and assignment suites also pass at both widths. Those suites accept `COACH_API_URL` and `COACH_APP_URL` so the regression can use the isolated database without changing the normal server configuration.

App build, scoped Biome, the former repository checks, and backend `mix precommit` pass; precommit reports 1,759 tests and zero failures. Vite still reports the existing large-bundle warning. No backend API contract changed. The signed upload API prepares a public asset; saving the exercise attaches it, and removal clears the reference without deleting an asset another exercise can use.

Phone and desktop screenshots of the controls and plan reader were reviewed. Main demonstration controls precede the separately labelled reference photos. Browser verification does not replace the target-coach and physical-device review still recorded in the completion ledger. Graph tools were unavailable; exact-source fallback covered the library media context/schema/controller/types and exercise/plan surfaces. No handwritten code from the retired coach implementation was read.
