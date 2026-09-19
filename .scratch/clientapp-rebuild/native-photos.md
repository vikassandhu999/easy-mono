# Native progress photos

The form keeps selected images in its account-owned IndexedDB store before upload. Choosing a photo while connected uploads it immediately; recovery after process death keeps it local until the client taps Retry. Sending the form remains a separate action.

## Android gallery recovery

Camera 8.2.4's `chooseFromGallery` delegates to `IonCameraFlow`, whose `currentCall` exists only in memory. Its activity-result launcher does not use Capacitor's saved plugin call. A runtime test backgrounded the picker, reclaimed the app process, returned through Recents, selected a photo, and reproduced a lost result.

`PhotoLibraryPlugin` opens AndroidX `PickVisualMedia` through Capacitor's `startActivityForResult` and `@ActivityCallback`. Capacitor then delivers `appRestoredResult` when Android recreates the app. The adapter returns the selected content URI; Capacitor's local content handler reads it into the existing durable blob store. No library-wide permission or permanently retained URI grant is needed. AndroidX supplies the document-picker fallback where the system photo picker is unavailable, as described in the [Android photo-picker guide](https://developer.android.com/training/data-storage/shared/photo-picker). The adapter is limited to selecting one image; Camera continues to own capture and the iOS picker.

The API 36 emulator verifies cancellation, normal selection, real upload, form submission, downloaded image dimensions, and saved-image loading after process restart. Its separate recovery run verifies a changed process ID, recovered answers and photo, no automatic upload, deliberate Retry, submission, and another restart. The test uses Home and `am kill`, which waits until Android considers the background app safe to reclaim; force-stop would cancel the pending activity result.

Run `rtk pnpm test:android:photos` from the app for ordinary selection, and `rtk proxy env CLIENTAPP_PICKER_RESTART=1 pnpm test:android:photos` for process recovery. Seed media is `tests/forms/photo.png`, a generated four-colour image with no person or private content. The script copies it to the emulator and uses native taps and the native keyboard.

## iOS

The iPhone 17 simulator has passed full photo permission through the system prompt, native selection, real upload, form submission, and saved-response restart. A separate limited-access run selects one permitted image, verifies that Easy's library contains only that image, then completes the same upload, submission, and restart path. XCTest resets photo authorization for each permission case. The fixture accepts `CLIENTAPP_PHOTO_ACCESS=limited` to run the limited-access case.

The limited-access run first reproduced an IndexedDB transaction failure when saving a photo Blob. Copying the selected image into an app-owned Blob passed one run, but a later camera-cancellation/limited-access run reproduced the failure. Removing the camera steps still failed. Inspecting the individual write request revealed WebKit's error: `Attempt to delete range from database without an in-progress transaction`.

Photo records now store an ArrayBuffer and MIME type, reconstructing a Blob when read. This avoids the failing Blob-storage path while retaining the same account ownership, atomic metadata writes and explicit upload behavior. The reader also accepts the earlier Blob records; the browser suite converts an interrupted upload to that format and verifies reload/retry without a second attachment ticket. The isolated limited-access native run passes with byte storage (`evidence/ios-photo-bytes.json`). Native adapter failures and local storage failures keep separate feedback, and storage errors do not expose internal database messages to the client.

Evidence: `evidence/ios-photo-limited.json` and its saved-image screenshot; `evidence/android-photo-upload.json`, `evidence/android-photo-recovery.json`, and the Android saved-image screenshot. Screenshots show the actual downloaded test image after restart. Native tests use real storage; browser fault scenarios continue to simulate that boundary.

Seed the simulator with `rtk proxy xcrun simctl addmedia <device> tests/forms/photo.png`, create fresh invitations with `rtk proxy node tests/auth/native-fixture.mjs`, and run the shared `ClientUITests` scheme. Invitations are single-use, so regenerate before another run. Wait for each xcodebuild process to finish before starting another. Remove the installed test runner with `rtk proxy xcrun simctl uninstall <device> com.easy.client.uitests.xctrunner` between fixture runs; one run opened an earlier used invitation even though source, build and installed resource hashes matched. Removing the runner forced a fresh test launch. Keep `com.easy.client` installed so restart and draft checks retain their state. The task-owned simulator is `516E4F05-967E-46C9-BCB8-9A8DCFFC5854`; the older simulator's permission overrides returned `Operation not permitted` and its app Settings link opened Settings root.

## Real local object storage

Phoenix and PostgreSQL use the isolated development environment described in [auth/native](auth-native.md). The Docker MinIO service on port 9000 was roughly eight hours behind the host clock and rejected valid signed uploads as not yet valid. It was left untouched.

A task-owned MinIO binary was built from `github.com/minio/minio@v0.0.0-20260212201848-7aac2a2c5b7c` into `/tmp/easy-clientapp-tools`, using Go's toolchain selection. It runs with the repository's development storage credentials, data directory `/tmp/easy-clientapp-minio-data`, API `127.0.0.1:9002`, console `127.0.0.1:9003`, and `MINIO_API_CORS_ALLOW_ORIGIN=*`. The private bucket is `easy-dev-private`. Bucket creation used the backend's own SigV4 presigner and a bucket PUT; signed client PUTs returned 200.

Start the test API with `CLIENT_STORAGE_URL=http://localhost:9002` to override only its storage endpoint. Android requires reverse forwarding for both 4100 and 9002. Browser fault-injection suites accept the same variable to target their upload/download interception; their storage boundary remains simulated. Native photo tests use real signed PUTs and GETs without intercepting storage.

## Camera capture

Android capture cancellation, real capture, upload, submission, and saved-image restart pass on the API 36 emulator. A separate process-reclamation scenario first reproduced the same lost result as gallery selection: `takePhoto` keeps its callback in `IonCameraFlow`, and the restored app returned to its launch invitation without the photo.

Android capture uses the installed plugin's `getPhoto` with `CameraSource.Camera` and a URI result. This deprecated API is retained deliberately: its `LegacyCameraFlow` saves the output file path, and `CameraPlugin` delivers the restored call through Capacitor. The recovery test passes with a changed process ID, preserved answer, local photo, explicit Retry, actual storage upload, submission, and another process restart. Cancellation is normalized from this API's exact cancellation message. No dependency version or Android permission was added. Replace this bounded adapter only after the replacement passes the same recovery test.

Run `rtk proxy env CLIENTAPP_PHOTO_SOURCE=camera pnpm test:android:photos` for capture, adding `CLIENTAPP_PICKER_RESTART=1` for process recovery. Evidence is `evidence/android-camera-upload.json`, `evidence/android-camera-recovery.json`, and `evidence/android-saved-camera.png`. The emulator camera produces a synthetic scene.

iOS continues to use `takePhoto`. The iOS 26.3.1 simulator presents camera permission and capture controls, but tapping Take Picture leaves a black capture view without a result. `evidence/ios-camera-capture-unavailable.json` records that failed capture attempt. The simulator scenario exercises permission, cancellation, then gallery upload; physical iPhone capture remains an external check. The XCTest capture path uses Take Picture and Use Photo when run on a physical device. Set `CLIENTAPP_PHOTO_SOURCE=camera` when creating its fixture. A device whose plugin reports no available camera receives a specific library fallback message.

The plugin's [camera documentation](https://capacitorjs.com/docs/apis/camera) describes the Android activity-restoration requirement; the adapter choice is based on installed source and the runtime reproduction.

The iOS auth/form/photo suite passes all three tests with camera access denied, photo-library access denied, retained form input, allowed camera access, camera cancellation, full-library upload, submission and saved-image restart (`evidence/ios-camera-recovery.json`). A failed exploratory run left an unanswered system prompt that XCTest accepted during the next launch. Restarting the task-owned simulator cleared that test contamination; permission cases reset their own authorization before launch.

## Verification

Strict frontend build, Biome, repository shape checks, and the browser forms/recovery suites pass. Browser widths 375, 768, and 1280 retain the same mobile composition. Backend precommit passes 1,802 tests and the 172-route contract check. Android debug compilation and both gallery scenarios pass. The full iOS auth/form/photo regression passes all three tests after the limited-access fix; its summary is `evidence/ios-photo-checkpoint.json`.

After the byte-storage change, the iOS suite again passes all three tests, this time combining camera cancellation with limited-library access (`evidence/ios-photo-storage-checkpoint.json`). Its screenshot shows the downloaded test image after restart. Android capture/process recovery and browser forms, prior-format retry, and production offline reload pass against the byte-storage version. The earlier gallery and full-access results remain separate checkpoints above.

Graph MCP tools were unavailable in this continuation. Diagnosis used the installed Camera 8.2.4 and Capacitor 8.3.0 sources plus the failing and passing native scenarios; no graph coverage claim is made.

## Remaining checks

Physical iPhone capture and lifecycle behavior, physical Android devices, device-specific media formats, and human usability remain separate checks. These photo results do not complete the daily training, nutrition, messaging, or progress workflows in the goal.
