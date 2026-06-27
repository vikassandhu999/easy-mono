'use client';

import {useEffect, useRef, useState} from 'react';

const COACHAPP_URL = process.env.NEXT_PUBLIC_COACHAPP_URL || 'http://localhost:2021';
const goToSignup = () => {
  window.location.href = `${COACHAPP_URL}/signup`;
};
const goToLogin = () => {
  window.location.href = `${COACHAPP_URL}/login`;
};

const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {threshold},
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, isVisible] as const;
};

const FadeIn = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const [ref, isVisible] = useInView();
  return (
    <div
      className={className}
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
        transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

/* --- Ticker / Marquee --- */
const Ticker = ({items}: {items: string[]}) => (
  <div style={{overflow: 'hidden', width: '100%'}}>
    <div
      style={{
        display: 'flex',
        gap: '48px',
        whiteSpace: 'nowrap',
        animation: 'ticker 28s linear infinite',
      }}
    >
      {[...items, ...items, ...items].map((t, i) => (
        <span
          key={i}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '15px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{color: '#F97316', fontSize: '8px'}}>●</span> {t}
        </span>
      ))}
    </div>
  </div>
);

/* --- Feature Card --- */
const FeatureCard = ({
  icon,
  title,
  does,
  means,
  delay,
}: {
  icon: string;
  title: string;
  does: string;
  means: string;
  delay: number;
}) => (
  <FadeIn delay={delay}>
    <div className="h-full cursor-default rounded-[20px] border border-[#F1F5F9] bg-white px-8 py-9 transition-all duration-300 hover:-translate-y-1 hover:border-[#F97316] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          marginBottom: '20px',
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '20px',
          fontWeight: 700,
          color: '#0F172A',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14.5px',
          color: '#64748B',
          lineHeight: 1.65,
          margin: '0 0 14px',
        }}
      >
        {does}
      </p>
      <div
        style={{
          background: '#F0FDF4',
          borderRadius: '10px',
          padding: '12px 16px',
          borderLeft: '3px solid #22C55E',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13.5px',
            color: '#15803D',
            lineHeight: 1.6,
            margin: 0,
            fontWeight: 500,
          }}
        >
          ↳ {means}
        </p>
      </div>
    </div>
  </FadeIn>
);

/* --- Before/After Row --- */
const BARow = ({before, after, delay}: {before: string; after: string; delay: number}) => (
  <FadeIn delay={delay}>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 40px 1fr',
        alignItems: 'center',
        padding: '0 0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '15px',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.6,
          textDecoration: 'line-through',
          textDecorationColor: 'rgba(255,255,255,0.2)',
        }}
      >
        {before}
      </div>
      <div style={{textAlign: 'center', fontSize: '18px'}}>→</div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '15px',
          color: '#4ADE80',
          lineHeight: 1.6,
          fontWeight: 500,
        }}
      >
        {after}
      </div>
    </div>
  </FadeIn>
);

