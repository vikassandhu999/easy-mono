# Today and training

Status: design, bounded contract audit, and client cursor contracts; no training screen is delivered yet. Every screen keeps the phone composition on tablets and wide browsers.

## Screen brief

The client needs to see today's guidance, resume an interrupted workout, and record what they actually did. Today leads with an active session, then pending intake/check-ins and scheduled training. Nutrition joins this screen when its complete logging flow is available. A missing plan, a scheduled rest day, and a failed request have distinct messages.

Two recording layouts were considered: a continuous worksheet containing every editable set, or one exercise at a time with a compact exercise outline. Use the latter. It keeps the current target and the save action close to a phone keyboard while preserving quick movement between exercises. Each exercise shows its name and prescribed targets before saved sets and the next entry. Optional notes and effort stay behind a secondary action. A saved set can be edited or removed while the session remains active.

Entry points are Today, the Training destination, and supported session deep links. The sequence is guidance, workout preview, Start or Resume, record sets, finish, saved session, and return. Offer a different workout from the covering plan because the backend permits it; do not infer that a scheduled workout is the only startable one. Freestyle uses the supported exercise-name/catalog contract.

Keep unsent set inputs and session notes in account-owned durable drafts. On restart, load the saved session and reconcile its sets before offering another write. Cached guidance remains readable with its saved time. Starting, recording, finishing, and discarding require connectivity and explicit actions. A lost creation response must recover the same saved record; it must never silently add another set. Finish and discard receive focused confirmations and saved outcomes. Discard must not run merely because the client leaves the recording screen.

Empty guidance offers the available training choices. Failed reads retain cached content where available and expose Retry. Failed writes retain their input. A session completed or discarded elsewhere becomes a saved reader, with unsent local input still recoverable until deliberately removed. The frozen prescription from the session remains authoritative even when the assigned plan changes.

## Contract audit and prerequisites

Source inspection used the client typed controllers, `Easy.Training.Execution`, `Easy.Training.PerformedSets`, `Easy.Training.PlanReader`, their typed responses, and `Easy.Clients.Client`. Graph MCP tools were unavailable; no graph freshness or exhaustive coverage claim is made.

* Client plan and session indexes now support opaque cursor pages through the existing coach paging implementation. Plans accept server search; sessions accept search, state and inclusive date filters. Both retain offset compatibility and return server counts. Initial cursor is `start`. Cursor ordering uses insertion timestamp and ID; legacy session offset reads retain their existing start-time ordering. Training UI consumers remain pending.
* `Execution.start_client_session/3` enforces one active session per client through a database constraint. A lost Start response can be reconciled with the active-session endpoint. Completion/discard already return the same terminal state on repeated calls. Preserve these rules and verify conflicting terminal transitions.
* `PerformedSets.create_client_performed_set/3` appends a position under a session lock, but has no request identity. Two successful retries can create two sets. Add an account/session-scoped stable creation identity with uniqueness and conflict behavior before building reliable retry. Tests must distinguish a retry from another deliberate set with equal values and protect tenant isolation.
* The client profile now returns its applied `timezone` and server-owned `local_date`. Default coverage and planned/freestyle session starts use the same client calendar. An explicit coverage date remains explicit. The frontend must refresh date-sensitive guidance on resume and must not substitute the browser's timezone.
* Session responses contain a frozen plan/workout/exercise prescription and performed sets. Use these generated types directly. Planned exercise identity is `snapshot_exercise_ref`; server positions order performed sets. Current plan revisions cannot overwrite the session prescription.

These are focused prerequisites for the supported workflow. Follow the repository API-change process, regenerate contracts, and verify behavior through router tests before building the screens.

## Verification to complete

2026-09-19 cursor prerequisite: 32 focused router/context tests pass, including tied timestamps, deleted cursor boundaries, newly inserted rows, same-business/foreign-business isolation, filtered totals, invalid inputs and the 100-row maximum. `just gen-api`, strict client build (using the task API on port 4100), repository shape checks and full backend precommit pass (1,806 tests). The API-change subagent reviewed the typed contracts and generated current-client schema with no gaps. No screen or native training behavior is claimed by this backend checkpoint.

2026-09-19 calendar prerequisite: 39 focused context/router tests and full backend precommit pass (1,809 tests). Calendar tests cover both sides of UTC midnight and a daylight-saving transition. A real-router test chooses a timezone on a different day from UTC and verifies profile, default coverage and planned/freestyle creation agree; explicit UTC coverage remains separate. Generated contracts, strict client build, repository shape checks and API-change review pass. Existing date-sensitive training tests now use client-local dates.

Exercise planned and freestyle sessions against Phoenix: server-local today, rest and missing-coverage states, start/resume, every supported tracking type, save/edit/remove, frozen targets after a coach edit, completion/discard, saved history and return. Inject a lost set response and verify one persisted set after deliberate retry. Check concurrent terminal changes and account isolation. Verify draft and cached-session recovery with offline reload, native background/restart, native keyboard and Android back. Browser checks at 375, 768 and 1280 pixels must keep one mobile composition. Physical-device and real-client observations remain separate evidence.
