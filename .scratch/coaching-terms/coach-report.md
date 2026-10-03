# Coach app verification

The Coaching terms browser flow passed against Phoenix at 375px and 1280px on 2026-10-03. The script is `frontend/apps/coachapp/tests/clients/coaching-terms.browser.mjs`, run from the coach app with `rtk proxy node tests/clients/coaching-terms.browser.mjs`.

The flow verified:

- All five state filters, server search, and the seats-used header.
- Preferred-name, phone, notes, and unit-system edits, including persistence after reload.
- Setting, moving, and clearing an end date. Ending today keeps the client active, holds their seat, and hides Start coaching.
- Starting a returning client creates a separate term and preserves term history. The final free seat is consumed; another joined client sees a disabled Start coaching button and "No free seat".
- Inviting and resending a client invitation at full capacity. Acceptance runs through the client app at 375px with OTP; the joined screen persists after reload and the coach sees the joined state.
- Inviting and resending a coach invitation, accepting it through the coach browser OTP flow, assigning a client, and removing the coach with reassignment to the owner.
- Business handle syntax validation, reserved-handle rejection, availability, save, and persistence after reload.

Screenshots are in `frontend/apps/coachapp/tests/clients/artifacts/coaching-terms/` and are ignored by git. The inspected screenshots include mobile profile, end-today, full-seat acceptance, and business settings; desktop ended-term and business settings. Capture waits for seat and timezone loading to finish. The suite reports no page errors and asserts no horizontal page overflow at each capture.

The invitation harness uses the final client acceptance body (`email` and `otp`) through the real app. The only product correction from the final visual pass was in the client Messages subtitle: ended clients see "Conversation history". Browser regression checks cover that label.

Native and physical-device verification was not run. The fixture has no assigned plans, so stopped-plan labels and plan behavior are covered by the implementation's backend suites rather than this browser flow. Revoke actions were not exercised in this flow.
