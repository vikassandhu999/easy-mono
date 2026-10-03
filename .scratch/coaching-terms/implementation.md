# Coaching terms implementation

Source: approved `spec.md`. Execute in the current `codex/coaching-terms` working tree; do not commit, push, or touch clientapp-v2. No check-ins work.

## Work boundaries

1. Lifecycle backend: replace client, coach, user and business facts; rebuild identity migrations; implement terms, database constraints, seat locking, invitation acceptance, handle validation, and lifecycle API. Own lifecycle contexts, identity, billing integration, their controllers/types/tests. Use client `coach_id`, `invite_token`, `invited_at`; business `owner_user_id`; billing holds the seat limit. Keep timestamps and activity facts needed by existing features.
2. Integration: enforce term access on every client write while retaining reads; apply E6 in training and nutrition; remove stage advancement and expiry sweeper; update shared factories, seeds and vocabulary. Regenerate contracts without writing clientapp-v2. Run full verification and browser scenarios.
3. Coach app: implement client list/state/card/history/profile, team invitations/removal, business handle/seats and name changes. Own coachapp except generated schema.
4. Client app: joined screen, ended read-only history/banner, names and units. Own clientapp except generated schema.

## Shared API decisions

Preserve existing `/v1/coach`, `/v1/client` namespaces. Client invite is `POST /v1/coach/clients`, resend `POST /v1/coach/clients/:id/invite`, revoke `DELETE /v1/coach/clients/:id`, start `POST /v1/coach/clients/:id/terms`, edit end `PATCH /v1/coach/terms/:id` (`ends_on`: date or null). Profile patch includes `coach_id`. Lists take `state` and `q`, preserve cursor pagination, include plan names as before. Client JSON includes full_name, preferred_name, coach_id, coach_name, timezone (nullable), unit_system, local_date, state (active/ending_soon/joined/invited/ended), current_term, terms, invite_url, invited_at, invitation_expires_at. Terms contain id/starts_on/ends_on. List summary has counts for all five states.

Client profile includes full_name, preferred_name, unit_system, state, current_term, terms, timezone (applied), local_date, and coach full_name/preferred_name/phone/business_name. Names never fall back to split user names. Plan JSON adds `stopped_on` (date/null), derived from the first term end on or after the plan's client-local creation date, without changing plan rows.

Team API moves to `/v1/coach/coaches`: GET list/detail, POST invite, POST `/:id/invite` resend, DELETE `/:id` revoke, POST `/:id/remove` remove after reassignment. State is invited/active/removed, derived from user_id/removed_on; no reactivation compatibility action. Team JSON uses full_name, preferred_name, phone, invited_at, removed_on, invite_url and existing invitation/count/owner facts.

Business read/update remains `/v1/businesses/me` and create `/v1/businesses`. JSON has handle, timezone and seats `{limit, used}`, no about/whatsapp/default units. Add GET `/v1/businesses/handle-availability?handle=` => `{available: boolean}`; owner may retain own handle. Coach profile business uses handle; names use full_name/preferred_name. Auth maintains the OTP flow, names become full_name. Client acceptance final endpoint is `/v1/auth/invites/:token/accept` with OTP verification body; preliminary OTP request remains existing accept-invite path.

## Verification focus

- Inclusive local dates, timezone fallback, end today stays active, next day ends without writes.
- Database rejects overlap and reversed dates; immutable starts; editing a historical term cannot revive it.
- Concurrent accept/start cannot overbook; full seat acceptance still links user; downgrades leave terms intact.
- E6 allows pre-acceptance plans, prevents stale plans on return, preserves historical reads.
- Tenant denial, removed-coach denial, all client write paths including sockets denied after end.
- Handle syntax/reserved names/uniqueness and invitation expiry/resend/revoke.

Finish: backend `rtk mix precommit`, root `rtk just gen-api`, both maintained app builds, root `rtk pnpm -C frontend lint:ci`, Playwright lifecycle flows at required widths. Record outcomes and limitations here.

## Completed verification

