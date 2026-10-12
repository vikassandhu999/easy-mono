import {Pill} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useFoods} from '../api/foods';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {basisLabel} from './food';

export function Foods() {
  const [params, setParams] = useSearchParams();
  const {search, state} = useLocation();
  const kind = params.get('kind');
  const filterKind = kind === 'food' || kind === 'supplement' ? kind : null;
  const query = useFoods({search: params.get('search')?.trim() ?? '', ...(filterKind ? {kind: filterKind} : {})});
  const filtered = Boolean(params.get('search') || filterKind);
  return (
    <Page>
      <PageHeader
        title="Food catalogue"
        description="Foods and supplements for your clients’ meals."
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
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <ListSearch label="Search foods and supplements" />
        <div className="grid gap-2">
          <label
            id="food-kind-label"
            htmlFor="food-kind"
            className="text-sm font-medium"
          >
            Kind
          </label>
          <SelectField
            id="food-kind"
            value={filterKind ?? 'all'}
            onChange={(value) =>
              setParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  if (value === 'all') {
                    next.delete('kind');
                  } else {
                    next.set('kind', value);
                  }
                  return next;
                },
                {replace: true, state},
              )
            }
          >
            <SelectItem id="all">Foods and supplements</SelectItem>
            <SelectItem id="food">Foods</SelectItem>
            <SelectItem id="supplement">Supplements</SelectItem>
          </SelectField>
        </div>
      </div>
      <InfiniteList
        query={query}
        label="foods and supplements"
        singular="food or supplement"
        empty={
          <Surface>
            <h2 className="section-title">{filtered ? 'No matching foods' : 'Create your first food'}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {filtered
                ? 'Try another name or kind, or create the food you need.'
                : 'Add a food or supplement and its known nutrients.'}
            </p>
          </Surface>
        }
      >
        {(food) => (
          <Link
            to={generatePath(routes.food, {id: food.id})}
            state={{listSearch: search}}
            className="flex items-start gap-3 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <span className="mt-1 size-5 shrink-0">
              {food.kind === 'supplement' && (
                <Pill
                  aria-hidden="true"
                  className="size-5"
                />
              )}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="break-words font-semibold">{food.name}</p>
              <p className="text-sm text-muted-foreground">
                {food.kind === 'supplement' ? 'Supplement' : 'Food'} ·{' '}
                {food.nutrients.energy_kcal === undefined ? 'Energy not listed' : `${food.nutrients.energy_kcal} kcal`}{' '}
                · per {basisLabel(food)}
              </p>
            </div>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
