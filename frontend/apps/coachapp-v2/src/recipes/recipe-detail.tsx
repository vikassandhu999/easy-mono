import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, Spinner, Typography} from '@heroui/react';
import {ArrowLeft, ChefHat, Pencil, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useDeleteRecipeMutation, useGetRecipeQuery} from '@/api/recipes';

const MACRO_LABELS: Record<string, {label: string; unit: string}> = {
  calories_per_100g: {label: 'Calories', unit: ''},
  protein_g: {label: 'Protein', unit: 'g'},
  carbs_g: {label: 'Carbs', unit: 'g'},
  fats_g: {label: 'Fats', unit: 'g'},
  fiber_g: {label: 'Fiber', unit: 'g'},
  sugar_g: {label: 'Sugar', unit: 'g'},
};

export default function RecipeDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.RECIPES);
  const {data, isError, isLoading} = useGetRecipeQuery(id!);
  const [deleteRecipe, {isLoading: isDeleting}] = useDeleteRecipeMutation();

  const handleDelete = async () => {
    try {
      await deleteRecipe(id!).unwrap();
      navigate(ROUTES.RECIPES, {replace: true});
    } catch {
      // Mutation error — could add a toast here in the future.
    }
  };

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Recipes
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Recipe couldn&apos;t load. It may not exist, or you may not have access
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const recipe = data.data;
  const macroEntries = Object.entries(recipe.macros);
  const knownMacros = macroEntries.filter(([key, value]) => key in MACRO_LABELS && value !== 0);
  const unknownMacros = macroEntries.filter(([key, value]) => !(key in MACRO_LABELS) && value !== 0);

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Recipe</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar className="flex items-center gap-2">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Recipes
        </Button>
        <Button
          onPress={() => navigate(`/library/recipes/${recipe.id}/edit`)}
          size="sm"
          variant="secondary"
        >
          <Pencil size={16} />
          Edit
        </Button>
        <AlertDialog>
          <Button
            size="sm"
            variant="danger"
          >
            <Trash2 size={16} />
            Delete
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Delete recipe?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Typography>
                    This will permanently delete <strong>{recipe.name}</strong>. This action cannot be undone.
                  </Typography>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    slot="close"
                    variant="tertiary"
                  >
                    Cancel
                  </Button>
                  <Button
                    isPending={isDeleting}
                    onPress={handleDelete}
                    variant="danger"
                  >
                    {isDeleting ? 'Deleting' : 'Delete'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </Page.Toolbar>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-lg">
          <div className="flex items-start gap-4 pb-6">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-content2">
              {recipe.image_url ? (
                <img
                  alt={recipe.name}
                  className="size-14 rounded-xl object-cover"
                  src={recipe.image_url}
                />
              ) : (
                <ChefHat
                  className="text-foreground-400"
                  size={24}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Typography type="h5">{recipe.name}</Typography>
              {(recipe.category || recipe.source) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {recipe.category && (
                    <Chip
                      size="sm"
                      variant="soft"
                    >
                      {recipe.category}
                    </Chip>
                  )}
                  {recipe.source && (
                    <Chip
                      color="default"
                      size="sm"
                      variant="soft"
                    >
                      {recipe.source}
                    </Chip>
                  )}
                </div>
              )}
            </div>
          </div>

          {recipe.cooked_weight_g != null && recipe.cooked_weight_g > 0 && (
            <section className="border-t border-divider py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Cooked weight
              </Typography>
              <Typography
                type="body-sm"
                weight="medium"
              >
                {recipe.cooked_weight_g}g
              </Typography>
            </section>
          )}

          {(knownMacros.length > 0 || unknownMacros.length > 0) && (
            <section className="border-t border-divider py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Nutrition for 100 g
              </Typography>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {knownMacros.map(([key, value]) => {
                  const meta = MACRO_LABELS[key] as {
                    label: string;
                    unit: string;
                  };
                  return (
                    <div key={key}>
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        {meta.label}
                      </Typography>
                      <Typography weight="medium">
                        {value}
                        {meta.unit}
                      </Typography>
                    </div>
                  );
                })}
                {unknownMacros.map(([key, value]) => (
                  <div key={key}>
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {key}
                    </Typography>
                    <Typography weight="medium">{value}</Typography>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recipe.recipe_ingredients.length > 0 && (
            <section className="border-t border-divider py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Ingredients
              </Typography>
              <div className="flex flex-col gap-2">
                {recipe.recipe_ingredients.map((ingredient, i) => {
                  const hasAmount = ingredient.amount != null && ingredient.amount !== 0;
                  const hasWeight = ingredient.weight_g != null && ingredient.weight_g !== 0;
                  const amountPart = hasAmount
                    ? `${ingredient.amount}${ingredient.unit ? ` ${ingredient.unit}` : ''}`
                    : null;
                  const weightPart = hasWeight ? `${ingredient.weight_g}g` : null;
                  const detail = [amountPart, weightPart].filter(Boolean).join(' · ');

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-divider px-3 py-2 text-sm"
                      key={i}
                    >
                      <Typography
                        className="min-w-0 flex-1"
                        truncate
                        weight="medium"
                      >
                        {ingredient.food.name}
                      </Typography>
                      {detail && (
                        <Typography
                          color="muted"
                          type="body-sm"
                        >
                          {detail}
                        </Typography>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {recipe.instructions && (
            <section className="border-t border-divider py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Instructions
              </Typography>
              <Typography
                className="whitespace-pre-wrap"
                type="body-sm"
              >
                {recipe.instructions}
              </Typography>
            </section>
          )}

          {recipe.serving_sizes.length > 0 && (
            <section className="border-t border-divider py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Serving sizes
              </Typography>
              <div className="flex flex-col gap-2">
                {recipe.serving_sizes.map((serving, i) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-divider px-3 py-2 text-sm"
                    key={i}
                  >
                    <Typography weight="medium">
                      {serving.amount ?? 1} {serving.unit}
                    </Typography>
                    {serving.weight_g != null && serving.weight_g > 0 && (
                      <Typography
                        color="muted"
                        type="body-sm"
                      >
                        {serving.weight_g}g
                      </Typography>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {recipe.tags.length > 0 && (
            <section className="border-t border-divider py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Tags
              </Typography>
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map((tag) => (
                  <Chip
                    key={tag}
                    size="sm"
                    variant="soft"
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-divider py-4">
            <Typography
              className="mb-2"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Details
            </Typography>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  Created
                </Typography>
                <Typography>{formatIsoDateOnly(recipe.inserted_at)}</Typography>
              </div>
              <div>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  Last updated
                </Typography>
                <Typography>{formatIsoDateOnly(recipe.updated_at)}</Typography>
              </div>
            </div>
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}
