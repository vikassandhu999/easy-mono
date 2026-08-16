# 04 — Reset Programming and deliver Template lifecycle

**What to build:** Begin the destructive Programming rewrite and make valid empty Nutrition Templates usable end to end. Coaches can manage Template metadata and lifecycle through the typed plan aggregate while retained Library content remains intact.

**Blocked by:** 03 — Rewrite the Recipe Library contract

**Status:** ready-for-agent

- [ ] Legacy Nutrition Programming data is discarded without changing retained Foods, Recipes, media, Businesses, or Clients.
- [ ] Nutrition Templates and Client Nutrition Plans share one plan aggregate with an explicit kind and database checks for kind-specific fields.
- [ ] Creating a Template also creates one empty Everyday Day Pattern and assigns it to all seven weekdays.
- [ ] A plan always has at least one Day Pattern, and an empty Day Pattern is valid.
- [ ] Coaches can list, search, create, read, edit, archive, restore, delete, and duplicate Templates through top-level plan routes.
- [ ] Archived plans are read-only except for restore and delete; active plans may also be deleted explicitly.
- [ ] Template metadata, targets, lifecycle changes, deletion, and duplication use the expected plan or source revision.
- [ ] Archived Templates and Client Plans cannot be assigned or duplicated, and Client Plans cannot act as sources.
- [ ] Plan responses expose explicit kind, revision, archive state, and derived lifecycle vocabulary through OpenAPI.
- [ ] The coach Template list and create/edit/detail flows use the replacement contract and handle revision conflicts.
- [ ] Programming, database, controller, contract, and coach-app tests cover kind constraints, tenant isolation, lifecycle, deletion, duplication, and empty Template creation.
