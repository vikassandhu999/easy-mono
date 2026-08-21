# 15 — Serve durable history and coach summaries

**What to build:** Serve bounded client history and coach summaries from frozen Diary rows only. Historical intake remains readable after mutable Programming or Library content is deleted, and every screen uses the same backend-derived status and total rules.

**Blocked by:** 09 — Protect Library content used by Menus; 13 — Switch frozen Meal Options safely; 14 — Correct and substitute Diary Entries

**Status:** resolved

- [x] Nutrition Day history accepts bounded pagination and valid local-date filters and rejects malformed or reversed ranges.
- [x] Past Nutrition Days are assembled from Diary rows only and never join mutable Programming to reconstruct guidance.
- [x] Client history and authorized coach/owner history return the same slots, entries, statuses, totals, timestamps, and applied timezone vocabulary.
- [x] Coaches, owners, and admins remain unable to create, replace, update, delete, or switch client Diary data.
- [x] Coach summaries derive counts and totals from the same stored relationships and status rules as Nutrition Day detail.
- [x] Calorie-based adherence is unavailable when calories are unknown, while other known nutrient totals remain visible.
- [x] Deleting a Nutrition Template leaves assigned Client Plans and Diary history unchanged.
- [x] Deleting a Client Plan leaves Diary history unchanged and may null optional plan provenance without changing frozen values.
- [x] After structural blockers are removed, deleting a Food or Recipe may null its optional Diary reference while names, Portions, nutrients, completeness, and statuses remain readable.
- [x] Inactive-client access follows the application's account lifecycle policy.
- [x] Client History and coach Nutrition views use the common Nutrition Day contract and contain no frontend status or total reconciliation.
- [x] Diary, Library, Programming, controller, contract, authorization, deletion, summary, and frontend tests cover frozen-history durability and common interpretation.

## Answer

`GET /v1/client/nutrition-days` and `GET /v1/coach/clients/:id/nutrition-days` paginate a bounded local-date range (`offset`/`limit`, max 31 days) and attach one `summary` (logged/planned totals, status counts, `has_intake`, calorie `adherence`) plus `applied_timezone`. Past dates skip Programming. Adherence is `none` without intake, `null` when calories or a positive target are unknown, otherwise `on`/`under`/`over` against target. Template/plan/library deletes leave frozen Diary rows; inactive clients get HTTP 403 while coaches can still read. Client History and coach Nutrition consume that summary instead of walking rows.
