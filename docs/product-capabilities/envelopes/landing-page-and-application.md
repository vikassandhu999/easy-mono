# Design Envelope: Landing page and application

Derived from: [Landing page authoring and applications](../landing-page-authoring-and-applications.md)

## Supported outcome

A coaching business can shape and publish one guided public page where a visitor understands the offer, chooses an optional program, and submits an application that is safely saved before any follow-up handoff.

## Available information

* The business has no page yet or one draft or published page.
* Public identity: a unique 3–60 character lowercase slug using letters, numbers, and hyphens.
* Three composition choices: Proof first, Problem fit, and Coach story.
* Page copy: eyebrow, required headline, subheadline, coach introduction, hero-image URL, ordered proof points, and ordered fit statements.
* Up to three ordered programs with name and optional audience, promise, description, and display price.
* Up to five ordered application questions using short text, long text, or single select with configured choices. Supported authoring gives each question a unique identity for answer association, although that identity is not enforced.
* Business name and an optional WhatsApp number supplied by the business profile.
* Application details: name, optional phone, email, and Instagram, optional program choice, and optional answers to configured questions.

## Supported actions

* A coach can create or revise the one business page, choose its composition, arrange repeatable items, and save it as draft or published.
* A published page can be visited anonymously at its public address.
* A visitor can choose a program or a general application and answer the configured questions.
* A visitor can submit with a name and at least one of phone or email.
* After the application is saved, the visitor can optionally open a prefilled message to the business's WhatsApp number.
* A coach can return a published page to draft, which removes public access.

## Lifecycle

* Before the first save, there is no page. The first save creates it; later saves replace its authored content while keeping the page identity.
* Draft and published content are the same page. Publishing exposes the saved version, and returning to draft removes it from public access.
* Changing the slug moves the public address without forwarding the old address.
* Saving replaces all program identities. Earlier prospects may therefore lose their selected-program association.
* A successful public submission directly creates a new prospect. WhatsApp follow-up happens only afterward and is optional.
* Public visitors may briefly continue to see cached content after a published-page change.

## Conditions

* One landing page is available per business.
* Slug, composition, headline, and draft or published status are required.
* Zero to three programs and zero to five questions are supported.
* Program name is required; its other fields are optional presentation text.
* Application questions are optional. They cannot be marked required or made conditional.
* Application name and at least one direct contact method are required.
* Single-select answers should come only from the configured choices, and answers should belong only to configured question identities.
* Repeated applications by the same person are allowed.

## UX-relevant constraints

* Keep authoring guided by fixed sections and the three supported compositions. Arbitrary sections, free-form composition, and reusable page blocks are unavailable.
* The hero image is an external URL. Upload, crop, media selection, and dependable remote-image checks are unavailable.
* A displayed program price is sales copy, not a charge. Do not imply currency rules, checkout, or purchase.
* Draft content has no separate live copy, private preview address, revisions, rollback, schedule, or delete action.
* Saving replaces the whole page. There is no autosave or conflict warning when two coaches edit at once.
* Program identities change on every save. Historical interest must tolerate a missing program rather than treating it as durable reporting data.
* Question wording is not captured with an application. Later question edits can change or remove the labels available for older answers.
* Submission rules do not reject arbitrary answer identities or choices. The designed experience must keep answers within the configured questions and choices.
* An uncertain retry can create another prospect. Refresh or confirm success before encouraging repeat submission.
* A stale program choice becomes a general application. Success must not claim that an unavailable program was selected.
* WhatsApp is an optional external handoff after success. It is not automatic outreach, confirmation delivery, or a conversation inside the product.
* Empty authoring, draft, published, invalid slug, duplicate slug, save failure, unavailable public page, invalid contact details, submission failure, and submitted success need intentional states.

## Related capabilities

* Prospect management and enrollment owns the saved prospect, review work, and client conversion after application.
* Client relationships begins only after a coach enrolls the prospect.
* Authentication and invitation acceptance owns the invited client's later verification and entry.
* Training and nutrition plans are not landing-page programs and must not be presented as if they were the same object.

## Unsupported assumptions

* Generic page building, multiple pages, campaign variants, custom compositions, custom domains, and page-specific themes are unsupported.
* A/B tests, editable search metadata, analytics, attribution, and campaign tracking are unavailable.
* Uploaded public assets, galleries, videos, FAQ records, testimonials, and social-link collections are not supported content types.
* Required, conditional, scored, file-upload, or program-specific questions are unsupported.
* Checkout, payment, subscription purchase, scheduling, calendar booking, and instant enrollment are unsupported.
* Applicant accounts, application editing, withdrawal, progress tracking, confirmation delivery, automated follow-up, and duplicate prevention are unsupported.

## Example content

* "Strong Days Coaching" chooses the Problem fit composition, writes a headline and coach introduction, adds three proof points, and saves the page as draft.
* The coach adds "12-week strength coaching" for busy professionals with a displayed price of "From ₹8,000/month." The price is explanatory copy and cannot be purchased from the page.
* A visitor chooses the program, supplies a name and phone number, answers one single-select question, and submits. The prospect is saved before the optional WhatsApp action appears.
* A visitor supplies an email but no phone number. The application is valid, and the optional WhatsApp action is still available when the business has a WhatsApp number.
* The business changes its public slug. The old address stops working; no forwarding behavior is promised.
* A coach saves the page after prospects already selected a program. Older prospects remain valid even if that program association is now absent.
