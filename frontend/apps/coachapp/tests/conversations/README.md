# Conversation browser checks

Start the API, coach development app and configured local object storage. From `frontend/apps/coachapp`, run:

```sh
rtk proxy env COACHAPP_API_URL=http://localhost:4000 COACHAPP_URL=http://localhost:2022 pnpm test:conversations
```

The Chromium suite runs at 375px and 1280px with disposable coaches, accepted clients and real messages. It covers inbox search, draft restoration, uncertain-send recovery, duplicate prevention, history loading before retry, interrupted attachment recovery, photo upload retry and downloaded-byte equality. Requested failures are simulated; successful writes and storage transfers use the real local services. Fixture records remain in the selected database.

Screenshots are written to `tests/conversations/artifacts/`. The suite injects a development session, so use the development server. Authentication and cross-tab logout have their own browser suites. Voice recording, video playback, physical-device permissions and WebKit are not established by this reset suite.
