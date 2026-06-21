# Coach landing funnel design

Date: 2026-06-21

## Goal

CoachEasy should help coaches turn internet traffic into enrolled clients. The product is a coach landing funnel, not a storefront, website builder, or catalog.

Coaches often ask for "a website" when they mean: "I have an audience or I run ads. How do I bring interested people closer to enrollment?" V1 answers that with one public landing page, a good application flow, and a prospect review path inside the coach app.

## Product shape

V1 exposes one published landing page per business. The data model should still allow many landing pages per business so later work can support campaign-specific pages without renaming the main object. The backend should enforce at most one published page per business.

The page can show multiple Programs. A Program is sales positioning only. It describes who the coach helps, what the visitor can apply for, and why it may fit them. It does not link to training plan templates, nutrition plan templates, courses, or delivery content.

V1 supports up to three Programs on the page. A visitor can apply generally or apply for one Program. The selected Program is stored on the Prospect.

V1 uses three fixed page templates:

* Proof-first, for coaches with strong results or testimonials.
* Problem-fit, for coaches selling to a specific goal or audience.
* Coach-story, for coaches whose trust comes from personality, audience, and relationship.

The coach edits the page through a guided form. There is no page builder, block editor, section drag/drop, or custom layout control in V1.

Visual references:

* `assets/coach-landing-funnel/01-template-and-section-board.html`
* `assets/coach-landing-funnel/02-mobile-template-board.html`

Mobile pages should show the hero CTA on load. A slim sticky apply bar can appear after the visitor scrolls, but it must not cover the form or stack with another bottom bar.

## Retired storefront scope

The existing storefront product direction is discarded.

Implementation should remove the retired storefront backend and frontend surface instead of extending it:

* storefront backend context, schemas, controllers, routes, tests, and OpenAPI schemas
* public website storefront route and components
* shared storefront types package
* coachapp docs or references that describe storefront as an active product
* Offers, Leads, StoreProfile, testimonials CRUD, and storefront inquiry flow as product concepts

The replacement language is LandingPage, Program, ApplicationQuestion, and Prospect.

## Out of scope

V1 does not include:

* AI draft generation
* source-link crawling for Instagram, websites, or profiles
* scheduling or calendar booking
* payment or enroll-now checkout
* analytics dashboards
* multiple published campaign pages
* program-specific forms
* form submission history tables
* native WhatsApp inbox features

## Coach setup flow

The Landing Page area in coachapp-v2 lets the coach:

* choose one of the three templates
* set slug, headline, subheadline, coach intro, and proof points
* add up to three Programs
* configure up to five application questions
* see whether business WhatsApp follow-up is available
* publish or unpublish the page

The first version can use a simple preview action that opens the public page. A split iframe editor is not required.

The WhatsApp setting belongs to the business profile, not the landing page. The landing page editor should explain that adding a business WhatsApp number enables the public post-submit WhatsApp follow-up.

## Application form

The public apply form has fixed contact fields:

* name
* phone
* email
* Instagram or profile link, optional

Name is required. The visitor must provide at least one of phone or email. Both fields remain visible because coaches vary in how they follow up.

The form also has editable fit questions. V1 starts with sensible defaults:

* main goal
* experience level
* biggest challenge
* timeline or urgency
* anything the coach should know

The coach can edit, add, or remove these questions, capped at five total. Question types stay small: short text, long text, and single select.

V1 stores answers directly on the Prospect. A later version can split submissions into a form_submissions table and support Program-specific questions.

## Public submission flow

The public page renders the selected template, page copy, Programs, proof points, and apply form.

When a visitor clicks a Program CTA, the page scrolls to the same apply form and preselects that Program.

On submit:

1. The API creates a Prospect with status `new`.
2. The success state renders from the created Prospect response.
3. If the business has a WhatsApp number, the success state shows a prominent "Send on WhatsApp" action.
4. The WhatsApp action opens a prefilled `wa.me` message.

