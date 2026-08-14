# Implement the accepted CoachApp queue interactions

Type: task
Status: resolved
Blocked by: 14
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Replace the live CoachApp workbench views with the accepted Onboarding, Programming, Replies, Expiring, Quiet, and Check-ins queue contracts and interactions.

## Locked interaction

* Rename New clients to Onboarding across Today navigation, headings, drill-back copy, loading/empty states, and accessibility labels. Do not add the separate Recent clients metric.
* Implement [Design the Onboarding queue interaction](./05-design-onboarding-interaction.md) reference B: one compact lifecycle-gated reason/action row, confirmation before resend/reminder, conditional `tel:` Call, row press to client overview, and no competing disclosure or task pane.
* Implement [Design the Programming queue interaction](./03-design-programming-queue-interaction.md) reference A: default All filter, overlapping counts, filtered reasons, priority groups, one row per client, and one direct service action per reason into the matching Assign plan state.
* Implement [Design Replies handling](./04-design-replies-handling.md) reference B: desktop selected task pane, mobile inline expansion, color-only row selection, read separate from completion, Reply and confirmed Mark handled actions, next-row selection, and stale 409 recovery.
* Rewire Expiring, Quiet, and Check-ins to their explicit queue endpoints and reason facts. Keep Expiring/Quiet snooze behavior and explicit Check-in review drain behavior.
* Query keys and mutation hooks own all cache invalidation. Counts, filtered lists, conversation detail, and selected state must reconcile after every draining action.

## Edit surface

* `frontend/apps/coachapp-v2/src/api/workbench.ts`, conversation/check-in adapters, and `src/api/keys.ts`
* `frontend/apps/coachapp-v2/src/clients/lib/workbench-queues.ts`
* `frontend/apps/coachapp-v2/src/clients/workbench/`
* Locked prototypes under `src/clients/prototypes/` are reference assets, not production source to copy.

## Acceptance

* The live UI renders labels from reason codes and absolute facts without reproducing membership predicates.
* All queue rows, filters, actions, empty states, ordering, counts, mobile behavior, keyboard access, and confirmation flows match the locked prototypes.
* No live view calls a retired client-list queue filter or `waiting=true` conversation list.

## Verification

Run CoachApp lint and build, review lint writes, then verify every queue and draining action live at 375px and 1280px.

## Answer

Implemented the six accepted CoachApp queue interactions against the explicit workbench endpoints and generated OpenAPI contract. Onboarding now carries the Intake form title and confirmation facts; Replies carries sequence count, read/inactive state, conflict recovery, and the accepted responsive task pane; Programming preserves overlapping service filters, priority groups, full mobile facts, and direct Assign-plan navigation. Expiring, Quiet, and Check-ins retain their explicit drain/snooze behavior.

The follow-up fidelity pass restored the locked queue-specific layouts, removed prototype-only narration, eliminated nested Replies framing, and prevented mobile Programming facts from clipping. Focused backend tests, full backend precommit (1,189 tests), CoachApp build/checks, generated API output, UI-contract gates, and live 375×780 / 1280×800 checks passed. Detailed evidence and remaining environment-only coverage limits are recorded in [`../verification/16-live-verification.md`](../verification/16-live-verification.md) and [`../verification/16-ui-retest-2026-08-14.md`](../verification/16-ui-retest-2026-08-14.md).
