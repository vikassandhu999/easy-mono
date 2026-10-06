import {useEffect, useRef} from 'react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useFoodCategories, useFoods} from '../api/foods';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
export function Foods() {
  const [params] = useSearchParams();
  const {search, state: locationState} = useLocation();
  const state: unknown = locationState;
  const deleted =
    state && typeof state === 'object' && 'deleted' in state && typeof state.deleted === 'string'
      ? state.deleted
      : null;
  const category = params.get('category') || '';
  const query = useFoods({search: params.get('search')?.trim() ?? '', ...(category ? {categories: [category]} : {})});
  const filtered = Boolean(params.get('search') || category);
  return (
    <Page>
      <PageHeader
        title="Food library"
        description="Foods you can reuse in meal plans and recipes."
        back={{to: routes.nutritionPlans, label: 'Back to nutrition plans'}}
        actions={
          <Link
            to={routes.createFood}
            state={{listSearch: search}}
            className={buttonVariants()}
          >
            Create food
          </Link>
        }
      />
      {deleted && (
        <p
          role="status"
          className="text-sm"
        >
          {deleted} archived.
        </p>
      )}
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <ListSearch label="Search foods" />
        <CategoryFilter />
      </div>
      <InfiniteList
        query={query}
        label="foods"
        singular="food"
        empty={
          <Surface>
            <h2 className="section-title">{filtered ? 'No matching foods' : 'Create your first food'}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {filtered
                ? 'Try another name or category, or create the food you need.'
                : 'Add a food and its nutrition, then select it when building a meal.'}
            </p>
          </Surface>
        }
      >
        {(food) => (
          <Link
            to={generatePath(routes.food, {id: food.id})}
            state={{listSearch: search}}
            className="block space-y-1 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <p className="break-words font-semibold">{food.name}</p>
            {food.brand && <p className="break-words text-sm text-muted-foreground">{food.brand}</p>}
            <p className="text-sm text-muted-foreground">
              {food.nutrients.energy_kcal == null ? 'Calories unknown' : `${food.nutrients.energy_kcal} kcal per 100 g`}
              {food.source === 'system' ? ' · Shared food' : ''}
            </p>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}

function CategoryFilter() {
  const query = useFoodCategories();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const retryRequested = useRef(false);
  const [params, setParams] = useSearchParams();
  const {state} = useLocation();
  const category = params.get('category') || '';
  const choices = query.data?.data ?? [];
  useEffect(() => {
    if (!retryRequested.current || query.isFetching) {
      return;
    }
    retryRequested.current = false;
    if (document.activeElement === document.body || document.activeElement === retryRef.current) {
      (query.isError ? retryRef : triggerRef).current?.focus();
    }
  }, [query.isFetching, query.isError]);
  return (
    <div className="grid min-w-0 gap-2">
      <label
        id="food-category-label"
        htmlFor="food-category"
        className="text-sm font-medium"
      >
        Category
      </label>
      <SelectField
        id="food-category"
        triggerRef={triggerRef}
        value={category ? `category:${category}` : 'all'}
        isDisabled={query.isPending}
        onChange={(value) =>
          setParams(
            (current) => {
              const next = new URLSearchParams(current);
              if (value === 'all') {
                next.delete('category');
              } else {
                next.set('category', value.slice('category:'.length));
              }
              return next;
            },
            {replace: true, state},
          )
        }
      >
        <SelectItem id="all">All categories</SelectItem>
        {category && !choices.includes(category) && (
          <SelectItem
            id={`category:${category}`}
            textValue={category}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{category}</span>
          </SelectItem>
        )}
        {choices.map((value) => (
          <SelectItem
            key={value}
            id={`category:${value}`}
            textValue={value}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{value}</span>
          </SelectItem>
        ))}
      </SelectField>
      {query.isPending && (
        <p
          role="status"
          className="text-xs text-muted-foreground"
        >
          Loading categories…
        </p>
      )}
      {query.isError && (
        <div className="space-y-2">
          <FormError message="Could not refresh categories. You can still search foods or choose All categories." />
          <Button
            ref={retryRef}
            variant="ghost"
            size="sm"
            isPending={query.isFetching}
            onPress={() => {
              retryRequested.current = true;
              query.refetch();
            }}
          >
            Retry categories
          </Button>
        </div>
      )}
    </div>
  );
}
