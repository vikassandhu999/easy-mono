'use client';

import type {PublicStorefront} from '@easy/storefront-types';
import {useMemo, useState} from 'react';

import FaqSection from './faq-section';
import IntakeForm from './intake-form';
import OffersSection from './offers-section';
import {categorizeTestimonials, ResultsGrid, ResultsSpotlight} from './results-section';
import StickyCta from './sticky-cta';
import WhatsAppFab from './whatsapp-fab';

/**
 * Client wrapper for sections that need interactivity (offer selection → intake form).
 * HeroSection is a Server Component rendered in page.tsx.
 *
 * Section order (proof → price → more proof → objection handling → conversion):
 * 1. ResultsSpotlight — 1-2 featured transformations (before offers)
 * 2. OffersSection — pricing cards
 * 3. ResultsGrid — remaining photo grid + text quotes (after offers)
 * 4. FaqSection — objection handling
 * 5. IntakeForm — conversion form
 */
export default function StorefrontClient({
  data,
  initialOfferId,
  slug,
}: {
  data: PublicStorefront;
  initialOfferId: null | string;
  slug: string;
}) {
  const [selectedOfferId, setSelectedOfferId] = useState<null | string>(initialOfferId);

  const {photoGrid, spotlight, textOnly} = useMemo(
    () => categorizeTestimonials(data.testimonials),
    [data.testimonials],
  );

  // If fewer than 3 testimonials total, don't split — show all before offers
  const shouldSplit = data.testimonials.length >= 3;

  // Pick first text-only testimonial for the micro-quote below the form
  const microTestimonial = useMemo(
    () => data.testimonials.find((t) => t.quote && !t.before_image_url) ?? null,
    [data.testimonials],
  );

  const handleSelectOffer = (offerId: string) => {
    setSelectedOfferId(offerId);
    document.getElementById('get-started')?.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <>
      {/* Spotlight — featured transformations BEFORE offers */}
      {shouldSplit ? <ResultsSpotlight testimonials={spotlight} /> : null}

      <OffersSection
        offers={data.offers}
        onSelectOffer={handleSelectOffer}
      />

      {/* Remaining results AFTER offers */}
      {shouldSplit ? (
        <ResultsGrid
          photoGrid={photoGrid}
          textOnly={textOnly}
        />
      ) : data.testimonials.length > 0 ? (
        /* Small number of testimonials — show all together before the form */
        <>
          <ResultsSpotlight testimonials={spotlight} />
          <ResultsGrid
            photoGrid={photoGrid}
            textOnly={textOnly}
          />
        </>
      ) : null}

      {/* FAQ — objection handling before the form */}
      <FaqSection items={data.profile.faq_items} />

      <IntakeForm
        coachName={data.profile.display_name}
        intakeQuestions={data.profile.intake_questions}
        microTestimonial={microTestimonial}
        offers={data.offers}
        selectedOfferId={selectedOfferId}
        slug={slug}
        socialLinks={data.profile.social_links}
      />

      {/* Sticky mobile CTA — fixed bottom bar, hidden on desktop */}
      <StickyCta offers={data.offers} />

      {/* WhatsApp floating button — shown when enabled and whatsapp number is configured */}
      {data.profile.whatsapp_cta_enabled && data.profile.social_links.whatsapp ? (
        <WhatsAppFab
          message={data.profile.whatsapp_cta_message}
          whatsappNumber={data.profile.social_links.whatsapp}
        />
      ) : null}
    </>
  );
}
