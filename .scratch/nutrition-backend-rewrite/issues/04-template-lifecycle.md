# 04 — Reset Programming and deliver Template lifecycle

**What to build:** Begin the destructive Programming rewrite and make valid empty Nutrition Templates usable end to end. Coaches can manage Template metadata and lifecycle through the typed plan aggregate while retained Library content remains intact.

**Blocked by:** 03 — Rewrite the Recipe Library contract

**Status:** resolved

- [x] Legacy Nutrition Programming data is discarded without changing retained Foods, Recipes, media, Businesses, or Clients.
- [x] Nutrition Templates and Client Nutrition Plans share one plan aggregate with an explicit kind and database checks for kind-specific fields.
- [x] Creating a Template also creates one empty Everyday Day Pattern and assigns it to all seven weekdays.
- [x] A plan always has at least one Day Pattern, and an empty Day Pattern is valid.
- [x] Coaches can list, search, create, read, edit, archive, restore, delete, and duplicate Templates through top-level plan routes.
- [x] Archived plans are read-only except for restore and delete; active plans may also be deleted explicitly.
- [x] Template metadata, targets, lifecycle changes, deletion, and duplication use the expected plan or source revision.
- [x] Archived Templates and Client Plans cannot be assigned or duplicated, and Client Plans cannot act as sources.
- [x] Plan responses expose explicit kind, revision, archive state, and derived lifecycle vocabulary through OpenAPI.
- [x] The coach Template list and create/edit/detail flows use the replacement contract and handle revision conflicts.
- [x] Programming, database, controller, contract, and coach-app tests cover kind constraints, tenant isolation, lifecycle, deletion, duplication, and empty Template creation.

## Answer

Nutrition Programming now lives in `Easy.Nutrition.Programming`. One `nutrition_plans` row is either a Template or a Client Plan (`kind`), with `revision` and `archived_at`. Creating a Template also inserts one empty Everyday Day Pattern and points all seven weekdays at it. Coach top-level routes list, search, create, read, edit, archive, restore, delete, and duplicate Templates. Metadata, targets, lifecycle, delete, and duplicate send the observed revision and return 409 `stale_revision` when it is stale. Archived plans refuse metadata edits; restore and delete still work; active plans may be deleted. Duplicate refuses archived sources and Client Plans. OpenAPI exposes `kind`, `revision`, `archived_at`, derived `status`, and `lifecycle` (`null` on Templates). The coach list uses `?archived=`; create/edit/detail send `expected_revision` and reload on conflict. Assignment and Menu writes stay on later tickets. Leftover meal/day tables remain so Diary still compiles; Programming writes go only to Day Patterns and the Week Schedule.
