# Authenticated Run - June 27, 2026

Target: `http://localhost:2021`

Tool: `chrome-devtools-axi`

## Test Identity

- Signup email: `qa+coachapp-codex-20260627-1358@example.com`
- Coach name: `Codex QA`
- Business name: `Codex QA Fitness 1358`
- Business handle: `codex-qa-fitness-1358`
- Client invite email: `qa+client-20260627-1358@example.com`
- Created nutrition plan: `QA Nutrition Plan`
- Created nutrition plan id: `577a1e7e-3db1-435f-9006-6978d1ad9468`
- Created training plan: `QA Training Plan`
- Created training plan id: `7401df8b-466e-4fe7-8c1b-5b3761cad3c1`

The valid OTP was supplied interactively by the user and is intentionally not recorded here.

## Screenshots Captured

- [09-register-business.png](./screenshots/09-register-business.png)
- [10-auth-dashboard-placeholder.png](./screenshots/10-auth-dashboard-placeholder.png)
- [11-clients-empty.png](./screenshots/11-clients-empty.png)
- [12-clients-button-stale-instability.png](./screenshots/12-clients-button-stale-instability.png)
- [13-invite-client-form.png](./screenshots/13-invite-client-form.png)
- [14-invite-client-success.png](./screenshots/14-invite-client-success.png)
- [15-client-detail-pending.png](./screenshots/15-client-detail-pending.png)
- [16-client-profile-empty-fields.png](./screenshots/16-client-profile-empty-fields.png)
- [17-library-index.png](./screenshots/17-library-index.png)
- [18-exercises-list.png](./screenshots/18-exercises-list.png)
- [19-create-exercise-form.png](./screenshots/19-create-exercise-form.png)
- [20-foods-list.png](./screenshots/20-foods-list.png)
- [21-recipes-empty.png](./screenshots/21-recipes-empty.png)
- [22-nutrition-plan-builder-empty.png](./screenshots/22-nutrition-plan-builder-empty.png)
- [23-nutrition-picker-nested-dialogs.png](./screenshots/23-nutrition-picker-nested-dialogs.png)
- [24-nutrition-plan-meal-with-food.png](./screenshots/24-nutrition-plan-meal-with-food.png)
- [25-training-plan-builder-empty.png](./screenshots/25-training-plan-builder-empty.png)
- [26-training-exercise-picker.png](./screenshots/26-training-exercise-picker.png)
- [27-training-plan-workout-with-exercise.png](./screenshots/27-training-plan-workout-with-exercise.png)
- [28-checkin-builder-empty.png](./screenshots/28-checkin-builder-empty.png)
- [29-settings-profile.png](./screenshots/29-settings-profile.png)
- [30-profile-fields-empty.png](./screenshots/30-profile-fields-empty.png)
- [31-mobile-auth-dashboard.png](./screenshots/31-mobile-auth-dashboard.png)
- [32-mobile-clients.png](./screenshots/32-mobile-clients.png)
- [33-mobile-library.png](./screenshots/33-mobile-library.png)
- [34-mobile-settings.png](./screenshots/34-mobile-settings.png)

## Executed Checks

| Check | Result | Notes |
| --- | --- | --- |
| Valid signup OTP | Pass | Tokens were stored and the app navigated to `/register-business`. |
| Business registration | Pass | New business was created and the app navigated to `/dashboard`. |
| Authenticated dashboard | Fail | Dashboard shows only `This page is under construction`. See `COACH-QA-004`. |
| Desktop app shell | Pass | Sidebar navigation rendered and routes were reachable. |
| Clients empty state | Pass | Empty state and invite CTA rendered before creating an invite. |
| Client invite form validation | Pass | Empty submit focused required name; name-only submit showed `Add email or phone`. |
| Client invite success | Pass | Valid invite showed success screen and generated invite link. |
| Pending client detail | Pass | Pending client detail route rendered. |
| Pending client profile | Pass | Profile route rendered empty fields/setup CTA. |
| Library index | Pass | Six module cards rendered. |
| Exercises list | Fail | Several options had duplicated accessible names in the AX tree. See `COACH-QA-005`. |
| Create exercise form | Pass | Form rendered. Creation was not executed. |
| Foods list | Pass | Seeded system foods rendered. |
| Recipes list | Pass | Empty recipes state rendered with create CTA. |
| Nutrition plan create | Pass | Created `QA Nutrition Plan` and reached the builder. |
| Nutrition plan add meal | Pass | Added `Meal 1`. |
| Nutrition plan add food | Pass | Added `Mulberry Crush, Pure Berry's` at `5g`; meal totals updated to `12 kcal`, `0P`, `3C`, `0F`. |
| Training plan create | Pass | Created `QA Training Plan` and reached the builder. |
| Training plan add workout | Pass | Added `Workout 1`. |
| Training exercise picker filters | Fail | Equipment and muscle filters were exposed as static text rather than controls. See `COACH-QA-006`. |
| Training plan add exercise | Pass | Added `Sissy Squat` to `Workout 1`. |
| Check-in builder validation | Pass | Empty submit showed `Give the check-in a name.` |
| Settings profile | Fail | Avatar initials rendered as `c` for `Codex QA`. See `COACH-QA-007`. |
| Profile fields | Pass | Empty state and add-field dialog rendered; empty submit showed `Label is required`. |
| Mobile dashboard | Fail | Same dashboard placeholder on mobile. See `COACH-QA-004`. |
| Mobile clients | Pass | Pending client list rendered with bottom navigation. |
| Mobile library | Pass | Library cards rendered with bottom navigation. |
| Mobile settings | Fail | Same lowercase single initial rendered. See `COACH-QA-007`. |
| Console errors | Pass | No console errors were present at final inspection. |
| Final network check | Pass | Final fetches to `/v1/coach/clients` and `/v1/coach/me` returned `200`. |

## Observations Not Filed As Bugs

- A transient `ERR_CONNECTION_REFUSED` burst appeared while loading `/clients`, then the backend responded normally and a reload produced clean `200` responses. This was treated as environment instability, not a confirmed product bug.
- The nutrition picker briefly appeared to expose nested dialogs after selecting an item, but the stale picker state cleared after waiting/refreshing. More focused reproduction is needed before filing.
- Settings shows a public invite link shaped like `coachapp.in/join/codex-qa-fitness-1358`, while the client invite flow generated a localhost invite URL. This may be intended public join-link behavior and was not filed without product confirmation.

## Remaining Coverage

- Logout and forced session-expiry handling.
- Resend/copy/revoke pending invite actions.
- Edit/delete flows for clients, foods, recipes, exercises, plans, and check-in templates.
- Assignment flows from plans/check-ins to active clients.
- Tablet breakpoint pass at `768x1024`.
