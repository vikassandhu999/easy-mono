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
  const applyRef = useRef<HTMLDivElement>(null);
  const showSticky = useStickyBar(applyRef as React.RefObject<HTMLElement | null>);
  const scrollToApply = () => applyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

  return (
    <div style={{fontFamily: 'Roboto, sans-serif', background: R.bg, color: R.ink}}>
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
      <section
        style={{
          background: R.bg,
          minHeight: '88vh',
          display: 'flex',
          alignItems: 'center',
          padding: '64px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '45%',
            background: R.accentSoft,
            clipPath: 'polygon(6% 0, 100% 0, 100% 100%, 0% 100%)',
          }}
        />
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: R.accentSoft,
                border: `1px solid rgba(200,75,49,0.2)`,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: R.accent,
                marginBottom: 24,
              }}
            >
              ✦ Online Coaching · Limited Spots
            </div>
            <h1
              style={{
                fontFamily: condensed,
                fontWeight: 900,
                fontSize: 'clamp(2.6rem,5vw,4rem)',
                lineHeight: 1.0,
                textTransform: 'uppercase',
                color: R.ink,
                marginBottom: 24,
              }}
            >
              {page.eyebrow ? (
                <span style={{color: R.accent}}>
                  {page.eyebrow}
                  <br />
                </span>
              ) : null}
              {page.headline}
            </h1>
            {page.subheadline ? (
              <p style={{fontSize: 17, color: R.muted, lineHeight: 1.7, maxWidth: 420, marginBottom: 40}}>
                {page.subheadline}
              </p>
            ) : null}
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center'}}>
              <button
                onClick={scrollToApply}
                style={{
                  background: R.accent,
                  color: '#fff',
                  fontFamily: condensed,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '16px 32px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                type="button"
              >
                Apply for Coaching
              </button>
              {page.programs.length > 0 ? (
                <a
                  href="#programs"
                  style={{
                    background: 'transparent',
                    color: R.ink,
                    fontFamily: condensed,
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '15px 24px',
                    border: `2px solid ${R.border}`,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
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
            <div
              style={{aspectRatio: '4/5', background: `linear-gradient(145deg, ${R.accentSoft} 0%, #f0ccc5 100%)`}}
            />
          )}
        </div>
      </section>

      {/* Stats strip (dark) */}
      {(page.proof_points ?? []).length > 0 ? (
        <div style={{background: R.dark, padding: '28px 32px'}}>
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              flexWrap: 'wrap',
            }}
          >
            {(page.proof_points ?? []).map((p, i) => (
              <div
                key={`${p.value}-${p.label}`}
                style={{display: 'flex', alignItems: 'center', gap: 12, padding: '0 36px'}}
              >
                {i > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: 36,
                      background: 'rgba(255,255,255,0.1)',
                      transform: 'translateX(-48px)',
                    }}
                  />
                ) : null}
                <span style={{fontFamily: condensed, fontWeight: 900, fontSize: 26, color: '#fff'}}>{p.value}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Fit checklist (slate) */}
      {(page.fit_points ?? []).length > 0 ? (
        <section style={{background: R.slate, padding: '120px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p
              style={{
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: R.accent,
                marginBottom: 16,
              }}
            >
              Is This You?
            </p>
            <h2
              style={{
                fontFamily: condensed,
                fontWeight: 900,
                fontSize: 'clamp(2rem,4vw,2.8rem)',
                textTransform: 'uppercase',
                lineHeight: 1.05,
                color: R.ink,
                marginBottom: 60,
              }}
            >
              This coaching is for you if…
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16}}>
              {(page.fit_points ?? []).map((point) => (
                <div
                  key={point}
                  style={{
                    background: R.bg,
                    border: `1px solid ${R.border}`,
                    borderLeft: `4px solid ${R.accent}`,
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      background: R.accent,
                      color: '#fff',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      marginTop: 1,
                    }}
                  >
                    ✓
                  </div>
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
          <p
            style={{
              fontFamily: condensed,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: R.accent,
              marginBottom: 16,
            }}
          >
            How It Works
          </p>
          <h2
            style={{
              fontFamily: condensed,
              fontWeight: 900,
              fontSize: 'clamp(2rem,4vw,2.8rem)',
              textTransform: 'uppercase',
              color: '#fff',
              marginBottom: 64,
            }}
          >
            Four steps to results.
          </h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: 0}}>
            {[
              {
                num: '01',
                title: 'You Apply',
                body: 'Fill in the form below. Takes 2 minutes. Every application is reviewed personally.',
              },
              {
                num: '02',
                title: 'We Talk',
                body: "If it looks like a good fit, I'll schedule a free 20-minute call — no pitch, just a conversation.",
              },
              {
                num: '03',
                title: 'Your Plan Goes Live',
                body: 'A custom training and nutrition plan built around your schedule and goals, delivered within 48 hours.',
              },
              {
                num: '04',
                title: 'We Iterate Weekly',
                body: 'Check-ins every week. Adjustments when life happens. The plan evolves with you.',
              },
            ].map((step, i) => (
              <div
                key={step.num}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: 32,
                  padding: '36px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  alignItems: 'start',
                }}
              >
                <div
                  style={{
                    fontFamily: condensed,
                    fontWeight: 900,
                    fontSize: 52,
                    color: 'rgba(255,255,255,0.08)',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: condensed,
                      fontWeight: 700,
                      fontSize: 20,
                      textTransform: 'uppercase',
                      color: '#fff',
                      marginBottom: 8,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {step.title}
                  </div>
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
            <p
              style={{
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: R.accent,
                marginBottom: 16,
              }}
            >
              Programs
            </p>
            <h2
              style={{
                fontFamily: condensed,
                fontWeight: 900,
                fontSize: 'clamp(2rem,4vw,2.8rem)',
                textTransform: 'uppercase',
                lineHeight: 1.05,
                color: R.ink,
                marginBottom: 56,
              }}
            >
              Choose your starting point.
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20}}>
              {page.programs.map((program) => {
                const active = program.id === selectedId;
                return (
                  <div
                    key={program.id}
                    style={{background: R.bg, border: `2px solid ${active ? R.accent : R.border}`, padding: 28}}
                  >
                    <div
                      style={{
                        fontFamily: condensed,
                        fontWeight: 900,
                        fontSize: 20,
                        textTransform: 'uppercase',
                        color: R.ink,
                        marginBottom: 8,
                      }}
                    >
                      {program.name}
                    </div>
                    {program.audience ? (
                      <p style={{fontSize: 14, color: R.muted, lineHeight: 1.6, marginBottom: 20}}>
                        {program.audience}
                      </p>
                    ) : null}
                    {program.price_display ? (
                      <div
                        style={{
                          fontFamily: condensed,
                          fontWeight: 700,
                          fontSize: 17,
                          color: R.accent,
                          marginBottom: 18,
                        }}
                      >
                        {program.price_display}
                      </div>
                    ) : null}
                    <button
                      onClick={() => {
                        setSelectedId(program.id);
                        scrollToApply();
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        background: active ? R.accent : R.ink,
                        color: '#fff',
                        fontFamily: condensed,
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        border: 'none',
                        cursor: 'pointer',
                      }}
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

      {/* Coach bio */}
      {page.coach_intro ? (
        <section style={{background: R.bg, padding: '100px 32px'}}>
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: page.hero_image_url ? '1fr 1fr' : '1fr',
              gap: 64,
              alignItems: 'center',
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: condensed,
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: R.accent,
                  marginBottom: 16,
                }}
              >
                Your Coach
              </p>
              <h2
                style={{
                  fontFamily: condensed,
                  fontWeight: 900,
                  fontSize: 28,
                  textTransform: 'uppercase',
                  color: R.ink,
                  marginBottom: 16,
                }}
              >
                {page.business_name}
              </h2>
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
        ref={applyRef}
        style={{background: R.dark}}
      >
        <ApplyForm
          page={page}
          selectedProgramId={selectedId}
          theme={{
            bg: R.dark,
            labelColor: 'rgba(255,255,255,0.5)',
            inputBg: '#111',
            inputBorder: 'rgba(255,255,255,0.1)',
            inputColor: '#fff',
            btnBg: R.accent,
            headingColor: '#fff',
            subColor: 'rgba(255,255,255,0.45)',
            noteColor: 'rgba(255,255,255,0.25)',
            sectionBg: R.dark,
          }}
        />
      </div>

      <footer
        style={{
          background: '#111',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '28px 32px',
          textAlign: 'center',
          fontSize: 13,
          color: 'rgba(255,255,255,0.2)',
        }}
      >
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
