import {Button, Card, Input, Skeleton, TextField} from '@heroui/react';
import {Apple, ArrowLeft, ChevronRight, CookingPot, UtensilsCrossed} from 'lucide-react';
import {Fragment, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {useListFoodsQuery} from '@/entities/foods/api/foods';
import {useGetMealQuery} from '@/entities/meals/api/meals';
import {useListRecipesQuery} from '@/entities/recipes/api/recipes';

export default function MealItemPickerPage() {
  const navigate = useNavigate();
  const {id: planId = '', mealId = ''} = useParams();
  const backTo = `/library/nutrition-plans/${planId}/builder/meals/${mealId}/edit`;

  const {data: mealData, isLoading: isMealLoading} = useGetMealQuery(mealId, {
    skip: !mealId,
  });
  const {data: foodsData, isLoading: isFoodsLoading} = useListFoodsQuery({
    limit: 250,
    offset: 0,
  });
  const {data: recipesData, isLoading: isRecipesLoading} = useListRecipesQuery({limit: 250, offset: 0});

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'food' | 'recipe'>('food');

  const meal = mealData?.data;
  const isLoading = isMealLoading || isFoodsLoading || isRecipesLoading;

  const items = useMemo(
    () => (tab === 'food' ? (foodsData?.data ?? []) : (recipesData?.data ?? [])),
    [foodsData?.data, recipesData?.data, tab],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.name.toLowerCase().includes(term));
  }, [items, search]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(backTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Meal
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add item</h1>
        {meal && <p className="mt-1 text-sm text-muted">{meal.name}</p>}
      </div>

      <div className="border-t border-separator" />

      <div className="flex gap-2">
        <Button
          className="min-h-9"
          onPress={() => {
            setTab('food');
            setSearch('');
          }}
          size="sm"
          variant={tab === 'food' ? 'secondary' : 'ghost'}
        >
          Food
        </Button>
        <Button
          className="min-h-9"
          onPress={() => {
            setTab('recipe');
            setSearch('');
          }}
          size="sm"
          variant={tab === 'recipe' ? 'secondary' : 'ghost'}
        >
          Recipe
        </Button>
      </div>

      <TextField>
        <Input
          className="min-h-11"
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'food' ? 'Search foods...' : 'Search recipes...'}
          value={search}
          variant="secondary"
        />
      </TextField>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <UtensilsCrossed className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No {tab === 'food' ? 'foods' : 'recipes'} found</p>
        </div>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {filtered.map((item, i) => {
            const Icon = tab === 'food' ? Apple : CookingPot;
            return (
              <Fragment key={item.id}>
                {i > 0 && <div className="border-t border-separator" />}
                <button
                  className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-left outline-none hover:bg-surface-secondary"
                  onClick={() =>
                    navigate(`/library/nutrition-plans/${planId}/builder/meals/${mealId}/items/new/${tab}/${item.id}`, {
                      state: {itemName: item.name},
                    })
                  }
                  type="button"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                    <Icon className="h-4 w-4 text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    {item.category && <p className="text-xs capitalize text-muted">{item.category}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </Fragment>
            );
          })}
        </Card>
      )}
    </div>
  );
}
