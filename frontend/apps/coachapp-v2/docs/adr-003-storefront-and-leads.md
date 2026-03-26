# ADR-003: Coach Storefront & Lead Generation

**Date:** 2026-03-26  
**Context:** Public storefront for coaches to showcase services and capture leads, replacing WhatsApp-based client acquisition

---

## Context

Indian coaches acquire clients primarily through WhatsApp and Instagram DMs. This is manual, unscalable, and means the coach has no professional online presence. The storefront feature gives each coach a public page where potential clients can view offers, see transformation results, and submit an intake form that creates a lead directly in the coach's dashboard.

The feature spans **two apps**:
1. **coachapp-v2** (React SPA) — Coach dashboard for managing profile, offers, testimonials, and incoming leads
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

Lead (created by public intake form)
├── name, email, phone, instagram_handle
├── intake_answers: Record<string, unknown>
├── status: new | contacted | converted | rejected
├── notes, source
├── offer?: OfferBrief (preloaded)
└── client?: ClientBrief (after conversion)
```

---

## Decision: Three Feature Modules + Public Page

The feature is split across three feature modules in coachapp-v2 and one route in the website app:

### 1. `storefront/` — Profile, Offers, Testimonials management

The storefront landing page (`storefront.tsx`) is a hub linking to three sub-sections: My Page, Offers, and Testimonials. The profile editor (`storefront-page.tsx`) is the most complex screen — it manages the store profile with slug checking, social links, theme color, publish toggle, intake question builder, and share panel with QR code.

Offers and testimonials follow standard CRUD patterns with infinite scroll lists, create/edit forms, and AlertDialog delete confirmations.

### 2. `leads/` — Lead inbox and management

Leads are a separate feature module (not inside storefront) because they are accessed from the sidebar independently. The lead list has status tab filters (All, New, Contacted, Converted, Rejected). The lead detail page shows contact info, intake answers, status management, notes (RHF + zod), WhatsApp link, convert-to-client, reject, and delete.

### 3. Public Storefront (website app) — `/coach/[slug]`

Server-rendered Next.js page with ISR (60s revalidation). Fetches the public storefront API (profile + offers + testimonials in one response). The page is split into server and client components:
- **Server:** `page.tsx` (data fetching, metadata), `hero-section.tsx` (static profile display)
- **Client:** `storefront-client.tsx` (wrapper for interactivity), `offers-section.tsx` (offer selection → scroll to form), `results-section.tsx` (testimonial display), `intake-form.tsx` (form submission)

---

## Container Decisions

### Storefront (coachapp-v2)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Edit store profile (all fields) | Yes, many fields | **INLINE** (same page) | Single large form, not a separate page — profile is the page itself |
| Check slug availability | Yes, 1 field | **INLINE** | Debounced check as user types, status indicator inline |
| Add intake question | Yes, 2+ fields | **INLINE** | useFieldArray adds row within the form |
| Add select option to question | Yes, 1 field | **INLINE** | Input + Add button within the question row |
| Create/edit offer | Yes, 5+ fields | **NEW PAGE** | Multiple inputs including features list |
| Delete offer | No, confirmation | **DIALOG** | AlertDialog on edit page |
| Create/edit testimonial | Yes, 8+ fields | **NEW PAGE** | Many inputs including image URLs, weights |
| Delete testimonial | No, confirmation | **DIALOG** | AlertDialog on edit page |
| Copy share link | No, single tap | **INLINE** | Button copies to clipboard with toast |
| Download QR code | No, single tap | **INLINE** | Button triggers SVG download |

### Leads (coachapp-v2)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Filter leads by status | No, tab selection | **INLINE** | HeroUI Tabs compound component |
| Change lead status | No, selection | **INLINE** | HeroUI Select on detail page |
| Save notes | Yes, 1 field | **INLINE** | TextArea + Save button on detail page |
| Convert to client | No, single tap | **INLINE** | Button press with loading state |
| Reject lead | No, single tap | **INLINE** | Button press, updates status |
| Delete lead | No, confirmation | **DIALOG** | AlertDialog on detail page |
| WhatsApp lead | No, single tap | **INLINE** | External link opens wa.me |

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
| `storefront-page.tsx` | `/storefront/page` | Profile editor + share panel |
| `list-offers.tsx` | `/storefront/offers` | Infinite scroll offer list |
| `create-offer.tsx` | `/storefront/offers/create` | Create offer form |
| `edit-offer.tsx` | `/storefront/offers/:id/edit` | Edit offer + delete |
| `list-testimonials.tsx` | `/storefront/testimonials` | Infinite scroll testimonial list |
| `create-testimonial.tsx` | `/storefront/testimonials/create` | Create testimonial form |
| `edit-testimonial.tsx` | `/storefront/testimonials/:id/edit` | Edit testimonial + delete |

### Storefront Components (coachapp-v2)

| Component | Purpose | Used by |
| --- | --- | --- |
| `storefront-page-form.tsx` | Profile form (~600 lines): slug check, social links, theme picker, publish toggle, intake question builder with useFieldArray, select options editor | storefront-page screen |
| `offer-form.tsx` | Shared offer form (schema + hook + component). Features managed via useFieldArray with `{value: string}[]` shape. Exports `featuresToFormValues`/`formValuesToFeatures` converters. | create-offer, edit-offer |
| `offer-card.tsx` | List item card (name, price, type chip, featured badge) | list-offers |
| `testimonial-form.tsx` | Shared testimonial form (schema + hook). Handles before/after weight type coercion (string from API → number for form → number for API). | create-testimonial, edit-testimonial |
| `testimonial-card.tsx` | List item card (client name, photo thumbnail, rating stars, result tag, featured badge) | list-testimonials |
| `share-panel.tsx` | Share links (page URL + per-offer deep links) with copy buttons, QR code SVG with download. Uses `qrcode.react`. | storefront-page screen |

### Leads Screens (coachapp-v2)

| File | Route | Purpose |
| --- | --- | --- |
| `list-leads.tsx` | `/leads` | Infinite scroll + status tab filters |
| `lead-detail.tsx` | `/leads/:id` | Contact info, intake answers, status, notes, actions |

### Leads Components (coachapp-v2)

| Component | Purpose | Used by |
| --- | --- | --- |
| `lead-card.tsx` | List item card (name, offer, status chip, time ago, status dot) | list-leads |

### Public Storefront (website app)

| File | Path | Rendering | Purpose |
| --- | --- | --- | --- |
| `page.tsx` | `/coach/[slug]` | Server | Data fetching (ISR 60s), metadata generation, layout |
| `types.ts` | — | — | Public storefront TypeScript types (mirrors API) |
| `hero-section.tsx` | — | Server | Cover image, avatar, name, bio, social links |
| `storefront-client.tsx` | — | Client | Client wrapper for offers, results, intake form |
| `offers-section.tsx` | — | Client | Offer cards grid, CTA buttons scroll to intake form |
| `results-section.tsx` | — | Client | Three display modes: spotlight, photo grid, text quotes |
| `intake-form.tsx` | — | Client | Form with dynamic intake questions, offer pre-selection |

---

## Data Flow

### Coach Dashboard (coachapp-v2)

```
storefront-page.tsx
  ├── useGetStoreProfileQuery()            → profile data (or null for first-time)
  ├── useListOffersQuery()                 → offers for share panel deep links
  │
  ├── StorefrontPageForm
  │   ├── useUpsertStoreProfileMutation    → create or update profile
  │   └── useCheckSlugAvailabilityMutation → debounced slug check
  │
  └── SharePanel
      └── (read-only — generates URLs from slug + offers)

