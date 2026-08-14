# Ticket 16 live verification

Result: **PASS for the required seeded queue interactions.** Onboarding, Programming, Quiet, and Check-ins were populated with live data and exercised at `375x780` and `1280x800`. No product defect was observed. Replies remains a partial optional stretch because the environment has only one waiting conversation and no safely stale row version.

Verified on 2026-08-13 using the existing authenticated CoachApp and ClientApp sessions. No product source code was changed.

## Acceptance results

| Acceptance area | Result | Live evidence |
| --- | --- | --- |
| Onboarding naming | **PASS** | At both widths, navigation, heading, mobile drill-back, loading state, empty state, and accessibility names used **Onboarding** / `Onboarding queue`; no **New clients** label appeared. |
| Onboarding invitation row | **PASS** | `Queue Seed Onboarding` rendered one reason: `Invitation follow-up due · Sent 9 Aug · follow-up due 12 Aug`. The row exposed **Resend invitation** and **Call** because a phone number exists. The resend confirmation named the client and email and explained that resending restarts the three-day clock. Pressing the row opened the client's overview. The Call control was invoked; headless Chrome could not expose the operating-system `tel:` handoff. Confirming resend removed the row and reconciled the Today count without a reload. |
| Onboarding intake row | **PASS** | Riley Martin rendered `Intake overdue · Due 10 Aug` with **Send reminder** and no Call control because Riley has no phone. At both widths, the confirmation named Riley and the due date and stated that sending does not complete intake. Confirming sent `POST /v1/coach/form-assignments/0abb03fd-1b37-4268-b4ef-cd303e4ec8e2/remind` (`204`). The row correctly remained actionable after the reminder. |
| Programming | **PASS** | At both widths, **All** was the default and counts were `All 3`, `Training 3`, and `Nutrition 1`, proving Gina's overlapping service membership without duplicating her row. Groups rendered in accepted priority order: **Never programmed** (Drew Taylor), **Coverage lapsed** (Gina Lanetti), then **Ending soon** (Quinn Wilson). Training and Nutrition filters showed only the matching reason/action. **Plan Training** and **Plan Nutrition** opened the corresponding client service tab and assignment dialog (`?tab=<service>&assign=plan`; the router removed `assign` after opening the dialog). |
| Replies | **PARTIAL PASS — optional gaps only** | A new Gina message populated Replies. At `375x780`, the selected conversation expanded inline; at `1280x800`, it rendered in the right task pane. Both showed the waiting fact, read state, message, **Reply**, and **Mark handled**. Reply navigated to Gina's messages. The earlier verification already confirmed the Mark handled confirmation, `204` drain, count reconciliation, and no-message-sent feedback. Only one row exists, so next-row selection remains unavailable. No stale `expected_last_message_at` was manufactured to force a `409`. |
| Expiring | **PASS (retained)** | The prior live pass remains valid: explicit Expiring queue endpoint, reason fact, snooze menu, `204` snooze mutation, row drain, Today reconciliation, and feedback. This area was not previously blocked and was not mutated again. |
| Quiet | **PASS** | Riley rendered `Missed check-in · Missed check-in due 9 Aug` with **Message** and **Snooze** at both widths. Snooze offered 1 week, 2 weeks, and 30 days. Choosing 1 week through the menu's keyboard activation removed the row and reconciled the Today count without reload. |
| Check-ins | **PASS** | Gina submitted the due-today `Weekly check-in` in ClientApp. CoachApp then rendered `Awaiting review · Submitted 13 Aug` with **Review** at both widths. Review opened `/library/check-ins/review/abaeab20-42ca-48cc-9b9c-f497276bd7d1`. **Mark reviewed** returned to the workbench with `Check-in reviewed`; the row and Today count drained, and reopening the queue showed `All reviewed. Nothing waiting on you.` |
| Queue requests | **PASS** | Captured successful requests to `/v1/coach/workbench/queues/onboarding`, `/programming?limit=20&offset=0&service=all`, `/quiet`, and `/check-ins`. Observed traffic contained no `waiting=true` request and no retired client-list membership filter. `/v1/coach/clients?limit=0` was only the generic active-client count; the generic conversation load was `/v1/coach/conversations?limit=20&offset=0`. |
| Browser console | **PASS** | The final checks had no console errors. Chrome reported one generic form-field `id`/`name` issue outside the verified queue controls; it did not identify a broken accepted interaction. |

## Seeded accounts and actions

- **Queue Seed Onboarding** (`a73ca87a-6a33-4639-a270-0ccfd5b1d049`, `queue.seed.onboarding.20260813@example.com`, `+15550160813`): invited through CoachApp. Because the UI cannot advance time, `invitation_sent_at` was moved to 2026-08-09 through the backend data layer. The invitation row, Call control, row navigation, confirmation, and resend drain were then exercised through CoachApp.
- **Riley Martin**: assigned the Intake template through CoachApp (`0abb03fd-1b37-4268-b4ef-cd303e4ec8e2`). Its due date was changed to 2026-08-10 through the authenticated Coach API because the assignment UI has no past-date control. Riley's missing legacy `joined_at` was corrected through the backend data layer so the accepted-client lifecycle gate could classify the row. The reminder was sent through CoachApp. Riley's already-due check-in assignment (`9199bf8c-e2b3-48b9-ab46-e44a621ee5d2`) was marked missed through the authenticated Coach API because the UI cannot advance the clock; the resulting Quiet row was snoozed for one week through CoachApp.
- **Gina Lanetti** (`5c261bcb-61a0-4915-8c6f-a0b84afc5327`): required Training and Nutrition were already set. The active training plan was ended through CoachApp, and the active nutrition coverage was archived through the authenticated Coach API when no suitable live UI action was available. Gina then appeared once in Programming with both service actions and overlapping filter counts. Her existing Weekly check-in schedule was advanced through the backend application layer to generate one missed assignment due 2026-08-06 and one assignment due 2026-08-13. Gina submitted the latter through ClientApp; it was reviewed through CoachApp. Gina also sent `Ticket 16 live verification reply seed — 2026-08-13` through ClientApp; that conversation remains queued for follow-up testing.
- **Quinn Wilson** (`ddc674b1-00f8-422e-9e31-a3af21d59209`): Training was selected as a required service through CoachApp. `TB fixture — Push Pull Legs` was assigned through CoachApp, then its end date was set to 2026-08-17 through the authenticated Coach API to establish Ending soon deterministically. Quinn supplied the Ending soon group.
- **Drew Taylor** (`c8e1251a-8c73-4b0d-bea6-5b6df816b832`): Training was selected as a required service and saved through CoachApp. With no plan history, Drew supplied the Never programmed group.

## Final live state

- Onboarding retains Riley's overdue Intake row; the invitation-follow-up row was drained by resend.
- Programming retains Drew (Never programmed), Gina (Coverage lapsed for Training and Nutrition), and Quinn (Ending soon).
- Quiet is empty because Riley was snoozed for one week.
- Check-ins is empty because Gina's submission was reviewed.
- Replies retains Gina's new waiting message.

## Remaining coverage limits

- **Replies next-row selection:** a second waiting conversation requires another authenticated client sender. This is a data gap, not a product failure.
- **Replies stale-write recovery:** no safe stale `expected_last_message_at` version was available. This needs a controlled fixture or concurrent second writer; no `409` was invented.
- **Call handoff:** the Call control was present and invoked, but headless Chrome has no operating-system dialer with which to observe the final `tel:` handoff.
