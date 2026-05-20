import {Button, Typography} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import InfiniteList from '@/@components/infinite-list';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Offer, useOffersInfiniteQuery} from '@/api/offers';
import OfferCard from '@/storefront/components/offer-card';

export default function ListOffers() {
  const navigate = useNavigate();

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useOffersInfiniteQuery();

  const offers = useMemo<Offer[]>(() => {
    if (!data?.pages) {
      return [];
    }
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Offers</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_OFFER)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={() => navigate(ROUTES.STOREFRONT)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Storefront
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <InfiniteList
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Typography
                type="body-sm"
                weight="medium"
              >
                No offers yet
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                Create your first offer to showcase on your storefront
              </Typography>
              <Button
                className="mt-3"
                onPress={() => navigate(ROUTES.CREATE_OFFER)}
                size="sm"
              >
                <Plus size={16} />
                Create offer
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
      </Page.Content>
    </Page>
  );
}