list-offers.tsx / list-testimonials.tsx
  └── useOffersInfiniteQuery / useTestimonialsInfiniteQuery → paginated lists

create-offer.tsx / edit-offer.tsx
  ├── useCreateOfferMutation / useUpdateOfferMutation
  └── useDeleteOfferMutation (edit only)

create-testimonial.tsx / edit-testimonial.tsx
  ├── useCreateTestimonialMutation / useUpdateTestimonialMutation
  └── useDeleteTestimonialMutation (edit only)

list-leads.tsx
  └── useLeadsInfiniteQuery({status?})     → filtered paginated leads

lead-detail.tsx
  ├── useGetLeadQuery(id)                  → lead with offer + client preloads
  ├── useUpdateLeadMutation                → status change, save notes
  ├── useConvertLeadMutation               → convert to client (invalidates Client tags)
  └── useDeleteLeadMutation                → delete lead
```

### Public Storefront (website)

```
page.tsx (Server Component)
  └── fetch(`/v1/public/coaches/${slug}/profile`) → { profile, offers, testimonials }
      └── ISR: revalidate every 60 seconds

storefront-client.tsx (Client Component)
  ├── OffersSection
  │   └── onSelectOffer → smooth scroll to IntakeForm + set offer_id
  │
  ├── ResultsSection
  │   └── (read-only — categorizes testimonials into spotlight/grid/quotes)
  │
  └── IntakeForm
      └── fetch(`/v1/public/coaches/${slug}/leads`, POST) → create lead
