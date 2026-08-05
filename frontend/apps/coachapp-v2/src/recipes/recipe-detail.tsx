import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, Typography, toast} from '@heroui/react';
import {ChefHat, Copy, Pencil, Trash2} from 'lucide-react';
import type {ReactNode} from 'react';
import {generatePath, useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {OUTLINE_CHIP_CLASS} from '@/@components/browse-list-box';
import {DETAIL_SECTION_CLASS, DetailSectionHeading} from '@/@components/detail-section-heading';
import {ErrorState} from '@/@components/error-state';
import {MacroBreakdownCard} from '@/@components/macro-breakdown-card';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Recipe} from '@/api/nutrition-foods';
import {useCopyNutritionRecipeMutation, useDeleteRecipeMutation, useGetRecipeQuery} from '@/api/nutrition-foods';

// recipe.nutrition holds the recipe's total computed macros (not per-100g).
// The backend derives it from recipe_ingredients; it is null when no ingredient
// carries weight data. We display it as recipe totals.
type RecipeNutrition = NonNullable<Recipe['nutrition']>;

const MACRO_SEGMENTS: {color: 'accent' | 'success' | 'warning'; key: keyof RecipeNutrition; label: string}[] = [
  {color: 'accent', key: 'protein_g', label: 'Protein'},
  {color: 'success', key: 'carbs_g', label: 'Carbs'},
  {color: 'warning', key: 'fat_g', label: 'Fats'},
];

export default function RecipeDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.RECIPES);
  const {data, isError, isLoading, refetch} = useGetRecipeQuery(id!);
  const deleteRecipe = useDeleteRecipeMutation();
  const copyRecipe = useCopyNutritionRecipeMutation();
  const isDeleting = deleteRecipe.isPending;
  const isDuplicating = copyRecipe.isPending;

  const handleDuplicate = async () => {
    try {
      const result = await copyRecipe.mutateAsync(id!);
      toast.success('Recipe duplicated');
      navigate(generatePath(ROUTES.RECIPE_DETAIL, {id: result.data.id}));
    } catch {
      toast.danger("Recipe wasn't duplicated");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecipe.mutateAsync(id!);
      navigate(ROUTES.RECIPES, {replace: true});
    } catch {
      toast.danger("Couldn't delete recipe");
    }
  };

  const renderDeleteDialog = (trigger: ReactNode, recipeName: string) => (
    <AlertDialog>
      {trigger}
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete recipe?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                This will permanently delete <strong>{recipeName}</strong>. This action cannot be undone.
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
  );

  if (isLoading) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load recipe."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const recipe = data.data;
  const ingredientCount = recipe.recipe_ingredients.length;
  // Render ingredients in their stored order (position is the source of truth).
  const orderedIngredients = [...recipe.recipe_ingredients].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const nutrition = recipe.nutrition;
  const kcal = nutrition?.calories;
  const segments = MACRO_SEGMENTS.map((s) => ({...s, value: (nutrition?.[s.key] as number | null) ?? 0})).filter(
    (s) => s.value > 0,
  );
  const fiber = nutrition?.fiber_g;

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton onPress={goBack} />
        </Page.TitleGroup>
        <Page.Actions className="hidden sm:flex">
          <Button
            className="bg-ink text-ink-foreground"
            onPress={() => navigate(generatePath(ROUTES.EDIT_RECIPE, {id: recipe.id}))}
          >
            <Pencil />
            Edit
          </Button>
          <Button
            isPending={isDuplicating}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy />
            Duplicate
          </Button>
          {renderDeleteDialog(
            <Button
              aria-label="Delete recipe"
              className="text-danger"
              variant="outline"
            >
              <Trash2 />
            </Button>,
            recipe.name,
          )}
        </Page.Actions>
      </Page.Header>

      <Page.Content
        bare
        className="pb-6"
      >
        <Page.Frame size="content">
          <div className="flex items-start gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-card bg-surface-secondary">
              <ChefHat className="size-8 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <Page.Title className="wrap-break-word whitespace-normal">{recipe.name}</Page.Title>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip
                  className={OUTLINE_CHIP_CLASS}
                  variant="secondary"
                >
                  {ingredientCount} {ingredientCount === 1 ? 'ingredient' : 'ingredients'}
                </Chip>
                {recipe.cooked_weight_g != null && recipe.cooked_weight_g > 0 && (
                  <Chip
                    className={OUTLINE_CHIP_CLASS}
                    variant="secondary"
                  >
                    {recipe.cooked_weight_g} g cooked
                  </Chip>
                )}
              </div>
            </div>
          </div>

          {(kcal != null || segments.length > 0) && (
            <section className={DETAIL_SECTION_CLASS}>
              <DetailSectionHeading
                detail="recipe totals"
                title="Nutrition"
              />
              <MacroBreakdownCard
                caption="kcal total"
                fiber={fiber}
                kcal={kcal}
                segments={segments}
              />
            </section>
          )}

          {ingredientCount > 0 && (
            <section className={DETAIL_SECTION_CLASS}>
              <DetailSectionHeading title="Ingredients" />
              <div className="mt-3 flex flex-col gap-2">
                {orderedIngredients.map((ingredient, i) => {
                  const hasAmount = ingredient.amount != null && ingredient.amount !== 0;
                  const hasWeight = ingredient.weight_g != null && ingredient.weight_g !== 0;
                  const amountPart = hasAmount && ingredient.unit ? `${ingredient.amount} ${ingredient.unit}` : null;
                  const weightPart = hasWeight ? `${ingredient.weight_g} g` : null;
                  const detail = [amountPart, weightPart].filter(Boolean).join(' · ');

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3"
                      key={i}
                    >
                      <Typography
                        className="min-w-0 flex-1"
                        truncate
                        type="body-sm"
                        weight="semibold"
                      >
                        {ingredient.food?.name ?? 'Unknown ingredient'}
                      </Typography>
                      {detail && (
                        <Typography
                          className="shrink-0 tabular-nums"
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
            <section className={DETAIL_SECTION_CLASS}>
              <DetailSectionHeading title="Instructions" />
              <Typography
                className="mt-3 whitespace-pre-wrap"
                color="muted"
              >
                {recipe.instructions}
              </Typography>
            </section>
          )}

          <section className="mt-8 border-t border-separator pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Created
                </Typography>
                <Typography type="body-sm">{formatIsoDateOnly(recipe.inserted_at)}</Typography>
              </div>
              <div>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Updated
                </Typography>
                <Typography type="body-sm">{formatIsoDateOnly(recipe.updated_at)}</Typography>
              </div>
            </div>
          </section>
        </Page.Frame>

        <div className="sticky bottom-0 z-10 mt-6 flex items-center gap-2 border-t border-separator bg-surface px-4 py-3 sm:hidden">
          <Button
            className="flex-1"
            onPress={() => navigate(generatePath(ROUTES.EDIT_RECIPE, {id: recipe.id}))}
            variant="primary"
          >
            <Pencil />
            Edit
          </Button>
          <Button
            isIconOnly
            aria-label="Duplicate recipe"
            isPending={isDuplicating}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy />
          </Button>
          {renderDeleteDialog(
            <Button
              isIconOnly
              aria-label="Delete recipe"
              className="text-danger"
              variant="outline"
            >
              <Trash2 />
            </Button>,
            recipe.name,
          )}
        </div>
      </Page.Content>
    </Page>
  );
}
