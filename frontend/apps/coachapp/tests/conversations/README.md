# Conversation browser checks

Start the normal API on 4000, coachapp on 2022 and configured local object storage.
Run from `frontend/apps/coachapp`:

```sh
rtk proxy pnpm test:conversations
rtk proxy env BROWSER_ENGINE=webkit pnpm test:conversations
```

Install Playwright's WebKit browser if needed. `COACHAPP_API_URL` and `COACHAPP_URL`
override the services. `COACHAPP_CONVERSATIONS_FEATURES_ONLY=1` runs response sharing,
team updates, reconnect, voice notes and video without the full inbox/history flow.

Both widths (375px and 1280px) use real disposable accounts, clients, messages and
storage. These records remain in the development database. Run engines sequentially
if retaining their screenshots: both write `tests/conversations/artifacts/`.

Chromium uses its fake microphone. WebKit receives an oscillator stream through a
stable test-owned `mediaDevices` reference; its real MediaRecorder still encodes the
voice note. Neither requires physical microphone input. File-backed PUT bytes are
captured before browser fetch when Playwright cannot expose them, then compared with
the actual signed storage download. Permission denial and requested network failures
are deliberately simulated; successful storage and media playback are real.

The harness lets its injected sign-in settle before navigation. Session expiry is
covered by the authentication suites. These checks do not establish physical Safari
microphone permissions, device behavior or deployed storage compatibility.
