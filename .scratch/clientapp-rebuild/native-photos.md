# Native progress photos

The form keeps selected images in its account-owned IndexedDB store before upload. Choosing a photo while connected uploads it immediately; recovery after process death keeps it local until the client taps Retry. Sending the form remains a separate action.

## Android gallery recovery

Camera 8.2.4's `chooseFromGallery` delegates to `IonCameraFlow`, whose `currentCall` exists only in memory. Its activity-result launcher does not use Capacitor's saved plugin call. A runtime test backgrounded the picker, reclaimed the app process, returned through Recents, selected a photo, and reproduced a lost result.

`PhotoLibraryPlugin` opens AndroidX `PickVisualMedia` through Capacitor's `startActivityForResult` and `@ActivityCallback`. Capacitor then delivers `appRestoredResult` when Android recreates the app. The adapter returns the selected content URI; Capacitor's local content handler reads it into the existing durable blob store. No library-wide permission or permanently retained URI grant is needed. AndroidX supplies the document-picker fallback where the system photo picker is unavailable, as described in the [Android photo-picker guide](https://developer.android.com/training/data-storage/shared/photo-picker). The adapter is limited to selecting one image; Camera continues to own capture and the iOS picker.

The API 36 emulator verifies cancellation, normal selection, real upload, form submission, downloaded image dimensions, and saved-image loading after process restart. Its separate recovery run verifies a changed process ID, recovered answers and photo, no automatic upload, deliberate Retry, submission, and another restart. The test uses Home and `am kill`, which waits until Android considers the background app safe to reclaim; force-stop would cancel the pending activity result.

Run `rtk pnpm test:android:photos` from the app for ordinary selection, and `rtk proxy env CLIENTAPP_PICKER_RESTART=1 pnpm test:android:photos` for process recovery. Seed media is `tests/forms/photo.png`, a generated four-colour image with no person or private content. The script copies it to the emulator and uses native taps and the native keyboard.

## iOS

The iPhone 17 simulator has passed full photo permission through the system prompt, native selection, real upload, form submission, and saved-response restart. A separate limited-access run selects one permitted image, verifies that Easy's library contains only that image, then completes the same upload, submission, and restart path. XCTest resets photo authorization for each permission case. The fixture accepts `CLIENTAPP_PHOTO_ACCESS=limited` to run the limited-access case.

The limited-access run first reproduced an IndexedDB transaction failure when saving the photo-library-backed blob. The native adapter copies validated image bytes into an app-owned Blob before persistence; the same run then passes. The database write waits for the abort event to report failure, because the earlier request error event could expose a null transaction error. Native adapter failures and local file/storage failures are handled at their separate boundaries so validation messages are retained.

Evidence: `evidence/ios-photo-limited.json` and its saved-image screenshot; `evidence/android-photo-upload.json`, `evidence/android-photo-recovery.json`, and the Android saved-image screenshot. Screenshots show the actual downloaded test image after restart. Native tests use real storage; browser fault scenarios continue to simulate that boundary.

Seed the simulator with `rtk proxy xcrun simctl addmedia <device> tests/forms/photo.png`, create fresh invitations with `rtk proxy node tests/auth/native-fixture.mjs`, and run the shared `ClientUITests` scheme. Invitations are single-use, so regenerate before another run. The fresh simulator is `516E4F05-967E-46C9-BCB8-9A8DCFFC5854`; the older simulator's permission overrides returned `Operation not permitted` and its app Settings link opened Settings root.

## Real local object storage

Phoenix and PostgreSQL use the isolated development environment described in [auth/native](auth-native.md). The Docker MinIO service on port 9000 was roughly eight hours behind the host clock and rejected valid signed uploads as not yet valid. It was left untouched.

A task-owned MinIO binary was built from `github.com/minio/minio@v0.0.0-20260212201848-7aac2a2c5b7c` into `/tmp/easy-clientapp-tools`, using Go's toolchain selection. It runs with the repository's development storage credentials, data directory `/tmp/easy-clientapp-minio-data`, API `127.0.0.1:9002`, console `127.0.0.1:9003`, and `MINIO_API_CORS_ALLOW_ORIGIN=*`. The private bucket is `easy-dev-private`. Bucket creation used the backend's own SigV4 presigner and a bucket PUT; signed client PUTs returned 200.

Start the test API with `CLIENT_STORAGE_URL=http://localhost:9002` to override only its storage endpoint. Android requires reverse forwarding for both 4100 and 9002. Browser fault-injection suites accept the same variable to target their upload/download interception; their storage boundary remains simulated. Native photo tests use real signed PUTs and GETs without intercepting storage.

## Verification

Strict frontend build, Biome, repository shape checks, and the browser forms/recovery suites pass. Browser widths 375, 768, and 1280 retain the same mobile composition. Backend precommit passes 1,802 tests and the 172-route contract check. Android debug compilation and both gallery scenarios pass. The full iOS auth/form/photo regression passes all three tests after the limited-access fix; its summary is `evidence/ios-photo-checkpoint.json`.

Graph MCP tools were unavailable in this continuation. Diagnosis used the installed Camera 8.2.4 and Capacitor 8.3.0 sources plus the failing and passing native scenarios; no graph coverage claim is made.

## Remaining checks

Camera capture and interruption recovery still need runtime verification. Physical iPhones and Android devices, device-specific media formats, and human usability remain separate checks. These gallery results do not complete the daily training, nutrition, messaging, or progress workflows in the goal.
