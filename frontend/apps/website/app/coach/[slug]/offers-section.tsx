import {Check, Star} from 'lucide-react';

import type {PublicOffer} from '@easy/storefront-types';

export default function OffersSection({
  offers,
  onSelectOffer,
}: {
  offers: PublicOffer[];
  onSelectOffer: (offerId: string) => void;
}) {
  if (offers.length === 0) return null;

  // Sort featured offers first so they get most attention on mobile (single column)
  const sortedOffers = [...offers].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return 0;
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="mb-8 text-center text-xl font-bold sm:text-2xl">Choose your program</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedOffers.map((offer) => (
          <div
            className={`relative flex flex-col rounded-2xl border p-5 transition-shadow hover:shadow-lg ${
              offer.is_featured
                ? 'border-t-4 border-gray-200 border-t-[--theme] bg-white shadow-md'
                : 'border-gray-200 bg-white'
            }`}
            key={offer.id}
          >
            {offer.is_featured && (
              <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[--theme]/10 px-2.5 py-0.5 text-xs font-medium text-[--theme]">
                <Star
                  className="fill-[--theme] text-[--theme]"
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
            {offer.features.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {offer.features.map((feature, i) => (
                  <li
                    className="flex items-start gap-2 text-sm text-gray-700"
                    key={i}
                  >
                    <Check
                      className="mt-0.5 shrink-0 text-[--theme]"
                      size={14}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-auto pt-4">
              {offer.price_display && (
                <p className="mb-3 text-2xl font-bold">{offer.price_display}</p>
              )}

              {offer.is_featured ? (
                <button
                  className="min-h-11 w-full rounded-lg bg-[--theme] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
                  onClick={() => onSelectOffer(offer.id)}
                  type="button"
                >
                  {offer.cta_text || 'Get started →'}
                </button>
              ) : (
                <button
                  className="min-h-11 w-full rounded-lg border-2 border-[--theme] px-4 py-2.5 text-sm font-medium text-[--theme] transition-colors hover:bg-[--theme]/5 active:bg-[--theme]/10"
                  onClick={() => onSelectOffer(offer.id)}
                  type="button"
                >
                  {offer.cta_text || 'Get started'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
