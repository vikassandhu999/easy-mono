# Module Review Checklist

Use this as a focused review tracker. Each item should be small enough to pick up quickly, inspect, and decide what to do next.

## How to use this checklist

For each task:

- Look at the backend endpoint/schema flow
- Look at the frontend screen/interaction
- Write 1 decision
- Write 1 follow-up action if needed

Suggested note format:

- Status: done / needs work / blocked
- Decision:
- Follow-up:

---

# 1. Auth

## Auth map

- [ ] List all auth entry points: signup, OTP, verify, token refresh, invite accept
- [ ] Write the happy path for coach login
- [ ] Write the happy path for client invite acceptance
- [ ] Write the failure states for invalid OTP / expired invite / used invite / invalid invite

## Coach auth

- [ ] Review coach signup backend flow
- [ ] Review coach signup frontend form
- [ ] Decide if the signup flow is clear in one pass

## OTP login

- [ ] Review OTP request endpoint + controller behavior
- [ ] Review OTP verify endpoint + session creation behavior
- [ ] Review frontend OTP request screen
- [ ] Review frontend OTP verify screen
- [ ] Decide whether errors are explained clearly

## Session handling

- [ ] Review refresh token flow
- [ ] Review logout flow
- [ ] Review frontend expired-session handling
- [ ] Decide if session failure sends user somewhere sensible

## Invite flow

- [ ] Review invitation lookup endpoint states: pending / used / expired / invalid
- [ ] Review invitation accept request OTP flow
- [ ] Review invitation verify flow
- [ ] Review frontend invite screens for all invite states
- [ ] Decide whether any invite state is underexplained

---

# 2. Business + Coach Profile

## Business setup

- [ ] Review business creation endpoint
- [ ] Review business creation frontend flow
- [ ] Decide whether onboarding asks only for essential information

## Business settings

- [ ] Review business show/update endpoints
- [ ] Review frontend business settings screen
- [ ] Decide whether any business field is confusing or unnecessary

## Coach profile

- [ ] Review coach profile show endpoint
- [ ] Review coach profile update endpoint
- [ ] Review frontend coach profile/settings page
- [ ] Decide whether coach identity/contact info is easy to maintain

## Tenant safety

- [ ] Spot-check business scoping in business-related queries
- [ ] Decide whether any area feels risky for tenant leakage

---

# 3. Clients

## Client list

- [ ] Review coach client list endpoint
- [ ] Review frontend clients list/table/cards
- [ ] Decide whether the list supports quick daily use

## Client detail

- [ ] Review client show endpoint payload
- [ ] Review frontend client detail page sections
- [ ] Decide whether the page helps a coach take action fast

## Invite client

- [ ] Review invite client backend flow
- [ ] Review resend invite backend flow
- [ ] Review frontend invite client modal/form
- [ ] Decide whether the coach gets enough confirmation after sending an invite

## Client editing

- [ ] Review client update backend rules
- [ ] Review frontend edit client form
- [ ] Decide whether editable vs non-editable fields are obvious

## Client deletion

- [ ] Review client delete backend behavior
- [ ] Review frontend delete confirmation UX
- [ ] Decide whether delete is too easy, too hidden, or fine

## Client-linked plans

- [ ] Review client training plans endpoint from coach side
- [ ] Review client nutrition plans endpoint from coach side
- [ ] Review frontend navigation from client detail to plans
- [ ] Decide whether plan access is fast enough

---

# 4. Training

Context docs:

- `docs/specs/training-plan-redesign-2026-04-21.md`
- `docs/handovers/2026-04-21-training-plan-redesign-handover.md`

## Training plan list

- [ ] Review coach training plan list endpoint
- [ ] Review client training plan list endpoint
- [ ] Review frontend training plan list screens
- [ ] Decide whether active vs archived plans are clear

## Training plan detail shape

- [ ] Review backend training plan payload: `workouts`, `plan_items`, `rest_days`
- [ ] Review frontend data model for the same payload
- [ ] Decide whether content vs schedule separation is clear in code and UI

## Workout library

- [ ] Review workout create/list/show/update/delete backend flow
- [ ] Review frontend workout library UI
- [ ] Decide whether creating/editing workouts feels straightforward

