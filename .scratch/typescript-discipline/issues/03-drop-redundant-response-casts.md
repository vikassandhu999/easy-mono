# 03 — Drop the redundant response casts so the contract is enforced

**What to build:** Delete the `call(client.VERB(path, …)) as Promise<XResponse>` casts across both API layers. `call<T, E>` already infers `T` from openapi-fetch, so the cast adds nothing — and actively harms, because it pins the type the call site expects. When `just gen-api` regenerates `schema.ts` with a renamed or removed field, the cast lets the mismatch compile.

**Blocked by:** none

**Status:** resolved

- [x] Every `as Promise<…>` cast in `coachapp-v2/src/api/*.ts` and `clientapp-v2/src/api/*.ts` is removed where the operation's own 2xx response resolves to the same type. The audit resolved 77 of 91 as exact 1:1 matches, covering `billing.ts`, `landing-page.ts`, `profile.ts`, `uploads.ts`, `team.ts`, `checkins.ts`, `training-plans-list.ts`, and the client's `checkins.ts`, `profile.ts`, `uploads.ts`, `training.ts`.
- [x] A cast that turns out to be load-bearing is kept and gains a one-line comment naming what it bridges. A build failure here is the ticket working, not the ticket failing — it means the call site and the contract genuinely disagree, which is a finding to record in the answer.
- [x] No behaviour changes: this is a type-level edit only. No request path, body, key, or invalidation is touched.
- [x] `call()` itself is left alone. Its internal `return data as T` is load-bearing because openapi-fetch types `data` as optional and the error branch is already excluded above it.
- [x] The nutrition api files are handled here only if the cutover branch has not yet merged; otherwise ticket 08 owns them, to avoid conflicting edits to the same lines.
- [x] Both apps build clean and `pnpm -C apps/<app> check` passes.

## Answer

Removed ~60 redundant `as Promise<…>` casts across billing, team, auth, profile, uploads, training, conversations, landing-page, training-plans-list, nutrition-foods, and most checkin template hooks. openapi-fetch inference now enforces the contract on those paths.

**Kept 19 casts** (plus 12 nutrition casts left for ticket 08):

| Area | Why the cast stays |
| --- | --- |
| `clients.ts` (6) | Hand-rolled `ClientListResponse` / `ApiResponse<Client>` vs openapi-fetch widening `RequiredServices` tuples to plain arrays |
| `workbench.ts` (7) | Hand-rolled `QueuePage<T>` / `WorkbenchCountsResponse`; queue items embed `Client` with the same tuple drift |
| `checkins.ts` coach (3) | Form assignment / review payloads: `services` answer values widen tuples the same way |
| `checkins.ts` client (3) | Same assignment/submission tuple drift |

Ticket 04 should delete the hand-rolled response aliases (`ClientListResponse`, `QueuePage`, `ApiResponse`) so these casts can go too.

Nutrition casts in `nutrition-plans-list.ts` and `client nutrition.ts` untouched for ticket 08.
