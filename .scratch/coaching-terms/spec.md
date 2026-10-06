# Coaching terms

Status: needs-triage

This spec replaces the client lifecycle with one concept, the Coaching term: a span of time during which a business coaches a client. It deletes the overlapping lifecycle fields (`status`, `inactive_reason`, `stage`, `required_services`, the subscription dates) and the expiry sweeper, and applies the same treatment to coaches.

Easy is a prototype with no real clients (E9). Old lifecycle code and data are discarded and the schema is rebuilt cleanly. Nothing is migrated.

Decisions were made in a grilling session on 2026-09-25 and a brainstorming session on 2026-10-03. Each carries an identifier so it can be traced.

## Why

After the core reset on 2026-09-23, the client lifecycle was the least coherent feature left. A client carried five overlapping state fields, most of them designed around removed features:

* `required_services` was validated and edited but never read.
* `stage` duplicated "has a plan" and could drift from it.
* `inactive` mixed three meanings: the coach ended coaching, the subscription dates ran out, and the business ran out of seats.
* A daily sweeper flipped status from hand-entered dates.

The check-ins spec depended on `stage`, the weakest of these fields.

## Principles

* Store facts; derive states. No table has a status, reason, stage or flag column, and no background job changes data on a schedule.
* A Client is the person. A Coaching term is the coaching. A plan is what the client does during coaching. The structure is Client, then Coaching term, then plans and check-ins.
* Clients and coaches follow the same pattern: an invitation is a token on the person's record, and the person is invited until an account is linked.

## Competitive context

A research pass on 2026-10-03 covered Trainerize, TrueCoach, Everfit, Kahunas, Hexfit, Harbiz, Healthie, Practice Better, Exercise.com and FITR.

* Every competitor stores one coach-set status (active, archived, deactivated) and overwrites it, often with automation that flips it when a product expires. None keeps a history of when someone was a client.
* Seat counting varies. TrueCoach, Everfit, Trainerize, Healthie and Harbiz free the seat when a client is archived. Hexfit, Practice Better and Quenza keep counting it.
* After coaching ends, TrueCoach, Trainerize and Kahunas block the app. Everfit and Healthie allow read-only history. Harbiz keeps chat and the store.
* Pausing is the most common gap coaches raise. Trainerize users ask for it, and Everfit, Exercise.com and Healthie offer it.
* TrueCoach supports in-person clients without the app, and Trainerize offers them as a free "basic" tier.

This design keeps term history, derives every state from dates, never ends anyone on a seat downgrade, keeps read-only history after the end, and never revives a stale plan. Pausing and app-less clients are deferred (E7, E8).

## Lifecycle

```
Invite sent ─► INVITED ─(client accepts)─► seat free? ─yes─► ACTIVE ◄──────────────┐
                                              │ no              │ ends within       │
                                              ▼                 ▼ 14 days           │
                                    JOINED, NOT STARTED    ENDING SOON              │
                                              │                 │ end date passes   │
                              "Start coaching" (needs a seat)   ▼                   │
                                              │               ENDED                 │
                                              ▼                 │ "Start coaching": │
                                            ACTIVE              └─ a new term ──────┘
```

Seats: invited, joined-not-started and ended clients use none. Active and ending-soon clients use one each.

## Decisions

### The concept

* E1. A Coaching term is its own record with a start date and an optional end date. A client can have many terms over time and at most one covers any date. History is kept, so a returning client's earlier terms stay visible.
* N1. The concept is named Coaching term (`CoachingTerm`, table `coaching_terms`). Coach-facing actions use plain language: "Start coaching" and "End coaching". Earlier notes call it an Engagement.
* E2. A term starts when the client accepts the invitation, not when the coach sends it, provided a seat is free (E5). Until then the client is invited and has no seat, no check-ins and no plan in force. The coach can prepare plans before acceptance. A coach-chosen future start date is left for later.
* E3. After a term ends, the client keeps read-only access to their history: workouts, meals, chat, and later tracker entries and check-ins. They cannot record anything or send messages. A banner shows when coaching ended. A new term makes the same account active again.
* E4. A term has one optional end date that the coach can set, move or clear. A future date is a planned end, such as a 12-week program. "End coaching" sets it to today. A term ends when its date passes; "ended" is derived, so nothing is flipped and no job runs. When the end date is within 14 days, the coach sees "Ends in N days".
* E5. Starting a term needs a free seat; nothing else does. Invitations are free and never hold a seat. When a client accepts and a seat is free, the term starts automatically. When none is free, the account is still linked but no term starts; the coach sees that the client joined and can start coaching once a seat is free, and the client sees that coaching will start soon. A returning client is started the same way. A seat downgrade below usage never ends a term; it only blocks new starts. "Joined but not started" is derived, so the old awaiting-seat state is gone.
* E6. A plan never outlives the coaching it was made for. A plan is in force on a date only when its own coverage includes the date, a term covers the date, and no term has ended between the plan's creation and that date. Creation, not the start date, decides which coaching a plan was made for: a plan made before acceptance, or between terms for a returning client, comes into force when coaching starts; a plan made during a term stops for good once that term ends, even if it was scheduled to start later. Plan rows are not edited when coaching ends; the effective end is derived. Tightened on 2026-10-03 after review found that a start-date rule revived plans scheduled past a term's end.
* E9. There is no data migration. The old lifecycle fields, code and data are discarded.

