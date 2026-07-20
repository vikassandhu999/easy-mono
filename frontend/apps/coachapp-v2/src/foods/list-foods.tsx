import {Button, SearchField} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {
  BROWSE_LIST_FRAME_CLASS,
  BROWSE_LIST_SURFACE_CLASS,
  BROWSE_SEARCH_GROUP_CLASS,
} from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useResponsiveCreate} from '@/@hooks/use-responsive-create';
import {useCoachFoodsInfiniteQuery} from '@/api/nutrition-foods';
import CreateFood from '@/foods/create-food';

import FoodListItem from './food-list-item';

export default function ListFoods() {
  const navigate = useNavigate();
  const create = useResponsiveCreate(ROUTES.CREATE_FOOD);
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachFoodsInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);
  const total = list.data?.pages[0]?.count;

  if (create.isCreating) {
    return <CreateFood onClose={create.stopCreating} />;
  }

  return (
    <Page>
      <Page.Header
        className="bg-surface pb-1 sm:bg-transparent sm:pb-2"
        size="content"
      >
        <Page.TitleGroup>
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
            className="min-h-11 min-w-11 rounded-control"
            onPress={create.startCreating}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create food</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className="sticky top-0 z-10 mb-0 flex items-center gap-3 border-b border-border bg-surface pt-2 pb-3 sm:mb-6 sm:border-0 sm:bg-background"
        size="content"
      >
        <SearchField
          aria-label="Search foods"
          className="w-full sm:max-w-72"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className={BROWSE_SEARCH_GROUP_CLASS}>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-h-11 "
              placeholder="Search foods…"
            />
            <SearchField.ClearButton className="min-h-11 min-w-11  " />
          </SearchField.Group>
        </SearchField>
        {total != null && <span className="ms-auto hidden shrink-0 text-sm text-muted sm:block">{total} foods</span>}
      </Page.Toolbar>
      <Page.Content bare>
        <Page.Frame
          className={BROWSE_LIST_FRAME_CLASS}
          size="content"
        >
          <div className={BROWSE_LIST_SURFACE_CLASS}>
            <BrowseListBox
              ariaLabel="Foods"
              className="flex-1 p-0"
              emptyState={
                <ListEmptyState
                  createLabel="Create Food"
                  onCreate={create.startCreating}
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
