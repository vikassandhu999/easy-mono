import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useRecipes} from '../api/recipes';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
export function Recipes() {
  const [params] = useSearchParams();
  const {search} = useLocation();
  const query = useRecipes(params.get('search')?.trim() ?? '');
  return (
    <Page>
      <PageHeader
        title="Recipe library"
        description="Prepare ingredients once, then reuse a recipe in meal plans."
        back={{to: routes.nutritionPlans, label: 'Back to nutrition plans'}}
        actions={
          <Link
            to={routes.createRecipe}
            state={{listSearch: search}}
            className={buttonVariants()}
          >
            Create recipe
          </Link>
        }
      />
      <ListSearch label="Search recipes" />
      <InfiniteList
        query={query}
        label="recipes"
        singular="recipe"
        empty={
          <Surface>
            <h2 className="section-title">
              {params.get('search') ? 'No matching recipes' : 'Create your first recipe'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {params.get('search')
                ? 'Try another name, or create the recipe you need.'
                : 'Bring ingredients and preparation notes together for your next meal plan.'}
            </p>
          </Surface>
        }
      >
        {(recipe) => (
          <Link
            to={generatePath(routes.recipe, {id: recipe.id})}
            state={{listSearch: search}}
            className="block space-y-1 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <p className="break-words font-semibold">{recipe.name}</p>
            <p className="text-sm text-muted-foreground">
              Makes {recipe.servings_count} {recipe.servings_count === 1 ? 'serving' : 'servings'}
            </p>
            {recipe.description && <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>}
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
