import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useListFoodCategoriesQuery} from '@/api/generated';
import {useCoachFoodsInfiniteQuery} from '@/api/nutrition-foods';
import MultiSelectAutocomplete from '@/exercises/components/multi-select-autocomplete';

import FoodListItem from './food-list-item';

export default function ListFoods() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const deferredSearch = useDeferredValue(search);
  const list = useCoachFoodsInfiniteQuery({categories, search: deferredSearch});
  // `category` is a free-form column, so the options are whatever the library
  // actually contains rather than an enum the frontend could hard-code.
  const {data: categoryData} = useListFoodCategoriesQuery();
  const categoryOptions = (categoryData?.data ?? []).map((name) => ({id: name, name}));
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);
  const total = list.data?.pages[0]?.count;

  return (
    <BrowseScreen
      action={{icon: <Plus />, label: 'Create food', to: ROUTES.CREATE_FOOD}}
      backTo={ROUTES.LIBRARY}
      description="Your ingredient library for building nutrition plans"
      empty={
        <ListEmptyState
          createLabel="Create food"
          createRoute={ROUTES.CREATE_FOOD}
          emptyDescription="Create your first food to get started."
          hasFilter={!!deferredSearch || categories.length > 0}
          nounPlural="foods"
        />
      }
      onOpen={(key) => navigate(ROUTES.FOOD_DETAIL.replace(':id', String(key)))}
      query={{fetchNextPage, isError, isLoading, items, refetch}}
      row={(food) => <FoodListItem food={food} />}
      search={{onChange: setSearch, placeholder: 'Search foods\u2026', value: search}}
      title="Foods"
      toolbarExtra={
        categoryOptions.length > 0 ? (
          <MultiSelectAutocomplete
            collapseToCount
            emptyMessage="No categories found"
            items={categoryOptions}
            name="categories"
            onChange={setCategories}
            placeholder="Categories"
            searchPlaceholder="Search categories"
            value={categories}
          />
        ) : null
      }
      total={total ?? undefined}
    />
  );
}