## Schedule assignment

- [ ] Review training plan items create/list/update/delete backend flow
- [ ] Review frontend assign-workout-to-day interaction
- [ ] Decide whether scheduling is understandable without extra explanation

## Copy day

- [ ] Review backend `copy-day` behavior
- [ ] Review frontend copy-day UI flow
- [ ] Decide whether copy-day is discoverable enough

## Duplicate workout

- [ ] Review backend workout duplicate behavior
- [ ] Review frontend duplicate workout UX
- [ ] Decide whether “duplicate content” vs “assign to day” is clearly separated

## Today resolution

- [ ] Review client logic for weekday -> `plan_items` -> `workout`
- [ ] Review frontend Today screen states
- [ ] Check all four states: workout day / rest day / empty day / no plan
- [ ] Decide whether Today logic is robust and easy to follow

## Workout sessions

- [ ] Review client workout session create flow
- [ ] Review coach workout session create flow if used
- [ ] Confirm `workout_id` is used consistently
- [ ] Review frontend start workout interaction
- [ ] Decide whether anything still assumes old `planned_workout` naming

## Active workout

- [ ] Review workout session show/update/complete/discard backend flow
- [ ] Review performed sets create/update/delete backend flow
- [ ] Review frontend in-progress workout experience
- [ ] Decide what the biggest friction point is during logging

## Training edge cases

- [ ] Check shared workout editing behavior
- [ ] Check rest-day handling
- [ ] Check empty result from copy-day
- [ ] Decide which edge case needs the clearest UI messaging

---

# 5. Nutrition

## Nutrition plan list

- [ ] Review coach nutrition plan list endpoint
- [ ] Review client nutrition plan list endpoint
- [ ] Review frontend nutrition plan list screens
- [ ] Decide whether active plans are easy to spot

## Nutrition plan detail

- [ ] Review backend nutrition plan payload
- [ ] Review frontend plan detail rendering
- [ ] Decide whether nutrition structure feels consistent with training

## Meals

- [ ] Review meal create/list/show/update/delete backend flow
- [ ] Review frontend meal builder/editor
- [ ] Decide whether meal editing is fast enough

## Meal items

- [ ] Review meal item create/list/update/delete backend flow
- [ ] Review frontend add/remove food or recipe from meal flow
- [ ] Decide whether adding items feels too click-heavy

## Foods

- [ ] Review coach food CRUD endpoints
- [ ] Review client food read-only endpoints
- [ ] Review frontend food library/search UI
- [ ] Decide whether finding foods is easy enough

## Recipes

- [ ] Review coach recipe CRUD endpoints
- [ ] Review client recipe read-only endpoints
- [ ] Review frontend recipe UX
- [ ] Decide whether recipes simplify or complicate meal planning

## Nutrition scheduling

- [ ] Review plan item create/list/update/delete backend flow
- [ ] Review frontend assign meals to days/slots UX
- [ ] Decide whether nutrition scheduling is cleaner than training, equal, or worse

## Shopping list + macros

- [ ] Review shopping list backend endpoint
- [ ] Review macros backend endpoint
- [ ] Review frontend display
- [ ] Decide whether these outputs are useful in current form

## Meal logging

- [ ] Review meal logs endpoints
- [ ] Review food log entry create/update/delete flows
- [ ] Review frontend meal logging UX
- [ ] Decide whether logging is smooth enough for repeated daily use

## Coach nutrition monitoring

- [ ] Review coach meal log summary/list endpoints
- [ ] Review frontend coach nutrition monitoring screens
- [ ] Decide whether the coach gets enough useful signal

---

# 6. Weight Tracking

Context docs:

- `docs/specs/ux-spec-weight-tracker-2026-04-22.md`
- `docs/handovers/2026-04-22-weight-tracker-handover.md`

## Client weight screen

- [ ] Review client weight entries list endpoint response shape: `entries`, `goal`, `summary`
- [ ] Review frontend empty state
- [ ] Review frontend single-entry state
- [ ] Review frontend chart state
- [ ] Decide whether the screen feels calm and motivational

## Log weight

