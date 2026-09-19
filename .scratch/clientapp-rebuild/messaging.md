# Mobile coach conversation

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
