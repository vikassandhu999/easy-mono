# Coach App Test Plan

Target: `frontend/apps/coachapp-v2` at `http://localhost:2021`

API expected by the app: `http://localhost:4000`

Tooling: Chrome through `chrome-devtools-axi`, screenshots, console, and network inspection.

## Preconditions

- Frontend dev server is running on port `2021`.
- Backend API is running on port `4000`.
- Browser starts with a clean coach app auth state.
- A valid coach test account is available, including access to the OTP delivery channel.
- Seed or create enough data for authenticated coverage:
  - At least one active client, one pending invite, and one archived/inactive client.
  - At least one exercise, food, recipe, nutrition plan, training plan, and check-in template.
  - At least one client workout session and one client nutrition log if detail dashboards are in scope.

## Priority Matrix

| Priority | Area | Why |
| --- | --- | --- |
| P0 | Auth and onboarding | Blocks all protected coach workflows. |
| P0 | Protected route guard and session expiry | Prevents unauthorized access and bad logout behavior. |
| P0 | Clients | Primary coach workflow. |
| P1 | Library lists and create/edit forms | Core content management. |
| P1 | Nutrition/training plan builders | High-complexity product flows. |
| P1 | Settings/profile fields | Account and intake configuration. |
| P2 | PWA/install behavior | Important, but not a core data workflow. |

## Test Areas

### 1. Auth And Onboarding

| Case | Steps | Expected |
| --- | --- | --- |
| Root redirect | Open `/` with no token. | User lands on `/login`. |
| Protected redirect | Open `/dashboard` with no token. | User lands on `/login`; no protected UI flashes. |
| Login validation | Submit `/login` empty and with malformed email. | Inline field errors: required email and valid email. |
| Login unknown email | Submit a valid email that has no account. | User-facing message, no raw backend code. |
| Login OTP success | Submit a known coach email, enter valid OTP. | User lands on `/dashboard`; tokens are stored. |
| Login OTP invalid | Enter a wrong 6-digit OTP. | OTP field clears only if an error remains visible. |
| Login resend | Click `Resend`. | The user gets success/failure feedback and duplicate clicks are controlled. |
| Signup validation | Submit `/signup` empty and malformed email. | Inline field errors. |
| Signup success | Submit a new email. | User lands on `/verify-signup` with masked email. |
| Signup OTP invalid | Enter a wrong 6-digit OTP. | Visible error explains the code is invalid. |
| Signup OTP valid | Enter valid OTP. | Tokens are stored and user reaches `/register-business`. |
| Business registration | Complete business setup. | User reaches protected app shell. |
| Business registration after onboarding | Open `/register-business` after a coach already has a business. | User is redirected away or shown a safe already-configured state. |
| Direct OTP routes | Open `/verify-login` and `/verify-signup` without navigation state. | Redirects to `/login` or `/signup`. |

### 2. App Shell And Navigation

| Case | Steps | Expected |
| --- | --- | --- |
| Desktop shell | Login at 1280px and inspect sidebar. | Dashboard, Clients, Library group, Settings render; active state follows route. |
| Mobile shell | Login at 375px and inspect bottom nav. | Home, Clients, Library, Settings are reachable with no overlap. |
| Library group | Expand/collapse desktop Library group. | Nested links remain keyboard and pointer accessible. |
| Logout | Use Settings logout. | Tokens clear, API cache resets, user lands on `/login`. |
| Session expiry | Force API 401/403 with an expired token. | User gets a session-expired message and is redirected to `/login`. |

### 3. Clients

| Case | Steps | Expected |
| --- | --- | --- |
| Client list | Open `/clients`. | Summary filters render and list loads. |
| Search | Search by name/email. | Results update without layout jumps; clear works. |
| Status tabs | Switch All/Active/Pending/Inactive/Archived. | Counts and rows match API data. |
| Invite form | Open `/clients/invite`; submit empty, invalid email, and valid invite. | Validation is field-specific; success navigates or confirms clearly. |
| Pending invite actions | Resend, copy invite, revoke. | Success/failure feedback is clear; list/detail refresh. |
| Client detail | Open active and pending client details. | Header, profile, nutrition, training, check-ins, and actions match status. |
| Edit client | Edit allowed fields and status. | Form saves, errors map to fields, navigation returns correctly. |
| Workout history | Open client workout history/session detail. | Empty, loading, error, and populated states render. |

### 4. Library

| Case | Steps | Expected |
| --- | --- | --- |
| Library index | Open `/library`. | Six module cards render and navigate. |
| Exercises | List, search/filter, create, detail, edit, delete/copy if present. | No crashes; forms validate; list refreshes. |
| Foods | List, search, create, detail, edit, delete. | Macro/serving fields validate and render consistently. |
| Recipes | List, create with ingredients, detail, edit, copy/delete. | Ingredient picker and totals work. |
| Nutrition plans | List, create, builder, edit metadata, assign to client. | Builder handles empty days, add/remove meals/items, save states. |
| Training plans | List, create, builder, edit metadata, assign to client. | Week schedule, workouts, exercises, sets, and tracking fields work. |
| Check-ins | List, create builder, edit template, assign to client. | Question sections, field mappings, and required/options validation work. |

### 5. Settings

| Case | Steps | Expected |
| --- | --- | --- |
| Profile load | Open `/settings`. | Coach name, business, phone, invite link, account email render. |
| Inline edits | Edit name, business, phone. | Save/cancel states work; API errors show in row. |
| Copy invite link | Click copy. | Clipboard success state is visible. |
| Profile fields | Open `/settings/client-profile-fields`. | Empty, create, edit, delete, reorder if supported, and errors work. |

### 6. Responsive And Accessibility

Run the P0 and P1 flows at:

- `375x812`
- `768x1024`
- `1280x900`

Checks:

- No horizontal overflow on mobile.
- Buttons and fields have at least 44px touch targets.
- Forms are keyboard reachable.
- Error messages are associated with fields or visible as form-level text.
- Focus moves predictably after navigation and form submission.
- No text overlaps fixed bottom nav or sticky toolbars.

### 7. Console And Network

- Check console errors after every major flow.
- Check failed API calls for user-facing error handling.
- Verify loading, empty, error, and retry states for every list/detail screen.
- Confirm no raw backend codes leak to the UI.

## Current Session Coverage

Completed:

- Public auth screens: login, signup, signup OTP.
- Form validation for login and signup.
- Signup happy path up to `/verify-signup`.
- Invalid signup OTP error path.
- OTP resend success call.
- Unauthenticated protected-route redirect.
- Direct OTP route redirects.
- Mobile snapshots for login and signup.
- Valid signup OTP and business onboarding.
- Authenticated desktop app shell.
- Authenticated mobile app shell at `375x812`.
- Clients list, invite flow, pending client detail, and pending client profile.
- Library index, exercise list/create form, foods list, recipes empty state.
- Nutrition plan creation, meal creation, and food item addition.
- Training plan creation, workout creation, exercise picker, and exercise addition.
- Check-in builder validation.
- Settings profile and profile-fields empty/create validation.
- Authenticated `/login`, `/signup`, catch-all, and `/register-business` guard checks.
- Detail/edit/create route sweep for clients, exercises, foods, recipes, nutrition plans, training plans, check-ins, and profile fields.
- Console and network inspection for tested flows.

Deferred:

- Logout and forced session-expiry handling.
- Destructive or cleanup actions: delete, revoke, archive, and full edit/delete coverage.
- Active-client assignment flows, populated client dashboards, and workout session detail.
- Tablet breakpoint at `768x1024`.
