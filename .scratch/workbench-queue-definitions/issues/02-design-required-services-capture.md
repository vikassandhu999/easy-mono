# Design required-services capture

Type: prototype
Status: resolved
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Where and how can Training, Nutrition, or both become a client's required services?

Resolve optional selection during invitation, client selection through intake, accepted-client editing, and the treatment of an unclassified active client. No production-data backfill is required.

## Answer

Use one canonical, undated `required_services` set containing Training, Nutrition, or both.

* A coach may set the services directly during Invite or later client editing. Invite selection is optional.
* `Service type` is a special question that a coach may add to an Intake form at most once. It is not a general-purpose choice question.
* The client must select Training, Nutrition, or both when answering `Service type`. Submitting the Intake immediately replaces the client's canonical set with that answer.
* An Intake without `Service type` leaves the client's services unchanged.
* `Service type` is unavailable in Check-in forms. A recurring Check-in submission must never update required services.
* There are no separate requested, confirmed, or actor-owned service states. The latest direct coach edit or submitted Intake answer wins.
* A client whose set is empty is unclassified and excluded from Programming until services are set.

## Prototype

* [Required-services interaction prototype](../../../frontend/apps/coachapp-v2/src/clients/prototypes/required-services-prototype.tsx)
* Development route: `http://localhost:2021/clients/prototypes/required-services?context=invite`
* Use the prototype controls to inspect Invite, Intake, Edit client, and Unclassified states.

## Comments

### 2026-08-13 — Required services are undated

Product feedback rejected separate Training and Nutrition start dates. A required service records only whether the client requires Training, Nutrition, or both. The prototype was simplified accordingly. Programming therefore has no future service-start delay: once the client is active, every required service is evaluated.

### 2026-08-13 — Intake question locked

Product feedback clarified only the Intake behavior as a domain rule; the broader capture prototype remains. Required services are captured by the Intake-only `Service type` question, optional direct Invite selection, or later coach editing. Check-in forms explicitly exclude the question to prevent recurring submissions from changing delivery obligations.
