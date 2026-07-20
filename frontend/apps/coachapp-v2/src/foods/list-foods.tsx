import {Button, SearchField} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachFoodsInfiniteQuery} from '@/api/nutrition-foods';

import FoodListItem from './food-list-item';

export default function ListFoods() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachFoodsInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);
  const total = list.data?.pages[0]?.count;

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton
            className={'lg:hidden'}
            onPress={goBack}
          />
          <div className="min-w-0">
            <Page.Title>Foods</Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Your ingredient library for building nutrition plans
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Create food"
            onPress={() => navigate(ROUTES.CREATE_FOOD)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create food</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className={'sticky top-0 z-10 flex items-center gap-3 bg-background pt-2 pb-3'}
        size="content"
      >
        <SearchField
          aria-label="Search foods"
          className="w-full sm:max-w-72"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search foods…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {total != null && <span className="ms-auto hidden shrink-0 text-sm text-muted sm:block">{total} foods</span>}
      </Page.Toolbar>
      <Page.Content bare>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="content"
        >
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <BrowseListBox
              ariaLabel="Foods"
              className="flex-1 p-0"
              emptyState={
                <ListEmptyState
                  createLabel="Create Food"
                  createRoute={ROUTES.CREATE_FOOD}
                  emptyDescription="Create your first food to get started."
                  hasFilter={!!deferredSearch}
                  nounPlural="foods"
                />
              }
              fetchNextPage={fetchNextPage}
              isError={isError}
              isLoading={isLoading}
              onRetry={refetch}
              items={items}
              onAction={(key) => navigate(ROUTES.FOOD_DETAIL.replace(':id', String(key)))}
              renderItem={(food) => <FoodListItem food={food} />}
            />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
