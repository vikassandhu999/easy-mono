# Coach App Bug Report

Run dates: June 27-28, 2026

Target: `http://localhost:2021`

Browser automation: `chrome-devtools-axi`

## Scope

This report contains confirmed bugs from public auth/onboarding, route-guard checks, and authenticated coach workflows tested after completing signup OTP and business registration with a fresh QA account.

The June 28 acquisition/prospects pass was blocked at auth before the landing-page and prospect routes could be exercised through normal UI flows.

## Bugs

### COACH-QA-001 - Login shows raw backend error code for unknown email

Severity: Medium

Route: `/login`

Status: Open

Evidence:

- Screenshot: [screenshots/02-login-raw-error.png](./screenshots/02-login-raw-error.png)
- Network: `POST http://localhost:4000/v1/auth/otp` returned `404` with `error_message: "user_not_found"`.

Steps:

1. Open `http://localhost:2021/login`.
2. Enter `qa@example.com`.
3. Click `Continue with email`.

Expected:

The page shows a user-facing message. It should not expose internal backend codes. Product/security should decide whether to avoid account enumeration entirely with copy such as "If this email can sign in, we'll send a code."

Actual:

The form renders raw red text: `user_not_found`.

Likely source:

- `frontend/apps/coachapp-v2/src/auth/login.tsx:34-35` calls `applyFormErrors`.
- `frontend/apps/coachapp-v2/src/api/shared.ts:144-150` prefers backend `error_message` over the fallback message when there are no field errors.

Recommended fix:

Map auth error codes to product-safe copy before calling `setError`, or make the shared helper accept an option to prefer the caller fallback for selected flows.

### COACH-QA-002 - Invalid signup OTP silently clears the code without showing an error

Severity: High

Route: `/verify-signup`

Status: Open

Evidence:

- Screenshot before invalid OTP: [screenshots/04-verify-signup.png](./screenshots/04-verify-signup.png)
- Screenshot after invalid OTP: [screenshots/05-verify-signup-invalid-otp-no-error.png](./screenshots/05-verify-signup-invalid-otp-no-error.png)
- Network: `POST http://localhost:4000/v1/auth/verify` returned `400` with `error_message: "Invalid OTP, please check and try again"`.

Steps:

1. Submit a valid new signup email.
2. Confirm the app navigates to `/verify-signup`.
3. Enter `000000`.
4. Click `Verify`.

Expected:

The form shows a visible error such as `Invalid code. Try again` or the backend copy.

Actual:

The OTP field clears and `Verify` becomes disabled, but no visible error is shown.

Likely source:

- `frontend/apps/coachapp-v2/src/auth/verify-signup-otp.tsx:58-60` sets the form error, then immediately calls `form.reset({otp: ''})`.
- `frontend/apps/coachapp-v2/src/auth/verify-login-otp.tsx:60-62` has the same pattern, so login OTP likely has the same bug. Manual reproduction was completed for signup OTP only.

Recommended fix:

Clear only the OTP field while preserving errors, or reset the value before setting the root error. Add a regression check that a failed OTP submit leaves visible error text.

### COACH-QA-003 - OTP resend succeeds with no user confirmation

Severity: Low

Route: `/verify-signup`

Status: Open

Evidence:

- After clicking `Resend`, `POST http://localhost:4000/v1/auth/otp` returned `200`.
- The screen returned to the same `Resend` link with no success message or timestamp.

Steps:

1. Reach `/verify-signup`.
2. Click `Resend`.

Expected:

The user gets confirmation that a new code was sent, or a visible disabled/countdown state prevents repeated uncertainty clicks.

Actual:

The page appears unchanged after the request succeeds.

Likely source:

- `frontend/apps/coachapp-v2/src/auth/verify-signup-otp.tsx:64-72` handles failures but has no success state.
- `frontend/apps/coachapp-v2/src/auth/verify-login-otp.tsx:66-72` has the same behavior for login OTP resend.

