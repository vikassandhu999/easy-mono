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
import {useCoachRecipesInfiniteQuery} from '@/api/nutrition-foods';

import RecipeListItem from './recipe-list-item';

export default function ListRecipes() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachRecipesInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  return (
    <Page>
      <Page.Header size="list">
        <Page.TitleGroup className="flex items-center">
          <BackButton
            className={'lg:hidden'}
            onPress={goBack}
          />
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
      <Page.Toolbar
        className={'sticky top-0 z-10 flex flex-col gap-3 border-b bg-surface pt-2 pb-3'}
        size="list"
      >
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
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
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
            isError={isError}
            isLoading={isLoading}
            onRetry={refetch}
            items={items}
            onAction={(key) => navigate(ROUTES.RECIPE_DETAIL.replace(':id', String(key)))}
            renderItem={(recipe) => <RecipeListItem recipe={recipe} />}
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
