# Review client check-ins

When clients submit progress updates, the coach needs to read their answers and record a review so nothing is overlooked. This is a frequent phone and desktop task. The costly mistakes are treating a schedule as a response, showing today's edited questions beside old answers, or losing the place in a review list after opening a response.

Choose a searchable list with a dedicated reading page over an always-open split pane. Long answers and photos need the full phone width, and a stable URL makes each response reloadable. The global Check-ins entry defaults to Needs review; a client-scoped history defaults to All responses. The API filters by client, review state and name and supplies total/cursor. Reviewed responses stay accessible. No empty-screen instruction should ask a coach to select a nonexistent response.

Each list row emphasizes client and form names, submission date, due date, and review state. Open one response to read its frozen sections/questions and answers. A single Mark reviewed action follows the answers. Saving leaves the response visible with its saved review time and a return link; the originating list preserves search, loaded pages and scroll. Review does not send feedback to the client. A client link leads to their plans; messaging joins this later through the conversation task.

Keep the existing unreviewed queue API intact. Add cursor-based check-in submission listing and an authorized detail read using existing context/query code. Include reviewed responses and client filtering so history does not depend on downloading all assignments. Reuse the new app's intake answer rendering by promoting it to shared UI. The backend owns review timestamps and handles repeated review requests; refresh after ambiguous writes and session changes must not restore stale account data.

Verify required semantics through real controller tests and real API browser flows at 375px and 1280px: false/zero/blank answers, snapshot preservation, photo error/retry, reviewed and unreviewed filters, search beyond page one, pagination retries, return/reload, review failure and lost response, cross-client/tenant denial and account replacement during a pending save. Capture and inspect both layouts.

## Verification — 2026-09-12

Implemented `/check-ins`, stable response detail URLs, and client history/detail routes with links from Client Overview and schedules. The existing queue endpoint remains intact; the new submission list supports cursor, client, reviewed and search filters. Detail explicitly validates UUIDs. Both reads enforce tenant and visible-client scope and exclude Intake submissions. Migration adds tenant-leading cursor indexes. Generated API types were refreshed by `just gen-api`; no handwritten coachapp-v2 source was consulted or changed.

`test:reviews` passes at 375px and 1280px using the isolated local API. It submits 46 real check-ins per coach, loads three pages, searches the oldest form, recovers page failures, restores list scroll, reloads saved filters/detail, verifies false/zero/unanswered values and the original question snapshot after template editing, and recovers both rejected reviews and writes with lost responses. It also verifies client-history entry, missing responses, photo download retry through an external-storage fixture, and account replacement during a held review write. The shared Client Overview/intake suite runs in the same test and passes at both widths.

Mobile and desktop reader/history screenshots were inspected. Mobile navigation now scrolls horizontally without wrapping labels. App build, Biome, `just check-rm` and whitespace checks pass. Vite retains its existing large-bundle warning. Backend `mix precommit` passes 1,655 tests with zero failures, including 10 focused review-controller cases. These checks establish the implemented task, not completion of the whole application or a physical-device/target-coach usability study.

Graph tools were unavailable; the CLI query returned `backend_timeout`. Discovery used bounded source reads and searches, with no graph completeness claim. The existing review write remains idempotent on repeated requests; this slice does not claim to change its simultaneous-review attribution behavior.


## Real photo delivery audit — 2026-09-15

The response reader now reports image delivery failures and allows Reload photos to retry them. Previously, a real saved photo with a failed storage GET displayed a broken image without an error; the new probe reproduced that state before the fix. A successful signed-URL refresh remounts photo state so a repeated URL can retry too.

The full review suite passes at 375px/1280px against normal API 4000, app 2022 and real local storage. It creates client uploads and photo answers through the API, verifies signing failure/retry, storage failure/reload, image decoding and downloaded bytes, then opens the saved photo through Discuss with client. The shared intake regression also uses a real upload and submitted photo answer. The full invitation/intake suite passes at both widths after removing its simulated photo transport.

All three SubmissionAnswers consumers are covered: check-in response, client intake and conversation preview. No API contract changed. Build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). Screenshots: tests/check-ins/artifacts/photo-response-{375,1280}.png. Existing fixture accounts, forms, submissions and storage objects remain in their disposable businesses. Deployed-storage and physical-device checks remain separate from this local Chromium evidence.
