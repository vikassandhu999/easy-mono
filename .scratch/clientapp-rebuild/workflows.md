# Supported workflows and gaps

Initial inventory: 2026-09-19. Reconciled with delivered slices on 2026-09-20.
Sources are the Phoenix router, client typed controllers, generated schema and current
clientapp router. Neither v2 app was consulted. Graph discovery initially timed out;
graph tools were unavailable during the final review, so bounded source reads and
workflow evidence were used. This is not a whole-repository completeness claim.

| Outcome | Backend surface | Delivered behavior / remaining boundary |
| --- | --- | --- |
| Join coach | Auth invitation preview, accept, verify | [Invitation and OTP](auth-mobile.md), challenge restart, protected return and explicit account replacement; browser and both native runtimes pass |
| Sign in | OTP, client role, refresh token | Shared refresh, transient/rejected-session distinction, logout races and [native secure credentials](credential-storage.md) verified |
| Complete intake/check-in | Assignment index/show/submit | [Mobile forms](forms.md), pending/history/purpose cursor filters, all questions, draft/revision recovery and saved responses verified |
| Understand today | Date coverage, active session, nutrition day, assignments | Active Resume, direct workout preview, pending server count, nutrition guidance, client-local calendar, rest/no-plan/loading/error and cached retry verified |
| Follow workout | Plans/coverage, exercises, sessions, sets, complete/discard | [Planned/freestyle execution and history](training.md), all tracking modes, frozen targets, stable set identity, offline drafts and native restart verified |
| Follow nutrition/log meals | Plans, foods, recipes, nutrition days GET/PATCH | [Meal recording](nutrition.md), server search/cursors/totals, alternatives, portions, extras, revisions, conflict/lost-response recovery and native restart verified |
| Progress photos | Upload/signing endpoints; assignment submit | Gallery, media validation, iOS library permissions, Android gallery/capture process recovery verified; physical iPhone camera capture remains external |
| Message coach | Conversation show/history/create/read | [Conversation](messaging.md), cursor history, bounded read state, replay-safe text/media send, native restart and actual MP4/MP3 playback verified on both runtimes |
| Review history/progress | Sessions, nutrition days, assignments, client weight endpoints | Saved workout/meal/form readers, [weight history and server trend](progress.md), server counts, opaque paging, source/return and create/edit/delete recovery verified |
| Manage account | Profile GET/PATCH | [Names, phone and optional weight goal](account.md) verified; email, timezone and default unit remain read-only under this contract |
| Notifications | No supported device-registration/delivery API | Explicit external gap; no speculative local-reminder feature or permission prompt. Delivery requires an agreed backend workflow and APNs/FCM setup |

Focused backend additions were completed through the repository API-change process,
including tenant/account isolation tests and generated types. Client resources retain
the user-selected typed-route pipeline; OpenAPI remains the auth contract.

Physical-device/usability and production domain/signing/service requirements are listed
separately in [device-and-client-checks.md](device-and-client-checks.md). See
[completion.md](completion.md) for the final implementation and verification status.
