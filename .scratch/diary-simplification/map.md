# Diary simplification

## Notes

User asked for Simple code: local ownership and fewer interacting representations.

## Decisions so far

* [Complete slot values](issues/01-slot-documents.md): two Diary tables, one document
  per slot, one persistence path, one live/frozen renderer, slot-local entry IDs.
  Validated migration preservation, backend tests, and real browser journeys.
* [Storage decision](../../docs/adr/0005-nutrition-diary-slot-document.md) records
  ownership, validation, and the forward-only migration.
* [Audit cleanup](issues/02-audit-cleanup.md): keyed Library resolution removes
  positional coupling; retained direct returns, typed dates, and slot ownership.
  Migration history stays because the repository records a production database.

## Fog

None for this iteration. Changes await the user's commit request.
