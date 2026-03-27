import {Button, Chip} from '@heroui/react';
import {Gift, Star} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import type {Offer} from '@/api/offers';

import {ROUTES} from '@/@config/routes';

export default function OffersSummary({offers}: {offers: Offer[]}) {
  const navigate = useNavigate();

  if (offers.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground-500">No offers yet. Create offers to show pricing on your page.</p>
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT_OFFERS)}
          size="sm"
          variant="secondary"
        >
          <Gift size={14} />
          Go to Offers
        </Button>
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
              <Chip
                color="warning"
                size="sm"
              >
                Featured
              </Chip>
            ) : null}
          </div>
        ))}
      </div>

      <Button
        onPress={() => navigate(ROUTES.STOREFRONT_OFFERS)}
        size="sm"
        variant="secondary"
      >
        <Gift size={14} />
        Manage Offers
      </Button>

      <p className="text-xs text-foreground-400">Featured offer is shown first on mobile.</p>
    </div>
  );
}
