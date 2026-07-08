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

function WaveUp() {
  return (
    <div
      style={{
        display: 'block',
        width: '100%',
        overflow: 'hidden',
        lineHeight: 0,
        marginBottom: -2,
        transform: 'rotate(180deg)',
      }}
    >
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
  const applyRef = useRef<HTMLDivElement>(null);
  const showSticky = useStickyBar(applyRef as React.RefObject<HTMLElement | null>);
  const scrollToApply = () => applyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

  return (
    <div style={{fontFamily: 'Roboto, sans-serif', background: C.parchment, color: C.ink}}>
      <Nav
        accentBg={C.olive}
        businessName={page.business_name}
        ctaColor="#fff"
        logoColor={C.ink}
        navBg={C.parchment}
        navBorder={`1px solid ${C.border}`}
        onApply={scrollToApply}
      />

      {/* Hero — split */}
      <section style={{background: C.parchment, padding: '96px 32px'}}>
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: page.hero_image_url ? '1fr 1fr' : '1fr',
            gap: 80,
            alignItems: 'center',
          }}
        >
          {page.hero_image_url ? (
            <img
              alt={page.business_name}
              src={page.hero_image_url}
              style={{width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 2}}
            />
          ) : null}
          <div>
            {page.eyebrow ? (
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: C.olive,
                  marginBottom: 20,
                }}
              >
                {page.eyebrow}
              </p>
            ) : null}
            <h1
              style={{
                fontSize: 'clamp(2.2rem,3.5vw,3rem)',
                fontWeight: 700,
                lineHeight: 1.2,
                color: C.ink,
                marginBottom: 24,
              }}
            >
              {page.headline}
            </h1>
            {page.subheadline ? (
              <p style={{fontSize: 17, color: C.muted, lineHeight: 1.7, marginBottom: 36}}>{page.subheadline}</p>
            ) : null}
            <button
              onClick={scrollToApply}
              style={{
                background: C.olive,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '15px 32px',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
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
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            <span style={{color: '#fff'}}>Rated 5.0</span> · 140+ verified client reviews
          </p>
        </div>
      </div>

      {/* Coach story (parchment) */}
      <WaveUp />
      {page.coach_intro ? (
        <section style={{background: C.parchment, padding: '120px 32px'}}>
          <div
            style={{
              maxWidth: 1000,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 80,
              alignItems: 'start',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: C.olive,
                  marginBottom: 16,
                }}
              >
                My Story
              </p>
              <h2
                style={{
                  fontSize: 'clamp(1.8rem,3vw,2.4rem)',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: C.ink,
                  marginBottom: 24,
                }}
              >
                {page.business_name}
              </h2>
              <p style={{fontSize: 16, color: C.muted, lineHeight: 1.8, whiteSpace: 'pre-line'}}>{page.coach_intro}</p>
            </div>
            <div>
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

      {/* Method (dark) */}
      <WaveDown />
      <section style={{background: C.dark, padding: '120px 32px'}}>
        <div style={{maxWidth: 900, margin: '0 auto'}}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: C.olive,
              marginBottom: 16,
            }}
          >
            How I Coach
          </p>
          <h2
            style={{
              fontSize: 'clamp(2rem,3.5vw,2.8rem)',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
              marginBottom: 64,
            }}
          >
            No templates. No guesswork. Just your plan.
          </h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 40}}>
            {[
              {
                num: '01',
                title: 'We start with your life',
                body: "Before I write a single workout, I learn your schedule, stress, sleep, and what matters to you. Coaching has to fit your life, or it won't last.",
              },
              {
                num: '02',
                title: 'Weekly check-ins, real feedback',
                body: "Every week we review progress together. What's working gets more. What isn't gets adjusted. No set-and-forget programs here.",
              },
              {
                num: '03',
                title: 'You learn as you go',
                body: "By the end of our time together you understand your body. The goal is that you don't need me forever — just long enough to build the knowledge.",
              },
            ].map((p) => (
              <div key={p.num}>
                <div
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontWeight: 900,
                    fontSize: 52,
                    color: 'rgba(255,255,255,0.08)',
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {p.num}
                </div>
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
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: C.olive,
                  marginBottom: 16,
                }}
              >
                This is for you if…
              </p>
              <h2 style={{fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 700, color: C.ink, marginBottom: 56}}>
                Does this sound like you?
              </h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                {(page.fit_points ?? []).map((point) => (
                  <div
                    key={point}
                    style={{
                      background: C.paper,
                      borderLeft: `3px solid ${C.olive}`,
                      padding: '14px 20px',
                      fontSize: 16,
                      color: C.ink,
                      lineHeight: 1.6,
                      borderRadius: '0 4px 4px 0',
                    }}
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
          style={{background: C.dark, padding: '120px 32px'}}
        >
          {(page.fit_points ?? []).length === 0 ? <WaveDown /> : null}
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: C.olive,
                marginBottom: 16,
              }}
            >
              Programs
            </p>
            <h2 style={{fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 700, color: '#fff', marginBottom: 56}}>
              Where do you want to start?
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20}}>
              {page.programs.map((program) => {
                const active = program.id === selectedId;
                return (
                  <div
                    key={program.id}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? C.olive : 'rgba(255,255,255,0.1)'}`,
                      padding: 28,
                    }}
                  >
                    <div style={{fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 10}}>{program.name}</div>
                    {program.audience ? (
                      <p style={{fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 24}}>
                        {program.audience}
                      </p>
                    ) : null}
                    {program.price_display ? (
                      <div style={{fontSize: 16, fontWeight: 700, color: C.olive, marginBottom: 16}}>
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
                        padding: 12,
                        background: active ? C.olive : 'transparent',
                        color: '#fff',
                        border: `1px solid ${active ? C.olive : 'rgba(255,255,255,0.2)'}`,
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
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

      {/* Apply (parchment) */}
      <WaveUp />
      <div ref={applyRef}>
        <ApplyForm
          page={page}
          selectedProgramId={selectedId}
          theme={{
            bg: C.parchment,
            labelColor: C.muted,
            inputBg: C.paper,
            inputBorder: 'rgba(37,37,37,0.15)',
            inputColor: C.ink,
            btnBg: C.olive,
            headingColor: C.ink,
            subColor: C.muted,
            noteColor: C.muted,
            sectionBg: C.parchment,
          }}
        />
      </div>

      <footer
        style={{background: C.dark, padding: 32, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)'}}
      >
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
