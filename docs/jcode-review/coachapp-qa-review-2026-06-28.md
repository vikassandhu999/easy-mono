# Coachapp QA Review - 2026-06-28

URL tested: <http://localhost:2021>

Primary browser tooling: Chrome DevTools MCP (`chrome-devtools-mcp`) accessibility snapshots, interactions, network log, console log, Lighthouse snapshot.

Supplemental evidence: disposable Playwright crawl saved raw route snapshots/screenshots under `docs/jcode-review/`.

## Executive summary

The unauthenticated coachapp shell is reachable and protected routes correctly redirect to `/login`, but the public acquisition/auth path is currently not production-ready:

1. **Blocker:** creating a new coach account returns `500 Internal Server Error` from `POST http://localhost:4000/v1/auth/signup` and shows `An internal server error occurred.`
2. **High:** login for an unknown/unusable email returns `400 Bad Request` from `POST http://localhost:4000/v1/auth/otp` and surfaces the raw text `Bad Request` in the form.
3. **Medium:** accessibility audit fails color contrast on auth help text and primary button, and the page has no `<main>` landmark.
4. **Low/Medium:** SEO/agentic browsing audit fails because no meta description exists and SPA fallback serves app HTML for `/robots.txt` and `/llms.txt`.
5. **Low:** console warns that `apple-mobile-web-app-capable` is deprecated without the replacement `mobile-web-app-capable` meta tag.

## Scope covered

### Chrome DevTools MCP checks

- Opened `http://localhost:2021`, observed redirect to `/login`.
- Took accessibility snapshots on `/login` and `/signup`.
- Exercised login validation:
  - Empty submit shows `Enter email`.
  - Invalid format shows `Enter a valid email`.
  - Real-looking unknown email submits to auth API and surfaces `Bad Request`.
- Exercised signup validation:
  - Empty submit shows `Enter email`.
  - New email with names submits to auth API and surfaces `An internal server error occurred.`
- Navigated directly to `/clients`, confirmed redirect to `/login` while unauthenticated.
- Ran Lighthouse snapshot on `/login`.
- Inspected DevTools console and network logs.

### Supplemental route crawl

A disposable Playwright run crawled these unauthenticated routes and saved screenshots/JSON:

- `/`
- `/login`
- `/signup`
- `/clients`
- `/library`
- `/library/exercises`
- `/library/foods`
- `/library/recipes`
- `/nutrition-plans`
- `/training-plans`
- `/check-ins`
- `/settings`
- `/register-business`

All protected routes observed in the crawl redirected to `/login` while unauthenticated.

## Findings

### 1. Blocker: signup returns backend 500

**Severity:** Blocker  
**Area:** Authentication / acquisition

**Reproduction:**

1. Open `http://localhost:2021/signup`.
2. Fill:
   - First name: `QA`
   - Last name: `Axi`
   - Email: `qa-axi-0305@example.com`
3. Click `Create account`.

**Observed:**

- Page remains on `/signup`.
- Inline form error: `An internal server error occurred.`
- Network: `POST http://localhost:4000/v1/auth/signup` returns `500`.
- Console: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`.

**Expected:**

- Either account creation succeeds and user proceeds to OTP verification, or a recoverable user-facing validation/message is shown.
- Backend should not return 500 for normal signup input.

**Artifacts:**

- `docs/jcode-review/screenshots/smoke-signup.png`
- `docs/jcode-review/qa-results.json`

### 2. High: login surfaces raw `Bad Request`

**Severity:** High  
**Area:** Authentication / error UX

**Reproduction:**

1. Open `http://localhost:2021/login`.
2. Fill email: `qa-missing@example.com`.
3. Click `Continue with email`.

**Observed:**

- Inline form error: `Bad Request`.
- Network: `POST http://localhost:4000/v1/auth/otp` returns `400`.
- Console: `Failed to load resource: the server responded with a status of 400 (Bad Request)`.

**Expected:**

A helpful, safe message such as:

- `We could not send a code for that email.`
- `No coach account exists for that email. Sign up first.`
- or a generic anti-enumeration message if desired: `If an account exists for this email, we sent a code.`

