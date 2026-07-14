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

  return (
    <Page>
      <Page.Header size="list">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton
            className={'lg:hidden'}
            onPress={goBack}
          />
          <Page.Title>Foods</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_FOOD)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className={'sticky top-0 z-10 flex flex-col gap-3 pt-2 pb-3 bg-surface border-b'}
        size="list"
      >
        <SearchField
          aria-label="Search foods"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
          variant={'secondary'}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search foods..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Page.Toolbar>
      <Page.Content>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
          <BrowseListBox
            ariaLabel="Foods"
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
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
