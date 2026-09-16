# Connected navigation

Run `rtk proxy pnpm test:navigation` from the coachapp directory with the isolated API on 44000 and coachapp on 22022. The fixture uses `easy_coachapp_auth_dev` and local mail delivery. It creates fresh owner/trainer accounts for each viewport and each role invites and accepts its own test client. Accepted clients and account/business records remain in this disposable database; the suite creates no plans, media or user-authored forms.

The suite navigates with Tab, Shift+Tab, arrow keys and Enter. It covers all eight primary sections, account-menu entries, owner-only Team access, three library destinations and eleven client tasks with their return links. It checks focused links fit fully in the viewport, navigation outlines have room around their labels, route changes focus the main content, destination loading resolves without alerts, active sections match the client task, and logout succeeds. Same-route navigation preserves the focused link. Both owner and trainer run at 375px and 1280px.

Generated fixture details and screenshots stay in the ignored `artifacts/` directory. A failure captures the viewport and focused-element geometry. The original mobile backward-tab probe failed with Workbench at x = -22px; the fixed navigation reveals the complete link.