/* --- Mini Story --- */
const MiniStory = ({
  name,
  location,
  clients,
  story,
  uses,
  changed,
  delay,
}: {
  name: string;
  location: string;
  clients: string;
  story: string;
  uses: string;
  changed: string;
  delay: number;
}) => (
  <FadeIn delay={delay}>
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '36px 32px',
        border: '1px solid #F1F5F9',
        height: '100%',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px'}}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F97316, #EA580C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
          }}
        >
          {name[0]}
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: '16px',
              color: '#0F172A',
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#94A3B8',
            }}
          >
            {location} · {clients} clients
          </div>
        </div>
      </div>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14px',
          color: '#64748B',
          lineHeight: 1.65,
          margin: '0 0 16px',
        }}
      >
        {story}
      </p>
      <div
        style={{
          background: '#FFF7ED',
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '12px',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            color: '#9A3412',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          <strong>How they use CoachEasy:</strong> {uses}
        </p>
      </div>
      <div
        style={{
          background: '#F0FDF4',
          borderRadius: '10px',
          padding: '14px 16px',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13.5px',
            color: '#15803D',
            lineHeight: 1.6,
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          &quot;{changed}&quot;
        </p>
      </div>
    </div>
  </FadeIn>
);

/* --- Pricing Card --- */
const PricingCard = ({
  name,
  price,
  unit,
  clients,
  features,
  popular,
  delay,
}: {
  name: string;
  price: string;
  unit: string;
  clients: string;
  features: string[];
  popular?: boolean;
  delay: number;
}) => (
  <FadeIn delay={delay}>
    <div
      style={{
        background: popular ? 'linear-gradient(135deg, #0F172A, #1E293B)' : '#FFFFFF',
        borderRadius: '24px',
        padding: '40px 32px',
        border: popular ? '2px solid #F97316' : '1px solid #E2E8F0',
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {popular && (
        <div
          style={{
            position: 'absolute',
            top: '-13px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #F97316, #EA580C)',
            color: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '5px 18px',
            borderRadius: '20px',
            textTransform: 'uppercase',
          }}
        >
          Most Popular
        </div>
      )}
      <h3
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '22px',
          fontWeight: 700,
          color: popular ? '#FFFFFF' : '#0F172A',
          margin: '0 0 8px',
        }}
      >
        {name}
      </h3>
      <div style={{display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px'}}>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '42px',
            fontWeight: 800,
            color: popular ? '#F97316' : '#0F172A',
          }}
        >
          {price}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              color: popular ? 'rgba(255,255,255,0.5)' : '#94A3B8',
            }}
          >
            {unit}
          </span>
        )}
      </div>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14px',
          color: popular ? 'rgba(255,255,255,0.5)' : '#94A3B8',
          margin: '0 0 24px',
        }}
      >
        {clients}
      </p>
      <div style={{flex: 1}}>
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <span style={{color: '#22C55E', fontSize: '16px', lineHeight: 1.5}}>✓</span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                color: popular ? 'rgba(255,255,255,0.7)' : '#64748B',
                lineHeight: 1.5,
              }}
            >
              {f}
            </span>
          </div>
        ))}
      </div>
      <button
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: popular ? 'none' : '2px solid #E2E8F0',
          background: popular ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
          color: popular ? '#FFFFFF' : '#0F172A',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          marginTop: '24px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onClick={goToSignup}
      >
        {popular ? 'Start Free Trial' : 'Get Started'}
      </button>
    </div>
  </FadeIn>
);

