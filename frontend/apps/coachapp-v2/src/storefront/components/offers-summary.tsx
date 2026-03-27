import {Gift, Star} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {Offer} from '@/api/offers';

import {ROUTES} from '@/@config/routes';

export default function OffersSummary({offers}: {offers: Offer[]}) {
  if (offers.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground-500">No offers yet. Create offers to show pricing on your page.</p>
        <Link
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-divider px-3 py-2 text-sm font-medium hover:bg-default-100 active:bg-default-200"
          to={ROUTES.STOREFRONT_OFFERS}
        >
          <Gift size={14} />
          Go to Offers
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-foreground-400">Offers are managed on a separate page.</p>

      <div className="flex flex-col gap-2">
        {offers.map((offer) => (
          <div
            className="flex items-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm"
            key={offer.id}
          >
            {offer.is_featured ? (
              <Star
                className="shrink-0 fill-warning text-warning"
                size={14}
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate font-medium">{offer.name}</span>
            <span className="shrink-0 text-xs text-foreground-400">
              {offer.price_display ?? (offer.price != null ? `${offer.currency ?? ''}${offer.price}` : 'Free')}
            </span>
            {offer.is_featured ? (
              <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                Featured
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <Link
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-divider px-3 py-2 text-sm font-medium hover:bg-default-100 active:bg-default-200"
        to={ROUTES.STOREFRONT_OFFERS}
      >
        <Gift size={14} />
        Manage Offers
      </Link>

      <p className="text-xs text-foreground-400">Featured offer is shown first on mobile.</p>
    </div>
  );
}