### Data model

* M1. Five tables hold the lifecycle facts:
    * User: `id`, `email` (unique), `full_name`, `created_at`.
    * Business: `id`, `owner_user_id`, `name`, `handle` (unique), `timezone`, `created_at`. The seat limit lives in billing (free plus paid seats), its only source.
    * Coach: `id`, `business_id`, `user_id` (empty until accepted), `full_name`, `preferred_name`, `email`, `phone`, `invite_token` (empty once accepted), `invited_at`, `removed_on` (empty while on the team).
    * Client: `id`, `business_id`, `user_id` (empty until accepted), `coach_id`, `full_name`, `preferred_name`, `email`, `phone`, `notes`, `timezone` (empty uses the business timezone), `unit_system` (metric or imperial, default metric), `invite_token` (empty once accepted), `invited_at`.
    * Coaching term: `id`, `client_id`, `starts_on`, `ends_on` (empty is open-ended). The database rejects an `ends_on` before `starts_on` and rejects overlapping terms for one client.
* M2. Names follow the W3C guidance on personal names. Clients and coaches have a free-text `full_name` and an optional `preferred_name` ("What should we call you?"); screens show the preferred name when present. Users have `full_name` only.
* M3. A business handle such as `indian-strength` is URL-safe: lowercase `a-z`, `0-9` and single hyphens, 3 to 40 characters, no leading or trailing hyphen. It is unique ignoring case, and reserved words such as `admin`, `api`, `app` and `www` are blocked. The app suggests it from the name and the coach can edit it.
* M4. Derived, never stored:
    * Invited: the client has no `user_id`.
    * Active: a term covers today in the client's timezone.
    * Ending soon: active, and `ends_on` is within 14 days.
    * Joined, not started: a `user_id`, no term covering today, and no earlier term.
    * Ended: a `user_id`, no term covering today, and an earlier term.
    * Seats used: clients active today.
    * Invitation expired: `invited_at` is more than 30 days ago.
    * Coach invited: an open `invite_token`. Coach active: `user_id` set, no open token, `removed_on` empty. Coach removed: `removed_on` set and no open token.
    * Plan in force: E6.
* M5. Coaches get the same treatment as clients: no stored status, and an invitation is a token on the record. The seat limit has one source, billing's free plus paid seats (10 free by default); it is not copied onto the business. The billing provider tables are otherwise untouched.
* M6. Deleted: client `status`, `inactive_reason`, `stage`, `required_services`, `subscription_started_on`, `subscription_ends_on`, `creator_id`, first and last names, the status transition rules, the plan-copy stage advance, the awaiting-seat billing flow, and the expiry sweeper; coach `status`, `invited_by_id` and first and last names; user first and last names; business `about`, `whatsapp_number` and `default_weight_unit`; the "Required service" term in `CONTEXT.md`.
* M7. The client's `unit_system` replaces the business `default_weight_unit` now, because workout loads read it. It is the same setting as check-ins Q26.

### Actions and API

