'use client';

import {cloneElement, useEffect, useId, useRef, useState} from 'react';

import {
  type ApplicationResult,
  COACHAPP_URL,
  type LandingPage,
  type Question,
  submitApplication,
  whatsappLink,
} from '@/lib/api';

const c = {
  ink: '#17201b',
  muted: '#65746b',
  line: '#d9e1dc',
  paper: '#fbfaf7',
  panel: '#ffffff',
  green: '#1d6b4f',
  greenSoft: '#e7f2eb',
  coral: '#cf5c45',
  coralSoft: '#fae8e2',
  blue: '#315c8f',
  blueSoft: '#e6eef7',
};

const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

type TrustKind = 'proof' | 'coach' | 'fit';

// Section order is the only thing that varies per template; each template leads with its
// signature trust section (proof band / fit list / coach bio).
const TEMPLATE: Record<LandingPage['template'], {order: TrustKind[]; coachHeading: string}> = {
  proof_first: {order: ['proof', 'fit', 'coach'], coachHeading: 'Meet your coach'},
  problem_fit: {order: ['fit', 'proof', 'coach'], coachHeading: 'Meet your coach'},
  coach_story: {order: ['coach', 'proof', 'fit'], coachHeading: 'Meet your coach'},
};

export default function LandingClient({page}: {page: LandingPage}) {
  const [selected, setSelected] = useState<string | null>(page.programs[0]?.id ?? null);
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const applyRef = useRef<HTMLDivElement>(null);

  const selectedProgram = page.programs.find((p) => p.id === selected) ?? null;

  const scrollToApply = () => applyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

  const selectProgram = (id: string) => {
    setSelected(id);
    scrollToApply();
  };

  const tpl = TEMPLATE[page.template];

  const trustBlock = (kind: TrustKind) => {
    if (kind === 'proof') {
      return page.proof_points && page.proof_points.length > 0 ? (
        <ProofBand
          key="proof"
          points={page.proof_points}
        />
      ) : null;
    }
    if (kind === 'fit') {
      return page.fit_points && page.fit_points.length > 0 ? (
        <FitList
          key="fit"
          points={page.fit_points}
        />
      ) : null;
    }
    return page.coach_intro ? (
      <CoachIntro
        heading={tpl.coachHeading}
        intro={page.coach_intro}
        key="coach"
      />
    ) : null;
  };

  return (
    <div style={{background: c.paper, color: c.ink, fontFamily: FONT, minHeight: '100vh'}}>
      {/* Nav */}
      <nav
        style={{borderBottom: `1px solid ${c.line}`, background: c.panel}}
        className="sticky top-0 z-30"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <span style={{fontWeight: 800}}>{page.business_name}</span>
          <button
            onClick={scrollToApply}
            style={{background: c.green, color: '#fff', borderRadius: 8}}
            className="px-4 py-2 text-sm font-semibold"
            type="button"
          >
            Apply
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl">
        {/* Hero — split with the coach image when present, else text-only */}
        <section className="grid gap-6 px-5 py-10 sm:grid-cols-2 sm:items-center">
          <div>
            {page.eyebrow ? (
              <p
                style={{color: c.green, fontWeight: 800, letterSpacing: '0.02em'}}
                className="mb-2 text-xs uppercase"
              >
                {page.eyebrow}
              </p>
            ) : null}
            <h1
              className="text-3xl font-bold sm:text-4xl"
              style={{lineHeight: 1.1}}
            >
              {page.headline}
            </h1>
            {page.subheadline ? (
              <p
                className="mt-3 text-base"
                style={{color: c.muted}}
              >
                {page.subheadline}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={scrollToApply}
                style={{background: c.green, color: '#fff', borderRadius: 8}}
                className="px-5 py-2.5 text-sm font-semibold"
                type="button"
              >
                Apply for coaching
              </button>
              {page.programs.length > 0 ? (
                <a
                  href="#programs"
                  style={{border: `1px solid ${c.line}`, color: c.ink, borderRadius: 8}}
                  className="px-5 py-2.5 text-sm font-semibold"
                >
                  See programs
                </a>
              ) : null}
            </div>
          </div>
          {page.hero_image_url ? (
            <img
              alt={page.business_name}
              className="aspect-[4/3] w-full rounded-2xl object-cover"
              src={page.hero_image_url}
            />
          ) : null}
        </section>

        {/* Trust sections, ordered per template */}
        {tpl.order.map(trustBlock)}

        {/* Programs */}
        {page.programs.length > 0 ? (
          <section
            className="px-5 py-8"
            id="programs"
            style={{borderTop: `1px solid ${c.line}`}}
          >
            <h2 className="mb-4 text-lg font-semibold">Programs</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {page.programs.map((program) => {
                const active = program.id === selected;
                return (
                  <button
                    key={program.id}
                    onClick={() => selectProgram(program.id)}
                    style={{
                      background: c.panel,
                      border: `1px solid ${active ? c.green : c.line}`,
                      borderRadius: 10,
                      boxShadow: active ? `inset 0 0 0 1px ${c.green}` : 'none',
                      textAlign: 'left',
                    }}
                    className="p-3"
                    type="button"
                  >
                    <span className="block text-sm font-bold">{program.name}</span>
                    {program.audience ? (
                      <span
                        className="mt-1 block text-xs"
                        style={{color: c.muted}}
                      >
                        {program.audience}
                      </span>
                    ) : null}
                    {program.price_display ? (
                      <span
                        className="mt-1 block text-xs font-semibold"
                        style={{color: c.green}}
                      >
                        {program.price_display}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Apply / Success */}
        <section
          className="px-5 py-8"
          ref={applyRef}
          style={{borderTop: `1px solid ${c.line}`}}
        >
          {result ? (
            <Success
              answers={answers}
              page={page}
              result={result}
            />
          ) : (
            <ApplyForm
              answers={answers}
              onAnswers={setAnswers}
              onSuccess={setResult}
              page={page}
              selectedProgram={selectedProgram}
            />
          )}
        </section>

        <footer
          className="px-5 py-8 text-center text-xs"
          style={{color: c.muted}}
        >
          Powered by CoachEasy
        </footer>
      </main>

      {!result ? (
        <StickyBar
          applyRef={applyRef}
          onApply={scrollToApply}
        />
      ) : null}
    </div>
  );
}

function ProofBand({points}: {points: NonNullable<LandingPage['proof_points']>}) {
  return (
    <section
      className="px-5 py-8"
      style={{background: c.greenSoft, borderTop: `1px solid ${c.line}`}}
    >
      <div className="grid grid-cols-3 gap-3">
        {points.map((point) => (
          <div
            className="text-center"
            key={`${point.label}-${point.value}`}
          >
            <div className="text-xl font-bold">{point.value}</div>
            <div
              className="text-xs"
              style={{color: c.muted}}
            >
              {point.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FitList({points}: {points: string[]}) {
  return (
    <section
      className="px-5 py-8"
      style={{background: c.coralSoft, borderTop: `1px solid ${c.line}`}}
    >
      <h2
        className="mb-3 text-lg font-semibold"
        style={{color: c.coral}}
      >
        This is for you if…
      </h2>
      <div className="flex flex-col gap-2">
        {points.map((point) => (
          <div
            className="text-sm"
            key={point}
            style={{background: c.panel, borderLeft: `4px solid ${c.coral}`, borderRadius: 8, padding: '9px 12px'}}
          >
            {point}
          </div>
        ))}
      </div>
    </section>
  );
}

function CoachIntro({heading, intro}: {heading: string; intro: string}) {
  return (
    <section
      className="px-5 py-8"
      style={{background: c.blueSoft, borderTop: `1px solid ${c.line}`}}
    >
      <h2
        className="mb-2 text-lg font-semibold"
        style={{color: c.blue}}
      >
        {heading}
      </h2>
      <p
        className="whitespace-pre-line text-sm"
        style={{color: c.ink}}
      >
        {intro}
      </p>
    </section>
  );
}

const inputStyle = {background: c.panel, border: `1px solid ${c.line}`, borderRadius: 8, color: c.ink};

function Labeled({label, children}: {label: string; children: React.ReactElement<{id?: string}>}) {
  const id = useId();
  return (
    <div>
      <label
        className="mb-1 block text-sm font-medium"
        htmlFor={id}
      >
        {label}
      </label>
      {cloneElement(children, {id})}
    </div>
  );
}

function ApplyForm({
  answers,
  onAnswers,
  onSuccess,
  page,
  selectedProgram,
}: {
  answers: Record<string, string>;
  onAnswers: (a: Record<string, string>) => void;
  onSuccess: (r: ApplicationResult) => void;
  page: LandingPage;
  selectedProgram: {id: string; name: string} | null;
}) {
  const [values, setValues] = useState({name: '', phone: '', email: '', instagram: ''});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (patch: Partial<typeof values>) => setValues((v) => ({...v, ...patch}));
  const setAnswer = (qid: string, value: string) => onAnswers({...answers, [qid]: value});

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
      landing_program_id: selectedProgram?.id ?? null,
      answers,
    });
    setSubmitting(false);
    if (res.ok) {
      onSuccess(res.data);
    } else {
      setError(res.message);
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Apply for coaching</h2>
        {selectedProgram ? (
          <span
            className="text-xs"
            style={{color: c.green}}
          >
            {selectedProgram.name} selected
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Name">
          <input
            className="w-full px-3 py-2 text-sm outline-none"
            onChange={(e) => set({name: e.target.value})}
            style={inputStyle}
            value={values.name}
          />
        </Labeled>
        <Labeled label="Phone">
          <input
            className="w-full px-3 py-2 text-sm outline-none"
            inputMode="tel"
            onChange={(e) => set({phone: e.target.value})}
            style={inputStyle}
            value={values.phone}
          />
        </Labeled>
        <Labeled label="Email">
          <input
            className="w-full px-3 py-2 text-sm outline-none"
            inputMode="email"
            onChange={(e) => set({email: e.target.value})}
            style={inputStyle}
            value={values.email}
          />
        </Labeled>
        <Labeled label="Instagram or profile link (optional)">
          <input
            className="w-full px-3 py-2 text-sm outline-none"
            onChange={(e) => set({instagram: e.target.value})}
            style={inputStyle}
            value={values.instagram}
          />
        </Labeled>
      </div>

      {page.application_questions.map((question) => (
        <QuestionField
          key={question.id ?? question.label}
          onChange={(v) => setAnswer(question.id ?? '', v)}
          question={question}
          value={answers[question.id ?? ''] ?? ''}
        />
      ))}

      {error ? (
        <p
          className="text-sm"
          style={{color: c.coral}}
        >
          {error}
        </p>
      ) : null}

      <button
        className="self-start px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        disabled={submitting}
        style={{background: c.green, color: '#fff', borderRadius: 8}}
        type="submit"
      >
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}

function QuestionField({
  onChange,
  question,
  value,
}: {
  onChange: (v: string) => void;
  question: Question;
  value: string;
}) {
  const label = question.label ?? '';
  if (question.type === 'long_text') {
    return (
      <Labeled label={label}>
        <textarea
          className="min-h-20 w-full resize-y px-3 py-2 text-sm outline-none"
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          value={value}
        />
      </Labeled>
    );
  }
  if (question.type === 'single_select') {
    return (
      <Labeled label={label}>
        <select
          className="w-full px-3 py-2 text-sm outline-none"
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          value={value}
        >
          <option value="">Select…</option>
          {(question.options ?? []).map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>
      </Labeled>
    );
  }
  return (
    <Labeled label={label}>
      <input
        className="w-full px-3 py-2 text-sm outline-none"
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        value={value}
      />
    </Labeled>
  );
}

function Success({
  answers,
  page,
  result,
}: {
  answers: Record<string, string>;
  page: LandingPage;
  result: ApplicationResult;
}) {
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
    <div
      style={{background: '#f4fbf6', border: '1px solid #bad6c6', borderRadius: 14}}
      className="p-6"
    >
      <h2 className="text-lg font-bold">Application received</h2>
      <p
        className="mt-1 text-sm"
        style={{color: c.muted}}
      >
        Your coach will review this and get back to you.
      </p>

      {wa ? (
        <div
          style={{background: c.panel, border: '1px solid #9bc5ac', borderRadius: 12}}
          className="mt-4 p-4"
        >
          <p className="text-sm font-semibold">Recommended next step</p>
          <p
            className="mb-3 mt-1 text-sm"
            style={{color: c.muted}}
          >
            Send your summary on WhatsApp so the coach can reply faster.
          </p>
          <a
            className="inline-block px-5 py-2.5 text-sm font-semibold"
            href={wa}
            rel="noopener noreferrer"
            style={{background: '#25D366', color: '#fff', borderRadius: 8}}
            target="_blank"
          >
            Send on WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  );
}

function StickyBar({applyRef, onApply}: {applyRef: React.RefObject<HTMLDivElement | null>; onApply: () => void}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = applyRef.current;
    if (!node) {
      return;
    }
    // Hide the bar whenever the apply form is on screen (avoids covering the submit button).
    const observer = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting), {threshold: 0.15});
    observer.observe(node);
    return () => observer.disconnect();
  }, [applyRef]);

  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between sm:hidden"
      style={{
        background: 'rgba(255,255,255,0.94)',
        border: '1px solid rgba(29,107,79,0.25)',
        borderRadius: 14,
        boxShadow: '0 12px 28px rgba(23,32,27,0.18)',
        padding: 9,
      }}
    >
      <span
        className="text-xs"
        style={{color: c.muted}}
      >
        Ready to apply?
      </span>
      <button
        onClick={onApply}
        style={{background: c.green, color: '#fff', borderRadius: 10}}
        className="px-4 py-2 text-sm font-semibold"
        type="button"
      >
        Apply
      </button>
    </div>
  );
}
