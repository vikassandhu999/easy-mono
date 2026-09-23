# Coach app

Build one complete coaching task at a time in `frontend/apps/coachapp`. Use the Phoenix contract and this app's primitives. Do not use the v2 app as a design reference.

## Product scope

Clients is the signed-in home. Coaches invite clients directly, maintain profiles and engagements, assign and edit training/nutrition plans, read recorded history, and communicate through Messages. The account menu contains profile/business settings, team management, and billing.

Training includes exercises, reusable templates, workouts, prescribed sets, schedules, client plans and performed sessions. Nutrition includes foods, recipes, reusable templates, client plans, menus, diary history. Plan copies remain independent of their templates.

## Delivery

Write a short screen brief describing entry, primary action, saved outcome, empty/loading/error states, and recovery. Build against real APIs and verify the complete flow at 375px and 1280px. Keep cache invalidation in resource hooks. See [list conventions](lists.md), [client management](client-management.md), [team](team.md), and [billing](billing.md).

Auth uses email OTP, business setup, session refresh, protected routes and logout. Failed transport must preserve valid credentials. A late response must not cross into another account.

Implementation and verification for the approved local reset are tracked in [the reset plan](../core-reset/plan.md). Historic verification is retained in the checkpoint branches; it is not evidence for the reset.
