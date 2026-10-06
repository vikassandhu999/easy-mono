# Slice 2 journal foundation

The journal no longer checks coaching terms. RequireCoaching remains the HTTP write gate. A route test verifies that an ended client can read a session but receives 403 for a write.

RecordJournal.actor(ctx) supplies a client or coach membership id. Training record creation and journal rows use that same tuple. Coach writes use write_for_client(ctx, client_id, operation), with tenant and coach access checks.

The journal locks the client before it runs the operation. It allocates one sequence and inserts history only when the operation returns changes. An error rolls the transaction back. A no-op does not update the sequence.

Verification: the three regression tests first failed for the reported defects. After the fix, record_journal_test and the training HTTP tests passed: 10 tests, zero failures. Journal concurrency tests also passed. Final full verification belongs in s2-report.md.

Choices: actor identity is the membership id, not the linked user id. The shared helper exposes a coach-targeted write function for later Tracker work; no coach workout or meal endpoint was added.

The HTTP gate also checks the requested diary date. A regression test first reproduced an extra meal accepted outside coaching; the fixed route denies it while accepting today. Final backend precommit: 672 tests, zero failures.