Recommended fix:

Show a toast or inline status like `Code resent` and optionally disable resend briefly.

### COACH-QA-004 - Authenticated dashboard is an under-construction placeholder

Severity: Medium

Route: `/dashboard`

Status: Open

Evidence:

- Screenshot: [screenshots/10-auth-dashboard-placeholder.png](./screenshots/10-auth-dashboard-placeholder.png)
- Mobile screenshot: [screenshots/31-mobile-auth-dashboard.png](./screenshots/31-mobile-auth-dashboard.png)

Steps:

1. Complete signup OTP with a new QA account.
2. Complete `/register-business`.
3. Land on `/dashboard`.

Expected:

The default authenticated landing page provides a useful coach home state, such as onboarding next steps, client summary, recent activity, or a deliberate redirect to the first usable module.

Actual:

The app lands on a page titled `Dashboard` with only `This page is under construction`.

Likely source:

- `frontend/apps/coachapp-v2/src/router.tsx:53-70` defines the placeholder component.
- `frontend/apps/coachapp-v2/src/router.tsx:87` wires `ROUTES.DASHBOARD` to `<Placeholder title="Dashboard" />`.

Recommended fix:

Replace the placeholder with the real coach dashboard or redirect new coaches to the highest-value setup route until the dashboard exists.

### COACH-QA-005 - Exercise list accessible names duplicate exercise titles

Severity: Low

Route: `/library/exercises`

Status: Open

Evidence:

- Screenshot: [screenshots/18-exercises-list.png](./screenshots/18-exercises-list.png)
- Chrome AX snapshot exposed repeated option names such as `Sissy Squat (Weighted) Sissy Squat (Weighted)` and `Hammer Curl (Dumbbell) Hammer Curl (Dumbbell)`.

Steps:

1. Sign in as a coach.
2. Open `/library/exercises`.
3. Inspect the accessibility tree for the exercise `ListBox` options.

Expected:

Each row has a concise accessible name, ideally the exercise name once plus useful secondary metadata if needed.

Actual:

Several option names repeat the exercise title, which makes screen reader output noisy and can make voice-control targeting ambiguous.

Likely source:

- `frontend/apps/coachapp-v2/src/@components/browse-list-box.tsx:35-64` renders the shared `ListBox`.
- `frontend/apps/coachapp-v2/src/exercises/exercise-list-item.tsx:40-63` renders a `ListBox.Item` with `textValue={exercise.name}` and visible child label text. The duplicated AX name appears to come from how the list item children and `textValue` are combined.

Recommended fix:

Verify the rendered accessibility tree after adjusting the row markup. Keep one accessible name per row, and mark duplicated decorative/visible label text as appropriate only if the component library still includes it in the item name.

### COACH-QA-006 - Training exercise picker filters are not exposed as controls

Severity: Medium

Route: `/library/training-plans/:id`

Status: Open

Evidence:

- Screenshot: [screenshots/26-training-exercise-picker.png](./screenshots/26-training-exercise-picker.png)
- Chrome AX snapshot exposed equipment and muscle filters such as `Barbell`, `Body Only`, `Dumbbell`, and `Abductors` as static text rather than buttons/toggles.

Steps:

1. Sign in as a coach.
2. Create or open a training plan.
3. Add a workout.
4. Click `Add exercise`.
5. Inspect the picker filters in the accessibility tree.

Expected:

Each filter is reachable as a button/toggle with a clear selected state.

Actual:

The filter chips are visually clickable, but they are not exposed as interactive controls to assistive technology.

Likely source:

