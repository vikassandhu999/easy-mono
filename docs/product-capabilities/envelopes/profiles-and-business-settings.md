# Design Envelope: Profiles and business settings

Derived from: [Profiles and business settings](../profiles-and-business-settings.md)

## Supported outcome

A coach or active client can understand and maintain the limited personal profile facts they own, while coaches can maintain shared business identity.

## Available information

* A coach has optional first and last names, account email, optional phone, owner or trainer status, and shared business context.
* Shared business context includes a possibly missing or blank name, read-only handle, optional about text, optional WhatsApp number, and a default weight unit of kilograms or pounds.
* An active client has optional first and last names, optional relationship contact email, and optional phone.

## Supported actions

* A coach can edit their own first name, last name, and phone.
* Any coach can edit the shared business name, about text, WhatsApp number, and default weight unit.
* An active client can edit their own first name, last name, and phone.

## Lifecycle

* Initial account, membership, and business establishment happen before later profile maintenance.
* Personal facts saved together with the business name or WhatsApp number succeed or fail together. About-text and default-unit changes are separate saves.
* Shared business changes use the last successful save and affect every actor or public experience that consumes those facts.

## Conditions

* Coach actions require a coach membership in the business. Client actions require an active client relationship.
* Every coach can change the supported shared business fields.
* A coach can change only their own personal profile. A client can change only their own name and phone.
* Account email, business handle, and client relationship email are read-only here.

## UX-relevant constraints

* Treat the business handle as read-only. It is different from the public landing-page slug.
* Names and contact values can be missing, blank, or poorly formed. Phone and WhatsApp values are not verified or normalized.
* Business name can be missing or blank even though some consumers expect it. That state needs explicit treatment.
* Any trainer can change shared business facts. Make shared impact understandable without implying owner-only authority that does not exist.
* Business about text has no supported public destination. Do not claim that editing it changes the public landing page.
* The last successful save wins. There is no revision history, undo, author information, or concurrent-change warning.
* Missing names and missing contact details need intentional treatment.
* Profile images are unavailable.

## Related capabilities

* Authentication and invitation acceptance owns account entry, sessions, device logout, and account-security limits.
* Coach team management owns trainer membership and owner-only team actions, not personal profiles.
* Coach client relationships owns client status, dates, goal weight, assignment, relationship email, assigned-coach context, and coach-side client changes.
* Landing page authoring and applications consumes business name and WhatsApp number and owns its separate public slug.
* Weight tracking uses the relationship goal and business default unit.
* Billing and seats owns capacity and payment work rather than profile settings.

## Unsupported assumptions

* Account or login email change, passwords, security settings, account deletion, data export, remote logout, and device management are outside this area.
* Profile images, personal biographies, pronouns, date of birth, locale, timezone, and notification preferences are unavailable.
* Ownership transfer, business switching, role editing, and field-level business permissions are unsupported.
* Business handle editing, handle redirects, and using the handle as the landing-page slug are unsupported.
* Client edits to relationship email, goal, dates, status, assigned coach, or business details are unsupported.
* Editing another trainer's personal profile is unsupported.
* Change history, approval, rollback, and conflict resolution are unavailable.

## Example content

* Owner Neha Kapoor has a phone number and account email. Her business, "Strong Days Coaching," has an optional description, a WhatsApp number, a read-only handle, and pounds as its default unit.
* Trainer Omar Ali changes his own phone number. He can also change the shared business name because business editing is not owner-only.
* Client Aisha Verma changes her name and phone. Her relationship email remains read-only.
* A business name was cleared by another trainer. The missing name is shown honestly and can be repaired without inventing a fallback company name.
