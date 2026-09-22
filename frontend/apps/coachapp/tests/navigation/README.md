# Connected navigation

Run `rtk proxy pnpm test:navigation` from the coachapp directory with the isolated API on 44000 and coachapp on 22022. The fixture uses `easy_coachapp_auth_dev` and local mail delivery. It creates fresh owner/trainer accounts for each viewport and each role invites and accepts its own test client. Accepted clients and account/business records remain in this disposable database; the suite creates no plans, media or user-authored forms.

The suite navigates with Tab, Shift+Tab, arrow keys and Enter. It covers all eight primary sections, account-menu entries, owner-only Team access, three library destinations and eleven client tasks with their return links. It checks focused links fit fully in the viewport, navigation outlines have room around their labels, route changes focus the main content, destination loading resolves without alerts, active sections match the client task, and logout succeeds. Same-route navigation preserves the focused link. Both owner and trainer run at 375px and 1280px.

Generated fixture details and screenshots stay in the ignored `artifacts/` directory. A failure captures the viewport and focused-element geometry. The original mobile backward-tab probe failed with Workbench at x = -22px; the fixed navigation reveals the complete link.


## Built application

Run `rtk proxy pnpm test:production` with the normal API on port 4000. The command builds coachapp, starts its own Vite preview on a temporary localhost port, exercises only built assets, then closes that preview. It leaves the normal development servers running. No source-module import or injected session is used for authentication.

At both widths, the browser signs up, recovers from an invalid code, creates a business, completes the six-slide welcome tour, resumes a protected form-creation address, uses the shadcn answer-type select and saves/reopens/reloads its choices, opens all eight primary sections, receives a real inbox WebSocket reply, signs out and signs in again, and returns from a deleted form to the library. The tour checks responsive image decoding, heading focus and typography, and horizontal overflow. Successful runs delete their form; fresh accounts/business records and built-in forms remain in the development database. Navigation screenshots stay under ignored `artifacts/`; welcome screenshots use `/tmp/coachapp-welcome-production-{chromium,webkit}-{375,1280}.png`.

Use `rtk proxy env BROWSER_ENGINE=webkit pnpm test:production` for WebKit after installing that engine with `rtk proxy pnpm exec playwright install webkit`. The default engine is Chromium. This covers these production journeys in each engine, not every browser feature or physical device.

## Startup measurement

`rtk proxy pnpm test:startup` builds the app and serves the static output with gzip on a temporary localhost port. It measures three cold login loads at each width with a 200,000-byte/s download limit, 150ms latency and 4× CPU throttling. The measurement ends after the email field accepts text. It reports asset bytes and timings without enforcing an arbitrary time threshold. This simulated environment does not establish real-device performance or deployed hosting behavior.
