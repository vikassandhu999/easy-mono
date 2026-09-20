# Client mobile UI audit — 2026-09-20

User direction: modern, playful mobile screens with a distinct client UX. Coach engineering may be reused; web page compositions are not the design reference. Keep one layout capped at 480px on phones, tablets and wider browsers.

This continues the authorized rebuild on `clientapp-rebuild`, including its existing uncommitted progress work. Use the isolated task API on 4100 and task Vite on 1315. The v2 contract/implementation is excluded by the original objective. Coherent commits are already authorized; no push, deployment or publication.

| Route | Role | Viewport | States covered | Result | Findings |
| --- | --- | --- | --- | --- | --- |
| `/login` | client | 375 / 768 / 1280 | Pending | Pending | UI-01 |
| `/verify` | client | 375 / 768 / 1280 | Real OTP join; bad OTP/restart at 375/768 | Behavior passes; full visual/state pass pending | UI-01 |
| `/invite/:token` | client | 375 / 768 / 1280 | Real join; screenshot | Behavior passes; failure/long content visual pass pending | UI-01 |
| `/` | client | 375 / 768 / 1280 | Empty training/nutrition, pending intake, unread coach message, card navigation | Pass for exercised states; assigned/active workout visual pass pending | UI-01 |
| `/account` | client | 375 / 768 / 1280, iOS/Android | Mobile overview, editor rows, coaching, progress, sign-out | Pass for exercised states | UI-06 |
| `/account/details` | client | 375 / 768 / 1280, iOS/Android | Names/phone, save/error/retry, draft/session expiry, account isolation, keyboard/restart/logout | Browser/native regression passes | UI-06 |
| `/account/goal` | client | 375 / 768 / 1280, iOS/Android | Create/edit/remove, unit/validation, interrupted save, conflict review, offline/restart, native keyboard/Back and account switching | Browser/native pass; physical device/usability separate | UI-06 |
| `/progress` | client | 375 / 768 / 1280, iOS/Android | Empty/one record, units, filter validation, edit/delete, 23-row cursor retry, server chart/count, source/return; native sheet and resume | Pass for exercised states | UI-02, UI-04 |
| `/progress/weight/:date` | client | 375 / 768 / 1280, iOS/Android | Create/edit/delete, validation, decimal keyboard/save, restart, lost response; offline/storage/conflict/corrupt draft and late navigation | Browser/native pass; physical device and usability separate | UI-02, UI-03, UI-05 |
| `/messages` | client | 375 / 768 / 1280 | Text/live/read, long content, restart, lost response, conflict discard, composer above tabs | Behavior/geometry pass; distinct conversation design/native recheck pending | UI-01 |
| `/forms` | client | 375 / 768 / 1280 | Pending/history after saved response | Behavior regression passes; mobile redesign pending | UI-01 |
| `/forms/:id` | client | 375 / 768 / 1280 | All question types, validation, draft/revision/photo retry, saved response, progress return | Behavior regression passes; mobile redesign pending | UI-01 |
| `/training` | client | 375 / 768 / 1280 | History, filters, search, paging/error/retry, completed return | Behavior regression passes; mobile redesign pending | UI-01 |
| `/training/plans/:id` | client | 375 / 768 / 1280 | Pending | Pending | UI-01 |
| `/training/plans/:id/workouts/:workoutId` | client | 375 / 768 / 1280 | Prescription, start, interrupted start | Behavior regression passes; mobile redesign pending | UI-01 |
| `/training/sessions/:id` | client | 375 / 768 / 1280 | Planned/freeform recording, all modes, retry, offline, edit/remove, complete/discard | Behavior regression passes; mobile redesign pending | UI-01 |
| `/nutrition` | client | 375 / 768 / 1280 | Planned/empty/saved day and history return | Behavior regression passes; mobile redesign pending | UI-01 |
| `/nutrition/plans` | client | 375 / 768 / 1280 | Pending | Pending | UI-01 |
| `/nutrition/plans/:id` | client | 375 / 768 / 1280 | Pending | Pending | UI-01 |
| `/nutrition/days/:date/:slot` | client | 375 / 768 / 1280 | Planned/unplanned, alternatives, portions, extras/swaps, conflict/retry, offline, saved reading | Behavior regression passes; mobile redesign pending | UI-01 |
| `*` | public | 375 | Pending | Pending | — |

## Findings

- UI-01: Shared shell and workflow screens look like plain web pages. Evidence: earlier training, nutrition and form screenshots in `evidence/`; user explicitly requested redesign. Classification: requested design change. Status: in progress. Compact icon app bars/navigation, full tappable action cards and a warmer visual system are implemented; live verification and individual screen redesign remain.
- UI-02: Progress editor and history were under construction. Status: implemented and verified in browser and both native runtimes; see `progress.md`. Physical-device/usability checks are separate.
- UI-03: A restarted uncertain weight save incorrectly disabled Check save after its own successful write changed the observed revision. The recovery browser scenario first failed with a disabled action and a matching saved value. Fixed in `src/progress/weight.tsx`: compare the immutable attempt before treating the changed revision as a conflict. Same test now passes without a second write; differing saved content still requires explicit review. Prevention: RM-227.
- UI-04: Android Back did not dismiss the filter sheet. Native test first failed with the dialog still present. Fixed in `ui/native-runtime.ts` by dispatching bubbling Escape from the focused control; native test now proves both picker and sheet dismissal without leaving the route. Prevention: RM-239.
- UI-05: iOS date input exceeded the content gutter. Native keyboard screenshot before the change shows its clipped right edge; `index.css` now uses `appearance: none` and `max-width: 100%` for date inputs. Rebuilt iPhone screenshot `evidence/progress-ios-keyboard.png` shows both gutters intact; decimal keyboard/save/restart test passes.

Evidence: `frontend/apps/clientapp/tests/progress/artifacts/{today,invitation,editor,progress,filters}-{375,768,1280}.png`; `recovery-375.png`; messaging artifacts from its latest passing run. These are observed states, not approved visual baselines. Progress and its editor use compact stack headers. Weight recording has a large decimal input and a bottom save action with no tab bar. A single-point trend suppresses an otherwise empty chart.

Shared consumers: `Page` serves account, forms, training, nutrition and progress; `AuthLayout` serves login, verification and invitation; `Button`/inputs/selects serve every workflow. Every consumer must be checked after the shared changes. The message viewport must be verified against the floating tab bar and keyboard.

- UI-06: Account now uses a personal overview and separate contact/goal editors with compact app bars and reachable Save. Real browser/native verification passes; see `account.md`. Typed goal fields previously returned success without persistence; the backend self changeset and router regressions now enforce their declared behavior. Evidence: `evidence/account-*`.
