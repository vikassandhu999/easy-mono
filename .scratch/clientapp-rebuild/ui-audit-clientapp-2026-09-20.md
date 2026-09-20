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
| `/forms` | client | 375 / 768 / 1280 | Pending/history segments, empty, saved return, 22-row cursor retry | Mobile pass for exercised states | UI-12 |
| `/forms/:id` | client | 375 / 768 / 1280, iOS/Android | All question types, empty/partial validation, keyboard/pointer choices, draft/revision/photo retry, saved response, offline; native visible-keyboard send/restart | Browser/native pass; physical device/usability separate | UI-12 |
| `/training` | client | 375 / 768 / 1280, Android | Plan/history segments, search/empty/reset, sheet filters/Back, paging/error/retry, preserved completed return | Mobile pass for exercised states | UI-07 |
| `/training/plans/:id` | client | 375 / 768 / 1280 | Plan entry, workout rows, schedule, preview return | Mobile pass for exercised states | UI-07 |
| `/training/plans/:id/workouts/:workoutId` | client | 375 / 768 / 1280 | Numbered prescription, long name, reachable start, interrupted start | Mobile pass for exercised states | UI-07 |
| `/training/sessions/:id` | client | 375 / 768 / 1280, iOS/Android | Planned/freeform, all modes, last-set prefill, notes sheet/failure/retry, offline/restart, edit/remove, complete/discard, physical keyboard-open save | Browser/native pass; physical device/usability separate | UI-07, UI-08, UI-09 |
| `/nutrition` | client | 375 / 768 / 1280, iOS/Android | Empty/planned/saved day, previous/next, date sheet/Back, read-only date, meal-time sheet and return | Mobile pass for exercised states | UI-10 |
| `/nutrition/plans` | client | 375 / 768 / 1280 | Assigned rows, filter sheet, empty search/reset, filtered return | Mobile pass for exercised states | UI-10 |
| `/nutrition/plans/:id` | client | 375 / 768 / 1280 | Targets, weekly guidance, meal disclosure/portions, long names, return | Mobile pass for exercised states | UI-10 |
| `/nutrition/days/:date/:slot` | client | 375 / 768 / 1280, iOS/Android | Planned/unplanned, alternative/portion/note, sheet food/recipe choice and 22-food paging/retry, extras/swaps, conflict/recovery, offline/restart, visible-keyboard save and saved reading | Browser/native pass; physical device/usability separate | UI-10, UI-11 |
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

- UI-07: Training mobile pass replaces the web filter form/navigation with segments and sheets, focuses preview/recording, moves the next entry above saved sets and offers explicit same-exercise prefill. Notes save in a separate sheet. Mobile browser and native workflows pass; see `training.md` and `evidence/training-mobile-*`. Shared infinite-list refresh/end-state changes also pass forms, nutrition and weight regressions.
- UI-08: iOS reported the fixed Save set action hittable while a physical tap failed to save and focused Finish. `SetEditor` now opts into `preventFocusOnPress`; the same native probe verifies button bounds and a successful first-tap save. Notes also verify keyboard-open save. Prevention: RM-240. The shared SubmitButton defaults to its previous focus behavior; this opt-in only applies to workout set recording.

- UI-09: Native screenshot review found scrolled content overlapping the status bar. `body::before` now provides a fixed background over the top safe area. The final iPhone screenshot shows clear status indicators with the software keyboard visible; workout and goal tests pass. Browser and Android auth/form/workout regressions also pass. The keyboard probe was strengthened after discovering that hardware-keyboard mode can leave an off-screen keyboard in the accessibility tree; see `auth-native.md`.

- UI-10: Nutrition mobile pass replaces persistent date/filter forms and crowded item controls with a day switcher, sheets, compact portions and a reachable Save. No-intake state now invites recording instead of leading with unavailable calories. Browser/native evidence passes; see `nutrition.md` and `evidence/nutrition-mobile-*`.
- UI-11: Meal success navigated unconditionally even after leaving its editor. A mounted-state guard now keeps subsequent navigation while finishing persistence. The real-response hold test verifies Account stays open, the attempt clears and the server stores the portion. Prevention: RM-241.

- UI-12: Forms mobile pass adds pending/history segments, numbered questions, large choices, a focused editor, reachable Send and clearer saved reading. Browser, iPhone and Android checks pass; see forms.md and evidence/forms-mobile-*. Initial tiny radio inputs failed direct pointer selection; full-target inputs now pass pointer/keyboard checks. Prevention: RM-242. Existing draft, upload, conflict and lost-response behavior remains covered. Closed/missed visual states and real-client usability remain part of the final connected audit.
