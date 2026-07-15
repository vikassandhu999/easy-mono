# Profiles and business settings

Owner: Profiles and business settings

## Supported outcome

An authenticated coach or active client can inspect their self profile and edit the limited personal facts they own, while coaches can maintain shared business facts and a business owner can manage setup-guide state.

## Available information

* A coach profile provides first name, last name, account email, phone, owner status, and a business summary. Names and phone may be absent.
* The business provides name, handle, optional about text, optional WhatsApp number, default weight unit in kilograms or pounds, and creation and update times. Business name can be missing or blank after a weakly validated update.
* The business handle is the value chosen during owner onboarding. It is separate from the public landing-page slug.
* An active client's self profile provides first name, last name, relationship contact email, phone, current goal weight, business default weight unit, subscription dates, relationship status, and an optional assigned-coach summary.
* The assigned-coach summary provides first name, last name, phone, and business name when a coach is assigned. Its business name can also be missing or blank.
* Owner setup guidance derives three milestones: at least one client relationship exists, at least one reusable business training or nutrition plan exists, and at least one of the loaded clients has an assigned training or nutrition plan whose record is active. The last milestone does not check the plan's date range or the client's relationship status.
* Setup-guide state is available as visible, dismissed, or completed, with the time when dismissal or completion was stored.

## Supported actions

* An authenticated coach can inspect their personal profile and business summary.
* A coach can update their own first name, last name, and phone.
* Any authenticated coach in the business can update the shared business name and WhatsApp number through profile editing.
* Any authenticated coach in the business can inspect the full business record and update its name, about text, and default weight unit.
* An active client can inspect their self profile, coaching relationship context, and assigned-coach contact information.
* An active client can update their own first name, last name, and phone. These changes update the same relationship record visible to permitted coaches.
* A business owner can dismiss setup guidance, restore it while it is dismissed, or let the product mark it completed after all three derived milestones are observed.

## Lifecycle

* Authentication and invitation acceptance creates the initial account, coach or client membership, and business. This capability owns later self-service profile and business maintenance.
* A coach update that contains personal and shared business fields commits them together. If either part fails, neither part is saved.
* Standalone business updates are separate writes. All shared business edits use the last successfully saved value; there is no version history or conflict detection.
* Business name changes appear in later reads, pending invitation previews, future or resent invitation delivery, public acquisition, and client coach context. Already delivered invitation messages are not rewritten. Business WhatsApp changes affect public application follow-up. Default weight-unit changes affect later fallback unit choices but do not convert prior values.
* Setup guidance begins visible. Dismissal records a time and can be cleared. Completion records a time and is permanent; later attempts to restore or dismiss it leave it completed.
* The supported product flow records completion after all three milestones are observed. The stored completion action itself does not verify those milestones.

## Conditions

* Coach profile and business access require a coach session for that business. Client self-profile access requires an active client relationship.
* Every coach can edit the shared business fields described here. Only the business owner can change setup-guide state.
* A coach can edit only their own personal profile. Team management does not allow an owner to edit another trainer's profile.
* A client can edit only their own first name, last name, and phone. Relationship email, goal weight, subscription dates, status, assigned coach, and business facts are read-only to the client.
* Client relationship contact email can differ in meaning from the account email used for login. Neither email is editable through profile settings.
* An assigned coach can be absent even for a returned client profile.
* A deactivated trainer's refresh sessions are revoked, but an already issued access credential can retain coach access for up to five minutes.

## UX-relevant constraints

