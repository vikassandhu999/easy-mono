# Slice 2: Client Nutrition

The client uses the Nutrition content and diary contract. Today lists the expected slot names and recorded counts. The day screen shows expected and recorded meals, the server nutrient totals and known-entry counts, and the target ranges. Unknown nutrient values display as `Unknown`. The plan reader shows the weekly pattern schedule, custom slots, per-pattern targets and copied meal items.

The meal editor supports planned options and items, portion edits, food and recipe swaps, extra entries, quick adds, entry notes and a note to the coach. The food picker calculates its displayed nutrients for the selected portion. The food and recipe search still uses server cursors.

The existing verified-account storage and durable draft controller remain in use. Before a save, the editor stores the exact request, including the meal request ID and all entry request IDs. An uncertain response locks the draft. A later explicit `Check meal save` reads the server and checks the saved request ID. If no save is present, it sends the same request. Reconnection does not send a draft. Revision conflicts retain the draft for an explicit comparison. Read-only dates cannot change saved records. UUID slot paths now work in authentication return paths and native deep links.

## Choices

- Quick add requires calories. Other nutrient fields are optional. An empty field omits the nutrient; zero remains a known zero.
- A new extra meal has an editable name. The default is `Meal`; the server enforces the unique name on that date.
- A planned option starts with its items unrecorded. `Record all listed items` includes them in intake.
- Nutrient display rounds to one decimal place. Requests retain the entered value; the browser does not calculate authoritative daily totals.
- A new extra meal clears its local creation draft after a confirmed save. Saved extras reopen by their record ID.
- Retired nutrition browser and native fixtures were removed because they call the deleted contract. `test:nutrition` now runs the combined slice-2 flow under coachapp.

## Verification

- `rtk pnpm -C frontend/apps/clientapp check`: pass. Draft tests check exact request restoration, date/slot draft isolation, rejected altered attempts, quick-add unknown and zero values, and incomplete portion input recovery. The portion test checks a 30 g portion of 200 kcal/100 g gives 60 kcal and does not invent fiber.
- `rtk pnpm -C frontend/apps/clientapp build`: pass against the generated slice-2 schema. TypeScript, all unit suites, and Vite pass. Vite reports the existing large-chunk advisory (main bundle about 797 kB).
- Focused Biome check of all changed client Nutrition files, route filters, tests, and package script: pass.
- Live browser flow and screenshots: owned by the root slice-2 flow.
- Native device and simulator verification: not run for slice 2. Earlier native Nutrition evidence uses the retired contract and does not establish this implementation's native behavior.

## Review correction R1

A fresh meal read now finds an existing record by its ID first, then by the planned slot ID or the extra meal's name. A first save from another device therefore produces a conflict even when the local draft has a different generated meal ID.

`Keep draft for review` adopts the saved meal ID, revision, name, plan revision, slot and chosen option. It keeps the client's draft food content, portions and notes, and gives the reviewed operation new request IDs. If the saved prescription differs, the retained foods become extra entries: their old planned-item links are removed. The confirmation explains this rule. An extra meal's name can still be edited to resolve a name conflict without replacing the existing meal.

The day guidance also displays the target revision number.

`tests/nutrition/conflict.test.ts` checks two independently created meal identities, slot lookup, explicit review, the next valid revision, retained portions and notes, fresh request IDs, changed-prescription handling, and extra meal name lookup. `rtk pnpm -C frontend/apps/clientapp build` and focused Biome checks pass after the correction. The parent owns the live browser recheck.

## Review correction R4

Planned meals now expose `Meal name`, with help that this names the record and does not change the plan slot. Before a write, the fresh day read checks for the same name on a different slot or extra meal. That conflict shows `Meal name is already used. Enter a different name.` and clears the pending attempt while retaining the draft. The client can rename and save; it does not adopt or overwrite an unrelated extra meal. Name changes preserve the plan revision, slot, chosen option and planned-item references.

Draft and conflict tests cover the name collision, safe rename preparation, retained entries and fixed prescription references. The client build and focused Biome checks pass after this change.