/* ===================== MAIN PAGE ===================== */
export default function CoachEasyLanding() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const triggers = [
    "Client can't find the PDF you sent Monday",
    'Spent Sunday copying the same workout into 12 sheets',
    'Prospect asked for your website — you sent your Instagram',
    "Tracking payments in a spreadsheet because Razorpay doesn't know who's a client",
    'A client DMs at 10pm asking for their meal plan — again',
    "You don't know which subscription expires next week",
  ];

  return (
    <div style={{background: '#FAFAF9', minHeight: '100vh', overflowX: 'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: #F97316; color: white; }
      `}</style>

      {/* === NAV === */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrollY > 50 ? 'rgba(250,250,249,0.92)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(0,0,0,0.05)' : 'none',
          transition: 'all 0.3s ease',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '68px',
          }}
        >
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 900,
              }}
            >
              C
            </div>
            CoachEasy
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '32px'}}>
            {['Features', 'Pricing', 'Stories'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  color: '#64748B',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                {item}
              </a>
            ))}
            <button
              onClick={goToLogin}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                fontWeight: 500,
                color: '#64748B',
              }}
              type="button"
            >
              Log in
            </button>
            <button
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(249,115,22,0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={goToSignup}
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* === HERO === */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            right: '-5%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)',
            animation: 'pulse 6s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '-8%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)',
            animation: 'pulse 8s ease-in-out infinite 1s',
          }}
        />

        <div style={{maxWidth: '820px', textAlign: 'center', position: 'relative'}}>
          <div
            style={{
              animation: 'fadeInUp 0.8s ease-out',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFF7ED',
              border: '1px solid #FFEDD5',
              borderRadius: '100px',
              padding: '8px 20px',
              marginBottom: '32px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22C55E',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#9A3412',
                fontWeight: 600,
              }}
            >
              Built for Indian coaches. Free to start.
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(38px, 5.5vw, 64px)',
              fontWeight: 900,
              color: '#0F172A',
              lineHeight: 1.08,
              marginBottom: '24px',
              letterSpacing: '-0.03em',
              animation: 'fadeInUp 0.8s ease-out 0.1s both',
            }}
          >
            You trained to coach.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Not to chase payments on WhatsApp.
            </span>
          </h1>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 'clamp(17px, 2vw, 20px)',
              color: '#64748B',
              lineHeight: 1.65,
              maxWidth: '640px',
              margin: '0 auto 40px',
              animation: 'fadeInUp 0.8s ease-out 0.2s both',
            }}
          >
            CoachEasy replaces the spreadsheets, scattered chats, and Razorpay links with one platform built for how
            Indian fitness coaches actually work.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              animation: 'fadeInUp 0.8s ease-out 0.3s both',
            }}
          >
            <button
              style={{
                padding: '16px 40px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '17px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(249,115,22,0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(249,115,22,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(249,115,22,0.3)';
              }}
              onClick={goToSignup}
            >
              Start Free → 2 Clients Forever
            </button>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                color: '#94A3B8',
              }}
            >
              No credit card required
            </span>
          </div>

          {/* Trust badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '32px',
              marginTop: '56px',
              flexWrap: 'wrap',
              animation: 'fadeInUp 0.8s ease-out 0.5s both',
            }}
          >
            {['UPI & Cards', 'Client App Included', 'Website Builder', '₹99/client/mo'].map((badge, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{color: '#F97316', fontSize: '14px'}}>✦</span>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13.5px',
                    color: '#94A3B8',
                    fontWeight: 500,
                  }}
                >
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === SITUATIONAL TRIGGERS TICKER === */}
      <section style={{background: '#0F172A', padding: '20px 0', overflow: 'hidden'}}>
        <div style={{marginBottom: '8px'}}>
          <p
            style={{
              textAlign: 'center',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Sound familiar?
          </p>
        </div>
        <Ticker items={triggers} />
      </section>

      {/* === BEFORE & AFTER === */}
      <section
        style={{
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
          padding: '100px 24px',
        }}
      >
        <div style={{maxWidth: '900px', margin: '0 auto'}}>
          <FadeIn>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#F97316',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              The shift
            </p>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(30px, 4vw, 44px)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.15,
                marginBottom: '16px',
                letterSpacing: '-0.02em',
              }}
            >
              What changes when you
              <br />
              stop duct-taping it together
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '17px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.6,
                marginBottom: '48px',
                maxWidth: '600px',
              }}
            >
              The old way technically works — until you hit 20 clients and everything starts cracking.
            </p>
          </FadeIn>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 40px 1fr',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
              }}
            >
              Before
            </span>
            <span />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                color: '#4ADE80',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
              }}
            >
              After CoachEasy
            </span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <BARow
              after="Every client's plan in one dashboard, updated live"
              before="Client plans in 14 different Google Sheets"
              delay={0.05}
            />
            <BARow
              after="Clients open their app. Today's meals are right there."
              before="Meal plans as PDFs re-sent weekly on WhatsApp"
              delay={0.1}
            />
            <BARow
              after="See who paid the moment you look at a client"
              before="Payment tracking = spreadsheet + Razorpay notifications"
              delay={0.15}
            />
            <BARow
              after="Clients sign up on your site, pay, and land in your system"
              before="Onboarding = Google Form → WhatsApp follow-up → hope"
              delay={0.2}
            />
            <BARow
              after="All progress in the client's profile with visual timelines"
              before="Progress photos lost in WhatsApp media"
              delay={0.25}
            />
            <BARow
              after="Your branded website with plans, pricing, and online signup"
              before="No website. Or a Linktree with a Razorpay link."
              delay={0.3}
            />
            <BARow
              after="Scaling = more clients in the same clean system"
              before="Scaling = more WhatsApp groups = more chaos"
              delay={0.35}
            />
          </div>
        </div>
      </section>

      {/* === "IMAGINE" TRANSITION === */}
      <section
        style={{
          background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)',
          padding: '80px 24px',
          borderTop: '3px solid #F97316',
        }}
      >
        <FadeIn>
          <div style={{maxWidth: '720px', margin: '0 auto', textAlign: 'center'}}>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(20px, 3vw, 28px)',
                fontWeight: 600,
                color: '#0F172A',
                lineHeight: 1.55,
                fontStyle: 'italic',
              }}
            >
              &quot;Imagine opening your phone in the morning and instead of 47 unread WhatsApp messages, you see a
              clean dashboard. Every client&apos;s plan, progress, and payment status — right there. No digging. No
              scrolling. Just coaching.&quot;
            </p>
          </div>
        </FadeIn>
      </section>

      {/* === FEATURES === */}
      <section
        id="features"
        style={{padding: '100px 24px', background: '#F8FAFC'}}
      >
        <div style={{maxWidth: '1100px', margin: '0 auto'}}>
          <FadeIn>
            <div style={{textAlign: 'center', marginBottom: '64px'}}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: '#F97316',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: '16px',
                }}
              >
                How it works
              </p>
              <h2
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 'clamp(30px, 4vw, 44px)',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1.15,
                  marginBottom: '16px',
                  letterSpacing: '-0.02em',
                }}
              >
                Everything your coaching
                <br />
                business actually needs
              </h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '17px',
                  color: '#64748B',
                  lineHeight: 1.6,
                  maxWidth: '540px',
                  margin: '0 auto',
                }}
              >
                Not 200 features you&apos;ll never touch. Just the ones that replace your WhatsApp + Sheets + Razorpay
                patchwork.
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            <FeatureCard
              delay={0.05}
              does="Every client's profile, plan, progress, payment status, and chat — in one view."
              icon="📋"
              means="Open CoachEasy and know where every client stands. No digging through 5 apps."
              title="Client Dashboard"
            />
            <FeatureCard
              delay={0.1}
              does="Build plans from templates or from scratch. Create once, personalise per client."
              icon="💪"
              means="Build a plan once, assign to 10 clients with tweaks. No more Sunday copy-paste sessions."
              title="Workout & Nutrition Builder"
            />
            <FeatureCard
              delay={0.15}
              does="Clients download an app with their workouts, meal plans, tracking, and chat."
              icon="📱"
              means={'Zero "where\'s my plan?" messages. Clients self-serve their daily workouts and meals.'}
              title="Client App"
            />
            <FeatureCard
              delay={0.2}
              does="Accept subscriptions via UPI, cards. See payment status per client instantly."
              icon="💳"
              means='No more Razorpay links in DMs. No more "did they pay?" spreadsheets.'
              title="Built-in Payments"
            />
            <FeatureCard
              delay={0.25}
              does="Create a professional coaching website with plans listed, pricing visible, online signup."
              icon="🌐"
              means="Prospects land on a real website — not your Instagram bio link. They sign up without a DM."
              title="AI Website Builder"
            />
            <FeatureCard
              delay={0.3}
              does="1-to-1 and group chat inside the platform. Intake forms and questionnaires built in."
              icon="💬"
              means="Client questions stay next to their plan and progress — not buried in WhatsApp."
              title="Chat & Forms"
            />
          </div>
        </div>
      </section>

      {/* === INDIA DIFFERENTIATION === */}
      <section
        style={{
          padding: '100px 24px',
          background: '#FFFFFF',
        }}
      >
        <div style={{maxWidth: '900px', margin: '0 auto'}}>
          <FadeIn>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <span style={{fontSize: '32px'}}>🇮🇳</span>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: '#F97316',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Built for Indian coaches
              </p>
            </div>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(28px, 3.5vw, 40px)',
                fontWeight: 800,
                color: '#0F172A',
                lineHeight: 1.2,
                marginBottom: '16px',
                letterSpacing: '-0.02em',
              }}
            >
              International tools weren&apos;t designed
              <br />
              for how you work
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '17px',
                color: '#64748B',
                lineHeight: 1.6,
                marginBottom: '48px',
                maxWidth: '600px',
              }}
            >
              Kajabi is for course creators. Thinkific is for educators. TrueCoach is priced for American coaches. None
              of them understand your world.
            </p>
          </FadeIn>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              {
                icon: '₹',
                title: 'UPI payments — built in',
                desc: 'Not an afterthought. Not a third-party integration. Your clients pay via UPI, and you see it instantly.',
              },
              {
                icon: '📊',
                title: 'Priced for India',
                desc: 'Starting at ₹99/client/month. Not $49/month platforms designed for coaches charging $200/client.',
              },
              {
                icon: '📲',
                title: 'WhatsApp → Platform',
                desc: 'Designed for coaches transitioning from WhatsApp chaos. The learning curve is minutes, not weeks.',
              },
              {
                icon: '🍛',
                title: 'Indian content library',
                desc: 'Food databases and recipe templates relevant to your clients. Paneer, dal, roti — not just chicken breast and broccoli.',
              },
            ].map((item, i) => (
              <FadeIn
                delay={i * 0.08}
                key={i}
              >
                <div
                  style={{
                    background: '#FFFBEB',
                    borderRadius: '18px',
                    padding: '32px 28px',
                    border: '1px solid #FEF3C7',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#FEF3C7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#92400E',
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#0F172A',
                      margin: '0 0 8px',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '14.5px',
                      color: '#78716C',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* === MINI STORIES === */}
      <section
        id="stories"
        style={{padding: '100px 24px', background: '#F8FAFC'}}
      >
        <div style={{maxWidth: '1100px', margin: '0 auto'}}>
          <FadeIn>
            <div style={{textAlign: 'center', marginBottom: '64px'}}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: '#F97316',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: '16px',
                }}
              >
                Real coaching realities
              </p>
              <h2
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 'clamp(30px, 4vw, 44px)',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                }}
              >
                How coaches like you use CoachEasy
              </h2>
            </div>
          </FadeIn>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            <MiniStory
              changed="I went from spending 3 hours a day on admin to maybe 30 minutes. I'm coaching more clients and actually coaching them better."
              clients="22"
              delay={0.05}
              location="Mumbai"
              name="Rohan"
              story="Got his INFS certification 2 years ago and built his client base through Instagram reels. Was running everything on WhatsApp and Google Sheets. At 20 clients, he started missing check-ins and forgetting payment follow-ups."
              uses="Builds workout templates in the content library and personalises per client. Clients use the app to log workouts. Payments flow through the platform."
            />
            <MiniStory
              changed="For the first time, I feel like I'm running a business, not just freelancing. Clients sign up on my website, get plans in the app, and I actually track their progress."
              clients="35"
              delay={0.15}
              location="Bangalore"
              name="Meera"
              story="Left her clinic job to start independent nutrition coaching. Was using Kajabi for content, WhatsApp for chat, Razorpay for payments. None designed for assigning personalised meal plans and tracking compliance."
              uses="Builds meal plans using the nutrition builder, creates recipe libraries. Her CoachEasy website converts Instagram followers into paying clients automatically."
            />
            <MiniStory
              changed="My online client retention went up because they actually feel coached, not just given a PDF. And I stopped mixing up who's doing what."
              clients="45"
              delay={0.25}
              location="Delhi"
              name="Vikram"
              story="Trained clients at a gym for 5 years, started taking online clients during COVID. His online clients got Google Sheets treatment without face-to-face accountability. Retention was dropping."
              uses="Online clients use the client app as their 'virtual gym.' They check workouts daily, log progress, and chat inside the platform. In-gym clients also use it for meal plans."
            />
          </div>
        </div>
      </section>

      {/* === PRICING === */}
      <section
        id="pricing"
        style={{padding: '100px 24px', background: '#FFFFFF'}}
      >
        <div style={{maxWidth: '1000px', margin: '0 auto'}}>
          <FadeIn>
            <div style={{textAlign: 'center', marginBottom: '64px'}}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: '#F97316',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: '16px',
                }}
              >
                Pricing
              </p>
              <h2
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 'clamp(30px, 4vw, 44px)',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1.15,
                  marginBottom: '16px',
                  letterSpacing: '-0.02em',
                }}
              >
                Less than your WhatsApp Business plan
              </h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '17px',
                  color: '#64748B',
                  lineHeight: 1.6,
                  maxWidth: '500px',
                  margin: '0 auto',
                }}
              >
                Pay per client. Start free. Scale when you&apos;re ready.
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              alignItems: 'stretch',
            }}
          >
            <PricingCard
              clients="Up to 2 clients · Forever free"
              delay={0.05}
              features={[
                'Client management',
                'Workout builder',
                'Nutrition plans',
                'Progress tracking',
                '1-1 Chat',
                'Client app access',
              ]}
              name="Starter"
              price="Free"
              unit=""
            />
            <PricingCard
              clients="3–50 clients"
              delay={0.15}
              features={[
                'Everything in Starter',
                'Custom exercise library',
                'Group chat',
                'Payment processing',
                'AI Website builder',
                'Forms & questionnaires',
                'Advanced analytics',
                'Priority support',
              ]}
              name="Pro"
              popular
              price="₹99"
              unit="/client/month"
            />
            <PricingCard
              clients="51–500 clients"
              delay={0.25}
              features={[
                'Everything in Pro',
                'Team collaboration',
                'White-label branding',
                'API access',
                'Dedicated account manager',
                'Bulk client management',
              ]}
              name="Studio"
              price="₹79"
              unit="/client/month"
            />
          </div>

          <FadeIn delay={0.3}>
            <p
              style={{
                textAlign: 'center',
                marginTop: '32px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                color: '#94A3B8',
              }}
            >
              All plans include 14-day free trial. Cancel anytime. No credit card to start.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section
        style={{
          padding: '100px 24px',
          background: 'linear-gradient(135deg, #0F172A, #1E293B)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
          }}
        />
        <div style={{maxWidth: '700px', margin: '0 auto', textAlign: 'center', position: 'relative'}}>
          <FadeIn>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(30px, 4.5vw, 48px)',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.15,
                marginBottom: '20px',
                letterSpacing: '-0.02em',
              }}
            >
              Ready to run your coaching business like a{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #F97316, #FBBF24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                real business?
              </span>
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '18px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6,
                marginBottom: '40px',
              }}
            >
              Start free with 2 clients. No credit card. See how it feels to have everything in one place.
            </p>
            <button
              style={{
                padding: '18px 48px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 40px rgba(249,115,22,0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 50px rgba(249,115,22,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 40px rgba(249,115,22,0.35)';
              }}
              onClick={goToSignup}
            >
              Start Coaching on CoachEasy →
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '32px',
                flexWrap: 'wrap',
              }}
            >
              {['Free forever plan', '2-minute setup', 'UPI ready'].map((t, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{color: '#4ADE80'}}>✓</span> {t}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer
        style={{
          background: '#0F172A',
          padding: '48px 24px 32px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '18px',
              fontWeight: 800,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 900,
              }}
            >
              C
            </div>
            CoachEasy
          </div>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            © 2026 CoachEasy. Built with ❤️ for Indian coaches.
          </p>
        </div>
      </footer>
    </div>
  );
}
