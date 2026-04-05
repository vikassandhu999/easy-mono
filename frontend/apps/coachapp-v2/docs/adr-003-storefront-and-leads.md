# ADR-003: Coach Storefront & Client Acquisition

**Date:** 2026-04-05  
**Status:** Hidden for MVP — sidebar nav and routes commented out in `app-shell.tsx` and `App.tsx`. All code, API endpoints, and the public website remain intact for v2 release.  
**Context:** Public storefront for coaches to showcase services and capture client inquiries, replacing WhatsApp-based client acquisition

---

## Context

Indian coaches acquire clients primarily through WhatsApp and Instagram DMs. This is manual, unscalable, and means the coach has no professional online presence. The storefront feature gives each coach a public page where potential clients can view offers, see transformation results, and submit an intake form that creates a pending client directly in the coach's dashboard.

The feature spans **two apps**:
1. **coachapp-v2** (React SPA) — Coach dashboard for managing profile, offers, and testimonials
2. **website** (Next.js) — Server-rendered public storefront at `/coach/{slug}` with ISR

### Data Model

```
StoreProfile (1 per coach)
├── slug, display_name, bio, photo_url, cover_image_url
├── social_links: { instagram, youtube, whatsapp }
├── theme_color: orange | blue | green | purple
├── is_published: boolean
└── intake_questions[]               ← inline array, not separate entities
    ├── label, type: text | number | select
    ├── required: boolean
    └── options?: string[]            ← only for select type

Offer (many per coach)
├── name, slug, description, type, duration_text
├── price, currency, price_display, features[]
├── is_featured, status, position, cta_text
└── (no nested entities)

Testimonial (many per coach)
├── client_name, client_handle, quote, rating
├── result_tag, program_name, duration_text
├── before_image_url, after_image_url, before_weight, after_weight
├── is_featured, status, position
└── (no nested entities)

Client (created by public intake form with status: pending)
├── See ADR-004 for full Client type
├── intake_answers: Record<string, unknown>
├── offer: ClientOffer | null (preloaded)
├── source: null | string
└── status: pending (auto-computed, see ADR-004)
```

---

## Decision: Storefront Module + Public Page

The feature is split across the storefront feature module in coachapp-v2 and one route in the website app:

### 1. `storefront/` — Visual Editor, Offers, Testimonials management

The storefront landing page (`storefront.tsx`) is a hub linking to three sub-sections: My Page, Offers, and Testimonials. The profile editor (`storefront-editor.tsx`) is a split-view visual editor:

- **Desktop (>=1024px):** 40/60 split with a scrollable accordion editor panel on the left and a live iframe preview of the public page on the right. The preview has a desktop/mobile device toggle (375px centered vs full width).
- **Mobile (<1024px):** Full-width accordion editor with a dedicated "Preview" button that opens a full-screen iframe overlay with a "Back to editor" button.

The editor panel uses collapsible accordion sections with status indicators (green = complete, yellow = partial, gray = optional). Only one section is open at a time. Sections: Hero, Trust Stats, Offers (read-only summary with link), Testimonials (read-only summary with link), FAQ, Intake Questions, Settings.

A single `react-hook-form` instance owns all form state in `storefront-editor.tsx`. Each section editor receives the form via props. Saving triggers `PATCH /v1/coach/storefront/profile` then reloads the preview iframe after 500ms.

Offers and testimonials follow standard CRUD patterns with infinite scroll lists, create/edit forms, and AlertDialog delete confirmations. They are NOT edited inline — the editor shows read-only summaries with links to their dedicated CRUD pages.

### 2. Leads eliminated — unified Client model

Leads were eliminated. The public intake form now creates a Client directly with `status: pending`. Coaches manage all people (applicants, active clients, past clients) in the unified client list. See ADR-004 for the full Client model and enriched client management.

### 3. Public Storefront (website app) — `/coach/[slug]`

Server-rendered Next.js page with ISR (60s revalidation). Fetches the public storefront API (profile + offers + testimonials in one response). Supports `?preview=true` query param which bypasses ISR cache (`revalidate: 0`) and passes the flag to the API for draft data rendering.