- `frontend/apps/coachapp-v2/src/builder-kit/search-picker-sheet.tsx:195-208` renders clickable `Chip` elements with `onClick={chip.onToggle}`.
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/exercise-picker-sheet.tsx:108-152` builds the equipment and muscle filter chips.

Recommended fix:

Render filters as actual `button` or toggle components, or configure the library chip component with button semantics. Include `aria-pressed` or equivalent selected-state semantics for active filters.

### COACH-QA-007 - Settings avatar shows only a lowercase first initial

Severity: Low

Route: `/settings`

Status: Open

Evidence:

- Screenshot: [screenshots/29-settings-profile.png](./screenshots/29-settings-profile.png)
- Mobile screenshot: [screenshots/34-mobile-settings.png](./screenshots/34-mobile-settings.png)

Steps:

1. Sign in as `Codex QA`.
2. Open `/settings`.
3. Inspect the profile avatar.

Expected:

The avatar fallback shows a polished name initial, such as `CQ`, `C`, or another consistent uppercase fallback.

Actual:

The avatar fallback shows only lowercase `c`.

Likely source:

- `frontend/apps/coachapp-v2/src/settings/settings.tsx:24-25` computes `const initials = (profile.first_name?.[0] || '' + profile.last_name?.[0] || '').toLowerCase();`.
- Because `+` binds before `||`, a present first name short-circuits the expression before the last initial is included, then the result is lowercased.

Recommended fix:

Compute initials from an array of first and last initials, filter empty values, join them, and uppercase the result.

### COACH-QA-008 - Client workout history empty state renders as a blank list

Severity: Medium

Route: `/clients/:id/workout-history`

Status: Open

Evidence:

- Screenshot: [screenshots/39-rigorous-client-workout-history-empty.png](./screenshots/39-rigorous-client-workout-history-empty.png)

Steps:

1. Sign in as a coach.
2. Open a pending client with no logged workout sessions.
3. Open `/clients/:id/workout-history`.
4. Wait for loading to settle.

Expected:

The page shows the empty-state copy `No workouts logged yet` and explains that sessions will appear once the client starts logging.

Actual:

The page renders the `Workout history` heading, client name, back button, and an empty listbox with no empty-state copy.

Likely source:

- `frontend/apps/coachapp-v2/src/clients/client-workout-history-page.tsx:66-90` passes an `emptyState` to `BrowseListBox`.
- `frontend/apps/coachapp-v2/src/@components/browse-list-box.tsx:35-79` always renders a `Collection` plus `ListBoxLoadMoreItem`; the listbox empty-state callback does not appear in this empty-list case.

Recommended fix:

Handle `items.length === 0 && !isLoading && !isError` outside the `ListBox`, or adjust `BrowseListBox` so the load-more sentinel does not suppress the library empty state.

### COACH-QA-009 - Nutrition plan list says `No meals yet` while builder has a meal

Severity: Medium

Route: `/library/nutrition-plans`

Status: Open

Evidence:

- List screenshot: [screenshots/53-rigorous-nutrition-plans-list.png](./screenshots/53-rigorous-nutrition-plans-list.png)
- Builder screenshot: [screenshots/54-rigorous-nutrition-plan-builder-meal-mismatch.png](./screenshots/54-rigorous-nutrition-plan-builder-meal-mismatch.png)

Steps:

1. Create a nutrition plan.
2. In the builder, add `Meal 1` and a food item.
3. Return to `/library/nutrition-plans`.

Expected:

The list summary reflects the plan content, for example `1 meal`.

Actual:

The list row for `QA Nutrition Plan` says `No meals yet`, while the builder shows `Meal 1` with `12 kcal · 0P/3C/0F`.

Likely source:

- `frontend/apps/coachapp-v2/src/nutrition-plans/list-nutrition-plans.tsx:24-30` derives the subtitle from `plan.meals?.length`.
- The list endpoint/cache used by `useCoachNutritionPlansInfiniteQuery` appears not to include the meals that the detail builder shows.

Recommended fix:

Make the list endpoint return an accurate meal count, or have the list item use a dedicated summary/count field instead of relying on nested `plan.meals`.

### COACH-QA-010 - Recipe create can fail with a generic 422 after visible ingredient fields look valid

Severity: Medium

Route: `/library/recipes/create`

Status: Open

Evidence:

- Screenshot: [screenshots/50-rigorous-recipe-create-generic-422.png](./screenshots/50-rigorous-recipe-create-generic-422.png)
- Network summary showed `POST http://localhost:4000/v1/coach/nutrition-recipes [422]`.

