# Landing page authoring and applications

Owner: Landing page authoring and applications

## Supported outcome

A coaching business can author and publish one guided public landing page where a visitor can understand its coaching offer, choose an optional program, and submit an application that becomes a prospect.

## Available information

* A business has either no saved landing page or one page with draft or published status.
* Page identity includes a globally unique public slug, normalized to lowercase, between 3 and 60 characters, using lowercase letters, numbers, and hyphens.
* The page uses one of three fixed intent templates: Proof first, Problem fit, or Coach story.
* Page content includes an eyebrow, required headline, subheadline, coach introduction, externally hosted hero-image URL, ordered proof points with labels and values, and ordered fit statements.
* A page can contain up to three ordered programs. Each has a required name plus optional audience, promise, description, and display price.
* A program is sales content describing a coaching offer. It is not a training or nutrition plan, and its displayed price does not create a payable purchase.
* A page can contain up to five ordered application questions. Each has a label and short-text, long-text, or single-select type. Single-select questions can provide options. Supported authoring assigns and preserves a unique identity for answer association, although stored question identity is not required or uniqueness-checked.
* The public page also provides the business name and optional WhatsApp number from the business profile.
* A public application contains name, optional phone, email, and Instagram, an optional selected program, and answers keyed by application-question identity.

## Supported actions

* Any coach in the business can create the business's page or replace its saved content in one save.
* A coach can choose the template, public slug, page copy, hero-image URL, proof and fit content, programs, questions, and draft or published status.
* Saving as published makes the page publicly available by slug. Saving it as draft removes it from public access.
* An anonymous visitor can view a published page, choose one program or a general application, and submit an application.
* A public application requires a name and at least one of phone or email. Instagram and question answers are optional.
* A successful application creates a new prospect before any optional WhatsApp follow-up begins.
* When the business has a WhatsApp number, the applicant can open an external prefilled message after success. Skipping it does not lose the saved prospect.

## Lifecycle

* Before the first save, the business has no landing-page record.
* Saving creates the page or updates that same page identity. The whole authored page is saved together rather than section by section.
* Draft and published content are one record. Moving a published page to draft makes its public slug unavailable; publishing it again exposes the newly saved content.
* Changing the slug moves the public address without creating a redirect.
* Each save replaces the page's program records with new identities, even when their visible content appears unchanged.
* Application submission creates a prospect in the new state. The public application is not a separate saved object from that prospect.
* A visitor-selected program is linked when its current identity is valid. An unknown or stale program identity is treated as a general application.
* Public delivery can briefly continue to show previously cached content after a published-page change.

## Conditions

* One page is supported per business.
* The slug, template, headline, and draft or published status are required.
* The slug is globally unique across businesses.
* Zero to three programs and zero to five application questions are supported.
* Program name is required. Its audience, promise, description, and display price are optional text.
* Application questions are optional. There is no required-question setting or conditional question logic.
* A visitor must provide a name and at least one direct contact method: phone or email.
* Only configured question identities and configured single-select options belong in the supported public experience, although submitted answers are not currently enforced against them.
* Repeated applications are allowed. No applicant identity or repeat-submission rule prevents duplicates.

## UX-relevant constraints

* This is a guided authoring capability with fixed sections and three fixed compositions, not a generic page builder.
* The hero image accepts a URL only. There is no upload, crop, asset library, or reliable remote-image validation.
* Programs are presentation content. Displayed price has no currency model, checkout, payment, or purchase behavior.
* A draft has no separate live version, private preview link, revision history, rollback, publishing schedule, or deletion action.
* Saving is whole-page replacement. There is no autosave, change conflict detection, or independent section persistence.
* Saving recreates every program. Historical prospects can therefore lose their selected-program link after any later page save.
* Application answers do not preserve their question wording. Editing, removing, or recreating questions can rename or orphan the labels shown for older prospects.
* Answer content and single-select membership are not validated against the saved question definitions. The product must constrain what it submits rather than presenting arbitrary answer keys or options as supported.
* An uncertain application retry can create a duplicate prospect because submission has no duplicate-request protection or person deduplication.
* A stale program choice silently becomes a general application. Success treatment must not falsely confirm that program.
* There is no automatic confirmation email, coach notification, response-time guarantee, or native WhatsApp conversation.

## Related capabilities

* Prospect management and enrollment owns the prospect created from an application, its review status, notes, and conversion to a client invitation.
* Client relationships owns the pending client relationship created only after a prospect is enrolled.
* Authentication and invitation acceptance owns the invited person's later email verification and membership entry.
* Training and nutrition plans are delivered coaching products and are unrelated to the landing-page program sales content.

## Unsupported assumptions

* A generic page builder, arbitrary sections, custom compositions, multiple pages, campaign variants, and page-specific themes or custom styles are unsupported.
* A/B testing, custom domains, editable search metadata, analytics, visitor attribution, and campaign tracking are unsupported.
* Testimonials, galleries, FAQs, videos, social-link collections, and uploaded public assets are not separate supported content types.
* Program-specific, conditional, required, scored, or file-upload application questions are unsupported.
* Checkout, payment, subscriptions, scheduling, calendar booking, and instant client enrollment are unsupported.
* Applicant login, application editing, withdrawal, and status tracking are unsupported.
* Confirmation email or message delivery, automated follow-up, spam protection, duplicate suppression, and a native WhatsApp inbox are unsupported.

## Verification evidence

* `backend/lib/easy/landing.ex`, `backend/lib/easy/landing/landing_page.ex`, and `backend/lib/easy/landing/landing_program.ex`: one-page ownership, content fields, limits, save replacement, publication, and application creation.
* `backend/lib/easy_web/controllers/coaches/landing_page_controller.ex`, `backend/lib/easy_web/controllers/public/landing_page_controller.ex`, and `backend/lib/easy_web/open_api/schemas/landing.ex`: coach authoring, public retrieval, application fields, and returned outcomes.
* `backend/priv/repo/migrations/20260703000500_create_landing_funnel.exs`: stored page, program, question, and prospect relationships.
* `frontend/apps/coachapp-v2/src/landing/landing-page-editor.tsx` and `frontend/apps/coachapp-v2/src/api/landing-page.ts`: supported authoring use and currently omitted program fields.
* `frontend/apps/website/app/[slug]/`, `frontend/apps/website/lib/api.ts`, and `frontend/apps/website/app/[slug]/landing-shared.tsx`: public rendering, caching, application submission, and WhatsApp handoff.
* `backend/test/easy_web/controllers/landing_funnel_test.exs`: source-backed page, publication, validation, tenant, application, and enrollment-funnel behavior.