- `rtk mix precommit` in backend: passed; 1,242 tests, zero failures, clean compile/Credo, 122 generated routes checked.
- `rtk just gen-api`: passed; generation targets only the maintained apps, leaving clientapp-v2 unchanged.
- `rtk pnpm -C frontend/apps/coachapp build` and `rtk pnpm -C frontend/apps/clientapp build`: passed, including application typechecks and existing unit checks. Vite reports its existing large-chunk advisory.
- `rtk pnpm -C frontend lint:ci`: passed. `rtk git diff --check`: passed.
- Real Phoenix Playwright flows passed: coach at 375px and 1280px, client at 375px, free/full-seat invitation acceptance, returning coaching, end-date edits, inclusive end-today behavior, client access states, business handles, coach invitations/acceptance/removal. See `coach-report.md` and `client-report.md` for commands and screenshots.
- Review regressions cover creation-date plan expiry, concurrent overlap validation, returning-client login, and coach reinvitation.

All in-scope requirements are implemented. Existing `/v1` namespaces and `/v1/businesses/me` are retained. Prototype dev/test databases were reset; no old data was migrated. Deferred features and native/physical-device verification were not included. Clientapp-v2 has no changes. An external edit to `.scratch/check-ins/spec-validation.md` appeared during the session and was preserved without modification by this implementation. No commits or pushes were made.

## Review fixes

1. Seats: deleted `Business.seats` and synchronization; billing's free plus paid seats is the only limit (10 free by default), created transactionally with the business; shared capacity-lock and downgrade tests pass.
2. Removed coaches: changed active-user uniqueness, reused removed rows for fresh invitations, derived state from open tokens, and cleared token/removal on acceptance; same-business return, another business, own-business, and browser reinvitation tests pass.
3. Plan expiry: `PlanCoverage` uses the client-local creation date in adjacent Elixir and SQL rules; deleted the start-date edit guard; future-scheduled, between-term, pre-acceptance, and timezone parity tests pass.
4. Plan overlap: deleted the trigger migration and baseline plan exclusions; one Ctx-scoped Elixir check locks the client and compares effective same-service ranges using completed terms; both concurrent assignment suites pass and term database constraints remain.
5. Owner setup: business creation requires explicit owner `full_name` and accepts `preferred_name`; setup prefills the account name and maps validation errors without inventing names; blank-account and prefilled setup browser flows pass at both widths.
6. Client writes: one HTTP plug uses the already-loaded client for every non-GET client route; deleted service-site gates and reloads; receive-only channels reject inbound writes, attachment reads use GET, and route/channel plus zero-write ended-browser tests pass.
7. Client lookups: authorization queries return plain scoped clients; calendar consumers explicitly preload what they need, and unused user preloads are removed; tenant, history, and timezone tests pass.
8. State counts: one FILTER aggregate reuses the list's state predicates; regular and cursor-page tests verify exact totals and one summary query.
9. Context boundaries: public CoachingTerms operations take Ctx, capacity/relationship helpers are private, and the raw-argument acceptance wrapper is deleted; identity and acceptance tests pass.
10. Leftovers: deleted the unused billing capacity helper and reservation comment; diary writability is computed once per request without per-date term preloads; stale tests and unused helpers were removed and compile/Credo are clean.

Final verification on 2026-10-03:

- `rtk mix precommit` in `backend/`: passed, 1,242 tests and zero failures; compile with warnings as errors, formatting, 122-route contract check, and Credo all passed. Log: `/tmp/coaching-review-precommit-final.log`.
- `rtk just gen-api`: passed for the two maintained apps; clientapp-v2 remains untouched.
- `rtk pnpm -C frontend/apps/coachapp build` and `rtk pnpm -C frontend/apps/clientapp build`: passed including application typechecks and unit checks; existing Vite bundle-size advisories remain.
- `rtk pnpm -C frontend lint:ci` and `rtk git diff --check`: passed.
- Playwright lifecycle and owner setup: coach at 375px and 1280px, client at 375px, including removed-coach reinvitation and free/full-seat acceptance, passed. Commands, screenshots and outcomes: `review-browser-report.md`.

No requested fix or verification remains outstanding. Dev and test databases were reset to the revised prototype baselines. No commits or pushes were made.
