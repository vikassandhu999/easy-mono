# Mobile coach conversation

## Mobile design pass, 2026-09-20

Keep the client's single conversation focused: a compact back/header, readable bubbles and a short composer with large Attach and Send targets. A separate compose route would hide the coach's question and add navigation, so retain the in-thread composer. Put attachment source choices in a bottom sheet; preserve selected media and text underneath it. Use the existing durable draft, immutable send attempt and explicit retry semantics. Keep server counts available to assistive technology without letting them dominate the conversation. Shared-form links must return to Messages. Verify keyboard-open first-tap sends, sheet dismissal, offline media recovery, long content, live read state, history paging and shared-form return in browser/native flows.

## Situation and action

The client needs to ask their coach a question, share a photo or other supported media, and know whether the message arrived. Messages opens the client's single coach conversation. There is no client inbox or desktop layout. The primary action is Send; older history is available above the latest exchange.

Two arrangements were considered: a separate compose screen, and a composer beneath the conversation. Keep the composer in the conversation so the client can read the coach's question while replying. Secondary attachment controls appear on demand. Use the established shadcn message and message-scroller components, comfortable touch targets, safe-area padding and a keyboard-aware viewport within the existing 480px mobile shell.

## Entry, reading and return

Messages replaces Check-ins in the four-item primary navigation; check-ins remain reachable from Today. Today links to the conversation with the server's unread count. A cold message link, authentication return, background/resume and Android back use the existing native boundary. Older history uses opaque server cursors and server counts. Coach-shared form submissions link to the supported saved response reader.

Loading, an empty first conversation, failed history and failed older-page fetch each have specific states. Preserve visible history while retrying a later page. Image, video and audio attachments use signed downloads and explicit retry on failure. Cached conversation reading is account-scoped and visibly stale offline.

## Drafts and delivery

Persist composer text and attachment bytes before claiming they are saved on this device. Upload metadata and progress belong to each attachment, with recoverable errors and deliberate retry. Reuse the existing native photo adapter and account-scoped byte storage; verify supported video/audio selection and playback separately.

Before sending, persist one immutable attempt containing a UUID, text and ordered uploaded attachment IDs. A successful server response clears that attempt. A lost response keeps it locked until the client deliberately retries the same identity. Reconnection never sends automatically. A different payload for an existing identity is a conflict, never a second message. Logout clears private drafts, media and cache; expired authentication preserves the original account's work.

Read acknowledgement uses only the latest server timestamp actually observed while the newest messages are visible in the foreground. It must not clear a new arrival that the screen has not loaded. Socket events refresh authoritative reads; lifecycle/reconnection also refreshes.

## Contract prerequisites

Use repository-owned typed routes, retaining legacy callers:

- Add client conversation history using the existing shared cursor page and `latest_message_at` watermark.
- Accept an optional `through` timestamp for client read acknowledgement, using the existing bounded monotonic read cursor.
- Accept an optional client send request UUID. Store its normalized payload fingerprint on the immutable message, enforce actor/conversation uniqueness in Postgres and serialize replay resolution on the conversation. Identical retries return the original message without another broadcast or conversation update; changed payloads return conflict. Legacy sends remain supported.

## Verification

Contract checks pass: 90 focused chat/router tests cover history isolation, server counts, deleted cursor boundaries, page cap, validation, bounded read acknowledgements, replay without another event or conversation update, attachment order, changed-payload conflicts and independent account identities. Real database connections prove simultaneous identical sends create one message and competing payloads have one winner. Direct inserts test request completeness and uniqueness constraints. Full backend precommit passes 1,832 tests; generated types, strict client and coach builds, Biome and repository shape checks pass. The isolated development API is migrated and running with the changes. Logs: `/tmp/easy-clientapp-messaging-{contract-tests,precommit,gen-api,build,coach-build,shape}.log`.

The mobile conversation screen is implemented. Browser checks pass at 375/768/1280px with the same 480px-capped layout: text send, live coach replies, bounded read acknowledgements, draft restart, lost-response retry and long content. A competing payload produces a locked conflict with an explicit discard action; discarding cannot send another message.

The production browser check preserves text and photo/video/audio bytes through offline reload. Reconnection does not send. A lost storage PUT response reuses its attachment ticket, and the deliberate retry creates one message with three attachments. Real MinIO downloads render the image and play MP4/MP3 media. Storage failure prevents sending. Logout clears private drafts. History checks cover initial/older-page failure and retry, 65 messages across opaque pages, unseen arrivals remaining unread, and a coach-shared form response with a return to Messages.

An account-switch regression reproduced a waiting request acquiring the replacement account's credentials after the refresh lock released. The shared client captures ownership before waiting and checks it before attaching credentials; conversation mutations also retain their rendered owner. The regression passes with both server conversations empty. Existing auth and form browser suites pass, along with the training-list regression for the extracted shared scroll sentinel. API review found no remaining contract or ownership gap.

The iPhone simulator passes native keyboard reachability, text/photo draft process restart, real upload, saved-image reopening, background/resume and cold restart. Its extended test also selects MP4/MP3 files through the native Files picker, restores their bytes after termination, uploads them and opens the saved media. This establishes native selection and opening; iOS playback still needs a separate runtime observation. The photo permission stall was a test interaction failure: tapping the visible system permission button by its center coordinate resolves it. Changed XCTest runs must reinstall the test runner to avoid executing its cached binary.

Android passes the complete native test with exit 0: keyboard/back, gallery cancellation and selection, offline text/photo force-stop recovery, deliberate reconnect/send, saved-image reopening, and native video/audio selection, byte recovery, upload and playback. The harness targets the Downloads drawer row explicitly and exits after assertions, cleanup and evidence writes because Playwright retains an ADB socket. Physical-device and human usability observations remain separate.

