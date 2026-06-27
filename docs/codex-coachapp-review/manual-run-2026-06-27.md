# Manual Run - June 27, 2026

Target: `http://localhost:2021`

Tool: `chrome-devtools-axi`

## Environment Notes

- The frontend app was already running on port `2021`.
- The app used the default API base, `http://localhost:4000`.
- Browser testing was performed through accessibility snapshots, screenshots, network inspection, and console inspection.
- This first pass covered unauthenticated behavior. Authenticated coverage was completed later in [authenticated-run-2026-06-27.md](./authenticated-run-2026-06-27.md) after the user supplied a valid OTP.

## Screenshots Captured

- [01-login-initial.png](./screenshots/01-login-initial.png)
- [02-login-raw-error.png](./screenshots/02-login-raw-error.png)
- [03-signup-initial.png](./screenshots/03-signup-initial.png)
- [04-verify-signup.png](./screenshots/04-verify-signup.png)
- [05-verify-signup-invalid-otp-no-error.png](./screenshots/05-verify-signup-invalid-otp-no-error.png)
- [06-protected-dashboard-redirects-login.png](./screenshots/06-protected-dashboard-redirects-login.png)
- [07-mobile-login.png](./screenshots/07-mobile-login.png)
- [08-mobile-signup.png](./screenshots/08-mobile-signup.png)

## Executed Checks

| Check | Result | Notes |
| --- | --- | --- |
| Open `/` with no token | Pass | Redirected to `/login`. |
| Login empty submit | Pass | Field error: `Enter email`. |
| Login malformed email | Pass | Field error: `Enter a valid email`. |
| Login unknown valid email | Fail | Shows raw `user_not_found`. See `COACH-QA-001`. |
| Login to Signup link | Pass | Navigated to `/signup`. |
| Signup empty submit | Pass | Field error: `Enter email`. |
| Signup malformed email | Pass | Field error: `Enter a valid email`. |
| Signup new valid email | Pass | Navigated to `/verify-signup`. |
| Signup invalid OTP | Fail | Field clears with no visible error. See `COACH-QA-002`. |
| Signup OTP resend | Fail | API returns `200`, but UI gives no confirmation. See `COACH-QA-003`. |
| Open `/dashboard` with no token | Pass | Redirected to `/login`. |
| Open `/verify-login` directly | Pass | Redirected to `/login`. |
| Open `/verify-signup` directly | Pass | Redirected to `/signup`. |
| Console errors | Pass | No console errors found. |
| Mobile login layout at 375px | Pass | No visible overlap in screenshot. |
| Mobile signup layout at 375px | Pass | No visible overlap in screenshot. |

## Network Evidence

`POST /v1/auth/otp` for unknown login email:

- Status: `404`
- Request body: `{"email":"qa@example.com","type":"authentication"}`
- Response included `error_message: "user_not_found"`.

`POST /v1/auth/signup` for a new email:

- Status: `201`
- Result: app navigated to `/verify-signup`.

`POST /v1/auth/verify` for wrong OTP:

- Status: `400`
- Request body included `otp: "000000"`.
- Response included `error_message: "Invalid OTP, please check and try again"`.

`POST /v1/auth/otp` from signup resend:

- Status: `200`
- Result: page did not show success feedback.

## Authenticated Coverage Follow-Up

The unauthenticated blocker was removed after the user supplied a valid OTP for the fresh QA signup. See [authenticated-run-2026-06-27.md](./authenticated-run-2026-06-27.md) for the protected app-shell, clients, library, builders, settings, and mobile pass.