Steps:

1. Create a custom food with only the required name and no nutrition values.
2. Open `/library/recipes/create`.
3. Add that custom food as an ingredient.
4. Fill amount, unit, and weight.
5. Submit the recipe.

Expected:

The UI either prevents invalid ingredient data before submit, or maps the backend validation failure to an actionable message near the ingredient.

Actual:

The form shows only `The data provided was invalid.` with no field-specific guidance. Replacing the ingredient with a seeded food that has nutrition data succeeds.

Likely source:

- `frontend/apps/coachapp-v2/src/recipes/recipe-form/recipe-form.tsx:115-120` builds the request from visible ingredient drafts.
- `frontend/apps/coachapp-v2/src/recipes/recipe-form/recipe-form.tsx:178-184` computes nutrition only when it can, but does not block submit when nutrition cannot be computed.
- `frontend/apps/coachapp-v2/src/recipes/create-recipe.tsx:39-42` submits the request and relies on generic form-error mapping.

Recommended fix:

Validate recipe ingredient requirements client-side before submit, especially when a selected food has missing nutrition fields, and map backend validation details to the ingredient row when the API rejects the request.

### COACH-QA-011 - Adding a profile field leaves an empty modal shell open

Severity: Medium

Route: `/settings/client-profile-fields`

Status: Open

Evidence:

- Screenshot: [screenshots/65-rigorous-profile-field-added-empty-modal.png](./screenshots/65-rigorous-profile-field-added-empty-modal.png)
- Follow-up screenshot showing the field renders on client profile: [screenshots/66-rigorous-client-profile-with-field.png](./screenshots/66-rigorous-client-profile-with-field.png)

Steps:

1. Open `/settings/client-profile-fields`.
2. Click `Add field`.
3. Enter `QA Goal`.
4. Submit.

Expected:

The add-field modal closes after success and the new field appears in the section list.

Actual:

The field is created and the list updates, but the `Add field` modal remains open as an empty shell with only its title/close affordance until a later re-render clears it.

Likely source:

- `frontend/apps/coachapp-v2/src/settings/profile-fields.tsx:119-145` calls `onDone()` after the create mutation succeeds.
- `frontend/apps/coachapp-v2/src/settings/profile-fields.tsx:286-287` owns the modal target state. The success path should synchronously clear the target before or while the list refreshes.

Recommended fix:

Ensure `onDone` closes the sheet/dialog state immediately after successful create/update, then let the list refresh happen independently.

### COACH-QA-012 - Onboarded coaches can still open business registration

Severity: Medium

Route: `/register-business`

Status: Open

Evidence:

- Screenshot: [screenshots/67-rigorous-register-business-accessible-after-onboarding.png](./screenshots/67-rigorous-register-business-accessible-after-onboarding.png)

Steps:

1. Sign in as a coach with an existing business.
2. Open `http://localhost:2021/register-business` directly.

Expected:

The user is redirected to the authenticated app, or shown an already-configured state. The business setup form should not be reachable once onboarding is complete unless the product supports creating/switching businesses.

Actual:

The `Register your business` form renders again for the already onboarded coach.

Likely source:

- `frontend/apps/coachapp-v2/src/router.tsx:50-81` protects `/register-business` with auth only; there is no onboarding-complete guard.

Recommended fix:

Add an onboarding/business-exists guard around `RegisterBusiness`, or make the component redirect when the current coach already has a business.

### COACH-QA-013 - Fresh coach signup can fail with a generic 500 before OTP

Severity: High

