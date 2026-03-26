'use client';

import {useState} from 'react';

import type {PublicStorefront} from './types';

import IntakeForm from './intake-form';
import OffersSection from './offers-section';
import ResultsSection from './results-section';

/**
 * Client wrapper for sections that need interactivity (offer selection → intake form).
 * HeroSection is a Server Component rendered in page.tsx.
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

  const handleSelectOffer = (offerId: string) => {
    setSelectedOfferId(offerId);
    // Scroll to intake form
    document.getElementById('get-started')?.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <>
      <OffersSection
        offers={data.offers}
        onSelectOffer={handleSelectOffer}
      />

      <ResultsSection testimonials={data.testimonials} />

      <IntakeForm
        intakeQuestions={data.profile.intake_questions}
        offers={data.offers}
        selectedOfferId={selectedOfferId}
        slug={slug}
      />
    </>
  );
}
