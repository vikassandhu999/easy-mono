# Ticket 16 fixable instructions

No product defects were found in the accepted Onboarding, Programming, Quiet, or Check-ins interactions after the queues were seeded. No implementation change is requested.

## Remaining data and environment gaps

- **Replies next-row selection:** only Gina currently has a waiting conversation. To complete this check, send a client message from a second authenticated client, open Replies at both widths, resolve the selected row, and confirm that the remaining row becomes selected without a reload.
- **Replies stale-write recovery:** use a controlled test fixture or two concurrent writers. Load a reply row, retain its `expected_last_message_at`, send a newer client message, then submit Mark handled with the stale value. Verify that the expected `409` recovery refreshes the row and preserves the newer message.
- **Call handoff:** repeat the Onboarding phone-row check in a headed browser or physical device with a registered dialer and confirm that Call opens the expected `tel:` target. Headless Chrome cannot expose this operating-system handoff.

These are verification gaps, not fix instructions. All required queue data gaps were closed during this run.
