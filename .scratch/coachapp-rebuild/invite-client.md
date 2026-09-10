# Invite a client and provide their intake

Approved scope: invite a client, preview the business's default intake before sending, provide the invitation link, revisit invitation status, and resend. A client is fully onboarded once they have their plans; this slice stops when the accepted client can open their intake.

## Screen brief

When someone agrees to work with me, I need to invite them and provide their intake so I can collect the information needed to prepare their coaching.

The signed-in destination becomes a small Clients page. Its empty state leads to Invite client. A dedicated invite route collects first name, last name, and email and shows the resolved default intake with expandable questions. Email is required for this flow. The server remains responsible for default selection and assignment. Sending creates the client and intake together, then navigates to that client's invitation detail.

The detail shows invitation acceptance, the assigned intake, and the shareable link while pending. Resend renews the invitation expiry and keeps the same link. Display the server response. Accepted clients have no resend action. The client list provides a way to return after leaving the app. Loading and request errors have explicit retry actions. Failed invitations retain entered details. Clipboard failure leaves a selectable link. Reloading a successful invitation must never send another invitation.

Use a dedicated route rather than a modal: the form and preview have space on phones, and the result has a durable address. Keep account identity and sign-out in the shell. Use the existing neutral theme and installed React Aria primitives.

No per-client form selection, form builder, intake answer review, plan creation, or broader workbench in this slice. A read of the resolved default may create the server's standard Intake for a business with no active intake, matching invitation behavior.

## Implementation plan

Execute inline in the current working tree, following the rebuild's recorded workspace preference. No commit or deployment requested.

- [x] Add a controller regression for `GET /v1/coach/form-templates/default-intake`: tenant isolation, chosen default, fallback, and matching intake assignment after invitation. Run it red, then add the thin route/action using `Templates.get_default_intake(ctx)`. Regenerate the contract with `rtk just gen-api`.
- [x] Add `tests/clients/invite.browser.mjs` against the isolated API. Assert `getByRole('heading', {name: 'Clients'})`, invite form preview, failed send preserving input, successful detail, reload, resend preserving the link and updating invitation data, list navigation, and client acceptance/intake access. Run red before screen implementation.
- [x] Add resource hooks in `src/api/clients.ts` and `src/api/forms.ts`; all keys in `src/api/keys.ts`. Mutations update detail data and invalidate client lists. Consume generated schemas without duplicate response types.
- [x] Add `src/clients/clients.tsx`, `invite-client.tsx`, `client-invitation.tsx`, and `intake-preview.tsx`. Compose them through `router.tsx` and `app-shell.tsx`, with routes in `routes.ts`. Keep the feature's components private; promote the auth error display to `ui/` because both features need it.
- [x] Verify complete browser scenarios at 375px and 1280px, real client acceptance and intake access, existing auth regression suites, app build/Biome, frontend boundary checks, and backend `mix precommit`. Record results in the rebuild plan and README.

Verification and independent-review results are recorded in [the rebuild plan](plan.md#client-invitation-slice).