* A1. Coach actions:
    * Invite a client: `POST /clients` with `full_name`, optional `preferred_name`, `email`, optional `phone`, `notes` and `coach_id`. Creates the client with an invite token and sends the email. No seat is used.
    * Resend an invitation: `POST /clients/:id/invite`, only while invited. Restarts the 30-day clock.
    * Revoke an invitation: `DELETE /clients/:id`, only while invited.
    * Start coaching: `POST /clients/:id/terms`. Needs a free seat. The term starts today with no end date. Not allowed while a term covers today.
    * Set, move or clear the end date: `PATCH /terms/:id` with `ends_on` as a date or null. The date cannot be in the past or before the start. "End coaching" is `ends_on` = today.
    * Change the coach or edit the profile: `PATCH /clients/:id` with `coach_id`, `full_name`, `preferred_name`, `email`, `phone`, `notes`, `timezone` or `unit_system`.
* A2. Client actions: `POST /invites/:token/accept` links the account and starts a term today if a seat is free. Every client write (workout, meal, message) requires a term covering today. Every client read is allowed, so history stays visible.
* A3. Reads: `GET /clients?state=active|ending_soon|joined|invited|ended&q=` returns each client with the derived `state` and `current_term` (`id`, `starts_on`, `ends_on`) or null. `GET /clients/:id` adds `terms`, the full history. `GET /business` includes `seats` with `limit` and `used`.
* A4. Rules:
    * A term's start date never changes; only `ends_on` is editable.
    * While a term covers today, including its last day, coaching continues by moving or clearing `ends_on`, and "Start coaching" is unavailable.
    * "End coaching" keeps the client active until midnight in their timezone.
    * Seat checks happen only at acceptance and at start, inside one database lock so concurrent starts cannot overbook.
    * Coach invitations mirror client invitations (`POST /coaches`, resend, revoke). Removing a coach sets `removed_on` after their clients are reassigned. Re-inviting a removed coach opens a new token on the same record; accepting clears `removed_on`. A removed coach can join or create another business.

### App behaviour

* U1. Coach app, client list: filters Active, Ending soon, Joined, Invited and Ended, replacing the stage filter. Each row shows the preferred name (or full name), a state label, "Ends in N days" when relevant, and the assigned coach. The header shows seats used against the limit.
* U2. Coach app, client page:
    * The header shows the state and current term, such as "Coaching since Jan 5 · ends Mar 31".
    * One Coaching card replaces the access card. Active: set, move or clear the end date, and "End coaching". Joined or ended: "Start coaching", disabled with "No free seat" when seats are full. Invited: resend, revoke and copy the link, as today.
    * Term history is listed, such as "Jan 5 – Mar 31" and "Jun 1 – now".
    * The profile form has full name, preferred name, email, phone, notes, timezone and unit system.
    * A plan stopped by E6 shows "Stopped when coaching ended on Mar 31".
* U3. Coach app, settings and team: business settings gain the handle with live validation and an availability check, and show seats. The team list uses preferred names, and coach invite, resend, revoke and remove follow the client pattern.
* U4. Client app:
    * Joined, not started: a single "Coaching starts soon" screen with sign-out.
    * Active: unchanged.
    * Ended: a "Coaching ended Mar 31" banner. All log, record and send controls are hidden; history stays readable.
* U5. Client-app changes go to `frontend/apps/clientapp` only. `clientapp-v2` is no longer maintained and receives no changes. Coach-app changes go to `frontend/apps/coachapp`, the only coach app.

### Defaults

* D1. Where nothing new was decided, today's behaviour stays: the assigned coach lives on the client; invitations expire after 30 days and can be resent or revoked; an invitation can be revoked only while the client has no records; ex-clients get read-only access with no messaging.

### Deferred

* D2. Deferred: labelling a term with what was sold and recording how it ended; reusing an old client plan for a returning client (the coach assigns a template again); a way for ex-clients to ask to return.
* E7. Pausing is deferred. The leading option was a dated gap inside a term that keeps the seat and plans, stops reminders and due check-ins, and offers to move the end date.
* E8. Clients who never use the app (in-person only, coach records everything) are out of scope. If needed later, a coach-only client is one whose term the coach starts directly; that needs coach-recorded workouts and meals, not a model change.

## Effect on the check-ins spec

* Check-ins run during a coaching term. A client is due for review on the day a term starts, then every review-frequency days. Check-ins have no periods and no four-day minimum (see `.scratch/check-ins/spec.md`).
* Check-ins Q26 (units) is delivered by M7.
* This spec ships before check-ins.

## Open questions

* Should `clientapp-v2` be deleted or kept frozen? U5 only stops maintaining it.
