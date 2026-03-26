import {Check, Star} from 'lucide-react';

import type {PublicOffer} from './types';

export default function OffersSection({
  offers,
  onSelectOffer,
}: {
  offers: PublicOffer[];
  onSelectOffer: (offerId: string) => void;
}) {
  if (offers.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="mb-8 text-center text-xl font-bold sm:text-2xl">What I Offer</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <div
            className={`relative flex flex-col rounded-2xl border p-5 transition-shadow hover:shadow-lg ${
              offer.is_featured ? 'border-orange-300 bg-orange-50 shadow-md' : 'border-gray-200 bg-white'
            }`}
            key={offer.id}
          >
            {offer.is_featured && (
              <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                <Star
                  className="fill-orange-500 text-orange-500"
                  size={12}
                />
                Popular
              </span>
            )}

            <h3 className="text-lg font-semibold">{offer.name}</h3>

            {offer.duration_text && (
              <p className="mt-1 text-sm text-gray-500">{offer.duration_text}</p>
            )}

            {offer.description && (
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{offer.description}</p>
            )}

            {/* Features */}
            {offer.features.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {offer.features.map((feature, i) => (
                  <li
                    className="flex items-start gap-2 text-sm text-gray-700"
                    key={i}
                  >
                    <Check
                      className="mt-0.5 shrink-0 text-green-500"
                      size={14}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto pt-4">
              {offer.price_display && (
                <p className="mb-3 text-2xl font-bold">{offer.price_display}</p>
              )}

              <button
                className="min-h-11 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                onClick={() => onSelectOffer(offer.id)}
                type="button"
              >
                {offer.cta_text || 'Get started'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
