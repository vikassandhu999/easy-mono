# 02 — Rewrite the Food Library contract

**What to build:** Move retained Food behavior behind the Nutrition Library interface and carry the replacement contract through the coach and client applications. Coaches can manage business Foods, while clients can browse the same visible Library for intake.

**Blocked by:** 01 — Install local-calendar and Nutrition foundations

**Status:** ready-for-agent

- [ ] Existing Foods and their authorized media references survive the rewrite unchanged unless a canonical invariant requires an in-place adjustment.
- [ ] System and imported Foods are read-only; Food creation always stamps custom source and trusted business ownership.
- [ ] Any coach in the business can update or delete a business-owned Food regardless of creator identity.
- [ ] Food writes use expected revisions and return a conflict with the latest revision after a stale mutation.
- [ ] A Food may have no serving sizes; every nonempty serving-size collection has exactly one default and only positive amounts and gram weights.
- [ ] Serving sizes are embedded values without stable IDs, and a selected serving resolves to positive grams while retaining its display value.
- [ ] Calories, protein, carbohydrates, fat, and fiber are nullable canonical nutrients; sugar remains Food metadata and unknown values never become zero.
- [ ] Food totals expose completeness, retain calculation precision, and round canonical nutrient values to one decimal only in responses.
- [ ] Food list, search, filters, categories, detail, copy, create, update, and delete work through the generated contract in the coach app.
- [ ] Client Food browsing uses the same visibility and response vocabulary through the generated contract.
- [ ] Library, database, controller, contract, and frontend tests cover tenant isolation, permissions, serving-size rules, revisions, unknown nutrients, and response rounding.

