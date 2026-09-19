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

Pending: browser text/media send and restart, offline/storage failure/lost-response recovery, pagination and unread refresh at 375/768/1280px. Exercise native keyboard, back, lifecycle, process restart and real media uploads on Android and iOS. Physical-device and human usability observations remain separate. This contract checkpoint does not deliver the conversation screen.

Source evidence: bounded reads of `Easy.Chat`, `Easy.ChatMessages`, `Easy.Chat.Message`, client/coach conversation controllers and typed responses, uploads, channels and rewritten coachapp message primitives. Graph tools were unavailable in the current tool catalog; no graph completeness claim is made. Neither v2 implementation was read.

API-change review found the server contract coherent and flagged premature on-device preservation copy in the unused send hook. Removed that claim; the composer must own durable storage before displaying saved-draft feedback.