Browser logs: `/tmp/easy-clientapp-messaging-{all-browser,auth-regression,forms-regression,training-list-regression}.log`. Android: `/tmp/easy-clientapp-messaging-android.log`. iOS: `/tmp/easy-clientapp-messaging-ios-media-tap.log` and its `.xcresult`. Selected results and screenshots are in `evidence/messaging-*` and `evidence/ios-messaging-*`. Strict frontend build, Biome, repository shape checks and full backend precommit pass (1,832 tests).

Source evidence: bounded reads of `Easy.Chat`, `Easy.ChatMessages`, `Easy.Chat.Message`, client/coach conversation controllers and typed responses, uploads, channels and rewritten coachapp message primitives. Graph tools were unavailable in the current tool catalog; no graph completeness claim is made. Neither v2 implementation was read.

API-change review found the server contract coherent and flagged premature on-device preservation copy in the unused send hook. Removed that claim; the composer must own durable storage before displaying saved-draft feedback.

### Mobile implementation

Messages now has its own back/header and the same phone-width conversation on tablets and wide windows. The compact composer uses 48px Attach/Send controls and a growing textarea; an uncertain send has a visible Retry label. Draft status and discard sit above the entry, and sent feedback disappears when a new draft begins. Attachment sources use the shared bottom sheet, selected media remain underneath, and selection closes the sheet. Attachment validation errors render and receive focus inside the active sheet. Client attachments follow their message's alignment. Existing shadcn bubble/scroller primitives, durable attempts, upload hooks, server counts and opaque cursor behavior remain in use; the count is available to assistive technology.

A coach-shared form now carries validated returnTo=/messages. The saved reader offers Back to messages, preserving the originating conversation instead of relying on the global tab bar. The real shared-response flow verifies the saved answer and return (RM-243).

The empty composer keeps Send inactive until text or an attachment exists, including whitespace-only text. This removes an unnecessary invalid action from the mobile screen. Browser/native tests check that state, then require keyboard entry, an enabled Send and actual persistence. A defensive empty-content guard remains before upload/busy work. During exploration, programmatic focus after empty submission did not bring up the iPhone software keyboard; direct submit/press and focus-policy variations did not resolve it. Those workarounds were removed. This checkpoint does not claim programmatic keyboard opening; the actual typing and keyboard-open first-tap send still have strict native geometry checks.

Final browser suites pass at 375/768/1280: empty/whitespace Send availability, touch-sized Send, sheet open/close and invalid-file feedback, text/live/read state, long content, durable reload, lost response with one server message, visible Retry, conflicting draft discard, real photo/video/audio upload/playback, offline media bytes, storage failure, logout cleanup, 65-row history paging/retry and unseen-arrival read protection, shared-form return, and a send waiting on authentication that cannot acquire another account's credentials. All four messaging suites pass for the final composer behavior. Forms regression also passes all three widths and recovery. The successful browser storage path uses real MinIO on 9002; failure injection only intercepts the documented boundary.

Probe notes: the first new-header run used an old exact connection label; selectors were updated. A history retry test lost its transient error button when socket reconnection refreshed history; it now uses the persistent header Refresh action to exercise explicit retry. The first iPhone saved-reader run correctly exposed the new placeholder as the empty textarea's accessibility value; its assertion now expects that placeholder. Native Send still requires a visible on-screen keyboard, bounds above it and a physical first tap, without substituting DOM submission.

Build/native sync, strict TypeScript and app checks, Biome, shape/check-rm and full backend mix precommit pass (1,846 tests). No API contract or hook changed, so API contract review does not apply. Test fixtures remain in the isolated task database; the manual preview account was untouched. iOS media selection/opening, actual playback, physical-device camera and human usability are distinct evidence categories. Final native result references follow below.

Final iPhone run passes in 93.576s on the final source: empty Send disabled; typed text and photo draft restart; visible software-keyboard bounds and physical first-tap Send; saved-image reopening; background/cold restart; native Files selection of MP4/MP3, retained bytes, upload and saved-media opening. Result: /tmp/easy-clientapp-ios-build/Logs/Test/Test-ClientUITests-2026.09.20_13-48-05-+0530.xcresult. This test still establishes iOS media opening rather than playback. That observation remains in the connected native audit.

A final Android run sent successfully, then the emulator's restored network briefly reported offline while opening the photo. Its captured UI correctly explained reconnection. The test now waits for the live conversation and allows 15 seconds for the real image; assertions still require nonzero image dimensions, server persistence and playback. The rerun result follows below.

The distinction between DOM focus and software-keyboard display is also described in [WebKit's focus discussion](https://bugs.webkit.org/show_bug.cgi?id=195884). It supports keeping those observations separate; it is not evidence for the outcome of this app's native test.

Final Android run passes with exit 0 on the same final bundle. The emulator needed more than the default five-second assertion window to restore connectivity after Wi-Fi/data were enabled. The test now waits up to 30 seconds for the real conversation connection before requiring enabled Send; it still asserts zero server messages before the deliberate tap. Keyboard-open first-tap sending, gallery cancellation/selection, sheet Back, offline draft/process recovery, real saved photo, background/cold restart, native MP4/MP3 selection, retained bytes, upload and playback all pass. Log: `/tmp/easy-clientapp-messages-mobile-ready-android-connected.log`. Selected evidence: `evidence/messaging-mobile-android-*`. Final browser log: `/tmp/easy-clientapp-messages-mobile-ready-browser.log`; build/native sync: `/tmp/easy-clientapp-messages-mobile-ready-sync.log`; full backend gate: `/tmp/easy-clientapp-messages-mobile-precommit.log`.
