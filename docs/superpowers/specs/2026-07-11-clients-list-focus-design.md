# Clients list design

## Scope

Match the desktop and mobile clients list at `/clients` to the clients section in `docs/design/mockups/coachez-dashboard-and-client.dc.html`. Keep the route, app shell, API queries, navigation, and permissions unchanged. This work does not include client detail, invitation, messaging, or check-in workflows.

## Reference and supported data

The reference provides separate desktop and mobile compositions. The application already supports client search, status tabs, pagination, invitation, status and stage labels, attention flags, messaging, WhatsApp links, loading, empty, and error states.

The backend does not support favorite clients or the reference's nudge and missed-check-in actions. Those controls will not be added. Generic attention counts and badges will use the supported intake, plan, and subscription flags instead of presenting them as missed check-ins.

## Approved design

### Desktop

Keep the desktop structure already present in `list-clients.tsx` and `client-list-item.tsx`: roster heading and counts, attention summary, invite action, search, status tabs, bordered client list, identity, supported status badges, WhatsApp, messages, unread count, and row navigation.

Desktop rows may show all applicable supported attention badges because the layout has room for them. Visual adjustments are limited to mismatches found during final comparison with the reference.

### Mobile

Keep the compact roster header, icon-only invite action, full-width search, horizontally scrollable status tabs, and bordered list.

Use a mobile-specific row composition inside the existing client list item. Every row must reserve space for the avatar, client name, and subtitle. The trailing status area may show:

* one highest-priority attention badge, when applicable;
* the client stage or status badge.

Attention priority is:

1. Intake incomplete
2. Needs plan
3. Expiring soon

If no attention flag applies, show only the stage or status badge. Badge text may truncate rather than displace the client identity. Desktop retains the complete badge set.

The mobile row remains one accessible list item and keeps the same row navigation behavior. Desktop-only WhatsApp and message actions remain hidden on mobile, matching the established application behavior.

## Data and states

Search and tabs continue to drive the existing client query. Counts continue to come from the backend summary. Infinite loading, initial loading, errors, empty filters, unread message counts, and client navigation retain their present data paths and behavior.

The responsive change is presentational. It must not create duplicate interactive list items, duplicate API requests, or a second client-state model.

## Verification

Compare the populated list at desktop and 392px mobile widths. Include an active client with all supported attention flags to prove the mobile identity remains visible. Also inspect pending and inactive rows, search and tabs, loading, empty, and error rendering where they can be reached without changing backend data.

Run a focused Biome check on touched files, the coachapp production build, and `just check-rm`. Record any repository-wide failures or states that cannot be exercised.