The page is split into server and client components:
- **Server:** `page.tsx` (data fetching, metadata, preview mode), `hero-section.tsx` (static profile display), `trust-bar.tsx` (stat value/label pairs)
- **Client:** `storefront-client.tsx` (wrapper), `offers-section.tsx` (offer selection → scroll), `results-section.tsx` (spotlight + grid + quotes), `faq-section.tsx` (accordion), `intake-form.tsx` (form), `sticky-cta.tsx` (mobile bottom bar), `whatsapp-fab.tsx` (floating button), `hero-cta-button.tsx` (scroll CTA)

Types are shared via `@easy/storefront-types` package — the local `types.ts` re-exports from the shared package.

---

## Container Decisions

### Storefront (coachapp-v2)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Edit store profile (split-view editor) | Yes, many fields | **NEW PAGE** | Full-screen split-view editor replaces PageLayout. Desktop: accordion left + iframe preview right. Mobile: accordion-only with preview button. |
| Preview storefront | No, view only | **INLINE** (desktop) / **Full-screen overlay** (mobile) | Desktop: always-visible iframe. Mobile: full-screen overlay triggered by Preview button. |
| Check slug availability | Yes, 1 field | **INLINE** | Debounced check on slug input onChange, status indicator inline |
| Add intake question | Yes, 2+ fields | **INLINE** | useFieldArray adds row within the accordion section |
| Add select option to question | Yes, 1 field | **INLINE** | Input + Add button within the question row |
| Create/edit offer | Yes, 5+ fields | **NEW PAGE** | Multiple inputs including features list |
| Delete offer | No, confirmation | **DIALOG** | AlertDialog on edit page |
| Create/edit testimonial | Yes, 8+ fields | **NEW PAGE** | Many inputs including image URLs, weights |
| Delete testimonial | No, confirmation | **DIALOG** | AlertDialog on edit page |
| Copy share link | No, single tap | **INLINE** | Button copies to clipboard with toast |
| Download QR code | No, single tap | **INLINE** | Button triggers SVG download |

### Public Storefront (website)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Select offer (scroll to form) | No, tap | **INLINE** | Smooth scroll to intake form section |
| Submit intake form | Yes, 4+ fields | **INLINE** | Form embedded in the page, no navigation |

---

## Component Architecture

### Storefront Screens (coachapp-v2)

| File | Route | Purpose |
| --- | --- | --- |
| `storefront.tsx` | `/storefront` | Hub page linking to My Page, Offers, Testimonials |
| `storefront-editor.tsx` | `/storefront/page` | Split-view visual editor (form + iframe preview) |
| `list-offers.tsx` | `/storefront/offers` | Infinite scroll offer list |
| `create-offer.tsx` | `/storefront/offers/create` | Create offer form |
| `edit-offer.tsx` | `/storefront/offers/:id/edit` | Edit offer + delete |
| `list-testimonials.tsx` | `/storefront/testimonials` | Infinite scroll testimonial list |
| `create-testimonial.tsx` | `/storefront/testimonials/create` | Create testimonial form |
| `edit-testimonial.tsx` | `/storefront/testimonials/:id/edit` | Edit testimonial + delete |

### Storefront Components (coachapp-v2)

