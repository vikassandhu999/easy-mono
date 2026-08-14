# Ticket 18 live cutover worklist

Date: 2026-08-14
Branch: `ui-quality/coachapp-2026-08-10`
Status: passed

## Baseline

* Worktree clean at `c28d972` when the ticket started; later unrelated chat/conversation formatting changes remained user-owned and were excluded from ticket commits.
* The existing authenticated AXI session was reused. Once the user-owned CoachApp, ClientApp, and backend were live, all required requests and mutations were exercised against ports 2021, 1314, and 4000.
* Every viewport was proved through browser `innerWidth` plus a horizontal-overflow probe; device emulation, not window resize alone, supplied the real 375px and 1280px widths.

## Route coverage

| route | role | viewport | states covered | result | finding ids |
| --- | --- | --- | --- | --- | --- |
| Clients / Check-ins | coach | 375×780 | empty and populated row; Review navigation; overflow probe | passed | — |
| Clients / Check-ins | coach | 1280×800 | populated row; Mark reviewed; count/list drain; overflow probe | passed | — |
| Clients / Replies | coach | 375×780 | socket-created row; inline task pane; confirmation; Mark handled drain; overflow probe | passed | — |
| Clients / Replies | coach | 1280×800 | populated split surface; selected facts/message/actions; overflow probe | passed | — |
| Clients / Programming | coach | 375×780 | populated groups, filters, full reason facts, actions; overflow probe | passed | — |
| Clients / Programming | coach | 1280×800 | populated groups, filters, full reason facts, actions; overflow probe | passed | — |
| Clients / Expiring | coach | 375×780 | populated renewal row; snooze menu/mutation/drain; overflow probe | passed | — |
| Clients / Expiring | coach | 1280×800 | populated renewal row; Renew access dialog; overflow probe | passed | — |
| Clients / Quiet | coach | 375×780 | populated missed-check-in row; overflow probe | passed | — |
| Clients / Quiet | coach | 1280×800 | Message navigation; snooze menu/mutation/drain; overflow probe | passed | — |
| Clients / Onboarding | coach | 375×780 | intake-overdue row; reminder confirmation/mutation; row retained; overflow probe | passed | — |
| Clients / Onboarding | coach | 1280×800 | populated accepted layout and reason facts; overflow probe | passed | — |
| Intake service answer | client | 375×780 | empty validation; Training + Nutrition selection; submission; completed answer review | passed after T18-04 | T18-04 |

## Findings

### T18-01 — Retired queue compatibility remained in backend contexts

Classification: behavioral/contract cleanup. Status: fixed.

`Easy.Clients` still implemented the deleted Programming, Expiring, and New list filters through a shared `attention_facts` projection, and `Easy.Chat.list_conversations/2` still accepted `waiting: true`. Removed those paths, the old counts/list wrapper, the four retired virtual Client fields, and their superseded tests. The roster-only `expiring_soon` fact remains and is derived directly from the accepted 14-day window.

### T18-02 — Membership-changing writes missed workbench caches

Classification: behavioral defect. Status: fixed.

Invitation revoke and assigned-plan update/delete/assign mutations could change Onboarding or Programming membership without invalidating the mounted workbench. All membership-changing writes now consume the checked `afterMembershipChange` target. Conversation socket events invalidate the Replies list and count together rather than counts alone.

### T18-03 — Onboarding retained the retired `new` view id

Classification: system inconsistency. Status: fixed.

The production Workbench queue registry still used `new` for URL/view state after the coordinated API vocabulary moved to Onboarding. The id is now `onboarding`; RM-210 mechanically rejects the retired production id while leaving historical and locked prototype evidence unchanged.

### T18-B1 — Fresh live-flow verification unavailable

Classification: environment blocker. Status: resolved.

The user-owned servers became available. All previously blocked routes, populated states, and mutations were re-run live; successful queue requests used only the explicit Workbench endpoints. Mark handled, Check-in review, both snoozes, and the Intake reminder returned successful responses and reconciled their list/count state.

### T18-04 — Intake validation stayed stale after the answer became valid

Classification: behavioral/validation defect. Status: fixed.

Submitting the temporary Intake without a required service correctly rendered `Please answer all required questions.`, but selecting Training and Nutrition left that error visible until another submit. `FillForm` only cleared its local error after a fully valid submit. The shared answer update now clears stale validation immediately. The original browser probe failed before the change and passed afterward (`staleError: false`) at 375px. This is the same defect class already documented by RM-150.

### T18-05 — Reload attempted the first socket handshake with an expired token

Classification: behavioral/realtime defect. Status: fixed and verified.

After the access token expired, a CoachApp reload synchronously connected the socket before HTTP middleware refreshed storage, producing an avoidable `403`; the existing `onError` refresh eventually recovered and the socket reached `open`. CoachApp and ClientApp now refresh a stale token before their first socket handshake while retaining the error-path recovery for later reconnects.

The HTTP middleware and socket now use one shared in-flight refresh promise per app, preventing
duplicate refreshes during reload. Forced stale-token replays on CoachApp and ClientApp each showed
exactly one `POST /v1/auth/token` returning `200`, a restored roughly five-minute expiry, no console
errors, and an `open` Phoenix socket.

## Live mutation evidence

* Replies: a ClientApp message appeared through the CoachApp socket, incrementing Replies/Today; confirmed Mark handled returned `204`, drained the row, and restored the count.
* Check-ins: a previously reviewed verification submission was temporarily reopened, rendered at both widths, and Mark reviewed returned `200`, navigated back with feedback, and drained the count.
* Expiring and Quiet: reversible fixtures rendered at both widths; Renew/Message opened the correct destinations; 1-week snoozes returned `204` and drained list/count state.
* Onboarding: the Intake reminder confirmation named Riley, the form, and due date; the `204` reminder preserved the actionable row as designed.
* ClientApp Intake: a temporary one-question Intake proved required validation, both-service submission shape, completion, and friendly `Training · Nutrition` review rendering.

## Fixture cleanup

The temporary Intake submission/template were deleted and the original dismissed assignment restored. Quinn's original 30 Aug access end, Riley's original 20 Aug Quiet snooze, and Gina's original Check-in review timestamp/coach were restored. A direct read-only database audit confirmed zero temporary templates/submissions and zero Quinn Expiring snoozes. The test reply remains in Gina's existing verification conversation as durable messaging evidence; it was marked handled through the accepted UI.
