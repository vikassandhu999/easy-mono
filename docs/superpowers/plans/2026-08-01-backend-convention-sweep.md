# Backend Convention Sweep

## Scope

- Move reusable preload query builders from contexts to their owning schemas.
- Align ordinary list endpoints with the context default: 20 rows, maximum 100.
- Keep chat message history at 50 rows because it is a timeline, not an entity list.
- Add missing specs to the audited channel, plug, fallback, and JSON public functions.
- Give food full-text search a stable `name, id` tie-break after rank.

## Deliberately unchanged

- Weight history and the two form-assignment lists remain unpaginated. Their expected growth is about one record per day per client (roughly 100–365 rows per year), so pagination would add contract work before there is a measured problem.
- Nutrition and training schedule writes remain one reset plus at most seven grouped updates. The input is fixed to seven weekdays; a set-based rewrite would save only a bounded handful of queries while making validation and updates harder to read.

## Verification

- Targeted food search-order test.
- Backend `mix precommit`.
- Repository removal check and whitespace check.
