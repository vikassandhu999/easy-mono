# Mobile account and preferences

Account opens as a personal overview with full-width rows for Personal details, Weight goal and Weight & progress, plus coaching information and Sign out. Each editable task opens a focused mobile screen with Back and a reachable Save action. Phones, tablets and wide browsers keep the same 480px screen.

Two arrangements were considered: all fields together, or an overview leading to focused editors. Use focused editors. Names/phone belong together, while a weight goal is optional and has its own unit and removal action. This keeps the decimal keyboard and goal removal separate from contact editing. Goal copy stays neutral about weight direction.

The current typed profile GET/PATCH supports names, phone, goal value and goal unit. Reuse it; do not add email, timezone, default-unit or notification writes. Display coaching timezone/default units as information only. The progress filter already controls its display unit. Notification delivery remains the documented backend/provider gap.

Personal details retain their account-scoped durable draft, expired-login recovery and deliberate retry. Goals keep incomplete decimal input and the selected unit across navigation, offline restart and process termination. Save and Remove remain explicit online actions. A lost goal response uses a fresh profile read to confirm matching content before retrying; no automatic write queue. Profile PATCH uses its existing last-write semantics and submits only the fields owned by the editor. Goal saves invalidate profile and weight progress. Sign-out clears account drafts and cache.

Verify the overview, independent edits, empty/invalid goal, unit change, removal, save/read-back, failure/retry, offline draft restart, account isolation and native decimal keyboard/Back/lifecycle. Update auth/browser/native tests to enter Personal details from the overview, preserving their original assertions about recovery and session ownership. Keep the full mobile route audit active for other features.

## Evidence — 2026-09-20

The first real goal save exposed a typed-route/implementation mismatch: `ClientProfile.update` accepted goal fields but `Client.self_update_changeset` ignored them. The self-service changeset now uses the existing paired-field normalization and numeric bounds. Two router regressions cover creation, kg/lb edits, clearing either field, invalid/unpaired input, unchanged contact details and another client's data. All 19 focused profile/context tests and full backend precommit pass (1,846 tests). `just gen-api` completed with no generated changes because the public request shape already existed. API-change review found no remaining material contract/recovery gap.

`tests/account/account.browser.mjs` passes at 375/768/1280: overview navigation, empty/invalid/decimal-comma input, durable restart, lost-response read-back with one PATCH, unit changes, independent contact edits, offline edits, explicit review after another goal change, and removal. Screenshots show the same mobile composition at each width, capped at 480px.

`tests/account/recovery.browser.mjs` passes against the production preview: full offline reload, incomplete edits, storage failure with no write, a committed save plus lost read-back, restart and one-write reconciliation, changed-goal review, discard/corrupt-draft recovery, and a delayed response after switching accounts. The replacement account remains empty; explicit logout clears private storage. Reads detect an observed external change before writing; the existing profile PATCH retains last-write semantics, so this is not an atomic compare-and-swap contract.

Android emulator API 36 passes native decimal input, reachable Save with keyboard open, unit picker Back, offline force-stop/reopen, deliberate reconnect/save, removal-sheet Back, background/resume and a saved cold link. The full existing Android authentication/forms/training/offline/logout runtime suite also passes after adapting Account navigation.

The iPhone 17 simulator passes goal decimal entry, reachable Save with keyboard open, draft termination/relaunch, saved read-back, background/resume and cold links. Personal-details auth/restart/logout also passes. Goal tests now use a separate invitation fixture after a combined run exposed reuse of an already consumed invitation. Browser auth at 375/768 and production offline regressions pass. Build, Biome and frontend-shape checks pass.

Physical-device and real-client usability observations remain separate. No notification permission or preference is fabricated; delivery still needs the documented provider/API work. Other workflow screens remain in the mobile redesign audit.

2026-09-20 credential regression: a keyboard-open first tap on Save details failed while
the action reported hittable. Details opts into preventFocusOnPress, and the iPhone test
requires an on-screen keyboard and button clearance before the physical tap. The same
profile draft/save/restart/logout scenario passes in 42.071 seconds. Browser account/goal
recovery and the Android full auth/form/workout suite pass on the final button. Evidence:
evidence/credentials-ios-details-{keyboard,saved}.png; prevention: RM-240.
