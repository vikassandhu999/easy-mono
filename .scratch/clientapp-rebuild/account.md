# Mobile account and preferences

Account opens as a personal overview with Personal details, coaching information and Sign out. Personal details opens a focused mobile screen with Back and a reachable Save action. Phones, tablets and wide browsers use the same mobile layout.

The typed profile GET/PATCH supports names and phone. Email, coaching timezone and the default workout load unit remain informational. Do not invent notification preferences without a delivery API.

Personal details retains an account-scoped durable draft, expired-login recovery and deliberate retry. Save is an explicit online action. Profile PATCH submits only fields owned by the editor. Sign-out clears account drafts and cache.

Verify saved values after reload, failed-request recovery, offline draft restart, account isolation and keyboard-open Save. Native and physical-device checks require their own evidence; browser results do not establish them. Current reset verification is recorded in [the reset report](../core-reset/verification.md).
