# Coach dashboard Focus design

## Scope

Implement the dashboard section of `docs/design/mockups/coachez-dashboard-and-client.dc.html` in `frontend/apps/coachapp-v2` at `/dashboard`. Desktop and mobile are in scope. Client screens and other routes are out of scope.

The application contract controls data, permissions, routes, and interactions. The mockup controls visual hierarchy, composition, spacing, typography, and responsive intent. A mockup element without backend or application support is omitted.

## Supported content

The dashboard may use only data already exposed through the application API:

* Coach name, business name, ownership, and dashboard setup state.
* Client summary counts and client attention flags.
* Prospect totals grouped by `new`, `reviewing`, `won`, and `lost`.
* Recent coach-client conversations.
* Client subscription end dates.
* Setup progress derived from clients, training plans, and nutrition plans.

Appointments, global search, a notification center, sticky notes, payment activity, renewal actions, and searchable stat dialogs are omitted. Their mock data must not appear as placeholders.

## Page composition

Keep the app shell, `/dashboard` route, desktop sidebar, and mobile bottom navigation.

The dashboard header uses the Focus hierarchy: a date eyebrow, a large time-based greeting, business context, and the supported invite-client action. It must not show a notification control.

The setup guide remains above the dashboard metrics for owners until completed or dismissed. Its progress, disclosure, dismissal, undo, retry, and completion persistence remain unchanged.

The metric row contains:

* Active clients.
* Pending invites.
* New prospects.
* Won and lost prospects for the available aggregate period.

Metric navigation uses the application's route constants. Client metrics open the client list. Prospect metrics open the prospect list. The metric cards do not open mockup-only dialogs.

The main bento contains compact previews for client attention and recent conversations. Each preview has a bounded number of rows so its height does not grow with the account's full dataset. Rows keep their working links to client details or conversations. Empty and error states stay inside the same card geometry.

Subscriptions ending this month remain a full-width section. Subscription cards open client details and use neutral "Open" copy rather than an unsupported renewal action.

The quick-action row keeps the supported destinations: invite client, training plan, nutrition plan, and landing page.

## Responsive behavior

At desktop width, content stays left-aligned inside the application's maximum dashboard width. Metrics form a four-column row, the two main cards form a two-column bento, and subscriptions and quick actions span the dashboard width.

At 375px, the dashboard uses a dedicated rendering of the mockup's `MOBILE FRAME B`, not responsive variants of the desktop bento cards. The header contains a date eyebrow and a two-line greeting without the business summary or desktop invite action. Active clients and new prospects use compact two-column stat cards, followed by a compact full-width won/lost split card.

Recent conversations, subscriptions ending, and client attention use the mobile reference's section-heading and row treatment without desktop card headers, icon blocks, minimum heights, or bento backgrounds. The dashboard route uses the reference's dark mobile bottom-navigation surface while preserving the application's real navigation destinations and labels. The desktop pending-invites metric and quick-action row are absent from the mobile renderer.

The owner setup guide remains above the mobile metrics. This approved deviation preserves the persisted setup workflow, which has no equivalent surface in the mobile mockup. Global search and upcoming appointments are omitted because the application has no supporting contract. The app shell's mobile navigation remains fixed and content retains enough bottom padding to avoid overlap.

## Data and state handling

RTK Query remains the only server-data path. The page keeps layout-shaped loading UI and card-local error and empty states. A failed query must not hide unrelated dashboard data.

Client attention is computed from `intake_incomplete`, `needs_plan`, and `expiring_soon`. Prospect metrics use the list response summary. Recent activity is represented by conversations because the API has no general activity feed. Subscription previews use `subscription_ends_on` and `expiring_soon`.

## Preserved behavior

The implementation keeps:

* Authentication and permission handling from the route and app shell.
* Owner-only setup guide visibility.
* Setup dismissal, undo, retry, and completion persistence.
* Route-constant navigation for metrics, preview rows, and quick actions.
* Client, prospect, conversation, profile, training-plan, and nutrition-plan query wiring.
* Loading, empty, error, focus, and keyboard behavior supplied by application components.

## Verification

Verification must include:

* Coachapp build and Biome lint.
* The repository recurring-mistakes check that covers coachapp tokens and UI rules.
* Insider inspection of desktop geometry and source ownership.
* Visual checks at 1280px or wider and at 375px.
* Navigation from metrics, attention rows, conversation rows, subscription cards, and quick actions.
* Setup disclosure and dismissal behavior when an owner account exposes the guide.
* Populated, empty, loading, and query-error states where they can be reached safely.

If browser control remains unavailable, the final report must name every visual or interaction check that could not be completed.