**Artifacts:**

- `docs/jcode-review/screenshots/smoke-login.png`
- `docs/jcode-review/qa-results.json`

### 3. Medium: login page color contrast failures

**Severity:** Medium  
**Area:** Accessibility / design tokens

Lighthouse accessibility score: **93**.

Failed contrast elements:

- Help text: `Enter your email and we'll send you a verification code.`
  - Foreground `#71717a`, background `#f5f5f5`, contrast `4.43:1`, expected `4.5:1`.
- Primary button: `Continue with email`
  - Foreground `#fcfcfc`, background `#0485f7`, contrast `3.58:1`, expected `4.5:1`.
- Muted auth footer text: `Don't have an account? Sign up`
  - Foreground `#71717a`, background `#f5f5f5`, contrast `4.43:1`, expected `4.5:1`.

**Expected:**

- Adjust muted text token slightly darker on `#f5f5f5`.
- Adjust primary blue darker or button foreground/background pair to reach at least 4.5:1.

**Artifacts:**

- `docs/jcode-review/lighthouse/failures.json`
- `docs/jcode-review/lighthouse/report.html`

### 4. Medium: no main landmark

**Severity:** Medium  
**Area:** Accessibility / page semantics

Lighthouse reports: `Document does not have a main landmark.`

**Expected:**

Wrap page content in exactly one `<main>` landmark, or ensure the layout component emits `<main>` around route content.

**Artifact:** `docs/jcode-review/lighthouse/failures.json`

### 5. Low/Medium: SEO and agentic browsing metadata missing/misrouted

**Severity:** Low/Medium  
**Area:** Web metadata / crawlers

Lighthouse scores:

- SEO: **60**
- Agentic Browsing: **50**

Failures:

- Missing `<meta name="description">`.
- `/robots.txt` returns SPA HTML, causing 26 parse errors.
- `/llms.txt` returns content that lacks required Markdown shape, likely also SPA fallback HTML.

**Expected:**

- Add a concise meta description for the coach app.
- Serve a valid `/robots.txt` from `public/robots.txt`.
- Either serve a valid `/llms.txt` from `public/llms.txt`, or intentionally decide it is not needed and handle route/fallback behavior accordingly.

**Artifacts:**

- `docs/jcode-review/lighthouse/failures.json`
- `docs/jcode-review/lighthouse/report.html`

### 6. Low: deprecated PWA meta warning

**Severity:** Low  
**Area:** PWA metadata

DevTools console warning:

```text
<meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">
```

**Expected:**

Keep the Apple meta if needed for iOS, but add:

```html
<meta name="mobile-web-app-capable" content="yes" />
```

## Positive observations

- The root route redirects unauthenticated users to `/login`.
- Protected routes tested while unauthenticated redirect to `/login` rather than exposing app data.
- Email form validation is accessible in the a11y tree: invalid fields have descriptions like `Enter email` and `Enter a valid email`.
- Login/signup pages have clear H1 headings and basic link paths between auth modes.
- Lighthouse Best Practices score is **100** for the login snapshot.

## Artifacts generated

- `docs/jcode-review/qa-results.json` - supplemental crawl data and API/console events.
- `docs/jcode-review/screenshots/` - supplemental screenshots for crawled routes and auth smoke tests.
- `docs/jcode-review/lighthouse/report.html` - full Lighthouse snapshot report.
- `docs/jcode-review/lighthouse/report.json` - raw Lighthouse JSON.
- `docs/jcode-review/lighthouse/failures.json` - filtered Lighthouse failures.

## Recommended next fixes

1. Fix backend/signup path returning 500 for normal coach signup input.
2. Normalize auth API errors into specific, user-safe frontend messages.
3. Add a `<main>` landmark in the auth/app layout.
4. Adjust design tokens for muted text and primary button contrast.
5. Add `meta description`, `public/robots.txt`, `public/llms.txt`, and replacement PWA meta tag.
6. Re-run Chrome DevTools MCP QA after signup is fixed, because authenticated app routes could not be tested through acquisition in this pass.
