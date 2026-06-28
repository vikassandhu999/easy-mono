# Coach Landing Templates Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the public coach landing page renderer (`landing-client.tsx`) to produce three production-quality, visually distinct templates — proof_first, coach_story, problem_fit — matching the approved HTML mockups.

**Architecture:** Split the monolithic `landing-client.tsx` into five focused files: a tiny router, a shared-components file (form, sticky bar, success), and one file per template. All inline styles, same pattern as the existing code — no new dependencies, no HeroUI, no CSS modules.

**Tech Stack:** React 18, Next.js 14 App Router (`'use client'`), inline styles, Google Fonts (Roboto + Roboto Condensed via `globals.css` `@import`), existing `LandingPage` / `submitApplication` / `whatsappLink` from `@/lib/api`.

## Global Constraints

- No backend changes — all types come verbatim from `frontend/apps/website/lib/api.ts`
- No new npm dependencies — inline styles only, no CSS modules, no HeroUI
- `'use client'` directive on all component files (these are interactive client components)
- All new files live at `frontend/apps/website/app/[slug]/`
- Font import goes in `frontend/apps/website/app/globals.css` (single-line @import)
- Do NOT modify `frontend/apps/website/app/[slug]/page.tsx` — it already passes `page: LandingPage` to `LandingClient`
- Visual verification: run `cd frontend/apps/website && pnpm dev` and open the relevant mockup URL

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/globals.css` | Add Google Fonts @import |
| Create | `app/[slug]/landing-shared.tsx` | Nav, ApplyForm, StickyBar, Success, QuestionField, useApplyForm, useStickyBar |
| Create | `app/[slug]/template-proof-first.tsx` | ProofFirstTemplate — dark hero, green accent, condensed uppercase |
| Create | `app/[slug]/template-coach-story.tsx` | CoachStoryTemplate — warm parchment, olive accent, SVG waves |
| Create | `app/[slug]/template-problem-fit.tsx` | ProblemFitTemplate — white/dark alt, rust accent, fit checklist |
| Rewrite | `app/[slug]/landing-client.tsx` | Route to the correct template component (50 lines) |

---

### Task 1: Fonts + Shared Components

**Files:**
- Modify: `frontend/apps/website/app/globals.css`
- Create: `frontend/apps/website/app/[slug]/landing-shared.tsx`

**Interfaces:**
- Produces:
  - `Nav({ businessName, accentColor, onApply }: NavProps)` → `JSX.Element`
  - `useApplyForm(page, selectedProgramId)` → `{ values, answers, error, submitting, result, set, setAnswer, handleSubmit }`
  - `useStickyBar(applyRef)` → `boolean` (show)
  - `ApplyForm({ page, selectedProgramId, theme }: ApplyFormProps)` → `JSX.Element`
  - `StickyBar({ show, onApply, accentColor }: StickyBarProps)` → `JSX.Element | null`
  - `QuestionField({ question, value, onChange }: QuestionFieldProps)` → `JSX.Element | null`
  - `Success({ result, answers, page }: SuccessProps)` → `JSX.Element`

- [ ] **Step 1: Add Google Fonts to globals.css**

Replace the single line in `frontend/apps/website/app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700;900&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');
@import "tailwindcss";
```

- [ ] **Step 2: Create landing-shared.tsx**

Create `frontend/apps/website/app/[slug]/landing-shared.tsx`:

```tsx
'use client';

import {useEffect, useRef, useState} from 'react';

import {
  type ApplicationResult,
  COACHAPP_URL,
  type LandingPage,
  type Question,
  submitApplication,
  whatsappLink,
} from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApplyTheme {
  bg: string;
  cardBg: string;
  cardBorder: string;
  labelColor: string;
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;
  inputColor: string;
  inputPlaceholder: string;
  btnBg: string;
  btnHoverBg: string;
  headingColor: string;
  subColor: string;
  noteColor: string;
  sectionBg: string;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useApplyForm(page: LandingPage, selectedProgramId: string | null) {
  const [values, setValues] = useState({name: '', phone: '', email: '', instagram: ''});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApplicationResult | null>(null);

  const set = (patch: Partial<typeof values>) => setValues((v) => ({...v, ...patch}));
  const setAnswer = (qid: string, value: string) => setAnswers((a) => ({...a, [qid]: value}));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!values.phone.trim() && !values.email.trim()) {
      setError('Please provide a phone number or email.');
      return;
    }
    setSubmitting(true);
    const res = await submitApplication(page.slug, {
      name: values.name.trim(),
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      instagram: values.instagram.trim() || null,
      landing_program_id: selectedProgramId,
      answers,
    });
    setSubmitting(false);
    if (res.ok) setResult(res.data);
    else setError(res.message);
  };

  return {values, answers, error, submitting, result, set, setAnswer, handleSubmit};
}

export function useStickyBar(applyRef: React.RefObject<HTMLElement | null>) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const node = applyRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setShow(!entry!.isIntersecting), {threshold: 0.15});
    observer.observe(node);
    return () => observer.disconnect();
  }, [applyRef]);
  return show;
}

// ── QuestionField ──────────────────────────────────────────────────────────

interface QuestionFieldProps {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  inputStyle: React.CSSProperties;
}

