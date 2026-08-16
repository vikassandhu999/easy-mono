# 09 — Protect Library content used by Menus

**What to build:** Prevent Library changes from breaking Recipes or live Menus. Coaches should receive tenant-safe usage impact and a domain conflict before a structural Food, Recipe, or Portion dependency can be removed.

**Blocked by:** 07 — Assign Templates and manage Client Plans

**Status:** ready-for-agent

- [ ] Food and Recipe usage impact includes Recipe Ingredients and direct Menu references in active, archived, Template, and Client Plan states.
- [ ] Every usage-impact and existence query is tenant-scoped and cannot reveal or be blocked by another business's rows.
- [ ] Deleting a Food used by a Recipe Ingredient or Menu returns an in-use domain error before the database constraint is reached.
- [ ] Deleting a Recipe used by a Menu returns the same domain-level in-use behavior.
- [ ] Restorable archived plans continue to block destructive Library deletion.
- [ ] A Library edit that would invalidate a Menu Portion is rejected; removing Recipe cooked weight while a Menu uses a gram Portion is covered explicitly.
- [ ] Editing or removing a Food serving-size value does not invalidate a Menu Item that already retained its display selection and resolved grams.
- [ ] Structural references use restrictive foreign keys and exact-one item constraints; historical reference behavior remains reserved for Diary.
- [ ] Food and Recipe detail flows display useful in-use feedback and impact without exposing tenant identifiers.
- [ ] Library, Programming, database, controller, contract, and frontend tests cover direct and transitive blockers, archived plans, invalidating edits, and tenant isolation.

