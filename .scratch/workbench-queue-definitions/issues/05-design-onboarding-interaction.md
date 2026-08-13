# Design the Onboarding queue interaction

Type: prototype
Status: resolved
Parent: [Coach workbench v1 delivery](../map.md)

## Question

How should Onboarding explain and action a stale invitation before acceptance or overdue intake work after acceptance?

Produce a rough interaction covering reason copy, row actions, outbound-contact confirmation, lifecycle gating, and the rename from New clients to Onboarding. The separate Recent clients metric has no placement in this effort.

## Prototype

* [Onboarding queue interaction prototype](../../../frontend/apps/coachapp-v2/src/clients/prototypes/onboarding-queue-prototype.tsx)
* Development route: `http://localhost:2021/clients?view=new&variant=B`
* Locked reference: **B — Compact queue row**. A and C remain only as prototype decision evidence.

## Answer

Use **B — Compact queue row**.

* Rename **New clients** to **Onboarding** everywhere the queue appears, including Today navigation, the queue heading, mobile drill-back copy, loading/empty states, and accessibility labels. Do not place the separate Recent clients metric in this effort.
* Render one compact workbench row per client and sort clients by oldest-due action. A client can have only one assigned Intake form, and lifecycle gating leaves at most one eligible Onboarding reason, so every row has one reason paired with one reason-specific verb using the app's standard outline action treatment. Do not add overflow, disclosure, **Next**, or **Then** concepts.
* Gate reasons by invitation acceptance. When `joined_at` is absent, show only pending-invitation work even if intake assignments already exist. When `joined_at` is present, show overdue intake work and never show invitation work. Invitation and intake actions therefore never compete in the same row.
* Render `invitation_follow_up_due` as **Invitation follow-up due** with “Sent <date> · follow-up due <date>” and a **Resend invitation** action.
* Render `intake_overdue` as **Intake overdue** with the intake title and absolute due date. Its one queue action is **Send reminder**. Opening the client row remains the route to broader client and intake context, avoiding a competing **View** button in the action queue.
* **Resend invitation** opens a confirmation dialog naming the client and email and explaining that sending restarts the three-day follow-up clock. Confirming resets the clock, clears the current invitation reason, and removes the pending client from Onboarding until another follow-up is due.
* **Send reminder** opens a confirmation dialog naming the client, form, and due date and stating that sending does not complete the intake. Confirming gives feedback but does not clear the reason. Only completing or dismissing that intake removes it.
* When the client has a phone number, show a trailing icon-only **Call <client>** utility beside the row actions. It opens the device call flow using the existing `tel:<phone>` convention. Omit it when no phone number is set.
* Row press opens the client overview without clearing any reason. On mobile, keep the same compact information order and place the controls beneath the fact rather than introducing cards, custom hover chrome, or a separate task pane.

This uses the existing workbench row vocabulary directly. Replies keeps its selected task pane because a coach needs substantial conversation context before choosing Reply or Mark handled; Onboarding needs a compact ordered action queue instead.

## Comments

* 2026-08-13 — Decision locked after live desktop and mobile review. The final interaction is B with one lifecycle-gated reason/action pair, confirmation before outbound contact, a single assignable Intake, and conditional Call.