| Component | Purpose | Used by |
| --- | --- | --- |
| `editor-panel.tsx` | Left panel: accordion container with 7 collapsible sections and status indicators (complete/partial/optional). One section open at a time. | storefront-editor |
| `preview-panel.tsx` | Right panel: iframe pointing to public page with desktop/mobile device toggle (375px vs full width). | storefront-editor |
| `hero-editor.tsx` | Hero section: photo/cover thumbnails, display name, headline, bio, social links. Contextual hints. | editor-panel |
| `trust-stats-editor.tsx` | Trust stats section: value/label rows via useFieldArray, max 4, suggested hints. | editor-panel |
| `faq-editor.tsx` | FAQ section: question/answer cards via useFieldArray, suggested questions. | editor-panel |
| `intake-questions-editor.tsx` | Intake questions section: dynamic question rows with type/required/options. Contains IntakeQuestionRow and SelectOptionsEditor sub-components. | editor-panel |
| `settings-editor.tsx` | Settings section: slug with debounced availability check, theme color picker, WhatsApp CTA toggle+message, publish toggle with status display. | editor-panel |
| `offers-summary.tsx` | Read-only summary of active offers with names, prices, featured badges, and link to /storefront/offers. | editor-panel |
| `testimonials-summary.tsx` | Read-only summary of active testimonials with featured/photo counts and link to /storefront/testimonials. | editor-panel |
| `offer-form.tsx` | Shared offer form (schema + hook + component). Features managed via useFieldArray with `{value: string}[]` shape. Exports `featuresToFormValues`/`formValuesToFeatures` converters. | create-offer, edit-offer |
| `offer-card.tsx` | List item card (name, price, type chip, featured badge) | list-offers |
| `testimonial-form.tsx` | Shared testimonial form (schema + hook). Handles before/after weight type coercion (string from API → number for form → number for API). | create-testimonial, edit-testimonial |
| `testimonial-card.tsx` | List item card (client name, photo thumbnail, rating stars, result tag, featured badge) | list-testimonials |

### Public Storefront (website app)

| File | Path | Rendering | Purpose |
| --- | --- | --- | --- |
| `page.tsx` | `/coach/[slug]` | Server | Data fetching (ISR 60s, 0 in preview), metadata, `--theme` CSS var, preview mode |
| `types.ts` | — | — | Re-exports from `@easy/storefront-types` shared package |
| `hero-section.tsx` | — | Server | Cover image, avatar, name, headline, bio, CTA buttons, social links |
| `hero-cta-button.tsx` | — | Client | Thin client component for "Get started" scroll button |
| `trust-bar.tsx` | — | Server | Horizontal stat value/label bar below hero |
| `storefront-client.tsx` | — | Client | Orchestrates section order, manages selectedOfferId state |
| `offers-section.tsx` | — | Client | Pricing cards, featured first sort, themed CTAs |
| `results-section.tsx` | — | Client | Exports `categorizeTestimonials`, `ResultsSpotlight`, `ResultsGrid` |
| `faq-section.tsx` | — | Client | Accordion with single-open pattern |
| `intake-form.tsx` | — | Client | Form with dynamic intake questions, offer pre-selection, success state |
| `sticky-cta.tsx` | — | Client | Mobile-only fixed bottom bar, hidden when hero/form visible |
| `whatsapp-fab.tsx` | — | Client | Floating WhatsApp button with delayed animation |

---

## Data Flow

### Coach Dashboard (coachapp-v2)

```
storefront-editor.tsx
  ├── useGetStoreProfileQuery()            → profile data (or null for first-time)
  ├── useListOffersQuery()                 → offers for summary display
  ├── useListTestimonialsQuery()           → testimonials for summary display
  ├── useForm<EditorFormValues>()          → single form instance for all sections
  ├── useUpsertStoreProfileMutation        → create or update profile on Save
  │
  ├── EditorPanel (receives form + offers + testimonials)
  │   ├── HeroEditor (form props)
  │   ├── TrustStatsEditor (form props + useFieldArray)
  │   ├── OffersSummary (read-only offers list)
  │   ├── TestimonialsSummary (read-only testimonials list)
  │   ├── FaqEditor (form props + useFieldArray)
  │   ├── IntakeQuestionsEditor (form props + useFieldArray)
  │   └── SettingsEditor (form props + useCheckSlugAvailabilityMutation)
  │
  └── PreviewPanel (iframe src = public page URL + ?preview=true)

list-offers.tsx / list-testimonials.tsx
  └── useOffersInfiniteQuery / useTestimonialsInfiniteQuery → paginated lists

create-offer.tsx / edit-offer.tsx
  ├── useCreateOfferMutation / useUpdateOfferMutation
  └── useDeleteOfferMutation (edit only)

create-testimonial.tsx / edit-testimonial.tsx
  ├── useCreateTestimonialMutation / useUpdateTestimonialMutation
  └── useDeleteTestimonialMutation (edit only)

```

### Public Storefront (website)

