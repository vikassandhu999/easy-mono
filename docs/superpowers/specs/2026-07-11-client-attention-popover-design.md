# Client attention popover design

## Scope

Add the desktop clients-list interaction represented by the open attention popup in `docs/design/mockups/coachez-dashboard-and-client.dc.html`. The interaction belongs to `/clients` in `frontend/apps/coachapp-v2` and consumes `GET /v1/coach/clients/attention` through the generated RTK Query hook.

The mobile clients-list reference has no attention trigger. The component returns no UI and skips its query below the desktop breakpoint. Dashboard attention, client-detail changes, nudge actions, and a mobile sheet are out of scope.

## Trigger

Replace the loaded-roster attention count in `list-clients.tsx` with the endpoint's pre-pagination `count`. The desktop trigger retains the danger-soft badge treatment, warning icon, and copy:

```text
3 need attention
```

The trigger is hidden when the endpoint returns zero clients. While the first page is loading, a disabled skeleton pill reserves the same header space. If the first request fails, the optional attention surface is omitted; the main clients list remains usable and its query is unaffected.

The trigger uses a real button with `aria-haspopup="dialog"` and `aria-expanded`. Activating it opens the anchored popup. Closing returns focus to the trigger.

## Desktop popup

Use HeroUI's controlled `Popover` with a trigger ref, matching the application's established anchored-overlay pattern. The popup is 340px wide, opens below and aligned to the end of the trigger, and stays within the viewport. It uses the reference's rounded bordered surface, shadow, header divider, and scrollable list bounded to roughly 300px.

The header contains the warning icon, title `Needs attention`, and subtitle describing the supported read model:

```text
Active clients waiting on you
```

Outside click and Escape close the popup. Client selection also closes it before navigation.

## Rows and navigation

Each client appears once in backend priority order. A row contains the client avatar or initials, display name, and highest-priority supported reason:

1. Intake incomplete
2. Needs plan
3. Expiring soon

Rows use an accessible HeroUI `ListBox`. Selecting a row navigates to the established client-detail route. The popup does not add nudge, messaging, renewal, or plan-building actions because those workflows are not part of the endpoint or approved interaction.

## Data and pagination

`ClientAttentionPopover` owns the endpoint query and overlay state. It requests the first page with `offset: 0, limit: 20` only at desktop width. The first response supplies the trigger count and initial rows.

When `data.length < count`, the popup footer shows a `Load more` button. Loading the next page uses the generated lazy query with `offset` equal to the number of unique loaded clients and `limit: 20`. Results append in server order and deduplicate by client ID. The button shows a pending state without changing width. A failed next-page request leaves loaded rows intact and changes the footer to a retry action.

The popup keeps loaded pages while open. A change to the first-page response resets appended pages so invalidated client data cannot leave stale duplicates. Reopening uses RTK Query's cached first page and fetch policy.

## States

Populated: show rows in server order and a load-more footer when more pages exist.

First-page loading: show the disabled skeleton trigger; the popup cannot open until count is known.

Empty: hide the trigger and popup.

First-page error: omit the optional trigger without affecting roster search, filtering, pagination, or errors.

Next-page loading: keep loaded rows visible and show the pending load-more button.

Next-page error: keep loaded rows visible and show `Retry` in the footer.

## Component ownership

Create `clients/clients-list/client-attention-popover.tsx`. It owns attention fetching, pagination accumulation, overlay state, reason selection, client-row rendering, dismissal, and navigation. `list-clients.tsx` only places the component beside Invite and removes its loaded-roster approximation.

The component remains page-local because this exact trigger-and-popup interaction is used only by the clients list. Shared client-name and initials helpers may be reused where they already represent the same concept.

## Verification

At desktop width, verify the populated popup against the reference for trigger position, 340px geometry, header, row density, scroll boundary, shadow, and alignment. Exercise open, outside-click close, Escape close, focus restoration, row navigation, browser Back, load more, and next-page retry.

Verify loading, empty, and first-page error states through a controlled preview or request interception when live data cannot reach them safely. At 375px or 392px, confirm the attention trigger and popup are absent and no attention request is made.

Run focused Biome checks on touched source files, the coachapp production build, and `just check-rm`. The app has no frontend component-test runner, so browser evidence is required for the interaction.