The WhatsApp step is optional but strongly encouraged. CoachEasy saves the Prospect first, so the application exists even if the visitor does not send the WhatsApp message.

The prefilled WhatsApp message should include:

* visitor name
* selected Program, if present
* answer summary
* a stable prospect reference or coach-only link

If the business has no WhatsApp number, the success state only tells the visitor that the coach will review the application.

## Prospect flow

A Prospect is not a Client. It is a sales record created from a landing page application.

V1 statuses:

* `new`
* `reviewing`
* `won`
* `lost`

The coach app has a Prospects area with a list and detail page.

The list supports status filtering. The detail page shows contact fields, selected Program, answers, notes, source landing page, timestamps, and linked Client if enrolled.

Coach actions:

* mark reviewing
* mark lost
* enroll prospect

Enroll prospect opens an enrollment form prefilled from the Prospect. It should reuse the configurable parts of the current invite flow. Submitting creates a pending Client, sends the client invite, links `prospect.client_id`, and marks the Prospect as `won`.

If a Prospect is already enrolled, the enroll action should show the linked Client instead of creating another Client.

## Data model

Suggested tables:

`landing_pages`

* `id`
* `business_id`
* `slug`
* `template`
* `headline`
* `subheadline`
* `coach_intro`
* `proof_points`
* `application_questions`
* `status`
* timestamps

`landing_programs`

* `id`
* `landing_page_id`
* `name`
* `audience`
* `promise`
* `description`
* `price_display`
* `position`
* timestamps

`prospects`

* `id`
* `business_id`
* `landing_page_id`
* `landing_program_id`
* `client_id`
* contact fields
* `answers`
* `status`
* `notes`
* timestamps

Use tenant-scoped queries everywhere. Do not accept `business_id` from public or coach request bodies.

Backend validations should enforce:

* at most one published landing page per business
* at most three Programs per page in V1
* at most five application questions per page in V1
* valid templates: `proof_first`, `problem_fit`, `coach_story`

## API shape

Coach routes:

* `GET /v1/coach/landing-page`
* `PUT /v1/coach/landing-page`
* `GET /v1/coach/prospects`
* `GET /v1/coach/prospects/:id`
* `PATCH /v1/coach/prospects/:id`
* `POST /v1/coach/prospects/:id/enroll`

Public routes:

* `GET /v1/public/landing-pages/:slug`
* `POST /v1/public/landing-pages/:slug/applications`

The coach landing-page save can be an upsert that accepts page fields, Programs, and questions in one request. V1 does not need separate Program CRUD.

## Frontend scope

coachapp-v2:

* Landing Page setup/editor
* template picker
* guided form fields
* Programs editor capped at three
* application questions editor capped at five
* publish toggle
* Prospects list
* Prospect detail
* enroll prospect flow

website:

* public landing page renderer
* Program CTA behavior
* apply form
* success state
* optional WhatsApp follow-up CTA

No shared storefront package should remain. If shared types are needed, create a small landing/acquisition type package or use generated OpenAPI types, depending on the repo pattern chosen during implementation.

## Error handling

* Missing or unpublished page returns 404.
* Duplicate slug returns a validation error in the coach editor.
* Invalid application fields render inline public form errors.
* Submit failure keeps entered values and allows retry.
* Missing or invalid WhatsApp configuration hides the public WhatsApp CTA and shows a setup hint in the coach editor.
* Enrolling an already-enrolled Prospect returns or shows the linked Client.

## Verification

Backend tests should cover:

* public landing page read
* application creates a Prospect
* Program selection is stored on the Prospect
* tenant scoping for coach prospect reads
* enroll prospect creates a pending Client and links it
* duplicate enroll does not create another Client
* retired storefront routes are gone

Frontend checks should cover:

* coachapp-v2 build
* website build
* manual browser path: publish page, apply, see Prospect, enroll Prospect

The implementation should also search for retired storefront names and remove stale references.
