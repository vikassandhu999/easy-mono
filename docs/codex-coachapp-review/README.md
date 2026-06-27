# Coach App Review

Manual QA review for `frontend/apps/coachapp-v2`, run against `http://localhost:2021` on June 27, 2026 using `chrome-devtools-axi`.

## Artifacts

- [test-plan.md](./test-plan.md) - end-to-end manual test plan for the coach app.
- [bug-report.md](./bug-report.md) - confirmed bugs and observed risks from this session.
- [manual-run-2026-06-27.md](./manual-run-2026-06-27.md) - execution log and coverage notes.
- [authenticated-run-2026-06-27.md](./authenticated-run-2026-06-27.md) - authenticated signup, onboarding, clients, library, builders, settings, and mobile execution log.
- [rigorous-route-run-2026-06-27.md](./rigorous-route-run-2026-06-27.md) - deeper authenticated route sweep across detail/edit/create paths.
- [screenshots/](./screenshots/) - browser evidence captured during testing.

## Session Summary

Confirmed bugs:

1. Login shows raw backend error code `user_not_found`.
2. Invalid signup OTP clears the code without showing an error.
3. OTP resend succeeds but gives no confirmation.
4. Authenticated dashboard lands on an under-construction placeholder.
5. Exercise list items have duplicated accessible names in the Chrome AX tree.
6. Training exercise picker filters are clickable chips but are not exposed as controls to assistive technology.
7. Settings avatar shows only a lowercase first initial.
8. Client workout history can render a blank empty state.
9. Nutrition plan list says `No meals yet` while the builder has a meal.
10. Recipe create can surface a generic 422 instead of actionable validation.
11. Adding a profile field can leave behind an empty modal shell.
12. Onboarded coaches can still open `/register-business`.

Coverage completed:

- Public auth, signup OTP, business onboarding, protected redirects, and mobile auth layouts.
- Authenticated app shell on desktop and mobile.
- Clients list, invite flow, pending client detail/edit/profile/workout-history routes.
- Library index, exercises, foods, recipes, nutrition plans, training plans, and check-ins across list/create/detail/edit paths where applicable.
- Settings profile, profile fields create flow, and client-profile field rendering.

Deferred:

- Destructive cleanup actions such as delete, revoke, archive, and logout/session-expiry simulation.
- Active-client-only paths and session-detail route, because this account only has a pending invited client and no workout sessions.
