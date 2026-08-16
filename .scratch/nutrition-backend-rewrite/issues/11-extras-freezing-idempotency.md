# 11 — Record extras with freezing and idempotency

**What to build:** Let only the client record an extra Food or Recipe safely. The first same-day write freezes Coverage and every offered option for the slot, while a Diary-private idempotency ledger protects mobile retries and double taps.

**Blocked by:** 10 — Reset Diary and serve live Nutrition Days

**Status:** ready-for-agent

- [ ] One Diary Slot may exist for each business, client, local date, and Meal Slot, with `applied_timezone`, frozen Coverage presence, revision, and optional active option.
- [ ] The first same-day extra under Coverage freezes every offered option, option order, planned item, and default active option in one transaction.
- [ ] An extra without Coverage creates a slot with no frozen options and is reported as `recorded`.
- [ ] An unstarted past date within the correction window accepts an extra without consulting Programming and reports it as `recorded`.
- [ ] Repeated occurrences of the same Food or Recipe create distinct Diary Entries and are never merged automatically.
- [ ] Every entry freezes item identity when available, display name, Portion, nutrient basis, canonical nutrients, completeness, notes, and UTC metadata.
- [ ] Only an active client can execute the command; coaches, owners, and admins have no Diary mutation route.
- [ ] The add command accepts today and the previous seven local dates, includes the exact seventh prior date, and rejects future dates.
- [ ] Every Diary mutation requires a UUID `Idempotency-Key`; an identical retry returns the stored result and a changed fingerprint returns a conflict.
- [ ] Ledger reservation, command execution, and outcome storage are atomic under simultaneous requests.
- [ ] Ledger lookup occurs before correction-window validation, entries are retained for 30 days, and bounded cleanup removes expired rows.
- [ ] The client add-item flow creates one key per user intent, reuses it for retries, and refreshes Nutrition Day through the generated contract.
- [ ] Diary, database, controller, contract, concurrency, expiry, authorization, and client-app tests cover freezing, no Coverage, repeated extras, correction dates, and idempotency.

