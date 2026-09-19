# Supported workflows and gaps

Inventory date: 2026-09-19. Evidence is the Phoenix router and client typed controllers, not legacy frontend screens. Graph discovery was attempted through `cbm architecture`, which returned `backend_timeout`; targeted source reads are the fallback. This is a route/controller inventory; context behavior and exact payloads still need verification per slice.

| Outcome | Backend surface | Required work / gap |
| --- | --- | --- |
| Join coach | Auth invitation preview, accept, verify | Build client routes; preserve invitation during OTP/restart; reject silent account replacement |
| Sign in | OTP, token with client role, refresh token | Shared refresh, invalid-vs-transient failure, logout races, native persistence |
| Complete intake/check-in | Assignment index/show/submit | Client index returns cursor pages and filtered server counts, with pending/history and purpose filters. Mobile forms, gallery photos, Android capture and response recovery are implemented; physical iPhone capture verification remains |
| Understand today | Coverage by date, active training session, nutrition days, assignments | Today composes active training, server pending count and coverage. Profile timezone/local_date now provide the client calendar; nutrition guidance joins after its complete logging slice |
| Follow workout | Plans/coverage, exercises, sessions, performed sets, complete/discard | Client plan/session cursor contracts and stable set-creation identities implemented. Mobile start/resume, frozen targets, recording and history browser checks pass; native recording/restart verification passes on both platforms |
| Follow nutrition/log meals | Nutrition plans, foods, recipes, nutrition days GET/PATCH | Day/slot revisions and server totals are available. Audit source search, paging, and idempotent save semantics |
| Progress photos | Client upload and signed download URL endpoints; assignment submission | Gallery adapters, media validation, iOS library permissions and Android gallery/capture recovery pass; physical iPhone capture verification remains |
| Message coach | Conversation show/messages/create/read | Messages use `before` and `has_more`, not shared opaque cursor; inspect context before defining a cursor API. Audit send deduplication and supported attachment types |
| Review history | Sessions, nutrition days, assignment show, weight entries | Client history paging and completed response access need contract/context audit; weight trend exposed to coach is not yet exposed to client |
| Manage account | Profile GET/PATCH | Editable names, phone, goal weight. Email and default unit are not editable in this profile contract; do not invent writes |
| Notifications | No notification registration route in router | Remote delivery needs backend registration and APNs/FCM credentials; define supported local reminders separately before implementing |

Any backend change follows the repository API-change process, including tests for tenant/account isolation, contract generation, and required backend precommit. The user selected the migrated typed-route contract pipeline. OpenAPI generation remains for auth; client resources derive from typed controllers.
