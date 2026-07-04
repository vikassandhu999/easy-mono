# Acquisition And Prospects Run - June 28, 2026

Target: `http://localhost:2021`

Tool: `chrome-devtools-axi`

## Scope

This pass was intended to test the coach acquisition funnel:

- Settings acquisition entry point.
- Landing page editor at `/settings/landing-page`.
- Public landing page preview/submission at `http://localhost:3000/:slug`.
- Prospect creation from public application submission.
- Prospect list, filters, detail, notes, status updates, and enrollment.

## Result

Blocked before acquisition/prospect coverage. The browser could not reach an authenticated coach session through normal UI auth:

- Existing QA coach login returned `POST http://localhost:4000/v1/auth/otp [400]` and showed `Bad Request`.
- Fresh QA signup returned `POST http://localhost:4000/v1/auth/signup [500]` and showed `An internal server error occurred.`

A local QA user/business was created through backend code while diagnosing the blocker, but browser session-token injection was not used because it would bypass normal authentication. Acquisition/prospect UI coverage should resume after a normal OTP login/signup path works or after explicit approval for a local test-session bypass.

## Screenshots Captured

- [68-acquisition-signup-500-blocker.png](./screenshots/68-acquisition-signup-500-blocker.png)
- [69-acquisition-login-400-blocker.png](./screenshots/69-acquisition-login-400-blocker.png)

## Route Coverage

| Area | Result | Notes |
| --- | --- | --- |
| Existing QA login | Fail | `/v1/auth/otp` returned `400`; screen showed `Bad Request`. See `COACH-QA-014`. |
| Fresh QA signup | Fail | `/v1/auth/signup` returned `500`; screen showed `An internal server error occurred.` See `COACH-QA-013`. |
| Settings acquisition | Blocked | Requires authenticated coach session. |
| Landing page editor | Blocked | Requires authenticated coach session. |
| Public landing page preview | Blocked | No published page could be created through the UI. |
| Prospect application submission | Blocked | Requires a published landing page. |
| Prospects list/detail/status/notes/enroll | Blocked | Requires authenticated coach session and a prospect. |

## Planned Coverage After Auth Is Unblocked

1. Open `/settings` and confirm the `Acquisition > Landing page` entry point.
2. Open `/settings/landing-page`; verify loading, empty/default draft, and save/publish states.
3. Edit slug, headline, subheadline, proof point, program, and application questions.
4. Save draft, verify preview remains disabled for draft, then publish and verify preview opens the public site.
5. Submit public application with missing required fields, malformed contact data, and a valid payload.
6. Confirm valid submission creates a new prospect in `/prospects`.
7. Test prospect filters: All, New, Reviewing, Won, Lost.
8. Open prospect detail; verify contact fields, source, program, answers, and notes.
9. Mark prospect reviewing/lost and verify list counts/status chips update.
10. Enroll prospect; verify invite/client creation, linked client detail, and already-enrolled state.

## Notes

- The current login component already handles `404` unknown-email with friendlier copy, so the June 28 login blocker is a separate `400 Bad Request` path.
- The signup failure occurs for both plus-addressed and no-plus QA emails.
