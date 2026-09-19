# Authentication and native foundation

When I open my coach's invitation, I need to accept it and know that I can return to my account after closing the app. The first native write is editing contact details, a small supported operation that exercises authentication, saving, and restart recovery before adding daily-task screens.

## Interaction

Use the rewritten coachapp's email/OTP sequence and shadcn React Aria fields. A single OTP input supports paste, one-time-code completion, and correction. A separate six-box input was rejected because it complicates keyboard and paste behavior without improving this task.

The invitation uses the backend's `/invite/:token` URL. Preview identifies the coaching business, prefills email, and explains unavailable or already-used links. An authenticated account must explicitly sign out before accepting another invitation. Verification opens the protected destination. Direct protected links preserve a validated local return path.

Account details use one mobile form with Save details. Unsaved fields survive reload through an verified-client-scoped draft. Successful saves refresh the profile query and remove that draft. Sign-out clears private data and leaves a persisted tombstone, so delayed verification and refresh cannot restore the session. Rejected credentials preserve the private draft; the next authenticated profile identifies its owner before opening it. A new login for another client cannot read it. API responses and draft writes retain session-generation guards.

All layouts are mobile screens, including tablet/browser use. There is no desktop composition. Inputs remain 16px and primary buttons 48px. Native safe-area insets apply to the document. API calls retain the current typed-route contract and openapi-fetch; auth remains generated from OpenAPI.

## Verification on 2026-09-19

- `pnpm build` passes strict application TypeScript, four persistence-boundary tests, and Vite production build. Biome and frontend shape checks pass.
- The real Phoenix browser suite passes at 375px and 768px: invitation acceptance, invalid OTP correction, challenge reload, contact save, failed save/retry, draft reload, saved reload, sign-out, protected return links, transient refresh failure/recovery, rejected-login draft recovery, and account isolation. Both widths render a mobile screen capped at 480px.
- iOS debug build passes. `ClientUITests/AuthenticationTests.testInvitationProfileAndRestart` passes on iPhone 17, iOS 26.3.1: custom-scheme invitation deep link, OTP, native keyboard entry, reachable Save, server save, background/resume, process restart/read-back, unsaved draft restoration after process termination, and sign-out surviving restart. See `evidence/ios-auth.json`, `evidence/ios-drafts.json`, and `evidence/ios-saved-profile.png`.
- Android `assembleDebug` passes, 213 executed tasks. Emulator installation was attempted with API 36 and a smaller API 30 image; both failed during extraction with `No space left on device`. Android back, keyboard, lifecycle, network, and authenticated runtime checks remain unverified.
- Backend `TEST_DATABASE_PORT=5440 MIX_TEST_PARTITION=clientapp mix precommit` passes: generated-contract check, compile, format, Credo, and 1,795 tests. The port override is optional and retains 5432 by default.

The first iOS test failure was a test text-replacement error: its delete keys ran while the cursor was at the beginning of the name. The corrected test uses an empty-name invitation fixture and verifies the exact server-saved value after restart. No app success criterion was weakened.

## Local environment

The development Docker PostgreSQL returned `global/pg_filenode.map: I/O error`, and Docker inspection did not respond. The test API uses a separate PostgreSQL 17 cluster at `/tmp/easy-clientapp-pg`, port 5440, and database `easy_clientapp_rebuild_dev`. Phoenix listens on 4100 with local-only mail delivery; client Vite listens on 1315. No real email is sent by the fixture helpers.

PostgreSQL was installed through Homebrew. Homebrew encountered libpq link conflicts; direct Cellar binaries and two missing versioned share/library symlinks allow the isolated cluster to run without replacing libpq links. The existing Docker database was not repaired or modified by this test setup.

## Repeating the native checks

From the client app, set `VITE_API_BASE_URL=http://localhost:4100` and run `pnpm native:sync`. Native sync requires an explicit API origin. Production origins use HTTPS. Browser development uses the Vite proxy; `.env.example` documents the configuration.

Run `node tests/auth/native-fixture.mjs` against the isolated API, then run the shared Xcode `ClientUITests` scheme on an available simulator. The generated fixture is ignored by git. XCTest uses the real app and backend; its source lives under `ios/App/ClientUITests/`.

For Android, configure the local SDK path in ignored `android/local.properties`, use Android Studio's JDK, and run `./gradlew --no-daemon assembleDebug`. Local HTTP is permitted only by the debug manifest; release builds retain Android's secure default. The custom scheme is `easy://app/invite/<token>` on both platforms.

Verified universal links/app links still need an owned domain and signing association. Photo permissions, notifications, offline cached reading beyond the live query cache, and the remaining client workflows are subsequent slices. Physical devices and real-client usability have separate outstanding validation.