- [ ] Review backend upsert-by-date behavior
- [ ] Review frontend log weight sheet/form
- [ ] Review update-existing-entry behavior for same date
- [ ] Decide whether create/update feels like one simple action

## Edit/delete past entry

- [ ] Review backend delete flow
- [ ] Review frontend point tap -> edit/delete flow
- [ ] Review delete confirmation
- [ ] Decide whether this is easy enough on mobile

## Chart logic

- [ ] Review frontend moving average implementation
- [ ] Review frontend 30d / 90d / All local filtering
- [ ] Review mixed-unit display conversion logic
- [ ] Review gap handling in chart display
- [ ] Decide which chart rule is most likely to break in practice

## Coach weight view

- [ ] Review coach client weight entries endpoint
- [ ] Review frontend coach weight section
- [ ] Review adherence display
- [ ] Decide whether the coach gets actionable insight quickly

## Goal weight

- [ ] Review backend client goal weight update behavior from coach endpoint
- [ ] Review frontend coach goal edit dialog
- [ ] Review frontend client goal display
- [ ] Decide whether goal ownership is clear: coach edits, client views

## Weight errors

- [ ] Review backend validation errors: date, future date, value, unit, note
- [ ] Review frontend field-level error rendering
- [ ] Decide whether errors are understandable without support

---

# 7. Storefront / Public

## Public profile

- [ ] Review public storefront/profile endpoint
- [ ] Review frontend public coach page
- [ ] Decide whether the page builds trust quickly

## Inquiry flow

- [ ] Review inquiry creation endpoint
- [ ] Review frontend lead/inquiry form
- [ ] Decide whether inquiry submission feels low-friction

## Store profile settings

- [ ] Review store profile show/update endpoints
- [ ] Review slug check behavior
- [ ] Review frontend storefront settings UI
- [ ] Decide whether a coach can publish confidently

## Offers

- [ ] Review offers CRUD endpoints
- [ ] Review frontend offers management and public display
- [ ] Decide whether offers are easy to understand

## Testimonials

- [ ] Review testimonials CRUD endpoints
- [ ] Review frontend testimonials management and public display
- [ ] Decide whether testimonials feel sufficient for MVP trust-building

---

# 8. Cross-cutting

## Router vs product surface

- [ ] Review `lib/easy_web/router.ex`
- [ ] Map endpoints to actual screens/actions
- [ ] Decide whether any endpoint has no UI or any UI has no endpoint

## API contract alignment

- [ ] Spot-check changed endpoints in `docs/api_contract.yaml`
- [ ] Compare training endpoints against current backend behavior
- [ ] Compare weight endpoints against current backend behavior
- [ ] Decide where contract drift still exists

## Naming consistency

- [ ] Search for old training names like `planned_workout` or `planned_workout_id`
- [ ] Search for any outdated frontend/backend naming
- [ ] Decide which naming leftovers must be cleaned first

## State coverage

- [ ] Review loading states on all major screens
- [ ] Review empty states on all major screens
- [ ] Review error states on all major screens
- [ ] Decide the top 3 screens that need polish first

## Tests

- [ ] Review backend tests by module
- [ ] Review frontend tests by module
- [ ] Decide where confidence is weakest

## Observability

- [ ] Review logs/debuggability around auth, training start, meal logging, weight logging
- [ ] Decide which user failures are hard to trace today

---

# Suggested review order

## Pass 1 — foundation

- [ ] Auth
- [ ] Business + Coach Profile
- [ ] Clients

## Pass 2 — core coaching product

- [ ] Training
- [ ] Nutrition

## Pass 3 — progress + growth

- [ ] Weight Tracking
- [ ] Storefront / Public

## Pass 4 — hardening

- [ ] Cross-cutting cleanup

---

# Daily review tracker

## Day 1

- [ ] Auth
- [ ] Business + Coach Profile

## Day 2

- [ ] Clients

## Day 3

- [ ] Training plans + workouts

## Day 4

- [ ] Training sessions + performed sets

## Day 5

- [ ] Nutrition plans + meals

## Day 6

- [ ] Nutrition logging + foods + recipes

## Day 7

- [ ] Weight Tracking

## Day 8

- [ ] Storefront / Public
- [ ] Cross-cutting cleanup
