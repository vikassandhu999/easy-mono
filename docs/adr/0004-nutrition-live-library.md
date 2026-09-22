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
Diary snapshots store those values inside validated JSONB slot documents, as
recorded in [the slot document decision](0005-nutrition-diary-slot-document.md). They retain one
scalar source ID without a Library foreign key. Availability is checked on read;
deleting a source hides the link and leaves historical identity and values intact.
Kind and completeness are derived, never stored alongside their inputs.

The tradeoff is calculating live values when reading plans. There is no materialized
nutrition cache to synchronize. If measured read costs later require one, it must
preserve this live-value contract rather than silently serving a mixture of versions.

The 2026-09-22 prototype baseline creates Diary days, portion documents, and Media
references directly. CSV seeds create Food images as system Media records. The
earlier conversion migrations remain in Git history; databases using that history
require the [baseline reset](../../backend/README.md#database-baseline).