```

---

## Key Design Decisions

### 1. Store profile is upsert, not create+update

`PATCH /v1/coach/storefront/profile` creates the profile if it doesn't exist, or updates it. The frontend doesn't distinguish between first-time setup and editing. `useGetStoreProfileQuery` returns `{ data: null }` for new coaches, and the form initializes with defaults.

### 2. Slug availability check with debounce

The slug field in `storefront-page-form.tsx` runs a debounced availability check (300ms) as the user types. Three states: checking (spinner), available (green check), taken (red X). The check is skipped if the slug matches the current profile's slug (no false "taken" on self).

### 3. Intake questions use useFieldArray, not separate CRUD

Intake questions are an inline JSON array on the StoreProfile, not separate entities. The form uses `useFieldArray` for the questions list and a nested `useFieldArray` for select options. This avoids the complexity of individual question CRUD endpoints.

### 4. Select options editor with @ts-expect-error

The `SelectOptionsEditor` component uses `useFieldArray` on a nested string array path (`intake_questions.${index}.options`). TypeScript's typing for nested `useFieldArray` paths doesn't support `string[]` arrays well, requiring `@ts-expect-error` annotations. This is a known react-hook-form limitation.

### 5. Offer features use {value: string}[] wrapper

`useFieldArray` requires objects (not plain strings). Offer features are stored as `string[]` in the API but represented as `{value: string}[]` in the form. `featuresToFormValues` and `formValuesToFeatures` converters bridge the two shapes.

### 6. Testimonial weight type coercion

The API returns `before_weight`/`after_weight` as strings on the Testimonial response but expects numbers on create/update requests. The form schema uses `z.union([z.number(), z.literal('')])` and the submit handler explicitly checks `typeof value === 'number' && !isNaN(value)` before including in the request.

### 7. Share panel with per-offer deep links

The share panel generates a base page URL (`coacheasy.app/coach/{slug}`) and per-offer deep links (`?offer={offer_slug}`). The public page reads the `offer` query param and pre-selects that offer in the intake form. Each link has a copy-to-clipboard button with visual feedback (icon changes to checkmark for 2s).

### 8. QR code via qrcode.react

The share panel renders a QR code SVG using `qrcode.react`. The download button serializes the SVG to a Blob and triggers a download. No server-side QR generation needed.

### 9. Public storefront uses ISR, not client-side fetch

The website's `/coach/[slug]/page.tsx` is a Next.js Server Component that fetches at build/request time with `{ next: { revalidate: 60 } }`. This gives SEO-friendly server rendering with 60-second staleness. The hero section is fully server-rendered; interactive parts (offer selection, form submission) are client components.

### 10. Results section categorizes testimonials into three display modes

`results-section.tsx` automatically categorizes testimonials:
- **Spotlight**: featured + has before/after images → large comparison layout
- **Photo grid**: non-featured + has before/after images → compact grid cards
- **Text quotes**: no images, has quote → simple quote cards with rating stars

The section title adapts: "Results" if photos exist, "What Clients Say" if only text quotes.

### 11. Intake form with dynamic custom questions

`intake-form.tsx` renders the standard fields (name, email, phone, instagram) plus dynamic custom questions from `profile.intake_questions`. Select-type questions render as native `<select>` elements. The offer can be pre-selected via the `offer` query param or by clicking an offer's CTA button (which scrolls to the form).

### 12. Lead conversion invalidates Client cache

`convertLead` mutation invalidates both `Lead` and `Client` cache tags. This ensures the client list updates immediately when a lead is converted, without requiring manual navigation or refresh.

### 13. Lead notes use react-hook-form + zod

The notes field on the lead detail page uses a dedicated `notesForm` instance with `useForm` + `zodResolver`. This follows the AGENTS.md rule that every form must use RHF + zod, even for a single field. The form uses `values: { notes: lead.notes ?? '' }` to sync with server state.

### 14. Sidebar structure: Storefront group + Leads item with badge

The sidebar (`app-shell.tsx`) has a "Storefront" collapsible group containing "My Page", "Offers", and "Testimonials" sub-items. "Leads" is a separate top-level sidebar item with a count badge showing the number of new leads, fetched via `useLeadsInfiniteQuery({ status: 'new' })`.

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
| `GET /v1/coach/leads/:id` | `useGetLeadQuery` | Fetch lead with preloads |
| `GET /v1/coach/leads` (infinite) | `useLeadsInfiniteQuery` | Paginated lead list |
| `PATCH /v1/coach/leads/:id` | `useUpdateLeadMutation` | Update status/notes |
| `DELETE /v1/coach/leads/:id` | `useDeleteLeadMutation` | Delete lead |
| `POST /v1/coach/leads/:id/convert` | `useConvertLeadMutation` | Convert lead to client |

### Public Storefront (website — direct fetch, not RTK Query)

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/public/coaches/:slug/profile` | Fetch profile + offers + testimonials |
| `POST /v1/public/coaches/:slug/leads` | Submit intake form |

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
