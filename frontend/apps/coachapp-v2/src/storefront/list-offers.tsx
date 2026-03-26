import {Button} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Offer, useOffersInfiniteQuery} from '@/api/offers';
import OfferCard from '@/storefront/components/offer-card';

export default function ListOffers() {
  const navigate = useNavigate();

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useOffersInfiniteQuery();

  const offers = useMemo<Offer[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  return (
    <PageLayout
      action={
        <Button
          onPress={() => navigate(ROUTES.CREATE_OFFER)}
          size="sm"
        >
          <Plus size={16} />
          Create
        </Button>
      }
      title="Offers"
    >
      <Button
        className="mb-4"
        onPress={() => navigate(ROUTES.STOREFRONT)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft size={16} />
        Storefront
      </Button>

      <InfiniteList
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-medium text-foreground-500">No offers yet</p>
            <p className="text-xs text-foreground-400">Create your first offer to showcase on your storefront.</p>
            <Button
              className="mt-3"
              onPress={() => navigate(ROUTES.CREATE_OFFER)}
              size="sm"
            >
              <Plus size={16} />
              Create Offer
            </Button>
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={offers}
        keyExtractor={(offer) => offer.id}
        renderItem={(offer) => <OfferCard offer={offer} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
