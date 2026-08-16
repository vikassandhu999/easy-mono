# 03 — Rewrite the Recipe Library contract

**What to build:** Move retained Recipe behavior behind Nutrition Library and make Recipe composition and Portions consistent across backend, contract, and both applications. A Recipe is an ordered composition of Foods and always supports serving-based use.

**Blocked by:** 02 — Rewrite the Food Library contract

**Status:** ready-for-agent

- [ ] Existing Recipes and Recipe Ingredients survive the rewrite with trusted tenant ownership.
- [ ] Every Recipe has a positive servings count; cooked weight is optional and positive when present.
- [ ] Recipe Ingredients reference visible Foods only, use positive gram weights, and have deterministic unique positions.
- [ ] Recipe creation and update replace metadata and the complete ingredient collection atomically with expected revision checking.
- [ ] Recipe subrecipes are rejected at the contract and domain boundaries.
- [ ] Every Recipe accepts positive serving Portions, while gram Portions are accepted only when cooked weight exists.
- [ ] Recipe nutrient calculation uses the Food Library rules for nullable nutrients, completeness, full calculation precision, and response rounding.
- [ ] Recipe listing, search, detail, create, edit, duplication, impact, and deletion work through the generated contract in the coach app.
- [ ] Client Recipe browsing uses the same visible Library and Portion vocabulary.
- [ ] Library exposes one batch item-and-Portion resolver that returns Food and Recipe results in input identity order for later Programming and Diary callers.
- [ ] Library, database, controller, contract, and frontend tests cover tenant isolation, atomic replacement, portions, revisions, duplication, and incomplete nutrients.

