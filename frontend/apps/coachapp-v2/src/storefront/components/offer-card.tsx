import {Chip} from '@heroui/react';
import {Gift} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {Offer} from '@/api/offers';

export default function OfferCard({offer}: {offer: Offer}) {
  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/storefront/offers/${offer.id}/edit`}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
        <Gift
          className="text-foreground-400"
          size={20}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{offer.name}</p>
        <p className="truncate text-xs text-foreground-500">
          {[offer.duration_text, offer.price_display].filter(Boolean).join(' · ') || 'No price set'}
        </p>
      </div>

      <div className="hidden gap-1.5 sm:flex">
        {offer.is_featured && (
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            Featured
          </Chip>
        )}
        <Chip
          color={offer.status === 'active' ? 'success' : 'default'}
          size="sm"
          variant="soft"
        >
          {offer.status}
        </Chip>
      </div>
    </Link>
  );
}
