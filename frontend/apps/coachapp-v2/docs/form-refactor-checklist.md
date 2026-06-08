# Coach app form refactor checklist

Goal: refactor every form-like surface in `coachapp-v2` so it uses HeroUI form primitives, React Hook Form with `Controller` around HeroUI fields, zod schemas, app navigation rules from `AGENTS.md`, and feature-owned folder structure.

## Refactor standards

- Use `react-hook-form` + `zod` for every form.
- Wrap every HeroUI form field with `Controller`.
- Prefer HeroUI form primitives: `Form`, `Fieldset`, `FieldError`, `ErrorMessage`, `TextField`, `NumberField`, `Checkbox`, `CheckboxGroup`, `Switch`, etc.
- Avoid native `<form>` when HeroUI `Form` is appropriate.
- Avoid `useState` for form field values; local state is fine only for non-form UI state.
- Use `applyFormErrors(err, fallback, setError)` for server/API errors.
- Create save navigation: `navigate(target, {replace: true})`.
- Edit save/cancel/back navigation: `useGoBack(fallback)`.
- Move domain forms out of generic `components/` folders where the form is a primary domain primitive.
- Keep schema + inferred values type in the same file as the form component.

## Primary CRUD forms

### Food
- [x] `foods/food-form/food-form.tsx`
  - Status: already mostly refactored to HeroUI `Form`, `Fieldset`, `TextField`, `NumberField`, `Controller`, numeric `number | undefined` values.
  - Review for final consistency only.
- [x] `foods/create-food.tsx`
- [x] `foods/edit-food.tsx`

### Exercises
- [x] `exercises/exercise-form/exercise-form.tsx`
  - Moved from `exercises/components/exercise-form.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `CheckboxGroup`, `Select`, `Controller`, and RHF-managed images.
- [x] `exercises/create-exercise.tsx`
- [x] `exercises/edit-exercise.tsx`

### Recipes
- [x] `recipes/recipe-form/recipe-form.tsx`
  - Moved from `recipes/components/recipe-form.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `NumberField`, `FieldError`, `ErrorMessage`, and `Controller`.
  - Numeric fields use `number | undefined` values.
- [x] `recipes/create-recipe.tsx`
- [x] `recipes/edit-recipe.tsx`

### Nutrition plans
- [x] `nutrition-plans/nutrition-plan-form/nutrition-plan-form.tsx`
  - Moved from `nutrition-plans/components/nutrition-plan-form.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `NumberField`, `FieldError`, `ErrorMessage`, and `Controller`.
  - Numeric fields use `number | undefined` values.
- [x] `nutrition-plans/create-nutrition-plan.tsx`
- [x] `nutrition-plans/edit-nutrition-plan.tsx`

### Training plans
- [x] `training-plans/training-plan-form/training-plan-form.tsx`
  - Moved from `training-plans/components/training-plan-form.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller`.
- [x] `training-plans/create-training-plan.tsx`
- [x] `training-plans/edit-training-plan.tsx`

### Clients
- [x] `clients/client-form/edit-client-form.tsx`
  - Extracted from `clients/edit-client.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `Select`, `FieldError`, `ErrorMessage`, and `Controller`.
- [x] `clients/edit-client.tsx`
- [x] `clients/client-invite-form/invite-client-form.tsx`
  - Extracted from `clients/invite-client.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller`.
- [x] `clients/invite-client.tsx`

## Storefront forms

