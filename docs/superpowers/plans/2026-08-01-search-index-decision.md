# Search Index Decision

**Decision:** Do not install `pg_trgm` or add trigram indexes for the prototype yet.

## Current evidence

Measured against the local development database on 2026-08-01:

| Search path | Largest relevant set | Shape |
| --- | ---: | --- |
| Clients: first name, last name, email, phone | 57 in one tenant | `ILIKE '%term%'` |
| Recipes: name | 3 in one tenant | `ILIKE '%term%'` |
| Exercises: name | 417 visible rows | `ILIKE '%term%'` |
| Nutrition plans: name | 15 in one tenant | `ILIKE '%term%'` |
| Training plans: name | 11 in one tenant | `ILIKE '%term%'` |
| Muscles: name | 20 total | `ILIKE '%term%'` |
| Equipment: name | 8 total | `ILIKE '%term%'` |
| Foods | 55,230 visible rows | Existing GIN full-text `search_vector` |

The widest client query used a sequential scan as expected, but completed in 0.057 ms. The installed extensions are `btree_gist` and `plpgsql`; `pg_trgm` is not currently part of the deployment schema.

## Trigger to revisit

Add `pg_trgm` and the smallest index for the measured slow route when either:

- a searched tenant/global set approaches 10,000 rows; or
- production p95 or representative `EXPLAIN ANALYZE` exceeds 25 ms.

Do not pre-emptively index every `Easy.Search` caller. For clients, compare separate column indexes against one generated search document using real query plans before choosing.
