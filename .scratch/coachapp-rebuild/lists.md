# Shared lists and server-owned values

The coach needs to find a form or client as their library grows, open it, and return to the same place. Forms and Clients share cursor pagination, search, loading, and recovery behavior. The user requested this foundation before more screens.

## Ownership

The API owns filtering, total result counts, question counts, and selecting the client's intake. The screen renders returned records. Draft question ordering and validation stay in the form editor because those values have not been saved yet.

`api/pagination.ts` defines the shared TanStack Query cursor options and derives its page metadata from the generated contract. Resource hooks supply typed filters, query keys, requests, and abort signals. `ui/infinite-list.tsx` renders native list semantics, initial loading/error/empty states, server totals, refresh, and the next-page control. An intersection observer loads the next page near the bottom; the same button works with a keyboard or when the observer is unavailable. Loading more never cancels an active refresh. A failed page pauses automatic loading and keeps the loaded records available.

Search is debounced by 300 ms and stored in the URL. Purpose changes get their own cache entry. Aborted requests cannot overwrite another search. React Router restores list scroll positions from the route and query string; `ui/list-location.ts` carries originating filters through form Cancel/Save and client overview/invitation return links. Query data stays in the session cache, with the existing logout/account-change clearing behavior. Reload restores filters and fetches the first page; it does not persist client records to browser storage.

## API contract

`GET /v1/coach/form-templates?cursor=start&limit=20` and `GET /v1/coach/clients?cursor=start&limit=20` return `data`, `count`, and `next_cursor`. Follow `next_cursor` unchanged; null means the sequence is exhausted. Page size defaults to 20 and is capped at 100. Ordering is descending `inserted_at`, then `id`, supported by tenant-leading indexes. Counts include the whole filtered result, independent of the page position. Every page reapplies business scope and client visibility.

Cursor paging tolerates deletion of an anchor and additions ahead of it without offset shifts. It is not a database snapshot: changes to records or search membership may appear on a subsequent refresh. Refresh restarts from the first cursor and fetches the cached pages sequentially. Very long lists still retain their loaded records and DOM rows; virtualization can be added to this shared component if measured list sizes justify it.

Forms accept server `search` and `purpose`. Search treats percent and underscore as literal characters. `FormTemplate.question_count` is supplied on list, detail, write, default intake, and nested assignment responses. `GET /v1/coach/clients/{client_id}/intake` returns the client's intake or null, after authorization; the browser no longer filters and sorts the assignment collection.

Clients keep their offset contract for existing consumers. Form-template requests without a cursor keep the full-list response for the live `coachapp-v2` consumer. Form filters/limit without a cursor and client cursor requests with incompatible offset/sort return 422. This compatibility path is confined to the legacy consumer; new coachapp lists always send a cursor. Retire it when that consumer migrates.

## Verification

Browser coverage lives in `tests/lists/lists.browser.mjs`: 46 real forms across three pages, later-page failure and retry, automatic loading pause, keyboard activation, unique rows, server search beyond page one, purpose filtering, delayed-search cancellation, refresh failure/retry, URL reload, editor/back scroll restoration, offline recovery, observer-free keyboard loading, and account replacement during a pending page. Clients use real API pages of two records to exercise the same component within a free account's seat limit.

Backend controller tests cover tie-breaking, deletion/insertion between pages, malformed cursors, trainer/business isolation, nullable intake, query validation, page bounds, literal search, and nonzero question counts including writes and nested templates. Browser accounts use the isolated database and local mail delivery.

The implementation follows [TanStack Query's infinite query request and refetch behavior](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries) and [React Router's scroll restoration](https://reactrouter.com/api/components/ScrollRestoration).

Verified on 2026-09-10 at 375px and 1280px. The Forms, Clients/intake, and authentication browser suites also passed. Backend `mix precommit` passed 1,629 tests. The coachapp build and repository shape checks passed; Vite still reports its bundle-size warning. No target-coach usability review or production deployment was performed.

Generated-contract consumer checks: `clientapp-v2` typecheck passed. `coachapp-v2` typecheck reports React ref-type incompatibilities in `question-type-meta.ts` and `meal-palette.tsx`; those handwritten files are outside this change. Its generated API schema was refreshed, and its full-list request behavior is preserved.
