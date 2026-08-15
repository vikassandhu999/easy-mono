# 04 — Coach app: default intake picker in settings + default badge on forms list

**What to build:** From the coach app's settings surface, a coach chooses which intake form new clients automatically receive, changes it at any time, or clears it to return to the automatic default. The picker offers only active intake-purpose templates, so the coach can never select an archived or check-in template. On the forms list, the current default template is visibly marked, so the coach doesn't have to open settings to remember which one it is. ~~Reads and writes go through the existing business update endpoint.~~ **Contract changed by 03's design revision:** reads come from `is_default_intake` on the form-template list; writes are `PUT`/`DELETE /v1/coach/form-templates/{id}/default-intake`.

**Blocked by:** 03 — Backend: business default intake template setting + invite flow.

**Status:** resolved

- [x] Settings surface shows the current default intake template (or that none is set)
- [x] Picker offers only active intake-purpose templates
- [x] Coach can change the default at any time and clear it back to unset
- [x] Forms list marks the current default template
- [x] React Query invalidation lives in the src/api mutation hooks, not at call sites
- [x] Typecheck and build gates pass (existing frontend gates; no new test seam)

## Comments

Implemented 2026-08-14. Notes:

- Settings → Profile tab gains a "Client onboarding" card with `DefaultIntakeRow`: shows the *effective* default (an archived flag-carrier reads as "Automatic", matching what invites actually assign), "Choose/Change" opens a `PickerModal` of active intake templates, "Use automatic" clears. Query errors render "Couldn't load intake forms" with actions disabled.
- Forms list marks the effective default with a `chip--outline` "Default intake" chip (hidden while the flag-carrier is archived, for the same reason).
- `useSetDefaultIntakeTemplateMutation` / `useClearDefaultIntakeTemplateMutation` invalidate `formTemplateKeys.all` in `onSettled` — a 422/404 means the picked-from list was stale, so failures refetch too.
- Verified live in the browser: choose → row + forms-list badge update; clear → back to "Automatic"; picker offers only the active intake template. The new endpoints 500'd until the dev `phx.server` was restarted (RM-004: cached OpenAPI spec).

## Placement revision (2026-08-15)

The Settings placement was prototyped against alternatives (branch
`prototype/default-intake-placement` — variants A/B/C on `/library/check-ins`,
kept as primary source). Verdict: **variant A** — the control moved to the
Forms page header beside "Create form", as a neutral outline select reading
"New clients get: *X*", opening a picker dialog. It is inline on desktop and
takes its own full-width line below the title on mobile (the browse header now
wraps for it) — capping the value alone still crushed the page title to "Fo…"
with a long form name. The Settings "Client onboarding" card was removed
entirely — one home only. The "Default intake" row badge stays.
Implementation: `src/checkins/components/default-intake-control.tsx` + an
`actionsExtra` slot on `BrowseScreen` (documented single caller).

**"Clear back to unset" was cut from the UI** (supersedes the third checkbox
above). It surfaced an internal state as a user-facing option: when no template
carries the flag the backend assigns the oldest active intake, which is a
bootstrap detail, not a decision a coach wants to make. Exposing it as an
"Automatic" / "Choose for me" row was rejected on review — 2026-08-15. Instead
the control always names the form a new client would actually receive (the flag
holder, else the oldest active intake — the list endpoint and
`Forms.get_or_create_default_intake_template/1` share the `inserted_at` order),
and the picker only offers forms. An archived flag-holder self-heals to the
fallback, so no clear path is needed.

Consequence: `useClearDefaultIntakeTemplateMutation` was deleted (zero
importers). `DELETE /v1/coach/form-templates/{id}/default-intake` still exists
and is still tested, but now has no frontend consumer — **design debt**, left
in place rather than churned out of the API contract.

Verified live at 375px and 1280px: switching between two intake forms updates
the trigger and the row badge; tapping the form that is already current just
dismisses.

## E2E verification (2026-08-14)

Full invite loop exercised against the dev stack (settings UI + invite UI + API assertions), three legs:

1. **Chosen default assigned** — created a second intake ("Premium intake"), picked it in settings, invited a client through the UI → the client's sole assignment is `{purpose: intake, template: "Premium intake", status: assigned}`.
2. **Cleared → automatic fallback** — "Use automatic" in settings, invited a second client → assignment is "Intake" (the oldest active intake), not "Premium intake".
3. **Archived default → fallback** — re-set "Premium intake" as default, archived it, invited a third client via `POST /v1/coach/clients/invite` → assignment is "Intake"; settings and forms list both read "Automatic"/unbadged while the archived template still carries the flag (effective-default display working as designed).

Dev-data residue: three `e2e-*@example.com` invited clients and an archived "Premium intake" template (flag still set) remain in the dev DB.
