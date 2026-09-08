# Diary as complete slot values

Status: resolved

Keep day targets in DiaryDay. Store each slot's frozen options, selected Meal ID,
and complete actual intake in one validated JSONB document. Remove the three child
tables, relational reconstruction, and child-row reconciliation. Entry identities
are local to a slot, like Menu identities are local to a plan. Array order is
canonical. Preserve existing history, public UUIDs, revisions, nutrients, frozen
portions, correction rules, option switching, tenant access, and concurrent-save
rollback. Keep the public request/response shape and frontend operations.

Unify live and frozen rendering around the same slot document. Separate database
orchestration from its pure interpretation. No runtime compatibility readers.
