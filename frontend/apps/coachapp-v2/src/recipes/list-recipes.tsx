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
import {useRecipesInfiniteQuery} from '@/api/recipes';

import RecipeListItem from './recipe-list-item';

export default function ListRecipes() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useRecipesInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isLoading, items} = useInfiniteItems(list);

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className="flex items-center">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
            isIconOnly
            className={'lg:hidden'}
          >
            <ArrowLeft size={18} />
          </Button>
          <Page.Title>Recipes</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_RECIPE)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar className={'sticky top-0 z-10 flex flex-col gap-3 pt-2 pb-3 border-b'}>
        <SearchField
          aria-label="Search recipes"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
          variant={'secondary'}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search recipes..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Page.Toolbar>
      <Page.Content>
        <BrowseListBox
          ariaLabel="Recipes"
          emptyState={
            <ListEmptyState
              createLabel="Create Recipe"
              createRoute={ROUTES.CREATE_RECIPE}
              emptyDescription="Create your first recipe to get started."
              hasFilter={!!deferredSearch}
              nounPlural="recipes"
            />
          }
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          items={items}
          onAction={(key) => navigate(ROUTES.RECIPE_DETAIL.replace(':id', String(key)))}
          renderItem={(recipe) => <RecipeListItem recipe={recipe} />}
        />
      </Page.Content>
    </Page>
  );
}
