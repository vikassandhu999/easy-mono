# 14 — Correct and substitute Diary Entries

**What to build:** Let the client correct recent actual intake without changing frozen historical meaning. Substitution, Portion updates, note updates, and deletion use explicit commands, optimistic revisions, the applied timezone, and the shared idempotency wrapper.

**Blocked by:** 12 — Log planned intake and derive statuses

**Status:** resolved

- [x] Replacing a planned fulfilment with another visible Food or Recipe commits atomically and retains the same frozen planned-item association.
- [x] A different substituted source is derived as `swapped`; a Portion-only change remains `as_planned`.
- [x] Updating a Diary Entry accepts Portion and notes only, requires the expected entry revision, and scales the frozen nutrient basis without consulting Library.
- [x] Deleting a Diary Entry requires the expected revision and leaves its Diary Slot, frozen offered options, and frozen planned items intact.
- [x] Add, planned fulfilment, replacement, update, and delete are accepted for today and the previous seven dates, including the exact seventh prior date.
- [x] Existing slots evaluate their correction boundary using their frozen `applied_timezone`; fresh slots use Client timezone with Business fallback.
- [x] An existing frozen past slot may accept planned fulfilments and actual corrections, while an unstarted past slot accepts independent extras only.
- [x] Option switching remains same-day only, and every future-date mutation is rejected.
- [x] Idempotency lookup precedes correction-window validation, so a retained identical retry returns its original success after the window closes.
- [x] Reusing an idempotency key with a changed replacement, update, or delete request returns a conflict.
- [x] The client Today and History flows expose the allowed correction actions and handle stale revisions and closed windows through the generated contract.
- [x] Diary, database, controller, contract, timezone-boundary, revision, idempotency, and client-app tests cover each correction path.

## Answer

`POST /v1/client/nutrition-days/:date/replacements` substitutes a fulfilment in one transaction while keeping the frozen planned-item association (`swapped` vs `as_planned` from source identity). `PATCH`/`DELETE .../entries/:id` take the expected entry revision; updates scale frozen nutrients without Library; deletes leave the slot and snapshots. All three use the idempotency ledger before the seven-day `applied_timezone` window. Client Today (and History via that screen) posts those commands through the generated contract and surfaces stale revisions and closed windows.


- [ ] Replacing a planned fulfilment with another visible Food or Recipe commits atomically and retains the same frozen planned-item association.
- [ ] A different substituted source is derived as `swapped`; a Portion-only change remains `as_planned`.
- [ ] Updating a Diary Entry accepts Portion and notes only, requires the expected entry revision, and scales the frozen nutrient basis without consulting Library.
- [ ] Deleting a Diary Entry requires the expected revision and leaves its Diary Slot, frozen offered options, and frozen planned items intact.
- [ ] Add, planned fulfilment, replacement, update, and delete are accepted for today and the previous seven dates, including the exact seventh prior date.
- [ ] Existing slots evaluate their correction boundary using their frozen `applied_timezone`; fresh slots use Client timezone with Business fallback.
- [ ] An existing frozen past slot may accept planned fulfilments and actual corrections, while an unstarted past slot accepts independent extras only.
- [ ] Option switching remains same-day only, and every future-date mutation is rejected.
- [ ] Idempotency lookup precedes correction-window validation, so a retained identical retry returns its original success after the window closes.
- [ ] Reusing an idempotency key with a changed replacement, update, or delete request returns a conflict.
- [ ] The client Today and History flows expose the allowed correction actions and handle stale revisions and closed windows through the generated contract.
- [ ] Diary, database, controller, contract, timezone-boundary, revision, idempotency, and client-app tests cover each correction path.

