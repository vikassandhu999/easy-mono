# Nutrition code guide

Start with [the nutrition code map](../docs/nutrition-code-map.md). It describes
current behavior, module ownership, contracts, and verification commands.

The system has three contexts:

- `Easy.Nutrition.Library`: foods, recipes, portion resolution, nutrients.
- `Easy.Nutrition.Programming`: templates, client plans, complete menus, coverage.
- `Easy.Nutrition.Diary`: revisioned slot saves, frozen guidance, actual intake.

Public JSON types live in `backend/lib/easy_web/types/`. Controllers use
`EasyWeb.Type` and `typed_controller`; `just gen-api` regenerates both frontend
contracts. Do not add handwritten copies of generated types.

The menu saves as one document. Recipe ingredients save as one ordered array of
`{food_id, portion}`. Diary writes save one or more complete slots atomically.
Each aggregate has one revision. Database constraints enforce ownership and
uniqueness; backend transactions keep multi-row changes coherent.

There are no diary command endpoints, request-key maps, replay ledgers, or legacy
response adapters. The historical migration that created the ledger remains part
of database history; the new migration drops it and removes per-entry revisions.
Existing recipe ingredient weights migrate to gram portions without changing the
weights used for nutrition calculations.

Frontend forms own their drafts. API hooks own requests and cache effects.
Assignment dialog visibility belongs to its parent screen. See the code map for
where each behavior is implemented and tested.
