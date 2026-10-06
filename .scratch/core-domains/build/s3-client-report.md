# Slice 3: Client Trackers

The retained client app has Today reminders and requests, a searchable server-paged Tracker library, all six recording kinds, and Tracker history. `Add something else` opens the library without changing assignments. Archived history is available from the library.

Shared recording and event prompts live in `src/ui/`. Completed workouts show pending Trackers in the finish screen. Saved meals with pending Trackers stay in the meal logger. Other meal saves keep their existing return path. Reopening the saved event reads the remaining prompts from the server. A failed prompt read keeps the saved meal route, so it does not ask the client to record the meal again.

## Persistence and recovery

Account-scoped durable drafts retain the entered value, date, unit, file order, request ID, correction revision and exact pending request. An uncertain save locks editing and exposes `Check Tracker save`; it does not send on reconnect. A confirmed correction conflict shows the saved revision and the draft. The client must select `Use latest revision with my draft` before a new request ID is made.

Files use the existing private upload path and account-scoped IndexedDB store. PDF is limited to 15 MiB. Reports hold ordered PDF/image attachments in one entry. File date is selected before files are added, then fixed until the selection is removed. Each selected file shows its captured date. Upload tickets and confirmed attachment IDs stay in IndexedDB across interruption. Each draft has a stable file group. Recovery restores a file saved just before its order update. A successful entry starts a new group, so old files cannot enter the next entry.

## Display and access

Built-in units start with the client's unit system. Imperial Body weight starts with lb. Custom units stay literal. History uses server metrics and coverage; the browser converts display units only. It shows a numeric trend, recorded counts, ranges, coach authorship, ordered files and private view/download links. Photo history can compare the latest photo with the previous or first photo. Entry corrections and removal use the generated API. Current coaching gates all writes; history remains readable.

Routes: `/trackers`, `/trackers/:id`, and `/trackers/:id?record=1`. Principal controls: `Search Trackers`, `Record entry`, `Value`, `Unit`, `Rating`, `Answer`, `Your text`, `File date`, `Report files`, `Photos`, `Move up`, `Save entry`, `Check Tracker save`, `Correct entry`, and `Remove entry`.

## Verification

- Client unit checks pass, including the new Tracker draft suite. It checks imperial units, exact retry identity, ordered report recovery, event links, invalid ratings and an explicit No answer.
- Client Biome check passes over all client files.
- Client design lint passes.
- `rtk pnpm -C frontend/apps/clientapp build` passes with the generated Tracker/PDF contract: TypeScript, all unit checks, and Vite. The existing large-chunk advisory remains (about 821 kB main bundle). No generated schema was edited by this worker.
- Root owns the live browser flow and screenshots. Native device, simulator and representative-client checks were not run.

No notifications, reviews, Focus, goals, imports, report parsing, or clientapp-v2 changes are included.

## Review correction: repeated entry corrections

A confirmed correction now seeds its durable draft from the accepted server entry. Reopening `Correct entry` retains the accepted value, local date, entered unit and revision. A successful new entry still prepares an empty form. Only a confirmed response settles the draft; uncertain saves retain the pending request identity.

The Tracker draft test now prepares and confirms a correction from 82 kg to 80 kg, restores the saved draft, and prepares a second correction to 79 kg. It asserts the literal accepted date `2026-10-05` and expected revision `2`, and checks that the second correction has a new request ID. It also checks that an unconfirmed correction keeps its old request ID and expected revision.

After this change, the client build, unit checks, scoped Biome/design checks, and full frontend `lint:ci` pass. Root owns the final live browser rerun.

## Live correction: imperial input precision

When a saved base value converts to an entered unit, the correction input now uses 15 significant digits. This removes binary conversion noise without a fixed decimal-place limit. Values with a conversion factor of one retain their direct numeric text.

The regression failed before the fix with `178.99999999999997` and passes with base `81.19303423` displayed as `179` lb. It also checks base `81.70332564625` displays and submits `180.125` lb, and that unconverted `81.12345678901234` retains its precision. Client build, unit checks, scoped lint, and full frontend `lint:ci` pass after this change.
