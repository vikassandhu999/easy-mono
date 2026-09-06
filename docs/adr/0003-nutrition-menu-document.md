# Store each nutrition menu as a plan-owned document

A coach saves a complete Menu. Assignment copies a complete Menu into an independent
Client Nutrition Plan. `nutrition_plans.menu` stores that unit as JSONB, represented
by Ecto embedded values. Plan details, ownership, revision, targets, and coverage
dates remain relational columns with their database constraints.

Meals, Menu Items, and Day Patterns have UUIDs local to their Menu. Copies retain
those IDs under a different plan ID. Each Slot lists ordered Meal IDs for one
Meal Slot. Array order replaces database position columns. This removes five child
tables, their ownership checks, row reconciliation, and copy-ID maps.

Menu validation is pure. Programming owns its transaction and revision check.
Library resolves portions and nutrients on Save. Reads use current Library names
with the stored nutrients and resolved weights. Diary freezes offered values when
a slot starts and retains its own relational identities for recording intake.

The document removes menu-to-Library foreign keys. Ordered Library row locks and
tenant-scoped JSONB usage queries protect references during application writes.
Direct SQL bypasses that protection. Recipe ingredient foreign keys remain, and
there is no second reference table or writable cache. Tests use independent
connections to exercise both orders of saves and destructive Library mutations.

The cutover is a forward migration that backfills saved values before removing the
child tables and the frozen option's live meal FK. It requires stopped application
writers and matching backend/frontend releases. Back up the database before the
migration. Rollback restores that backup with its matching application release.
Historical migrations remain executable history; runtime compatibility readers do
not remain in the application.
