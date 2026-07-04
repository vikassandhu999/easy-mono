# Rigorous Route Run - June 27, 2026

Target: `http://localhost:2021`

Tool: `chrome-devtools-axi`

## Session

- Login account: `qa+coachapp-codex-20260627-1358@example.com`
- OTP was supplied by the user and is intentionally not recorded.
- Existing client id: `8e9f2502-783a-4da8-8c63-11a2ffe16137`
- Existing nutrition plan id: `577a1e7e-3db1-435f-9006-6978d1ad9468`
- Existing training plan id: `7401df8b-466e-4fe7-8c1b-5b3761cad3c1`
- Created exercise id: `27ac166e-7550-429b-835b-3f9fbf70c512`
- Created food id: `7fbbe995-c7ac-4084-9fdb-2a9d8c26f530`
- Created recipe id: `51ab7395-f906-4b04-b3d3-eec6e92035ba`
- Created check-in id: `fb69dd24-a31b-4d9e-a422-0bbd48e7847d`
- Created profile field: `QA Goal`

## Screenshots Captured

- [35-rigorous-clients-list.png](./screenshots/35-rigorous-clients-list.png)
- [36-rigorous-client-detail.png](./screenshots/36-rigorous-client-detail.png)
- [37-rigorous-client-profile-loaded.png](./screenshots/37-rigorous-client-profile-loaded.png)
- [38-rigorous-client-edit.png](./screenshots/38-rigorous-client-edit.png)
- [39-rigorous-client-workout-history-empty.png](./screenshots/39-rigorous-client-workout-history-empty.png)
- [40-rigorous-library-index.png](./screenshots/40-rigorous-library-index.png)
- [41-rigorous-exercise-create.png](./screenshots/41-rigorous-exercise-create.png)
- [42-rigorous-exercise-detail.png](./screenshots/42-rigorous-exercise-detail.png)
- [43-rigorous-exercise-edit.png](./screenshots/43-rigorous-exercise-edit.png)
- [44-rigorous-foods-list.png](./screenshots/44-rigorous-foods-list.png)
- [45-rigorous-food-create.png](./screenshots/45-rigorous-food-create.png)
- [46-rigorous-food-detail.png](./screenshots/46-rigorous-food-detail.png)
- [47-rigorous-food-edit.png](./screenshots/47-rigorous-food-edit.png)
- [48-rigorous-recipes-list-empty.png](./screenshots/48-rigorous-recipes-list-empty.png)
- [49-rigorous-recipe-create.png](./screenshots/49-rigorous-recipe-create.png)
- [50-rigorous-recipe-create-generic-422.png](./screenshots/50-rigorous-recipe-create-generic-422.png)
- [51-rigorous-recipe-detail.png](./screenshots/51-rigorous-recipe-detail.png)
- [52-rigorous-recipe-edit.png](./screenshots/52-rigorous-recipe-edit.png)
- [53-rigorous-nutrition-plans-list.png](./screenshots/53-rigorous-nutrition-plans-list.png)
- [54-rigorous-nutrition-plan-builder-meal-mismatch.png](./screenshots/54-rigorous-nutrition-plan-builder-meal-mismatch.png)
- [55-rigorous-nutrition-plan-edit.png](./screenshots/55-rigorous-nutrition-plan-edit.png)
- [56-rigorous-training-plans-list.png](./screenshots/56-rigorous-training-plans-list.png)
- [57-rigorous-training-plan-builder.png](./screenshots/57-rigorous-training-plan-builder.png)
- [58-rigorous-training-plan-edit.png](./screenshots/58-rigorous-training-plan-edit.png)
- [59-rigorous-checkins-list-empty.png](./screenshots/59-rigorous-checkins-list-empty.png)
- [60-rigorous-checkin-create.png](./screenshots/60-rigorous-checkin-create.png)
- [61-rigorous-checkins-list-populated.png](./screenshots/61-rigorous-checkins-list-populated.png)
- [62-rigorous-checkin-edit.png](./screenshots/62-rigorous-checkin-edit.png)
- [63-rigorous-settings.png](./screenshots/63-rigorous-settings.png)
- [64-rigorous-profile-fields-empty.png](./screenshots/64-rigorous-profile-fields-empty.png)
- [65-rigorous-profile-field-added-empty-modal.png](./screenshots/65-rigorous-profile-field-added-empty-modal.png)
- [66-rigorous-client-profile-with-field.png](./screenshots/66-rigorous-client-profile-with-field.png)
- [67-rigorous-register-business-accessible-after-onboarding.png](./screenshots/67-rigorous-register-business-accessible-after-onboarding.png)

## Route Coverage

| Area | Result | Notes |
| --- | --- | --- |
| Login OTP | Pass | Fresh login OTP accepted and redirected to `/dashboard`. |
| Authenticated `/login` and `/signup` | Pass | Both redirected to `/dashboard`. |
| Catch-all route | Pass | Unknown route redirected to `/dashboard`. |
| `/register-business` after onboarding | Fail | Existing coach can still access business registration. See `COACH-QA-012`. |
| Clients list | Pass | Pending invite listed. |
| Client detail | Pass | Pending invite actions and profile link rendered. |
| Client profile | Pass | Empty profile loaded; after profile-field creation, `QA Goal` rendered. |
| Client edit | Pass | Pending client edit form rendered. |
| Client workout history | Fail | Empty history showed a blank listbox instead of empty copy. See `COACH-QA-008`. |
| Client session detail | Deferred | No workout session exists for the pending client. |
| Library index | Pass | All six module cards rendered. |
| Exercises | Pass with known a11y issue | List/create/detail/edit covered with custom exercise. Duplicate AX names remain `COACH-QA-005`. |
| Foods | Pass | List/create/detail/edit covered with custom food. |
| Recipes | Pass with validation issue | Empty list, create validation, successful create with seeded ingredient, detail, and edit covered. Generic 422 remains `COACH-QA-010`. |
| Nutrition plans | Fail | List and builder disagree on meal count. See `COACH-QA-009`. Edit route rendered. |
| Training plans | Pass with known a11y issue | List/builder/edit covered. Exercise picker filter issue remains `COACH-QA-006`. |
| Check-ins | Pass | Create validation, successful create, list, and edit covered. |
| Settings | Fail | Avatar initials bug remains `COACH-QA-007`. |
| Profile fields | Fail | Field creation works and client profile renders the field, but success leaves an empty modal shell. See `COACH-QA-011`. |
| Console | Pass | `chrome-devtools-axi console --type error` found no console errors. |

## Not Covered

- Logout and forced session-expiry behavior.
- Destructive actions: delete, revoke invitation, archive/inactivate, and cleanup.
- Active-client-only dashboards and assignment flows.
- Session detail route, because there were no workout sessions.
- Tablet breakpoint at `768x1024`.