Route: `/signup`

Status: Open

Evidence:

- Screenshot: [screenshots/68-acquisition-signup-500-blocker.png](./screenshots/68-acquisition-signup-500-blocker.png)
- Network summary showed `POST http://localhost:4000/v1/auth/signup [500]`.
- Console showed `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`.

Steps:

1. Open `/signup`.
2. Enter `QA` as first name and `Acquisition` as last name.
3. Submit a fresh QA email.
4. Repeat with a no-plus QA email.

Expected:

The app creates the account and navigates to `/verify-signup`, or shows a field-specific/user-actionable signup error.

Actual:

The form remains on `/signup` and shows `An internal server error occurred.` The OTP screen is never reached.

Likely source:

- `backend/lib/easy/identity/signup.ex:27-32` sends the OTP after the user/token transaction succeeds.
- `backend/config/dev.exs:41-45` configures the dev mailer with the Resend adapter, so a local email-delivery failure can surface as a 500 after partial signup work.
- `frontend/apps/coachapp-v2/src/auth/signup.tsx:36-38` maps the generic API failure into the form root.

Recommended fix:

Do not let OTP delivery failures produce a generic 500 in local/dev signup. Return actionable UI copy and use a local/dev-safe mail adapter or log-only OTP delivery for development.

### COACH-QA-014 - Existing QA coach login can fail with a generic 400 before OTP

Severity: High

Route: `/login`

Status: Open

Evidence:

- Screenshot: [screenshots/69-acquisition-login-400-blocker.png](./screenshots/69-acquisition-login-400-blocker.png)
- Network summary showed `POST http://localhost:4000/v1/auth/otp [400]`.
- Console showed `Failed to load resource: the server responded with a status of 400 (Bad Request)`.

Steps:

1. Open `/login`.
2. Enter the prior verified QA coach email.
3. Click `Continue with email`.

Expected:

The login flow sends an OTP and navigates to `/verify-login`, or shows a user-actionable reason the account cannot receive an OTP.

Actual:

The form stays on `/login` and shows only `Bad Request`.

Likely source:

- `backend/lib/easy/identity/otp_delivery.ex:12-32` creates the OTP and dispatches email after validation.
- `frontend/apps/coachapp-v2/src/auth/login.tsx:30-39` only special-cases `404`; other auth failures go through generic form-error mapping.

Recommended fix:

Map known OTP-send failures to product copy and avoid exposing bare HTTP status text. Add a regression case for non-404 OTP failures.

## Non-Bugs Confirmed In This Session

- `/` with no token redirects to `/login`.
- `/dashboard` with no token redirects to `/login`.
- `/verify-login` without location state redirects to `/login`.
- `/verify-signup` without location state redirects to `/signup`.
- Empty and malformed login email show field-level validation.
- Empty and malformed signup email show field-level validation.
- Signup with a new valid email reaches `/verify-signup`.
- Valid signup OTP reaches `/register-business`.
- Business registration reaches the authenticated app shell.
- Authenticated `/login`, `/signup`, and unknown routes redirect to `/dashboard`.
- Client invite form validates missing name and missing contact method.
- Client invite happy path succeeds and opens a pending client detail page.
- Exercise, food, recipe, training plan, check-in, and profile-field create/edit routes rendered without crashes in the tested paths.
- Training plan list and builder agree after data finishes loading.
- No JavaScript console errors were observed in tested flows.

## Additional Observations

- A transient `ERR_CONNECTION_REFUSED` burst appeared while loading `/clients`, then reload recovered with clean `200` responses. This was treated as environment instability, not a confirmed app bug.
- The nutrition picker briefly appeared to expose nested dialogs after selecting a food, but the stale picker cleared after waiting/refreshing. This needs a focused reproduction before filing.

## Warnings

Chrome reported one warning:

`<meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">`

This is not blocking the tested flows, but it should be cleaned up during PWA polish.
