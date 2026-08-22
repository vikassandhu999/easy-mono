# 04 — Derive API shapes from the generated schema instead of redeclaring them

**What to build:** Five hand-rolled response shapes duplicate a generated type exactly. `frontend/AGENTS.md` already forbids this ("Types come from `schema.ts` … do not redeclare the shape"), and each local alias is what forces the remaining casts that ticket 03 could not remove.

**Blocked by:** 03

**Status:** resolved

- [x] `ApiResponse<T>` (`coachapp-v2/src/api/shared.ts:1`) is replaced by the generated `ClientResponse` at its four call sites in `clients.ts` (`:53, :101, :116, :146`).
- [x] `QueuePage<T>` (`api/workbench.ts:23`) is replaced by the six generated `Workbench*QueueResponse` types.
- [x] `WorkbenchCountsResponse` (`api/workbench.ts:10`) is replaced by the identically named generated schema type.
- [x] `ClientListResponse` (`api/clients.ts:38`) and `ClientSummary` (`:32`) are replaced by their generated twins.
- [x] `MessagesPage` (coach `api/conversations.ts:14`) and the client's equivalent are replaced by the generated `ChatMessagesResponse`.
- [x] The ~14 casts these aliases were propping up are gone once the local shapes are. *(One fewer: workbench counts. Twelve remain on client/workbench queue endpoints — see Answer.)*
- [x] `ErrorResponse` is explicitly NOT derived. The generated version lacks `error_code`, `error_message`, and `error_detail`, because the backend declares the real shape per endpoint. Ticket 05 owns that type; leave it hand-written and record the backend spec gap in the answer.
- [x] Derivation uses `Pick`/`Omit`/indexed access rather than a fresh declaration wherever only part of a generated shape is needed.
- [x] Both apps build clean and `pnpm -C apps/<app> check` passes.

## Answer

Replaced five hand-rolled response aliases with `components['schemas'][…]` exports: `ClientResponse`, `ClientListResponse`, `ClientSummary`, `WorkbenchCountsResponse`, six `Workbench*QueueResponse` types, and `ChatMessagesResponse`. Deleted `ApiResponse<T>` from `shared.ts`.

Cast removal: `MessagesPage` and `WorkbenchCountsResponse` needed no casts once derived. Client and workbench queue endpoints still need twelve `as Promise<…>` casts — not because the aliases differed from schema (they were byte-identical), but because openapi-fetch widens `RequiredServices` tuple literals to plain arrays on nested `Client` objects. Those casts now target the generated type names (`ClientResponse`, `ClientListResponse`, `Workbench*QueueResponse`) instead of the deleted `ApiResponse` / `QueuePage` wrappers. One cast fewer than ticket 03 (workbench counts).

`ErrorResponse` left hand-written in `shared.ts` for ticket 05 — generated schema still lacks `error_code`, `error_message`, and `error_detail`.
