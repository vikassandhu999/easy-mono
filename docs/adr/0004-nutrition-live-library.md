# Live Library values, frozen Diary history

A Menu is a prescription of Library items and chosen portions. Its names, serving
weights, and nutrients all follow the current Library. Recipe ingredient servings
follow their Food in the same way. Saving a Menu validates these references; it
does not persist calculated nutrition. Copies retain independent menu structure
while referring to the same Library.

This means editing a Food or Recipe changes every referencing plan, including
archived plans. A plan is not a historical nutrition snapshot. The Diary supplies
that history: offered meals freeze when a slot starts, actual intake stores its
own portion and nutrients, and day targets freeze on the first successful slot save.
A later plan or Library edit cannot rewrite recorded values.

Multi-query reads and Diary saves use one repeatable-read transaction. Concurrent
writers can continue while each reader sees a coherent version. A Diary save that
encounters a serialization conflict rolls back and returns 409; there is no hidden
retry. Different slots can conflict through shared day creation or activity state. Saves and Library mutations
use ordered row locks to protect reference validity. A referenced source, named
Food serving, or required Recipe cooked weight cannot be removed. Serving weights
and nutrient values can change.

Portions and nutrient totals each have one map representation and one Ecto type.
Diary snapshots store those values as JSONB with database checks. They retain one
scalar source ID without a Library foreign key. Availability is checked on read;
deleting a source hides the link and leaves historical identity and values intact.
Kind and completeness are derived, never stored alongside their inputs.

The tradeoff is calculating live values when reading plans. There is no materialized
nutrition cache to synchronize. If measured read costs later require one, it must
preserve this live-value contract rather than silently serving a mixture of versions.

The migration backfills Diary days, converts stored portions and nutrients, removes
redundant columns, and preserves Food image URLs as system Media records. Stop
application writers and back up the database before migrating. Deploy matching
backend and frontend releases together. Rollback restores the backup and matching
release; runtime compatibility paths are not retained.