### Offers
- [x] `storefront/offer-form/offer-form.tsx`
  - Moved from `storefront/components/offer-form.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `Select`, `Switch`, `FieldError`, `ErrorMessage`, and `Controller`.
  - Removed local feature draft state; features are managed with RHF `useFieldArray`.
- [x] `storefront/create-offer.tsx`
- [x] `storefront/edit-offer.tsx`

### Testimonials
- [x] `storefront/testimonial-form/testimonial-form.tsx`
  - Moved from `storefront/components/testimonial-form.tsx`.
  - Uses HeroUI `Form`, `Fieldset`, `TextField`, `NumberField`, `Switch`, `FieldError`, `ErrorMessage`, and `Controller`.
  - Weight fields use `number | undefined` values.
- [x] `storefront/create-testimonial.tsx`
- [x] `storefront/edit-testimonial.tsx`

### Storefront editor
- [x] `storefront/storefront-editor.tsx`
  - Uses HeroUI `Form`; live-preview editor exception still applies for layout.
- [x] `storefront/components/hero-editor.tsx`
  - Uses HeroUI `Fieldset`, `TextField`, `FieldError`, and `Controller` for profile/social fields.
- [x] `storefront/components/settings-editor.tsx`
  - Uses HeroUI `Fieldset`, `TextField`, `Switch`, `FieldError`, and `Controller` for settings fields.
- [x] `storefront/components/intake-questions-editor.tsx`
  - Uses HeroUI `Fieldset`, `TextField`, `Select`, `Switch`, `FieldError`, and `Controller` for dynamic fields.
- [x] `storefront/components/faq-editor.tsx`
  - Uses HeroUI `Fieldset`, `TextField`, `FieldError`, and `Controller` for dynamic FAQ fields.
- [x] `storefront/components/trust-stats-editor.tsx`
  - Uses HeroUI `Fieldset`, `TextField`, `FieldError`, and `Controller` for dynamic stat fields.

## Plan builder and inline editing forms

- [x] `training-plans/components/inline-exercise-form.tsx`
  - Uses HeroUI `Form`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller` for inline exercise fields.
- [x] `training-plans/components/workout-name-form.tsx`
  - Uses HeroUI `Form`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller`.
- [x] `training-plans/components/workout-section.tsx`
  - Workout name/notes inline edits now use an RHF-backed `WorkoutTextForm` with HeroUI `Form`, `TextField`, `FieldError`, and `Controller`.

## Nutrition/food inline editors

- [x] `nutrition-plans/components/meal-section.tsx`
  - Add-item inline form now uses RHF with HeroUI `Form`, `TextField`, `NumberField`, `FieldError`, and `Controller`.
- [x] `nutrition-plans/components/meal-item-row.tsx`
  - Inline row editor now uses RHF with HeroUI `Form`, `TextField`, `NumberField`, `FieldError`, and `Controller`.
- [x] `nutrition-plans/nutrition-plan-detail.tsx`
  - Add-meal inline form now uses RHF with HeroUI `Form`, `TextField`, `FieldError`, and `Controller`.
- [x] `foods/components/ingredient-list.tsx`
  - Expanded ingredient fields now use RHF with HeroUI `Form`, `TextField`, `NumberField`, `FieldError`, and `Controller`.

## Auth and settings forms

- [x] `auth/login.tsx`
  - Uses HeroUI `Form`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller`.
- [x] `auth/signup.tsx`
  - Uses HeroUI `Form`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller`.
- [x] `auth/register-business.tsx`
  - Uses HeroUI `Form`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller`.
- [x] `auth/verify-login-otp.tsx`
  - Uses HeroUI `Form`, `InputOTP`, `ErrorMessage`, and `Controller`.
- [x] `auth/verify-signup-otp.tsx`
  - Uses HeroUI `Form`, `InputOTP`, `ErrorMessage`, and `Controller`.
- [x] `settings/components/editable-row.tsx`
  - Uses HeroUI `Form`, `TextField`, `FieldError`, `ErrorMessage`, and `Controller`; local state remains for edit mode only.

## Suggested refactor order

1. `exercises/components/exercise-form.tsx`
2. `recipes/components/recipe-form.tsx`
3. `nutrition-plans/components/nutrition-plan-form.tsx`
4. `training-plans/components/training-plan-form.tsx`
5. `clients/edit-client.tsx`
6. `clients/invite-client.tsx`
7. `storefront/components/offer-form.tsx`
8. `storefront/components/testimonial-form.tsx`
9. Storefront editor subforms
10. Plan builder inline forms
11. Nutrition/food inline editors
12. Auth/settings forms
