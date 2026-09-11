import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useFoods} from '../api/foods';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
export function Foods() {
  const [params] = useSearchParams();
  const {search} = useLocation();
  const query = useFoods(params.get('search')?.trim() ?? '');
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
      <ListSearch label="Search foods" />
      <InfiniteList
        query={query}
        label="foods"
        singular="food"
        empty={
          <Surface>
            <h2 className="section-title">{params.get('search') ? 'No matching foods' : 'Create your first food'}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {params.get('search')
                ? 'Try another name, or create the food you need.'
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
              {food.calories_per_100g === null ? 'Calories unknown' : `${food.calories_per_100g} kcal per 100 g`}
              {food.source === 'system' ? ' · Shared food' : ''}
            </p>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
