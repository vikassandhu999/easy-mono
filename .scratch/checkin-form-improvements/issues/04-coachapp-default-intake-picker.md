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
