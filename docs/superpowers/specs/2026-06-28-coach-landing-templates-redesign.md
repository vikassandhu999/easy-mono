# Coach Landing Page Templates — Redesign

Date: 2026-06-28

## Goal

Redesign the three public coach landing page templates (`proof_first`, `problem_fit`, `coach_story`) rendered by `frontend/apps/website/app/[slug]/landing-client.tsx` to be production-quality. The current implementation looks generic, feels too short, and uses a fragmented multi-hue color scheme that doesn't hold together.

## Visual references

HTML mockups committed to `docs/superpowers/specs/assets/coach-landing-funnel/`:
- `03-proof-first-draft.html` — Proof First template
- `04-coach-story-draft.html` — Coach Story template
- `05-problem-fit-draft.html` — Problem Fit template

Research sources: jeffnippard.com (athletic/bold), strengthandmindset.com (warm/personal).

## What changes

### Problems with current design

| Problem | Current | Fix |
|---|---|---|
| Too short | `py-8` (~32px) section padding | 96–120px per section |
| No trust before ask | No social proof between hero and content | Testimonial strip + stats bar immediately below hero |
| Fragmented brand | green/coral/blue per section type | Single accent color per template |
| Generic sections | All three templates identical except section order | Each template has distinct layout, typography, section stack |
| Raw apply form | Unstyled `<input>` elements | Polished dark/light form card with trust note |
| No typography hierarchy | Flat font sizes | Condensed uppercase for bold templates, humanist for warm |

### Shared patterns (all three templates)

1. **Sticky nav** — business name left, accent CTA right
2. **Testimonial strip** — immediately below hero, before any product section
3. **Single accent color** — no section-specific hues; one brand color throughout
4. **Apply form** — always last; styled card, trust note, no payment messaging
5. **Sticky bottom bar** (mobile) — "Apply Now" CTA, dismisses when apply form is visible
6. **Section padding** — `py-24` equivalent (96px) minimum; major sections at 120px
7. **Announcement bar** (optional) — soft conversion nudge at very top

### Per-template design

#### `proof_first`
- **Personality**: Athletic, authoritative, Nippard-style
- **Background rhythm**: Dark hero → green stats bar → cream proof → dark testimonials → white programs → cream bio → cream apply
- **Typography**: Roboto Condensed 900, uppercase headings
- **Accent**: Forest green `#2d5a3d`
- **Hero**: Near-full-viewport dark gradient, large uppercase H1 (bottom-left), single CTA
- **Sections**: Hero → pull-quote strip → stats bar → proof-point cards → testimonial grid (dark) → programs → coach bio → apply

#### `coach_story`
- **Personality**: Warm, personal, Strength-and-Mindset-style
- **Background rhythm**: Parchment hero → dark proof strip → parchment story → dark method → parchment testimonials → dark programs → parchment apply
- **Typography**: Roboto 700, mixed-case, italic emphasis
- **Accent**: Olive `#7c845d`
- **Hero**: Split grid (coach photo left, headline right) on warm parchment `#f1eeea`
- **Wave dividers**: SVG concave/convex curves between parchment ↔ dark sections
- **Sections**: Announcement bar → split hero → dark proof strip (stars + count) → parchment story + credentials → dark method pillars → parchment testimonials → dark programs → parchment apply

#### `problem_fit`
- **Personality**: Sharp, targeted, direct
- **Background rhythm**: White hero → dark stats strip → light-grey fit section → white testimonials → dark how-it-works → light-grey programs → dark apply
- **Typography**: Roboto Condensed 900, uppercase headings
- **Accent**: Rust `#c84b31`
- **Hero**: Split grid (text left, accent-bg image right), tag chip, rust headline accent word
- **Sections**: Hero → dark stats strip → fit checklist (bordered items, accent left border) → testimonials → dark step-by-step process → programs → dark apply

## Data model compatibility

No backend changes. All sections map to existing `LandingPage` fields:
- `headline`, `subheadline`, `eyebrow` → hero
- `hero_image_url` → hero photo (falls back to gradient placeholder)
- `proof_points` → stats bar + proof cards (value + label)
- `fit_points` → fit checklist items
- `coach_intro` → coach bio / story section
- `programs` → program cards
- `application_questions` → apply form custom questions
- `business_name` → nav logo
- `slug` → used by submit function (no change)

## Fonts

Add to `frontend/apps/website/app/layout.tsx` (or inline in the component via `<link>`):
- `Roboto Condensed` — weights 700, 900 (for proof-first and problem-fit bold headings)
- `Roboto` — weights 300, 400, 500, 700, italic 400 (body + coach-story headings)

Already used in the mock — confirmed available on Google Fonts.

## Scope

**In scope:**
- Full rewrite of `frontend/apps/website/app/[slug]/landing-client.tsx`
- Add Google Fonts link (either in layout or inline)

**Out of scope:**
- Backend changes
- Landing page editor (`coachapp-v2`) changes
- Any new data fields
- The `page.tsx` server component (no changes needed)

## Success criteria

- Each template feels visually distinct at a glance
- Pages feel "full" — no section looks thin or cramped
- Apply form looks trustworthy
- Single accent color throughout each template
- Mobile layout works without HeroUI
- Existing data fields map cleanly — no placeholder sections with empty state