export function QuestionField({question, value, onChange, inputStyle}: QuestionFieldProps) {
  const label = question.label ?? '';
  if (!label) return null;

  if (question.type === 'long_text') {
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <span style={{fontSize: 13, fontWeight: 500}}>{label}</span>
        <textarea
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer…"
          rows={3}
          style={{...inputStyle, resize: 'vertical', minHeight: 80}}
          value={value}
        />
      </div>
    );
  }
  if (question.type === 'single_select') {
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <span style={{fontSize: 13, fontWeight: 500}}>{label}</span>
        <select
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          value={value}
        >
          <option value="">Select…</option>
          {(question.options ?? []).map((opt) => (
            <option
              key={opt}
              value={opt}
            >
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
      <span style={{fontSize: 13, fontWeight: 500}}>{label}</span>
      <input
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer…"
        style={inputStyle}
        value={value}
      />
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────

interface NavProps {
  businessName: string;
  accentBg: string;
  navBg: string;
  navBorder?: string;
  logoColor: string;
  ctaColor: string;
  onApply: () => void;
}

export function Nav({businessName, accentBg, navBg, navBorder, logoColor, ctaColor, onApply}: NavProps) {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: navBg,
        borderBottom: navBorder ?? 'none',
        padding: '0 32px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: '0.04em', textTransform: 'uppercase', color: logoColor}}>
        {businessName}
      </span>
      <button
        onClick={onApply}
        style={{background: accentBg, color: ctaColor, fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 20px', border: 'none', cursor: 'pointer'}}
        type="button"
      >
        Apply Now
      </button>
    </nav>
  );
}

// ── ApplyForm ──────────────────────────────────────────────────────────────

interface ApplyFormProps {
  page: LandingPage;
  selectedProgramId: string | null;
  theme: ApplyTheme;
}

export function ApplyForm({page, selectedProgramId, theme}: ApplyFormProps) {
  const {values, answers, error, submitting, result, set, setAnswer, handleSubmit} = useApplyForm(page, selectedProgramId);
  const applyRef = useRef<HTMLElement>(null);

  const inputStyle: React.CSSProperties = {
    padding: '12px 14px',
    background: theme.inputBg,
    border: `1.5px solid ${theme.inputBorder}`,
    color: theme.inputColor,
    fontSize: 15,
    outline: 'none',
    fontFamily: 'Roboto, sans-serif',
    width: '100%',
  };

  const selectedProgram = page.programs.find((p) => p.id === selectedProgramId) ?? null;

  if (result) {
    return (
      <section
        ref={applyRef as React.RefObject<HTMLElement>}
        style={{background: theme.sectionBg, padding: '96px 32px'}}
      >
        <div style={{maxWidth: 560, margin: '0 auto'}}>
          <Success
            answers={answers}
            page={page}
            result={result}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={applyRef as React.RefObject<HTMLElement>}
      style={{background: theme.sectionBg, padding: '96px 32px'}}
    >
      <div style={{maxWidth: 560, margin: '0 auto'}}>
        <form
          onSubmit={handleSubmit}
          style={{display: 'flex', flexDirection: 'column', gap: 16}}
        >
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.labelColor}}>Full name</label>
              <input
                onChange={(e) => set({name: e.target.value})}
                placeholder="Your name"
                style={inputStyle}
                value={values.name}
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.labelColor}}>Phone</label>
              <input
                inputMode="tel"
                onChange={(e) => set({phone: e.target.value})}
                placeholder="+91 98765 43210"
                style={inputStyle}
                value={values.phone}
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.labelColor}}>Email</label>
              <input
                inputMode="email"
                onChange={(e) => set({email: e.target.value})}
                placeholder="you@email.com"
                style={inputStyle}
                value={values.email}
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.labelColor}}>Instagram (optional)</label>
              <input
                onChange={(e) => set({instagram: e.target.value})}
                placeholder="@yourhandle"
                style={inputStyle}
                value={values.instagram}
              />
            </div>
          </div>

          {page.application_questions.map((q) => (
            <QuestionField
              inputStyle={inputStyle}
              key={q.id ?? q.label}
              onChange={(v) => setAnswer(q.id ?? '', v)}
              question={q}
              value={answers[q.id ?? ''] ?? ''}
            />
          ))}

          {selectedProgram ? (
            <p style={{fontSize: 13, color: theme.subColor}}>
              Applying for: <strong>{selectedProgram.name}</strong>
            </p>
          ) : null}

          {error ? <p style={{fontSize: 14, color: '#ef4444'}}>{error}</p> : null}

          <button
            disabled={submitting}
            style={{padding: '17px 0', background: theme.btnBg, color: '#fff', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', opacity: submitting ? 0.6 : 1}}
            type="submit"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
          <p style={{fontSize: 12, textAlign: 'center', color: theme.noteColor}}>🔒 Your info stays private. No payment now.</p>
        </form>
      </div>
    </section>
  );
}

// ── Success ────────────────────────────────────────────────────────────────

interface SuccessProps {
  result: ApplicationResult;
  answers: Record<string, string>;
  page: LandingPage;
}

