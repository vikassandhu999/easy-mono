# Form field wrapper rollout checklist

Reusable wrappers introduced:

- `FormTextField`
- `FormTextAreaField`
- `FormNumberField`
- `FormSelectField`
- `FormSwitchField`
- `FormOtpField`

## Done

### Coach app
- [x] `apps/coachapp-v2/src/auth/login.tsx`
- [x] `apps/coachapp-v2/src/auth/register-business.tsx`
- [x] `apps/coachapp-v2/src/auth/signup.tsx`
- [x] `apps/coachapp-v2/src/auth/verify-login-otp.tsx`
- [x] `apps/coachapp-v2/src/auth/verify-signup-otp.tsx`
- [x] `apps/coachapp-v2/src/clients/client-form/edit-client-form.tsx`
- [x] `apps/coachapp-v2/src/clients/client-invite-form/invite-client-form.tsx`
- [x] `apps/coachapp-v2/src/exercises/exercise-form/exercise-form.tsx`
- [x] `apps/coachapp-v2/src/foods/components/ingredient-list.tsx`
- [x] `apps/coachapp-v2/src/foods/food-form/food-form.tsx`
- [x] `apps/coachapp-v2/src/nutrition-plans/components/meal-item-row.tsx`
- [x] `apps/coachapp-v2/src/nutrition-plans/components/meal-section.tsx`
- [x] `apps/coachapp-v2/src/nutrition-plans/nutrition-plan-detail.tsx` (inline add-meal form)
- [x] `apps/coachapp-v2/src/nutrition-plans/nutrition-plan-form/nutrition-plan-form.tsx`
- [x] `apps/coachapp-v2/src/recipes/recipe-form/recipe-form.tsx`
- [x] `apps/coachapp-v2/src/settings/components/editable-row.tsx`
- [x] `apps/coachapp-v2/src/storefront/components/faq-editor.tsx`
- [x] `apps/coachapp-v2/src/storefront/components/hero-editor.tsx`
- [x] `apps/coachapp-v2/src/storefront/components/intake-questions-editor.tsx`
- [x] `apps/coachapp-v2/src/storefront/components/settings-editor.tsx`
- [x] `apps/coachapp-v2/src/storefront/components/trust-stats-editor.tsx`
- [x] `apps/coachapp-v2/src/storefront/offer-form/offer-form.tsx`
- [x] `apps/coachapp-v2/src/storefront/testimonial-form/testimonial-form.tsx`
- [x] `apps/coachapp-v2/src/training-plans/components/inline-exercise-form.tsx`
- [x] `apps/coachapp-v2/src/training-plans/components/workout-name-form.tsx`
- [x] `apps/coachapp-v2/src/training-plans/components/workout-section.tsx`
- [x] `apps/coachapp-v2/src/training-plans/training-plan-form/training-plan-form.tsx`

### Client app
- [x] `apps/clientapp-v2/src/auth/verify-login-otp.tsx`
- [x] `apps/clientapp-v2/src/auth/verify-invite-otp.tsx`

## Still pending

- None

## Notes

- Some remaining files have custom field composition or more specialized interaction logic, but they are still strong candidates for the same wrappers.
- Typechecked after the completed rollout with `pnpm --filter @easy/coachapp-v2 exec tsc --noEmit` and `pnpm --filter @easy/clientapp-v2 exec tsc --noEmit`.
