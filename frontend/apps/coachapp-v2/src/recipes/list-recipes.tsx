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
import {useCoachRecipesInfiniteQuery} from '@/api/nutrition-foods';

import RecipeListItem from './recipe-list-item';

export default function ListRecipes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachRecipesInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);
  const total = list.data?.pages[0]?.count;

  return (
    <Page>
      <Page.Header
        className="bg-surface pb-1 sm:bg-transparent sm:pb-2"
        size="content"
      >
        <Page.TitleGroup>
          <div className="min-w-0">
            <Page.Title>Recipes</Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Combine foods into reusable dishes for nutrition plans
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Create recipe"
            className="min-h-11 min-w-11 rounded-control"
            onPress={() => navigate(ROUTES.CREATE_RECIPE)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create recipe</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className="sticky top-0 z-10 mb-0 flex items-center gap-3 border-b border-border bg-surface pt-2 pb-3 sm:mb-6 sm:border-0 sm:bg-background"
        size="content"
      >
        <SearchField
          aria-label="Search recipes"
          className="w-full sm:max-w-72"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className={BROWSE_SEARCH_GROUP_CLASS}>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-h-11"
              placeholder="Search recipes…"
            />
            <SearchField.ClearButton className="min-h-11 min-w-11" />
          </SearchField.Group>
        </SearchField>
        {total != null && <span className="ms-auto hidden shrink-0 text-sm text-muted sm:block">{total} recipes</span>}
      </Page.Toolbar>
      <Page.Content bare>
        <Page.Frame
          className={BROWSE_LIST_FRAME_CLASS}
          size="content"
        >
          <div className={BROWSE_LIST_SURFACE_CLASS}>
            <BrowseListBox
              ariaLabel="Recipes"
              className="flex-1 p-0"
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
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