```
page.tsx (Server Component)
  └── fetch(`/v1/public/coaches/${slug}/profile?preview=true`) → { profile, offers, testimonials }
      └── ISR: revalidate 60s (normal) or 0 (preview mode)

storefront-client.tsx (Client Component)
  ├── ResultsSpotlight (featured transformations, if ≥3 total)
  ├── OffersSection
  │   └── onSelectOffer → smooth scroll to IntakeForm + set offer_id
  ├── ResultsGrid (photo grid + text quotes)
  ├── FaqSection (accordion, conditional on faq_items.length)
  ├── IntakeForm
  │   └── fetch(`/v1/public/coaches/${slug}/inquiries`, POST) → create pending client
  ├── StickyCta (mobile only, hidden when hero/form visible)
  └── WhatsAppFab (conditional on whatsapp_cta_enabled)
```

---

## Key Design Decisions

### 1. Store profile is upsert, not create+update

`PATCH /v1/coach/storefront/profile` creates the profile if it doesn't exist, or updates it. The frontend doesn't distinguish between first-time setup and editing. `useGetStoreProfileQuery` returns `{ data: null }` for new coaches, and the form initializes with defaults.

### 2. Slug availability check with debounce

The slug field in `settings-editor.tsx` runs a debounced availability check (300ms) via the input's `onChange` handler (not `useEffect`, which would violate React Compiler rules). Three states: checking (spinner), available (green check), taken (red X). The check is skipped if the slug matches the current profile's slug (no false "taken" on self).

### 3. Intake questions use useFieldArray, not separate CRUD

Intake questions are an inline JSON array on the StoreProfile, not separate entities. The `intake-questions-editor.tsx` section editor uses `useFieldArray` for the questions list and a nested `useFieldArray` for select options within each question. This avoids the complexity of individual question CRUD endpoints.

### 4. Select options editor with @ts-expect-error

The `SelectOptionsEditor` component (inside `intake-questions-editor.tsx`) uses `useFieldArray` on a nested string array path (`intake_questions.${index}.options`). TypeScript's typing for nested `useFieldArray` paths doesn't support `string[]` arrays well, requiring `@ts-expect-error` annotations. This is a known react-hook-form limitation.

### 5. Offer features use {value: string}[] wrapper

`useFieldArray` requires objects (not plain strings). Offer features are stored as `string[]` in the API but represented as `{value: string}[]` in the form. `featuresToFormValues` and `formValuesToFeatures` converters bridge the two shapes.

### 6. Testimonial weight type coercion

The API returns `before_weight`/`after_weight` as strings on the Testimonial response but expects numbers on create/update requests. The form schema uses `z.union([z.number(), z.literal('')])` and the submit handler explicitly checks `typeof value === 'number' && !isNaN(value)` before including in the request.

### 7. Split-view visual editor with iframe preview

The storefront editor uses a split-view layout (40% editor / 60% preview) on desktop. The preview is an iframe pointing to the actual public page URL with `?preview=true`. This guarantees visual accuracy — no rendering divergence between preview and production. The iframe reloads 500ms after save. On mobile, the preview is a full-screen overlay triggered by a dedicated button, since side-by-side doesn't fit at 375px.

### 8. Shared types package eliminates duplication

`@easy/storefront-types` is a shared workspace package containing all public storefront types (`PublicStoreProfile`, `PublicOffer`, `PublicTestimonial`, etc.). Both coachapp-v2 and the website app import from it. The website's `types.ts` re-exports from the shared package. The coachapp-v2 `storefront.ts` API file imports `IntakeQuestion`, `TrustStat`, `FaqItem`, and `StoreProfileThemeColor` from the shared package for use in the coach-private `StoreProfile` type.

### 9. Public storefront uses ISR with preview mode bypass

The website's `/coach/[slug]/page.tsx` is a Next.js Server Component that fetches at build/request time with `{ next: { revalidate: 60 } }`. When `?preview=true` is present, revalidation is set to 0 (always fresh) and the flag is passed to the API so the backend can return draft/unpublished data. This enables the iframe preview in the editor to show the latest saved state without waiting for ISR.

### 10. Results section categorizes testimonials into three display modes

