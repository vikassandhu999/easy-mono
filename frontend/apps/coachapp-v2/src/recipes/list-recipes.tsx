import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
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
    <BrowseScreen
      action={{icon: <Plus className="size-4" />, label: 'Create recipe', to: ROUTES.CREATE_RECIPE}}
      backTo={ROUTES.LIBRARY}
      description="Combine foods into reusable dishes for nutrition plans"
      empty={
        <ListEmptyState
          createLabel="Create recipe"
          createRoute={ROUTES.CREATE_RECIPE}
          emptyDescription="Create your first recipe to get started."
          hasFilter={!!deferredSearch}
          nounPlural="recipes"
        />
      }
      onOpen={(key) => navigate(ROUTES.RECIPE_DETAIL.replace(':id', String(key)))}
      query={{fetchNextPage, isError, isLoading, items, refetch}}
      row={(recipe) => <RecipeListItem recipe={recipe} />}
      search={{onChange: setSearch, placeholder: 'Search recipes\u2026', value: search}}
      title="Recipes"
      total={total ?? undefined}
    />
  );
}
