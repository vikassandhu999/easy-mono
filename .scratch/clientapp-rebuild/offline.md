# Offline reading and form recovery

A client loses connectivity after opening a form, closes the app, and returns to finish their answers. Keep the same editor and saved-response reader, with the last successful server-check time. A separate offline editor would duplicate form behavior and make reconnection harder to understand.

Persist approved React Query reads for the verified account and session: profile, form lists, and form details. Restore before rendering. Keep up to 100 recently fetched queries for seven days; drafts have their own lifetime and are not discarded when a snapshot expires. Use the established storage adapter so logout removes snapshots with other private data. Exclude authentication requests, signed attachment URLs, and all mutations. The application shell cache contains only public build assets.

The form remains editable offline, and photos can stay on the device awaiting upload. Sending requires connectivity and a successful detail refresh during this screen visit. Reconnection refreshes the server state, handles template changes using the existing revision/draft reconciliation, and never sends automatically. If the form was completed elsewhere, preserve and expose local unsent answers beside the saved response.

Entry and return use the cached Forms list. An unopened or expired form explains that it needs a connection. Show the last-check time for cached reads and a visible warning if persistence fails. A storage failure must not prevent a successful online read or delete an unsent draft. Profile editing follows the same deliberate-save rule.

Verification must cover production-browser offline reload through its service worker, cached list/detail/reader, edited draft restart, offline send prevention, reconnect to a changed template, explicit submission, expired/malformed cache, account switching, logout cleanup, and native process restart with network disabled. Real API and PostgreSQL remain the business boundary. Provider photo delivery and human usability remain separate checks.

Implementation uses TanStack's existing dehydration/hydration API and a small account-scoped persistence adapter. The seven-day query lifetime follows the [documented relationship between garbage collection and persisted-cache age](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient).

## Evidence, 2026-09-19

The production browser test on port 1316 passes with the real Phoenix API and PostgreSQL. It verifies shell reload without networking, cached profile/list/detail/saved reader, draft edits across reload, disabled submission, server template changes on reconnect, explicit submission, malformed and expired snapshots, profile updates after a cached render, storage failure/retry, account isolation, and logout cleanup. Cache Storage contains only `/index.html` and build assets. API data uses the account-owned snapshot store.

Android API 36 passes after disabling both Wi-Fi and mobile data: cached form and draft reopen across two process stops, native keyboard edits persist, Send remains disabled, and reconnection enables a deliberate submission. See `evidence/android-offline-results.json` and `evidence/android-offline-form.png`.

iPhone 17 XCTest passes both cases with the local API fault proxy. During an injected API outage, a cached form survives app termination, remains editable and unsendable, and exposes a refresh action. Restoring the API permits submission; the saved response also reopens during an outage. This verifies API failure recovery on iOS, not the physical device's radio state. See `evidence/ios-offline.json`; screenshots are retained in `/tmp/easy-clientapp-ios-offline.xcresult`.

Run the production browser check after `VITE_API_BASE_URL=http://localhost:4100 pnpm build`, `pnpm preview --port 1316`, and `pnpm test:offline`. The service worker is deliberately absent in Vite development and native apps, which already bundle their shell.

For the iOS outage case, run `node tests/auth/native-proxy.mjs`, sync with `VITE_API_BASE_URL=http://localhost:4101`, and create the fixture with `CLIENTAPP_API_CONTROL=http://127.0.0.1:4101/__test/connection node tests/auth/native-fixture.mjs`. Then run `ClientUITests`. The proxy forwards to the real API on 4100 and limits each injected outage to 30 seconds. Android keeps its API on 4100 through `adb reverse` and runs `pnpm test:android`.

Uploaded images still require a connection; the reader explains this instead of waiting indefinitely. Offline snapshots for training, nutrition, and messaging must be added with those workflows. Physical-device and human usability checks remain outstanding.