* Business handle editing is declared as accepted input but is silently ignored by the stored update. Treat the handle as read-only until that mismatch is repaired.
* Client goal-weight editing is declared as accepted self-profile input but is silently ignored. Goal changes remain coach-owned through Coach client relationships.
* Names, phone numbers, about text, and WhatsApp number have little or no domain validation or normalization. Empty or malformed contact values must not be presented as verified or WhatsApp-capable.
* Business name and WhatsApp are shared facts that every coach can edit. A trainer's change affects the owner, other trainers, clients, later invitation reads or delivery, and public acquisition where those facts are used.
* Business name can become missing or blank. Consumers must handle that state rather than relying on the response declaration that says a name is always present.
* Business about text has no supported public presentation. Editing it must not imply that it appears on the landing page.
* Profile and business writes use last-save-wins behavior with no undo, revision history, authorship, or concurrent-change warning.
* The assigned coach is optional. Missing coach information needs intentional treatment rather than an assumed name or contact action.
* The setup milestones are derived rather than stored individually and have no real-time update signal. They must be refreshed after client or plan changes.
* The assigned-plan milestone inspects at most 100 loaded clients. A larger business can have a qualifying client outside that sample and still appear incomplete.
* Setup completion is not independently certified and cannot be reversed. Do not offer manual completion or portray it as a verified business-readiness assessment.
* Profile images are unavailable.

## Related capabilities

* Authentication and invitation acceptance owns account establishment, email-code entry, sessions, device logout, and unsupported account-security actions.
* Coach team management owns owner and trainer membership, trainer invitation, and deactivation. It does not own personal profile editing.
* Coach client relationships owns relationship email, status, dates, goal weight, trainer assignment, assigned-coach context, and coach-side client editing.
* Landing page authoring and applications consumes business name and WhatsApp number but owns public page content and its separate slug.
* Weight tracking consumes the relationship goal and business default unit without owning either setting.
* Training plan authoring and assignment and Nutrition plan authoring and assignment supply the plan facts used by owner setup guidance.
* Billing and seats owns business capacity and payment actions. Those actions are not profile settings.

## Unsupported assumptions

* Account or login email change, password or security settings, account deletion, data export, device lists, remote logout, and logout from all devices are unsupported.
* Profile images, cover images, biography fields for people, pronouns, date of birth, locale, timezone, and personal notification preferences are unsupported.
* Business ownership transfer, business switching, multiple businesses per coach, role editing, and per-field business permissions are unsupported.
* Business handle editing, redirecting an earlier handle, and treating the handle as the landing-page slug are unsupported.
* A client cannot edit relationship email, goal weight, subscription dates, status, assigned coach, or business details through self-profile settings.
* An owner cannot edit another trainer's personal profile through team management.
* Profile or business change history, approval, rollback, and conflict resolution are unsupported.
* Authoritative setup progress, custom milestones, setup reminders, manual completion, and reversible completion are unsupported.

## Verification evidence

* `backend/lib/easy_web/controllers/coaches/profile_controller.ex`, `backend/lib/easy_web/controllers/coaches/profile_json.ex`, and `backend/lib/easy_web/open_api/schemas/core.ex`: coach self information, editable fields, owner status, business summary, and declared input.
* `backend/lib/easy/coaches.ex`, `backend/lib/easy/orgs/coach.ex`, and `backend/lib/easy/orgs/business.ex`: coach and business field ownership, atomic profile updates, permissive shared-business authority, and validation behavior.
* `backend/lib/easy_web/controllers/clients/profile_controller.ex`, `backend/lib/easy_web/controllers/clients/profile_json.ex`, `backend/lib/easy/clients.ex`, and `backend/lib/easy/clients/client.ex`: active-client self access, returned coaching context, optional assigned coach, and the actual self-edit field set.
* `backend/lib/easy_web/controllers/business_controller.ex`, `backend/lib/easy_web/controllers/business_json.ex`, and `backend/lib/easy/orgs.ex`: business reads and updates, ignored handle input, owner-only setup state, serialization, and permanent completion.
* `frontend/apps/coachapp-v2/src/settings/settings.tsx`, `frontend/apps/clientapp-v2/src/settings/settings.tsx`, and `frontend/apps/coachapp-v2/src/dashboard/dashboard-setup-cell.tsx`: actor-facing editing, setup derivation, refresh behavior, and current recovery gaps.
* `backend/test/easy/orgs/dashboard_setup_test.exs`, `backend/test/easy_web/controllers/business_controller_test.exs`, `backend/test/easy_web/controllers/coaches/profile_controller_test.exs`, and `backend/test/easy_web/controllers/clients/profile_controller_test.exs`: source-backed profile, business, ownership, and setup-state behavior.
