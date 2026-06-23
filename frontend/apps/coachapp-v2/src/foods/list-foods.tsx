import {Button, SearchField} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useFoodsInfiniteQuery} from '@/api/foods';

import FoodListItem from './food-list-item';

export default function ListFoods() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useFoodsInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isLoading, items} = useInfiniteItems(list);

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className={'flex items-center'}>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
            isIconOnly
            className={'lg:hidden'}
          >
            <ArrowLeft size={18} />
          </Button>
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
      <Page.Toolbar className={'sticky top-0 z-10 flex flex-col gap-3 pt-2 pb-3 bg-surface border-b'}>
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
          isLoading={isLoading}
          items={items}
          onAction={(key) => navigate(ROUTES.FOOD_DETAIL.replace(':id', String(key)))}
          renderItem={(food) => <FoodListItem food={food} />}
        />
      </Page.Content>
    </Page>
  );
}