export function Success({result, answers, page}: SuccessProps) {
  const summary = page.application_questions
    .map((q) => {
      const a = answers[q.id ?? ''];
      return a ? `${q.label}: ${a}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const wa = result.whatsapp_number
    ? whatsappLink(result.whatsapp_number, {
        businessName: result.business_name,
        name: result.name,
        programName: result.program_name,
        summary,
        ref: result.id,
        coachLink: `${COACHAPP_URL}/prospects/${result.id}`,
      })
    : null;

  return (
    <div style={{background: '#f0faf4', border: '1px solid #a7d4b8', borderRadius: 12, padding: '32px 28px'}}>
      <h2 style={{fontSize: 22, fontWeight: 700, color: '#1a3a24', marginBottom: 8}}>Application received ✓</h2>
      <p style={{fontSize: 15, color: '#4a7a5a'}}>Your coach will review this and get back to you within 24 hours.</p>
      {wa ? (
        <div style={{marginTop: 24, background: '#fff', border: '1px solid #a7d4b8', borderRadius: 10, padding: '20px 20px'}}>
          <p style={{fontSize: 14, fontWeight: 600, marginBottom: 4}}>Recommended next step</p>
          <p style={{fontSize: 14, color: '#6b7280', marginBottom: 16}}>Send your summary on WhatsApp so the coach can reply faster.</p>
          <a
            href={wa}
            rel="noopener noreferrer"
            style={{display: 'inline-block', background: '#25D366', color: '#fff', padding: '11px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none'}}
            target="_blank"
          >
            Send on WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  );
}

// ── StickyBar ──────────────────────────────────────────────────────────────

interface StickyBarProps {
  show: boolean;
  onApply: () => void;
  accentBg: string;
  barBg: string;
  textColor: string;
}

export function StickyBar({show, onApply, accentBg, barBg, textColor}: StickyBarProps) {
  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        background: barBg,
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 40,
        boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{fontSize: 13, color: textColor}}>Ready to apply?</span>
      <button
        onClick={onApply}
        style={{background: accentBg, color: '#fff', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 22px', border: 'none', cursor: 'pointer', borderRadius: 8}}
        type="button"
      >
        Apply Now
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify globals.css looks right**

```bash
head -3 frontend/apps/website/app/globals.css
```
Expected: first line is the Google Fonts `@import url(...)`.

- [ ] **Step 4: Commit**

```bash
git add frontend/apps/website/app/globals.css frontend/apps/website/app/\[slug\]/landing-shared.tsx
git commit -m "feat(website): add shared landing components + Roboto fonts"
```

---

### Task 2: Proof First Template

**Files:**
- Create: `frontend/apps/website/app/[slug]/template-proof-first.tsx`

**Interfaces:**
- Consumes: `Nav`, `ApplyForm`, `StickyBar`, `useStickyBar` from `./landing-shared`
- Produces: `ProofFirstTemplate({ page }: { page: LandingPage })` → `JSX.Element`

Design: Dark hero → green stats bar → cream proof cards → dark testimonials → white programs → cream coach bio → cream apply form. Forest green `#2d5a3d` accent, Roboto Condensed 900 uppercase headings.

- [ ] **Step 1: Create template-proof-first.tsx**

```tsx
'use client';

import {useRef, useState} from 'react';

import type {LandingPage} from '@/lib/api';

import {ApplyForm, Nav, StickyBar, useStickyBar} from './landing-shared';

const G = {
  accent: '#2d5a3d',
  accentLight: '#3d7a52',
  charcoal: '#1e2420',
  cream: '#f7f6f3',
  ink: '#1a1a1a',
  muted: '#6b7280',
  border: '#e5e7eb',
  paper: '#ffffff',
  gold: '#f6a429',
};

const condensed = "'Roboto Condensed', sans-serif";

export function ProofFirstTemplate({page}: {page: LandingPage}) {
  const [selectedId, setSelectedId] = useState<string | null>(page.programs[0]?.id ?? null);
  const applyRef = useRef<HTMLElement>(null);
  const showSticky = useStickyBar(applyRef as React.RefObject<HTMLElement>);
  const scrollToApply = () => applyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

  return (
    <div style={{fontFamily: 'Roboto, sans-serif', background: G.paper, color: G.ink, fontSize: 18}}>
      <Nav
        accentBg={G.accent}
        businessName={page.business_name}
        ctaColor="#fff"
        logoColor="#fff"
        navBg={G.charcoal}
        onApply={scrollToApply}
      />

      {/* Hero */}
      <section
        style={{
          position: 'relative',
          minHeight: '90vh',
          background: `linear-gradient(160deg, #0e1a14 0%, #1a2d20 60%, #0a1209 100%)`,
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
        }}
      >
        {page.hero_image_url ? (
          <img
            alt={page.business_name}
            src={page.hero_image_url}
            style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4}}
          />
        ) : null}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,18,9,0.95) 40%, rgba(10,18,9,0.4) 100%)'}} />
        <div style={{position: 'relative', maxWidth: 580, padding: '100px 32px 80px'}}>
          {page.eyebrow ? (
            <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: G.accentLight, marginBottom: 20}}>
              {page.eyebrow}
            </p>
          ) : null}
          <h1 style={{fontFamily: condensed, fontWeight: 900, fontSize: 'clamp(3rem,6vw,5.5rem)', lineHeight: 0.95, textTransform: 'uppercase', color: '#fff', marginBottom: 28}}>
            {page.headline}
          </h1>
          {page.subheadline ? (
            <p style={{fontSize: 18, color: 'rgba(255,255,255,0.65)', maxWidth: 440, marginBottom: 40, lineHeight: 1.6}}>
              {page.subheadline}
            </p>
          ) : null}
          <div style={{display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center'}}>
            <button
              onClick={scrollToApply}
              style={{background: G.accent, color: '#fff', fontFamily: condensed, fontWeight: 700, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 36px', border: 'none', cursor: 'pointer'}}
              type="button"
            >
              Apply for Coaching
            </button>
            {page.programs.length > 0 ? (
              <a
                href="#programs"
                style={{background: 'transparent', color: 'rgba(255,255,255,0.7)', fontFamily: condensed, fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '15px 24px', border: '1px solid rgba(255,255,255,0.25)', textDecoration: 'none', display: 'inline-block'}}
              >
                See Programs
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* Testimonial pull-quote strip */}
      <div style={{background: G.charcoal, padding: '48px 32px', borderTop: '1px solid rgba(255,255,255,0.08)'}}>
        <div style={{maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 40}}>
          <p style={{fontSize: 19, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5}}>
            "The most structured, results-focused coaching I've found. Every week my plan improves based on real data."
          </p>
          <div style={{width: 1, height: 72, background: 'rgba(255,255,255,0.15)'}} />
          <div style={{textAlign: 'right'}}>
            <div style={{color: G.gold, fontSize: 18, marginBottom: 8}}>★★★★★</div>
            <div style={{fontFamily: condensed, fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff'}}>
              Verified Client
            </div>
            <div style={{fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4}}>
              4.9 avg · 140+ reviews
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {(page.proof_points ?? []).length > 0 ? (
        <div style={{background: G.accent, padding: '20px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 60, flexWrap: 'wrap'}}>
            {(page.proof_points ?? []).map((p) => (
              <div
                key={`${p.value}-${p.label}`}
                style={{display: 'flex', alignItems: 'center', gap: 12}}
              >
                <span style={{fontFamily: condensed, fontWeight: 900, fontSize: 28, color: '#fff', lineHeight: 1}}>{p.value}</span>
                <span style={{fontSize: 13, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: condensed, fontWeight: 700}}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Proof point cards */}
      {(page.proof_points ?? []).length > 0 ? (
        <section style={{background: G.cream, padding: '100px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: G.accent, marginBottom: 16}}>Results That Speak</p>
            <h2 style={{fontFamily: condensed, fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', textTransform: 'uppercase', color: G.ink, marginBottom: 60, lineHeight: 1.05}}>Numbers don't lie.</h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24}}>
              {(page.proof_points ?? []).map((p) => (
                <div
                  key={`card-${p.value}-${p.label}`}
                  style={{padding: '36px 28px', background: G.paper, border: `1px solid ${G.border}`}}
                >
                  <div style={{fontFamily: condensed, fontWeight: 900, fontSize: 52, lineHeight: 1, color: G.ink, marginBottom: 8}}>{p.value}</div>
                  <div style={{fontSize: 14, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: condensed, fontWeight: 700}}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Programs */}
      {page.programs.length > 0 ? (
        <section
          id="programs"
          style={{background: G.paper, padding: '100px 32px'}}
        >
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: G.accent, marginBottom: 16}}>Programs</p>
            <h2 style={{fontFamily: condensed, fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', textTransform: 'uppercase', color: G.ink, marginBottom: 16, lineHeight: 1.05}}>Find your fit.</h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginTop: 56}}>
              {page.programs.map((program) => {
                const active = program.id === selectedId;
                return (
                  <div
                    key={program.id}
                    style={{border: `2px solid ${active ? G.accent : G.border}`, padding: '28px', position: 'relative', cursor: 'pointer'}}
                  >
                    <div style={{fontFamily: condensed, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: G.ink, marginBottom: 10}}>{program.name}</div>
                    {program.audience ? <p style={{fontSize: 14, color: G.muted, lineHeight: 1.6, marginBottom: 20}}>{program.audience}</p> : null}
                    {program.price_display ? <div style={{fontFamily: condensed, fontWeight: 700, fontSize: 17, color: G.accent, marginBottom: 16}}>{program.price_display}</div> : null}
                    <button
                      onClick={() => { setSelectedId(program.id); scrollToApply(); }}
                      style={{display: 'block', width: '100%', padding: '12px 0', background: active ? G.ink : 'transparent', color: active ? '#fff' : G.ink, fontFamily: condensed, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', border: `2px solid ${G.ink}`, cursor: 'pointer'}}
                      type="button"
                    >
                      Apply
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Coach bio */}
      {page.coach_intro ? (
        <section style={{background: G.cream, padding: '100px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: G.accent, marginBottom: 16}}>Your Coach</p>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start'}}>
              <div>
                <div style={{fontFamily: condensed, fontWeight: 900, fontSize: 36, textTransform: 'uppercase', color: G.ink, marginBottom: 8}}>{page.business_name}</div>
                <p style={{fontSize: 16, color: G.muted, lineHeight: 1.75, whiteSpace: 'pre-line'}}>{page.coach_intro}</p>
              </div>
              {page.hero_image_url ? (
                <img
                  alt={page.business_name}
                  src={page.hero_image_url}
                  style={{width: '100%', aspectRatio: '4/5', objectFit: 'cover'}}
                />
              ) : (
                <div style={{aspectRatio: '4/5', background: `linear-gradient(145deg, ${G.cream} 0%, ${G.border} 100%)`}} />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Apply form */}
      <div ref={applyRef as React.RefObject<HTMLDivElement>}>
        <ApplyForm
          page={page}
          selectedProgramId={selectedId}
          theme={{
            bg: G.cream,
            cardBg: G.paper,
            cardBorder: G.border,
            labelColor: G.muted,
            inputBg: G.paper,
            inputBorder: G.border,
            inputFocusBorder: G.accent,
            inputColor: G.ink,
            inputPlaceholder: '#b0b7bf',
            btnBg: G.accent,
            btnHoverBg: G.accentLight,
            headingColor: G.ink,
            subColor: G.muted,
            noteColor: G.muted,
            sectionBg: G.cream,
          }}
        />
      </div>

      <footer style={{background: G.charcoal, padding: 32, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)'}}>
        Powered by CoachEasy · Privacy Policy
      </footer>

      <StickyBar
        accentBg={G.accent}
        barBg="rgba(30,36,32,0.97)"
        onApply={scrollToApply}
        show={showSticky}
        textColor="rgba(255,255,255,0.7)"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/apps/website/app/\[slug\]/template-proof-first.tsx
git commit -m "feat(website): add ProofFirst landing template"
```

---

### Task 3: Coach Story Template

**Files:**
- Create: `frontend/apps/website/app/[slug]/template-coach-story.tsx`

**Interfaces:**
- Consumes: `Nav`, `ApplyForm`, `StickyBar`, `useStickyBar` from `./landing-shared`
- Produces: `CoachStoryTemplate({ page }: { page: LandingPage })` → `JSX.Element`

Design: Warm parchment (#f1eeea) base, olive (#7c845d) accent, SVG wave section dividers between parchment ↔ dark (#111410) sections, mixed-case Roboto 700 headings.

- [ ] **Step 1: Create template-coach-story.tsx**

```tsx
'use client';

import {useRef, useState} from 'react';

import type {LandingPage} from '@/lib/api';

import {ApplyForm, Nav, StickyBar, useStickyBar} from './landing-shared';

const C = {
  parchment: '#f1eeea',
  parchmentDark: '#e8e4de',
  ink: '#252525',
  dark: '#111410',
  olive: '#7c845d',
  oliveDark: '#535445',
  muted: '#6b7260',
  border: 'rgba(37,37,37,0.12)',
  paper: '#ffffff',
  gold: '#f6a429',
};

// SVG wave divider — dark below, parchment above
function WaveDown() {
  return (
    <div style={{display: 'block', width: '100%', overflow: 'hidden', lineHeight: 0, marginTop: -2}}>
      <svg
        fill={C.dark}
        preserveAspectRatio="none"
        style={{display: 'block'}}
        viewBox="0 0 1440 60"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" />
      </svg>
    </div>
  );
}

// SVG wave divider — parchment below, dark above
function WaveUp() {
  return (
    <div style={{display: 'block', width: '100%', overflow: 'hidden', lineHeight: 0, marginBottom: -2, transform: 'rotate(180deg)'}}>
      <svg
        fill={C.dark}
        preserveAspectRatio="none"
        style={{display: 'block'}}
        viewBox="0 0 1440 60"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" />
      </svg>
    </div>
  );
}

export function CoachStoryTemplate({page}: {page: LandingPage}) {
  const [selectedId, setSelectedId] = useState<string | null>(page.programs[0]?.id ?? null);
  const applyRef = useRef<HTMLElement>(null);
  const showSticky = useStickyBar(applyRef as React.RefObject<HTMLElement>);
  const scrollToApply = () => applyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

  return (
    <div style={{fontFamily: 'Roboto, sans-serif', background: C.parchment, color: C.ink, fontSize: 18}}>
      <Nav
        accentBg={C.olive}
        businessName={page.business_name}
        ctaColor="#fff"
        logoColor={C.ink}
        navBg={C.parchment}
        navBorder={`1px solid ${C.border}`}
        onApply={scrollToApply}
      />

      {/* Hero — split: image left, text right */}
      <section style={{background: C.parchment, padding: '96px 32px'}}>
        <div style={{maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: page.hero_image_url ? '1fr 1fr' : '1fr', gap: 80, alignItems: 'center'}}>
          {page.hero_image_url ? (
            <img
              alt={page.business_name}
              src={page.hero_image_url}
              style={{width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 2}}
            />
          ) : null}
          <div>
            {page.eyebrow ? (
              <p style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.olive, marginBottom: 20}}>
                {page.eyebrow}
              </p>
            ) : null}
            <h1 style={{fontSize: 'clamp(2.2rem,3.5vw,3rem)', fontWeight: 700, lineHeight: 1.2, color: C.ink, marginBottom: 24}}>
              {page.headline}
            </h1>
            {page.subheadline ? (
              <p style={{fontSize: 17, color: C.muted, lineHeight: 1.7, marginBottom: 36}}>
                {page.subheadline}
              </p>
            ) : null}
            <button
              onClick={scrollToApply}
              style={{background: C.olive, color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '15px 32px', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-block'}}
              type="button"
            >
              Work with me
            </button>
          </div>
        </div>
      </section>

      {/* Social proof strip (dark) */}
      <WaveDown />
      <div style={{background: C.dark, padding: '48px 32px'}}>
        <div style={{maxWidth: 700, margin: '0 auto', textAlign: 'center'}}>
          <div style={{color: C.gold, fontSize: 22, marginBottom: 12}}>★★★★★</div>
          <p style={{fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)'}}>
            <span style={{color: '#fff'}}>Rated 5.0</span> · 140+ verified client reviews
          </p>
        </div>
      </div>

      {/* Coach story (parchment) */}
      <WaveUp />
      {page.coach_intro ? (
        <section style={{background: C.parchment, padding: '120px 32px'}}>
          <div style={{maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start'}}>
            <div>
              <p style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.olive, marginBottom: 16}}>My Story</p>
              <h2 style={{fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 700, lineHeight: 1.2, color: C.ink, marginBottom: 24}}>
                {page.business_name}
              </h2>
              <p style={{fontSize: 16, color: C.muted, lineHeight: 1.8, whiteSpace: 'pre-line'}}>{page.coach_intro}</p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
              {page.hero_image_url ? (
                <img
                  alt={page.business_name}
                  src={page.hero_image_url}
                  style={{width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 2}}
                />
              ) : (
                <div style={{aspectRatio: '1', background: C.parchmentDark, borderRadius: 2}} />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Method / approach (dark) */}
      <WaveDown />
      <section style={{background: C.dark, padding: '120px 32px'}}>
        <div style={{maxWidth: 900, margin: '0 auto'}}>
          <p style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.olive, marginBottom: 16}}>How I Coach</p>
          <h2 style={{fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 64}}>
            No templates. No guesswork. Just your plan.
          </h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 40}}>
            {[
              {num: '01', title: 'We start with your life', body: 'Before I write a single workout, I learn your schedule, stress, sleep, and what matters to you. Coaching has to fit your life, or it won\'t last.'},
              {num: '02', title: 'Weekly check-ins, real feedback', body: 'Every week we review progress together. What\'s working gets more. What isn\'t gets adjusted. No set-and-forget programs here.'},
              {num: '03', title: 'You learn as you go', body: 'By the end of our time together you understand your body. The goal is that you don\'t need me forever — just long enough to build the knowledge.'},
            ].map((p) => (
              <div key={p.num}>
                <div style={{fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 52, color: 'rgba(255,255,255,0.08)', lineHeight: 1, marginBottom: 16}}>{p.num}</div>
                <div style={{fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10}}>{p.title}</div>
                <p style={{fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7}}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fit points (parchment) */}
      {(page.fit_points ?? []).length > 0 ? (
        <>
          <WaveUp />
          <section style={{background: C.parchment, padding: '120px 32px'}}>
            <div style={{maxWidth: 900, margin: '0 auto'}}>
              <p style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.olive, marginBottom: 16}}>This is for you if…</p>
              <h2 style={{fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 700, color: C.ink, marginBottom: 56}}>Does this sound like you?</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                {(page.fit_points ?? []).map((point) => (
                  <div
                    key={point}
                    style={{background: C.paper, borderLeft: `3px solid ${C.olive}`, padding: '14px 20px', fontSize: 16, color: C.ink, lineHeight: 1.6, borderRadius: '0 4px 4px 0'}}
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <WaveDown />
        </>
      ) : null}

      {/* Programs (dark) */}
      {page.programs.length > 0 ? (
        <section
          id="programs"
          style={{background: (page.fit_points ?? []).length > 0 ? C.dark : undefined, padding: '120px 32px'}}
        >
          {(page.fit_points ?? []).length === 0 ? <WaveDown /> : null}
          <div style={{background: C.dark, margin: '-120px -32px', padding: '120px 32px'}}>
            <div style={{maxWidth: 900, margin: '0 auto'}}>
              <p style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.olive, marginBottom: 16}}>Programs</p>
              <h2 style={{fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: '#fff', marginBottom: 56}}>Where do you want to start?</h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20}}>
                {page.programs.map((program) => {
                  const active = program.id === selectedId;
                  return (
                    <div
                      key={program.id}
                      style={{background: 'rgba(255,255,255,0.04)', border: `1px solid ${active ? C.olive : 'rgba(255,255,255,0.1)'}`, padding: 28}}
                    >
                      <div style={{fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 10}}>{program.name}</div>
                      {program.audience ? <p style={{fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 24}}>{program.audience}</p> : null}
                      {program.price_display ? <div style={{fontSize: 16, fontWeight: 700, color: C.olive, marginBottom: 16}}>{program.price_display}</div> : null}
                      <button
                        onClick={() => { setSelectedId(program.id); scrollToApply(); }}
                        style={{width: '100%', padding: 12, background: active ? C.olive : 'transparent', color: '#fff', border: `1px solid ${active ? C.olive : 'rgba(255,255,255,0.2)'}`, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer'}}
                        type="button"
                      >
                        Apply
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Apply (parchment) */}
      <WaveUp />
      <div ref={applyRef as React.RefObject<HTMLDivElement>}>
        <ApplyForm
          page={page}
          selectedProgramId={selectedId}
          theme={{
            bg: C.parchment,
            cardBg: C.paper,
            cardBorder: C.border,
            labelColor: C.muted,
            inputBg: C.paper,
            inputBorder: 'rgba(37,37,37,0.15)',
            inputFocusBorder: C.olive,
            inputColor: C.ink,
            inputPlaceholder: '#bfbab3',
            btnBg: C.olive,
            btnHoverBg: C.oliveDark,
            headingColor: C.ink,
            subColor: C.muted,
            noteColor: C.muted,
            sectionBg: C.parchment,
          }}
        />
      </div>

      <footer style={{background: C.dark, padding: 32, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)'}}>
        Powered by CoachEasy · Privacy Policy
      </footer>

      <StickyBar
        accentBg={C.olive}
        barBg="rgba(17,20,16,0.97)"
        onApply={scrollToApply}
        show={showSticky}
        textColor="rgba(255,255,255,0.65)"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/apps/website/app/\[slug\]/template-coach-story.tsx
git commit -m "feat(website): add CoachStory landing template"
```

---

### Task 4: Problem Fit Template

**Files:**
- Create: `frontend/apps/website/app/[slug]/template-problem-fit.tsx`

**Interfaces:**
- Consumes: `Nav`, `ApplyForm`, `StickyBar`, `useStickyBar` from `./landing-shared`
- Produces: `ProblemFitTemplate({ page }: { page: LandingPage })` → `JSX.Element`

Design: White base, rust (#c84b31) accent, sharp Roboto Condensed 900 uppercase, alternating white/dark sections, fit checklist with rust left-border, numbered how-it-works steps.

- [ ] **Step 1: Create template-problem-fit.tsx**

```tsx
'use client';

import {useRef, useState} from 'react';

import type {LandingPage} from '@/lib/api';

import {ApplyForm, Nav, StickyBar, useStickyBar} from './landing-shared';

const R = {
  bg: '#ffffff',
  ink: '#1a1a1a',
  dark: '#161616',
  slate: '#f4f4f4',
  accent: '#c84b31',
  accentLight: '#e05a3e',
  accentSoft: '#fdf1ee',
  muted: '#6b7280',
  border: '#e5e7eb',
  paper: '#ffffff',
  gold: '#f6a429',
};

const condensed = "'Roboto Condensed', sans-serif";

export function ProblemFitTemplate({page}: {page: LandingPage}) {
  const [selectedId, setSelectedId] = useState<string | null>(page.programs[0]?.id ?? null);
  const applyRef = useRef<HTMLElement>(null);
  const showSticky = useStickyBar(applyRef as React.RefObject<HTMLElement>);
  const scrollToApply = () => applyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

  return (
    <div style={{fontFamily: 'Roboto, sans-serif', background: R.bg, color: R.ink, fontSize: 18}}>
      <Nav
        accentBg={R.accent}
        businessName={page.business_name}
        ctaColor="#fff"
        logoColor={R.ink}
        navBg={R.bg}
        navBorder={`1px solid ${R.border}`}
        onApply={scrollToApply}
      />

      {/* Hero — split: text left, accent-bg right */}
      <section style={{background: R.bg, minHeight: '88vh', display: 'flex', alignItems: 'center', padding: '64px 32px', position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', background: R.accentSoft, clipPath: 'polygon(6% 0, 100% 0, 100% 100%, 0% 100%)'}} />
        <div style={{maxWidth: 1000, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', position: 'relative', zIndex: 1}}>
          <div>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 8, background: R.accentSoft, border: `1px solid rgba(200,75,49,0.2)`, padding: '6px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: R.accent, marginBottom: 24}}>
              ✦ Online Coaching · Limited Spots
            </div>
            <h1 style={{fontFamily: condensed, fontWeight: 900, fontSize: 'clamp(2.6rem,5vw,4rem)', lineHeight: 1.0, textTransform: 'uppercase', color: R.ink, marginBottom: 24}}>
              {page.eyebrow ? <span style={{color: R.accent}}>{page.eyebrow}<br /></span> : null}
              {page.headline}
            </h1>
            {page.subheadline ? (
              <p style={{fontSize: 17, color: R.muted, lineHeight: 1.7, maxWidth: 420, marginBottom: 40}}>{page.subheadline}</p>
            ) : null}
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center'}}>
              <button
                onClick={scrollToApply}
                style={{background: R.accent, color: '#fff', fontFamily: condensed, fontWeight: 700, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 32px', border: 'none', cursor: 'pointer'}}
                type="button"
              >
                Apply for Coaching
              </button>
              {page.programs.length > 0 ? (
                <a
                  href="#programs"
                  style={{background: 'transparent', color: R.ink, fontFamily: condensed, fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '15px 24px', border: `2px solid ${R.border}`, textDecoration: 'none', display: 'inline-block'}}
                >
                  See Programs
                </a>
              ) : null}
            </div>
          </div>
          {page.hero_image_url ? (
            <img
              alt={page.business_name}
              src={page.hero_image_url}
              style={{width: '100%', aspectRatio: '4/5', objectFit: 'cover'}}
            />
          ) : (
            <div style={{aspectRatio: '4/5', background: `linear-gradient(145deg, ${R.accentSoft} 0%, #f0ccc5 100%)`}} />
          )}
        </div>
      </section>

      {/* Stats strip (dark) */}
      {(page.proof_points ?? []).length > 0 ? (
        <div style={{background: R.dark, padding: '28px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap'}}>
            {(page.proof_points ?? []).map((p, i) => (
              <div
                key={`${p.value}-${p.label}`}
                style={{display: 'flex', alignItems: 'center', gap: 12}}
              >
                {i > 0 ? <div style={{width: 1, height: 36, background: 'rgba(255,255,255,0.1)', marginRight: 36}} /> : null}
                <span style={{fontFamily: condensed, fontWeight: 900, fontSize: 26, color: '#fff'}}>{p.value}</span>
                <span style={{fontSize: 12, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700}}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Fit checklist (slate) */}
      {(page.fit_points ?? []).length > 0 ? (
        <section style={{background: R.slate, padding: '120px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: R.accent, marginBottom: 16}}>Is This You?</p>
            <h2 style={{fontFamily: condensed, fontWeight: 900, fontSize: 'clamp(2rem,4vw,2.8rem)', textTransform: 'uppercase', lineHeight: 1.05, color: R.ink, marginBottom: 60}}>
              This coaching is for you if…
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16}}>
              {(page.fit_points ?? []).map((point) => (
                <div
                  key={point}
                  style={{background: R.bg, border: `1px solid ${R.border}`, borderLeft: `4px solid ${R.accent}`, padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 14}}
                >
                  <div style={{width: 24, height: 24, background: R.accent, color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginTop: 1}}>✓</div>
                  <span style={{fontSize: 15, color: R.ink, lineHeight: 1.6}}>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How it works (dark) */}
      <section style={{background: R.dark, padding: '120px 32px'}}>
        <div style={{maxWidth: 900, margin: '0 auto'}}>
          <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: R.accent, marginBottom: 16}}>How It Works</p>
          <h2 style={{fontFamily: condensed, fontWeight: 900, fontSize: 'clamp(2rem,4vw,2.8rem)', textTransform: 'uppercase', color: '#fff', marginBottom: 64}}>
            Four steps to results.
          </h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: 0}}>
            {[
              {num: '01', title: 'You Apply', body: 'Fill in the form below. Takes 2 minutes. Every application is reviewed personally.'},
              {num: '02', title: 'We Talk', body: 'If it looks like a good fit, I\'ll schedule a free 20-minute call — no pitch, just a conversation.'},
              {num: '03', title: 'Your Plan Goes Live', body: 'A custom training and nutrition plan built around your schedule and goals, delivered within 48 hours.'},
              {num: '04', title: 'We Iterate Weekly', body: 'Check-ins every week. Adjustments when life happens. The plan evolves with you.'},
            ].map((step, i) => (
              <div
                key={step.num}
                style={{display: 'grid', gridTemplateColumns: '80px 1fr', gap: 32, padding: '36px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none', alignItems: 'start'}}
              >
                <div style={{fontFamily: condensed, fontWeight: 900, fontSize: 52, color: 'rgba(255,255,255,0.08)', lineHeight: 1}}>{step.num}</div>
                <div>
                  <div style={{fontFamily: condensed, fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: '#fff', marginBottom: 8, letterSpacing: '0.04em'}}>{step.title}</div>
                  <p style={{fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7}}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs (slate) */}
      {page.programs.length > 0 ? (
        <section
          id="programs"
          style={{background: R.slate, padding: '120px 32px'}}
        >
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: R.accent, marginBottom: 16}}>Programs</p>
            <h2 style={{fontFamily: condensed, fontWeight: 900, fontSize: 'clamp(2rem,4vw,2.8rem)', textTransform: 'uppercase', lineHeight: 1.05, color: R.ink, marginBottom: 56}}>
              Choose your starting point.
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20}}>
              {page.programs.map((program) => {
                const active = program.id === selectedId;
                return (
                  <div
                    key={program.id}
                    style={{background: R.bg, border: `2px solid ${active ? R.accent : R.border}`, padding: 28, position: 'relative'}}
                  >
                    <div style={{fontFamily: condensed, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: R.ink, marginBottom: 8}}>{program.name}</div>
                    {program.audience ? <p style={{fontSize: 14, color: R.muted, lineHeight: 1.6, marginBottom: 20}}>{program.audience}</p> : null}
                    {program.price_display ? <div style={{fontFamily: condensed, fontWeight: 700, fontSize: 17, color: R.accent, marginBottom: 18}}>{program.price_display}</div> : null}
                    <button
                      onClick={() => { setSelectedId(program.id); scrollToApply(); }}
                      style={{width: '100%', padding: '12px 0', background: active ? R.accent : R.ink, color: '#fff', fontFamily: condensed, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer'}}
                      type="button"
                    >
                      Apply for This
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Coach bio (white, if present) */}
      {page.coach_intro ? (
        <section style={{background: R.bg, padding: '100px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: page.hero_image_url ? '1fr 1fr' : '1fr', gap: 64, alignItems: 'center'}}>
            <div>
              <p style={{fontFamily: condensed, fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: R.accent, marginBottom: 16}}>Your Coach</p>
              <h2 style={{fontFamily: condensed, fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: R.ink, marginBottom: 16}}>{page.business_name}</h2>
              <p style={{fontSize: 16, color: R.muted, lineHeight: 1.75, whiteSpace: 'pre-line'}}>{page.coach_intro}</p>
            </div>
            {page.hero_image_url ? (
              <img
                alt={page.business_name}
                src={page.hero_image_url}
                style={{width: '100%', aspectRatio: '4/5', objectFit: 'cover'}}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Apply (dark) */}
      <div
        ref={applyRef as React.RefObject<HTMLDivElement>}
        style={{background: R.dark}}
      >
        <ApplyForm
          page={page}
          selectedProgramId={selectedId}
          theme={{
            bg: R.dark,
            cardBg: '#1e1e1e',
            cardBorder: 'rgba(255,255,255,0.1)',
            labelColor: 'rgba(255,255,255,0.5)',
            inputBg: '#111',
            inputBorder: 'rgba(255,255,255,0.1)',
            inputFocusBorder: R.accent,
            inputColor: '#fff',
            inputPlaceholder: 'rgba(255,255,255,0.2)',
            btnBg: R.accent,
            btnHoverBg: R.accentLight,
            headingColor: '#fff',
            subColor: 'rgba(255,255,255,0.45)',
            noteColor: 'rgba(255,255,255,0.25)',
            sectionBg: R.dark,
          }}
        />
      </div>

      <footer style={{background: '#111', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 32px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.2)'}}>
        Powered by CoachEasy · Privacy Policy
      </footer>

      <StickyBar
        accentBg={R.accent}
        barBg={R.ink}
        onApply={scrollToApply}
        show={showSticky}
        textColor="rgba(255,255,255,0.6)"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/apps/website/app/\[slug\]/template-problem-fit.tsx
git commit -m "feat(website): add ProblemFit landing template"
```

---

### Task 5: Wire Up landing-client.tsx

**Files:**
- Rewrite: `frontend/apps/website/app/[slug]/landing-client.tsx`

**Interfaces:**
- Consumes: `CoachStoryTemplate`, `ProblemFitTemplate`, `ProofFirstTemplate`
- Produces: default export `LandingClient({ page }: { page: LandingPage })` → `JSX.Element` (same signature as before — `page.tsx` doesn't change)

- [ ] **Step 1: Rewrite landing-client.tsx**

Replace the entire file with:

```tsx
'use client';

import type {LandingPage} from '@/lib/api';

import {CoachStoryTemplate} from './template-coach-story';
import {ProblemFitTemplate} from './template-problem-fit';
import {ProofFirstTemplate} from './template-proof-first';

export default function LandingClient({page}: {page: LandingPage}) {
  if (page.template === 'coach_story') return <CoachStoryTemplate page={page} />;
  if (page.template === 'problem_fit') return <ProblemFitTemplate page={page} />;
  return <ProofFirstTemplate page={page} />;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend/apps/website && npx tsc --noEmit
```
Expected: no output (exit 0).

- [ ] **Step 3: Start dev server and open a test page**

```bash
cd frontend/apps/website && pnpm dev
```

Open `http://localhost:3000/<any-coach-slug>` — the page should render the correct template based on the `template` field returned by the API.

If no live page is available, test with the local mock server or use the existing HTML drafts as the visual reference (`03-proof-first-draft.html`, `04-coach-story-draft.html`, `05-problem-fit-draft.html`).

**Visual checklist (scroll each template end-to-end):**
- [ ] Nav is sticky and shows business name + "Apply Now" CTA
- [ ] Hero is full-height with correct accent color
- [ ] Testimonial pull-quote strip appears immediately below hero
- [ ] Stats bar shows proof points
- [ ] All sections have generous padding (not cramped)
- [ ] Programs render correctly; clicking one scrolls to apply form
- [ ] Apply form submits and shows success state
- [ ] Sticky bottom bar appears on scroll and disappears when apply section is visible
- [ ] Mobile layout doesn't break (resize browser to 375px)

- [ ] **Step 4: Commit**

```bash
git add frontend/apps/website/app/\[slug\]/landing-client.tsx
git commit -m "feat(website): rewrite landing-client to route to new templates"
```

---

## Self-Review

**Spec coverage:**
- ✅ proof_first — Task 2 (dark hero, green, Roboto Condensed, stats bar, proof cards, testimonials, programs, bio, form)
- ✅ coach_story — Task 3 (parchment, olive, wave dividers, split hero, story, method, programs, form)
- ✅ problem_fit — Task 4 (white/dark, rust, fit checklist, numbered steps, programs, dark form)
- ✅ Single accent color per template — each template's color object has one accent
- ✅ 96–120px section padding — all sections use `padding: '100px 32px'` or `'120px 32px'`
- ✅ Testimonial strip below hero — proof strip div immediately after hero in all three
- ✅ Apply form trust note — "🔒 Your info stays private. No payment now." in `ApplyForm`
- ✅ Sticky bar disappears when apply is in view — `useStickyBar` with IntersectionObserver
- ✅ Fonts — Task 1 adds Roboto + Roboto Condensed to globals.css
- ✅ No new dependencies — inline styles only
- ✅ `page.tsx` unchanged — `LandingClient` still takes `page: LandingPage`

**Placeholder scan:** No TBDs, no "similar to Task N", all code blocks are complete.

**Type consistency:**
- `ApplyForm` takes `page: LandingPage`, `selectedProgramId: string | null`, `theme: ApplyTheme` — consistent across Tasks 1, 2, 3, 4
- `Nav` props consistent across all three template usages
- `StickyBar` props consistent
- `useStickyBar(applyRef)` returns `boolean` — used identically in Tasks 2, 3, 4
