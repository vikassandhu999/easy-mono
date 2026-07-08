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
  const applyRef = useRef<HTMLDivElement>(null);
  const showSticky = useStickyBar(applyRef as React.RefObject<HTMLElement | null>);
  const scrollToApply = () => applyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

  return (
    <div style={{fontFamily: 'Roboto, sans-serif', background: G.paper, color: G.ink}}>
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(10,18,9,0.95) 40%, rgba(10,18,9,0.4) 100%)',
          }}
        />
        <div style={{position: 'relative', maxWidth: 580, padding: '100px 32px 80px'}}>
          {page.eyebrow ? (
            <p
              style={{
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: G.accentLight,
                marginBottom: 20,
              }}
            >
              {page.eyebrow}
            </p>
          ) : null}
          <h1
            style={{
              fontFamily: condensed,
              fontWeight: 900,
              fontSize: 'clamp(3rem,6vw,5.5rem)',
              lineHeight: 0.95,
              textTransform: 'uppercase',
              color: '#fff',
              marginBottom: 28,
            }}
          >
            {page.headline}
          </h1>
          {page.subheadline ? (
            <p
              style={{fontSize: 18, color: 'rgba(255,255,255,0.65)', maxWidth: 440, marginBottom: 40, lineHeight: 1.6}}
            >
              {page.subheadline}
            </p>
          ) : null}
          <div style={{display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center'}}>
            <button
              onClick={scrollToApply}
              style={{
                background: G.accent,
                color: '#fff',
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '16px 36px',
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
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: condensed,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '15px 24px',
                  border: '1px solid rgba(255,255,255,0.25)',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                See Programs
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* Testimonial pull-quote strip */}
      <div style={{background: G.charcoal, padding: '48px 32px', borderTop: '1px solid rgba(255,255,255,0.08)'}}>
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 40,
          }}
        >
          <p style={{fontSize: 19, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5}}>
            "The most structured, results-focused coaching I've found. Every week my plan improves based on real data."
          </p>
          <div style={{width: 1, height: 72, background: 'rgba(255,255,255,0.15)'}} />
          <div style={{textAlign: 'right'}}>
            <div style={{color: G.gold, fontSize: 18, marginBottom: 8}}>★★★★★</div>
            <div
              style={{
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#fff',
              }}
            >
              Verified Client
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              4.9 avg · 140+ reviews
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {(page.proof_points ?? []).length > 0 ? (
        <div style={{background: G.accent, padding: '20px 32px'}}>
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'center',
              gap: 60,
              flexWrap: 'wrap',
            }}
          >
            {(page.proof_points ?? []).map((p) => (
              <div
                key={`${p.value}-${p.label}`}
                style={{display: 'flex', alignItems: 'center', gap: 12}}
              >
                <span style={{fontFamily: condensed, fontWeight: 900, fontSize: 28, color: '#fff', lineHeight: 1}}>
                  {p.value}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.75)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontFamily: condensed,
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

      {/* Proof point cards */}
      {(page.proof_points ?? []).length > 0 ? (
        <section style={{background: G.cream, padding: '100px 32px'}}>
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p
              style={{
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: G.accent,
                marginBottom: 16,
              }}
            >
              Results That Speak
            </p>
            <h2
              style={{
                fontFamily: condensed,
                fontWeight: 900,
                fontSize: 'clamp(2rem,4vw,3rem)',
                textTransform: 'uppercase',
                color: G.ink,
                marginBottom: 60,
                lineHeight: 1.05,
              }}
            >
              Numbers don't lie.
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24}}>
              {(page.proof_points ?? []).map((p) => (
                <div
                  key={`card-${p.value}-${p.label}`}
                  style={{padding: '36px 28px', background: G.paper, border: `1px solid ${G.border}`}}
                >
                  <div
                    style={{
                      fontFamily: condensed,
                      fontWeight: 900,
                      fontSize: 52,
                      lineHeight: 1,
                      color: G.ink,
                      marginBottom: 8,
                    }}
                  >
                    {p.value}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: G.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: condensed,
                      fontWeight: 700,
                    }}
                  >
                    {p.label}
                  </div>
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
            <p
              style={{
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: G.accent,
                marginBottom: 16,
              }}
            >
              Programs
            </p>
            <h2
              style={{
                fontFamily: condensed,
                fontWeight: 900,
                fontSize: 'clamp(2rem,4vw,3rem)',
                textTransform: 'uppercase',
                color: G.ink,
                marginBottom: 16,
                lineHeight: 1.05,
              }}
            >
              Find your fit.
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 20,
                marginTop: 56,
              }}
            >
              {page.programs.map((program) => {
                const active = program.id === selectedId;
                return (
                  <div
                    key={program.id}
                    style={{
                      border: `2px solid ${active ? G.accent : G.border}`,
                      padding: '28px',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: condensed,
                        fontWeight: 900,
                        fontSize: 20,
                        textTransform: 'uppercase',
                        color: G.ink,
                        marginBottom: 10,
                      }}
                    >
                      {program.name}
                    </div>
                    {program.audience ? (
                      <p style={{fontSize: 14, color: G.muted, lineHeight: 1.6, marginBottom: 20}}>
                        {program.audience}
                      </p>
                    ) : null}
                    {program.price_display ? (
                      <div
                        style={{
                          fontFamily: condensed,
                          fontWeight: 700,
                          fontSize: 17,
                          color: G.accent,
                          marginBottom: 16,
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
                        display: 'block',
                        width: '100%',
                        padding: '12px 0',
                        background: active ? G.ink : 'transparent',
                        color: active ? '#fff' : G.ink,
                        fontFamily: condensed,
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        border: `2px solid ${G.ink}`,
                        cursor: 'pointer',
                      }}
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
            <p
              style={{
                fontFamily: condensed,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: G.accent,
                marginBottom: 16,
              }}
            >
              Your Coach
            </p>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start'}}>
              <div>
                <div
                  style={{
                    fontFamily: condensed,
                    fontWeight: 900,
                    fontSize: 36,
                    textTransform: 'uppercase',
                    color: G.ink,
                    marginBottom: 8,
                  }}
                >
                  {page.business_name}
                </div>
                <p style={{fontSize: 16, color: G.muted, lineHeight: 1.75, whiteSpace: 'pre-line'}}>
                  {page.coach_intro}
                </p>
              </div>
              {page.hero_image_url ? (
                <img
                  alt={page.business_name}
                  src={page.hero_image_url}
                  style={{width: '100%', aspectRatio: '4/5', objectFit: 'cover'}}
                />
              ) : (
                <div
                  style={{aspectRatio: '4/5', background: `linear-gradient(145deg, ${G.cream} 0%, ${G.border} 100%)`}}
                />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Apply form */}
      <div ref={applyRef}>
        <ApplyForm
          page={page}
          selectedProgramId={selectedId}
          theme={{
            bg: G.cream,
            labelColor: G.muted,
            inputBg: G.paper,
            inputBorder: G.border,
            inputColor: G.ink,
            btnBg: G.accent,
            headingColor: G.ink,
            subColor: G.muted,
            noteColor: G.muted,
            sectionBg: G.cream,
          }}
        />
      </div>

      <footer
        style={{background: G.charcoal, padding: 32, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)'}}
      >
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
