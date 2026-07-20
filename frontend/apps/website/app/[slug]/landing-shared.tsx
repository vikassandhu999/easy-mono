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
  labelColor: string;
  inputBg: string;
  inputBorder: string;
  inputColor: string;
  btnBg: string;
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
    if (res.ok) {
      setResult(res.data);
    } else {
      setError(res.message);
    }
  };

  return {values, answers, error, submitting, result, set, setAnswer, handleSubmit};
}

export function useStickyBar(applyRef: React.RefObject<HTMLElement | null>) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const node = applyRef.current;
    if (!node) {
      return;
    }
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
  labelColor: string;
}

export function QuestionField({question, value, onChange, inputStyle, labelColor}: QuestionFieldProps) {
  const label = question.label ?? '';
  if (!label) {
    return null;
  }

  if (question.type === 'long_text') {
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: labelColor,
          }}
        >
          {label}
        </span>
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
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: labelColor,
          }}
        >
          {label}
        </span>
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
      <span
        style={{fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor}}
      >
        {label}
      </span>
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
      <span
        style={{
          fontFamily: "'Roboto Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: logoColor,
        }}
      >
        {businessName}
      </span>
      <button
        onClick={onApply}
        style={{
          background: accentBg,
          color: ctaColor,
          fontFamily: "'Roboto Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '9px 20px',
          border: 'none',
          cursor: 'pointer',
        }}
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
  const {values, answers, error, submitting, result, set, setAnswer, handleSubmit} = useApplyForm(
    page,
    selectedProgramId,
  );

  const inputStyle: React.CSSProperties = {
    padding: '12px 14px',
    background: theme.inputBg,
    border: `1.5px solid ${theme.inputBorder}`,
    color: theme.inputColor,
    fontSize: 15,
    outline: 'none',
    fontFamily: 'Roboto, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
  };

  const selectedProgram = page.programs.find((p) => p.id === selectedProgramId) ?? null;

  if (result) {
    return (
      <section style={{background: theme.sectionBg, padding: '96px 32px'}}>
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
    <section style={{background: theme.sectionBg, padding: '96px 32px'}}>
      <div style={{maxWidth: 560, margin: '0 auto'}}>
        <form
          onSubmit={handleSubmit}
          style={{display: 'flex', flexDirection: 'column', gap: 16}}
        >
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label
                htmlFor="lead-name"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.labelColor,
                }}
              >
                Full name
              </label>
              <input
                id="lead-name"
                onChange={(e) => set({name: e.target.value})}
                placeholder="Your name"
                style={inputStyle}
                value={values.name}
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label
                htmlFor="lead-phone"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.labelColor,
                }}
              >
                Phone
              </label>
              <input
                id="lead-phone"
                inputMode="tel"
                onChange={(e) => set({phone: e.target.value})}
                placeholder="+91 98765 43210"
                style={inputStyle}
                value={values.phone}
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label
                htmlFor="lead-email"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.labelColor,
                }}
              >
                Email
              </label>
              <input
                id="lead-email"
                inputMode="email"
                onChange={(e) => set({email: e.target.value})}
                placeholder="you@email.com"
                style={inputStyle}
                value={values.email}
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <label
                htmlFor="lead-instagram"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.labelColor,
                }}
              >
                Instagram (optional)
              </label>
              <input
                id="lead-instagram"
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
              labelColor={theme.labelColor}
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
            style={{
              padding: '17px 0',
              background: theme.btnBg,
              color: '#fff',
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
            type="submit"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
          <p style={{fontSize: 12, textAlign: 'center', color: theme.noteColor}}>
            🔒 Your info stays private. No payment now.
          </p>
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
        <div
          style={{
            marginTop: 24,
            background: '#fff',
            border: '1px solid #a7d4b8',
            borderRadius: 10,
            padding: '20px 20px',
          }}
        >
          <p style={{fontSize: 14, fontWeight: 600, marginBottom: 4}}>Recommended next step</p>
          <p style={{fontSize: 14, color: '#6b7280', marginBottom: 16}}>
            Send your summary on WhatsApp so the coach can reply faster.
          </p>
          <a
            href={wa}
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#25D366',
              color: '#fff',
              padding: '11px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
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
  if (!show) {
    return null;
  }
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
        style={{
          background: accentBg,
          color: '#fff',
          fontFamily: "'Roboto Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '10px 22px',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 8,
        }}
        type="button"
      >
        Apply Now
      </button>
    </div>
  );
}
