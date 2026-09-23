# Native credential storage

Native access/refresh tokens use `@aparajita/capacitor-secure-storage` 8.0.0. iOS uses
Keychain with `whenUnlockedThisDeviceOnly`; Android uses AES-GCM with a Keystore key.
Drafts and cached reads retain their existing account-owned stores. The browser keeps
its established localStorage session path; the plugin's web implementation is not used
for application credentials.

The dependency supports Capacitor 8 and Node 20+. Its pinned version is compatible with
the app's Capacitor 8 dependencies. No additional state or UI framework was introduced.
Sources: [plugin implementation and documentation](https://github.com/aparajita/capacitor-secure-storage)
and [Capacitor Preferences](https://capacitorjs.com/docs/apis/preferences). The latter
uses UserDefaults/SharedPreferences and provides the legacy migration source.

## Migration and failure behavior

`api/credential-store.ts` moves the whole session value into the secure store before
writing an installation marker and deleting the plaintext Preferences entry. If any
step fails, startup fails visibly and keeps the data needed to retry. Once the marker
exists, reads use the secure store; interrupted plaintext cleanup cannot restore an old
session after sign-out. A fresh installation has no marker, so retained iOS Keychain
credentials are overwritten with a signed-out value.

The session module retains serialized native writes, session-generation guards and its
logout tombstone. Explicit logout clears private account data and replaces usable secure
credentials. Authentication expiry preserves private drafts for a later verified login.
No credentials are synchronized through iCloud. Android backup is disabled in the app
manifest; iOS credentials do not migrate to another device.

A pnpm patch fixes two dependency boundaries used by this app: Android writes/removals
acknowledge only after `SharedPreferences.commit()` succeeds, and iOS read errors reject
instead of being treated as a missing item. The patch remains under `frontend/patches`
and is applied by the workspace lockfile. Recheck it when upgrading the plugin.

## Verification

Six migration tests cover the successful transfer, vault failure, marker-write failure,
interrupted cleanup, reinstall and a temporarily unavailable vault. Browser auth passes
at 375/768/1280. Today loading/error/retry, missing plan, real rest schedule and cached
failure/retry also pass at all three widths.

Android's full auth test now checks the encrypted preference file, absence of plaintext
credentials, a real authenticated legacy session migrated after process restart, and
logout's signed-out secure value. Its profile, offline form/workout, saved result and
background/back scenarios also pass. Log: `/tmp/easy-clientapp-credentials-android-refresh-ready.log`.

The iPhone migration test reads a real authenticated session seeded in the previous
Preferences format, opens that client's details, restarts without signing in, then signs
out and restarts signed out. It passes in
`Test-ClientUITests-2026.09.20_15-33-31-+0530.xcresult`; log
`/tmp/easy-clientapp-credentials-ios-refresh.log`. The app preference file has
the installation marker and no legacy session key after the test. Hardware key protection,
backup/restore and lock-state behavior remain in device-and-client-checks.md.

The first native probe caught mismatched JSON-write/raw-read APIs that double-encoded the
session. Using the matching raw-string APIs fixes it; both native probes verify the
stored format and authenticated restart. An iPhone probe also used an email hidden from
the accessibility tree on an overview row; it now verifies the email on Personal details.

For the isolated iPhone migration check, run `tests/auth/native-fixture.mjs`, then
`tests/auth/ios-credential-fixture.mjs`, wait for both to finish, reinstall the test runner,
and run only `testMigratedSessionAndSignOut`. The helper stops the task app, writes a real
legacy session without printing tokens, and refreshes the task simulator's preferences
service. Normal native fixtures omit the migration flag, so the opt-in test skips.

The fresh iPhone form regression passes. The account regression exposed a separate
keyboard-open first-tap Save failure; Personal details opts into preventFocusOnPress
and its test now checks actual keyboard bounds before tapping. The corrected iPhone
auth/profile/save/restart/logout scenario passes in 42.071 seconds. Account browser
checks also pass; RM-240 records the account consumer.

The final migration fixtures mark the stored access session expired. iOS and Android
then authenticate with the refresh token and persist a fresh access session before the
restart/logout checks. Android waits for that asynchronous refresh to finish rather than
assuming that a cached Today heading proves completion. Both final runs pass. The iPhone
refresh/migration test takes 22.158 seconds; Android also repeats the full profile,
offline form/workout and logout sequence on the final account-button bundle.


Final checkpoint gates pass: strict client build/native sync, both native builds, Biome,
check-rm and full backend precommit (1,846 tests). The connected nutrition
and messaging suites pass on both platforms with the secure-session bundle. Startup read
failures now expose an explicit Try again mobile screen and retain the account/drafts;
its browser failure/recovery probe passes at 375/768/1280. See final-audit.md.
