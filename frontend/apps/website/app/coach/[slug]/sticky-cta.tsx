'use client';

import type {PublicOffer} from '@easy/storefront-types';
import {useEffect, useRef, useState} from 'react';

/**
 * Sticky mobile CTA bar — fixed bottom, visible only on mobile (md:hidden).
 * Shows featured offer price + themed "Get started" button.
 * Hidden when the intake form (#get-started) is visible or when hero (#hero) is visible.
 */
export default function StickyCta({offers}: {offers: PublicOffer[]}) {
  const [visible, setVisible] = useState(false);
  const heroVisibleRef = useRef(false);
  const formVisibleRef = useRef(false);

  const featuredOffer = offers.find((o) => o.is_featured);
  const ctaText = featuredOffer?.cta_text || 'Get started';
  const priceText = featuredOffer?.price_display;

  useEffect(() => {
    const formEl = document.getElementById('get-started');
    const heroEl = document.getElementById('hero');

    if (!formEl || !heroEl) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === heroEl) {
            heroVisibleRef.current = entry.isIntersecting;
          }
          if (entry.target === formEl) {
            formVisibleRef.current = entry.isIntersecting;
          }
        }
        setVisible(!heroVisibleRef.current && !formVisibleRef.current);
      },
      {threshold: 0.1},
    );

    observer.observe(formEl);
    observer.observe(heroEl);

    return () => observer.disconnect();
  }, []);

  const handleClick = () => {
    document.getElementById('get-started')?.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 py-3 transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center gap-3">
        {priceText ? <p className="shrink-0 text-base font-bold">{priceText}</p> : null}
        <button
          className="min-h-11 flex-1 rounded-lg bg-[--theme] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          onClick={handleClick}
          type="button"
        >
          {ctaText} →
        </button>
      </div>
    </div>
  );
}