`results-section.tsx` automatically categorizes testimonials:
- **Spotlight**: featured + has before/after images → large comparison layout
- **Photo grid**: non-featured + has before/after images → compact grid cards
- **Text quotes**: no images, has quote → simple quote cards with rating stars

The section title adapts: "Results" if photos exist, "What Clients Say" if only text quotes.

### 11. Intake form with dynamic custom questions

`intake-form.tsx` renders the standard fields (name, email, phone, instagram) plus dynamic custom questions from `profile.intake_questions`. Select-type questions render as native `<select>` elements. The offer can be pre-selected via the `offer` query param or by clicking an offer's CTA button (which scrolls to the form).

### 12. Sidebar structure: Storefront group + Clients with pending badge

The sidebar (`app-shell.tsx`) defines a "Storefront" collapsible group containing "My Page", "Offers", and "Testimonials" sub-items. **For MVP, this group is commented out** — the storefront feature module, API endpoints, and public website pages remain intact but are not navigable from the coach app UI. The "Clients" item has a `PendingClientBadge` showing the count of pending clients (storefront applications) from `ClientSummary`, fetched via `useListClientsQuery({ status: 'pending', limit: 0 })`. The badge is hidden when count is 0.

---

## API Endpoints Used

### Coach Dashboard (coachapp-v2)

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `GET /v1/coach/storefront/profile` | `useGetStoreProfileQuery` | Fetch store profile (null if none) |
| `PATCH /v1/coach/storefront/profile` | `useUpsertStoreProfileMutation` | Create or update profile |
| `POST /v1/coach/storefront/check-slug` | `useCheckSlugAvailabilityMutation` | Check slug availability |
| `POST /v1/coach/offers` | `useCreateOfferMutation` | Create offer |
| `GET /v1/coach/offers/:id` | `useGetOfferQuery` | Fetch single offer |
| `GET /v1/coach/offers` (list) | `useListOffersQuery` | List offers (share panel) |
| `GET /v1/coach/offers` (infinite) | `useOffersInfiniteQuery` | Paginated offer list |
| `PATCH /v1/coach/offers/:id` | `useUpdateOfferMutation` | Update offer |
| `DELETE /v1/coach/offers/:id` | `useDeleteOfferMutation` | Delete offer |
| `POST /v1/coach/testimonials` | `useCreateTestimonialMutation` | Create testimonial |
| `GET /v1/coach/testimonials/:id` | `useGetTestimonialQuery` | Fetch single testimonial |
| `GET /v1/coach/testimonials` (infinite) | `useTestimonialsInfiniteQuery` | Paginated testimonial list |
| `PATCH /v1/coach/testimonials/:id` | `useUpdateTestimonialMutation` | Update testimonial |
| `DELETE /v1/coach/testimonials/:id` | `useDeleteTestimonialMutation` | Delete testimonial |

### Public Storefront (website — direct fetch, not RTK Query)

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/public/coaches/:slug/profile` | Fetch profile + offers + testimonials |
| `POST /v1/public/coaches/:slug/inquiries` | Submit intake form (creates pending Client) |

---

## What's Not Built Yet

- **Offer reordering** — `position` field exists, drag-and-drop UI deferred
- **Testimonial reordering** — `position` field exists, drag-and-drop UI deferred
- **Offer status management** — `status` field exists (active/archived) on Offer, no UI to archive/activate from the list
- **Testimonial status management** — same as offers, `status` field not exposed in list
- **Payment integration** — `price`/`currency` fields exist on Offer, no payment flow
- **Custom domains** — public page is at `coacheasy.app/coach/{slug}`, no custom domain support
- **Analytics** — no page view or conversion tracking
- **Image upload** — photo/cover/testimonial images are URL-only, no upload UI or CDN integration
- **Rich text bio** — bio is plain text, no markdown/HTML editor
- **Share panel / QR code** — removed in visual editor v2, may be re-added as a section
- **Preview authentication** — `?preview=true` currently relies on the backend accepting the flag; no session token verification in the iframe URL yet
- **Live-as-you-type preview** — current preview updates on save (Option A). Option B (shared component rendering for instant preview) is deferred
- **Client deletion** — no delete endpoint or UI for removing clients
