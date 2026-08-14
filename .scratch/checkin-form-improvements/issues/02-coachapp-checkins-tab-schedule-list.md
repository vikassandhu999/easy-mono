# 02 — Coach app: Check-ins tab schedule list + add-schedule flow

**What to build:** On a client's Check-ins tab, the coach sees *all* of the client's check-in schedules as a list of cards, replacing today's single-schedule card. Each card keeps the inline frequency and active (pause/resume) controls the single card has today, plus a delete action for a schedule set up by mistake. An add-schedule action opens a flow collecting: a check-in template (check-in purpose only), a frequency (once, weekly, biweekly, monthly), and a first due date — so a new cadence starts on the day the coach intends, not today by default. Editing one schedule's frequency never touches the others. The duplicate-template and schedule-cap 422s from the API render as clear, human messages. The endpoints already exist and return lists; this is presentational work over them.

**Blocked by:** 01 — Backend: multiple active check-in schedules per client (cap + error contract).

**Status:** ready-for-agent

- [ ] Check-ins tab lists every schedule for the client as its own card
- [ ] Each card retains inline frequency editing and pause/resume; editing one schedule leaves the others untouched
- [ ] Each card offers delete for a schedule that has not generated assignments
- [ ] Add-schedule flow: pick check-in template (check-in purpose only), frequency (once/weekly/biweekly/monthly), first due date
- [ ] Duplicate-template 422 renders a clear message tied to the template choice
- [ ] Cap 422 renders a clear message (no specific number promised)
- [ ] React Query invalidation lives in the src/api mutation hooks, not at call sites
- [ ] Typecheck and build gates pass (existing frontend gates; no new test seam)
