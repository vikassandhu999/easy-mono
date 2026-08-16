# 12 — Log planned intake and derive statuses

**What to build:** Let the client record planned intake at item, active-option, or whole-day scope. Diary owns fulfilment relationships, frozen nutrient totals, and status derivation so every caller reads the same result.

**Blocked by:** 11 — Record extras with freezing and idempotency

**Status:** ready-for-agent

- [ ] A client can log one frozen planned item, every remaining item in the active option, or every scheduled active option for the day.
- [ ] A planned command may create and freeze a slot only on the client's local day; an already frozen slot may accept corrections within the correction window.
- [ ] Frozen planned items retain source Menu Item identity, display values, Portion, nutrient basis, nutrients, completeness, and order without live structural foreign keys.
- [ ] A composite tenant-aware relationship proves that an entry and its fulfilled planned item belong to the same Diary Slot.
- [ ] At most one entry fulfils a frozen planned item; a second occurrence is stored as a distinct extra.
- [ ] Two planned items using the same Food remain distinct because fulfilment uses frozen planned identity rather than item or position.
- [ ] Whole-option and whole-day commands insert only unfulfilled planned items and remain safe under retries and concurrent taps.
- [ ] Matching item fulfilment is `as_planned`; entries outside the active planned set are `added` under frozen Coverage and `recorded` without it.
- [ ] An unfulfilled active planned item is `pending` during its client-local date and `skipped` only after that date ends.
- [ ] A Portion difference alone remains `as_planned`.
- [ ] Planned and actual totals come from frozen rows, preserve unknown nutrient fields, and round only in the response.
- [ ] The client Today flow supports item, option, and day logging and renders backend-derived statuses without local reconciliation.
- [ ] Diary, database, controller, contract, concurrency, status, nutrient, and client-app tests cover each command scope and fulfilment invariant.
