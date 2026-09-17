# Conversations

When a client asks for help, a coach needs to understand the conversation and respond, so the client can keep moving. This is a frequent phone task and a desktop catch-up task. The costly mistakes are replying to the wrong client, losing a draft, sending a duplicate after a lost response, and treating an unread message as handled.

Use a searchable inbox with All, Needs reply and Unread filters. Each row leads with the client's name, then the latest preview and time; unread and waiting states come from the API. Start a conversation from Client Overview. A dedicated thread keeps the client identity, messages and composer together. A permanent inbox/thread split was considered, but adds competing scrolling surfaces and collapses differently on phones. Start with a single reading surface at both widths.

Message history reads oldest to newest, opening at the latest message. Older pages load above without moving the reading position. Incoming messages do not pull a coach away from older history; offer Jump to latest. Keep the composer multiline with an explicit Send action, draft preservation on failed requests, and navigation protection. Attachments are optional and show upload/retry state. A failed response with an uncertain send outcome requires checking recent messages before another deliberate send. Reading and marking handled stay separate. Mark handled uses the reviewed timestamp so a new client message cannot be cleared accidentally.

Use server cursor pages for inbox and history, server search/status/counts, typed hooks and session guards. Realtime events only invalidate authorized HTTP queries; never trust pushed records to populate another client's cache. Refresh session before connecting, disconnect on account replacement, and refetch after reconnect. Connection trouble leaves history and drafts usable with explicit refresh/retry.

Verify real client and coach messages, multiple inbox/history pages, search beyond page one, server status/counts, read/handled conflicts, multiline and empty sends, failed/lost writes, media upload/download recovery, live incoming updates, reconnect and account isolation at 375px/1280px. Media upload and download verification uses the configured storage service; only deliberate failure responses are simulated. No real messages to existing users or real external delivery.

Evidence: backend Chat, ChatMessages, Conversation/Message schemas, coach ConversationController and UploadController, generated conversation/upload types, InboxChannel and UserSocket. Graph tools are unavailable; these task-directed source reads establish the contract. The referenced type-system-discipline skill is missing from repo and user skill locations; the available TypeScript skill supplies the applicable type rules.


## Implementation and verification

The thread uses the official shadcn React Aria [Message](https://ui.shadcn.com/docs/components/aria/message), [Bubble](https://ui.shadcn.com/docs/components/aria/bubble), [Attachment](https://ui.shadcn.com/docs/components/aria/attachment) and [Message Scroller](https://ui.shadcn.com/docs/components/aria/message-scroller), installed through the CLI and styled with the app's tokens. The older-page loader sits outside MessageScrollerContent so the first message remains the prepend anchor. Keyboard Home exercises real scroll intent; assigning scrollTop does not test the primitive's user-scroll handling. Browser checks wait for the primitive's data-autoscrolling state to clear before scrolling, and keep the injected load failure active until the retry button has keyboard focus.

Real API browser scenarios passed at 375px and 1280px on 2026-09-12: server search and status totals, opening a client thread, 45 messages across cursor pages, initial and older-page failures, preserved reading position on prepend and incoming replies, jump to latest, shared read state, handled conflicts, multiline and empty sends, draft navigation protection, lost-response recovery without duplicate sends, upload and download retries, and client overview navigation. The mobile scenario also replaces the account while history is in flight and checks cache isolation. Session refresh precedes the socket handshake; incoming messages update through authorized HTTP queries.

App build, scoped Biome and `just check-rm` passed. Backend `mix precommit` passed with 1,681 tests and zero failures. Vite reports the app bundle-size warning. Media signing uses the real API, while browser routes simulate storage uploads/downloads; external storage delivery was not exercised.

The completion checks on 2026-09-13 also pass at 375px and 1280px: intake and check-in response sharing, response-reader failure/retry, invalid response removal, read/handled updates across two tabs, missed replies after reconnect with the draft retained, microphone denial/retry, real recording and playback, re-record/discard, capture-track cleanup, and sending/playing recorded audio. The mobile account-replacement scenario holds both history and a successful send response and checks that neither repopulates the replacement account. Full-suite verification passed before the final composer button grouping; the focused response/voice/team suite checks that grouping at both widths.

The 2026-09-13 run simulated photo and audio storage transport. The real-storage verification below supersedes that limitation for local storage and Chromium; physical-device and Safari recording checks remain open. This browser verification does not replace a target-coach usability review.


## Completing responses and voice notes

A coach reading intake or a check-in can choose Discuss with client. The thread opens with that response attached to an unsent draft. The server resolves its title and answers within the authorized client; the coach can preview or remove it before Send. Received shared responses open the same reader without navigating away from a draft.

Voice recording opens a focused dialog. Start requests microphone access; Stop exposes playback, Record again and Use voice note. Use adds an attachment to the draft. Discard releases the microphone and object URL. The recording stops at three minutes. Unsupported browsers and denied microphone access keep ordinary text and file attachments available. Browser verification uses Chromium's fake microphone and real MediaRecorder output, with local storage transport.

The recorder checks supported output using [MediaRecorder.isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) and waits for the stop event before creating the preview. Its cleanup releases capture tracks when the dialog unmounts.


The browser suite uses Chromium's full headless mode (`channel: chromium`) for fake microphone capture; headless shell returned NotSupportedError before MediaRecorder started. Its reconnect fixture closes only the application socket. Closing Vite's development socket triggers a page reload and does not model chat reconnect. Temporary diagnostic logging was removed.


## Real storage audit — 2026-09-15

The complete conversation suite passes at 375px and 1280px against normal API 4000, coach app 2022 and configured local storage. The test discovers upload destinations from real signing responses instead of assuming the old fake storage address. Photo upload deliberately fails once; explicit retry performs a real PUT, and the downloaded bytes match the original. Voice notes use real MediaRecorder output, storage upload/download, byte comparison and playback. A generated WebM video uploads and plays; an injected storage GET failure exposes Retry attachment, which restores playback from storage.

The full run also repeats cursor history, server inbox filters/counts, reading anchors, incoming replies, read/handled races, lost-send recovery, shared form responses, reconnect and account replacement. No application or public API change was needed for this storage checkpoint. Screenshots were inspected at both widths; timestamp-dependent existing screenshots are retained as local run evidence rather than committed baseline changes.

Build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains. Disposable accounts, messages and media remain in the test businesses, as in the existing suite. Real remote deployment/storage configuration, physical-device media compatibility and target-coach usability remain outside this local Chromium verification.


## WebKit verification, 2026-09-17

The existing full conversation journey now runs in Chromium and WebKit at 375px and 1280px. WebKit uses generated oscillator audio with its real MediaRecorder; Chromium retains its fake microphone. Both exercise denial/retry, preview, re-record/discard, track cleanup, real photo/audio/video storage, byte equality and native playback. Inbox/history paging, live team updates, reconnect, shared responses, uncertain sends and account isolation remain in the same suite. Run instructions and fixture limits are in `tests/conversations/README.md`.

The desktop WebKit run exposed a clipped Jump to latest button. Its `inset-s-1/2` utility generated no positioning rule in this app's CSS. Replacing it with `start-1/2` supplies the intended logical 50% inset; the test now checks centering before clicking. No stacking workaround remains. The screen's layout and interaction design otherwise stay unchanged.

Harness corrections keep the check meaningful: retain WebKit's test mediaDevices reference, capture file-backed upload bytes before fetch when Playwright omits the body, and let injected sign-in finish before navigating. Authentication suites retain expiry coverage. These changes do not mock encoding, successful storage or playback. Physical Safari microphone/device behavior and deployed storage remain outside this local evidence.
