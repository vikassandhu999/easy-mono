# Ticket 18 live cutover worklist

Date: 2026-08-14
Branch: `ui-quality/coachapp-2026-08-10`
Status: in progress

## Baseline

* Worktree clean at `c28d972` when the ticket started.
* Existing AXI session retained a service-worker-backed CoachApp tab and its prior query cache.
* CoachApp, ClientApp, and the backend were not listening on ports 2021, 1314, and 4000. The cached CoachApp tab supports layout/state inspection, but no fresh requests or mutations; ClientApp could not be reopened offline.

## Route coverage

| route | role | viewport | states covered | result | finding ids |
| --- | --- | --- | --- | --- | --- |
| Clients / Check-ins | coach | 375×780 | cached empty state; overflow probe | layout passed; action blocked offline | T18-B1 |
| Clients / Check-ins | coach | 1280×800 | cached empty state; overflow probe | layout passed; action blocked offline | T18-B1 |
| Clients / Replies | coach | 375×780 | cached empty state; one-owner responsive surface; overflow probe | layout passed; populated/action state blocked offline | T18-B1 |
| Clients / Replies | coach | 1280×800 | cached empty state; split surface; overflow probe | layout passed; populated/action state blocked offline | T18-B1 |
| Clients / Programming | coach | 375×780 | populated groups, filters, full reason facts, actions; overflow probe | passed | — |
| Clients / Programming | coach | 1280×800 | populated groups, filters, full reason facts, actions; overflow probe | passed | — |
| Clients / Expiring | coach | 375×780 | cached empty state; overflow probe | layout passed; action blocked offline | T18-B1 |
| Clients / Expiring | coach | 1280×800 | cached empty state; overflow probe | layout passed; action blocked offline | T18-B1 |
| Clients / Quiet | coach | 375×780 | cached empty state; overflow probe | layout passed; action blocked offline | T18-B1 |
| Clients / Quiet | coach | 1280×800 | cached empty state; overflow probe | layout passed; action blocked offline | T18-B1 |
| Clients / Onboarding | coach | 375×780 | populated intake-overdue row, mobile identity/action layout; overflow probe | layout passed; reminder blocked offline | T18-B1 |
| Clients / Onboarding | coach | 1280×800 | populated intake-overdue row, desktop layout; overflow probe | layout passed; reminder blocked offline | T18-B1 |
| Intake service answer | client | 375×780 | none | blocked: ClientApp and backend offline, prior tab unavailable | T18-B1 |

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

Classification: environment blocker. Status: open.

CoachApp, ClientApp, and backend ports were all offline. The existing CoachApp service-worker tab allowed cached layout inspection at both required viewports, including populated Programming and Onboarding states, but it cannot prove fresh network behavior or mutations. Replies populated/drain, Check-ins review, Expiring/Quiet actions, Onboarding reminder, and ClientApp Intake submission still require the user-owned dev servers.
