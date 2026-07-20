import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, ProgressBar, Typography, toast} from '@heroui/react';
import {ChefHat, Copy, Pencil, Trash2} from 'lucide-react';
import type {ReactNode} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {OUTLINE_CHIP_CLASS} from '@/@components/browse-list-box';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Recipe} from '@/api/generated';
import {useCopyNutritionRecipeMutation, useDeleteRecipeMutation, useGetRecipeQuery} from '@/api/generated';

// recipe.nutrition holds the recipe's total computed macros (not per-100g).
// The backend derives it from recipe_ingredients; it is null when no ingredient
// carries weight data. We display it as recipe totals.
type RecipeNutrition = NonNullable<Recipe['nutrition']>;

const MACRO_SEGMENTS: {color: 'accent' | 'success' | 'warning'; key: keyof RecipeNutrition; label: string}[] = [
  {color: 'accent', key: 'protein_g', label: 'Protein'},
  {color: 'success', key: 'carbs_g', label: 'Carbs'},
  {color: 'warning', key: 'fat_g', label: 'Fats'},
];

const LEGEND_DOT: Record<string, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  muted: 'bg-muted',
};

function SectionHeading({detail, title}: {detail?: string; title: string}) {
  return (
    <div className="flex items-baseline gap-2">
      <Typography type="h6">{title}</Typography>
      {detail && (
        <Typography
          color="muted"
          type="body-sm"
        >
          · {detail}
        </Typography>
      )}
    </div>
  );
}

function LegendEntry({dot, label, value}: {dot: string; label: string; value: number}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${LEGEND_DOT[dot]}`} />
        <Typography
          color="muted"
          type="body-sm"
        >
          {label}
        </Typography>
      </div>
      <Typography
        className="tabular-nums"
        type="body"
        weight="semibold"
      >
        {Math.round(value * 10) / 10}
        <span className="text-xs font-normal text-muted">g</span>
      </Typography>
    </div>
  );
}

export default function RecipeDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.RECIPES);
  const {data, isError, isLoading} = useGetRecipeQuery({id: id!});
  const [deleteRecipe, {isLoading: isDeleting}] = useDeleteRecipeMutation();
  const [copyRecipe, {isLoading: isDuplicating}] = useCopyNutritionRecipeMutation();

  const handleDuplicate = async () => {
    try {
      const result = await copyRecipe({id: id!}).unwrap();
      toast.success('Recipe duplicated');
      navigate(`/library/recipes/${result.data.id}`);
    } catch {
      toast.danger("Recipe wasn't duplicated");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecipe({id: id!}).unwrap();
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
          <AlertDialog.Dialog className="sm:max-w-100">
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
        <Page.Header>
          <Page.TitleGroup>
            <Page.Title>Recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pb-6">
          <ErrorState message="Recipe couldn't load. It may not exist, or you may not have access" />
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
      <Page.Header>
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton onPress={goBack} />
          <Page.Title className="sm:hidden">Recipe</Page.Title>
        </Page.TitleGroup>
        <Page.Actions className="hidden sm:flex">
          <Button
            className="bg-ink text-ink-foreground"
            onPress={() => navigate(`/library/recipes/${recipe.id}/edit`)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            isPending={isDuplicating}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy className="size-4" />
            Duplicate
          </Button>
          {renderDeleteDialog(
            <Button
              aria-label="Delete recipe"
              className="text-danger"
              variant="outline"
            >
              <Trash2 className="size-4" />
            </Button>,
            recipe.name,
          )}
        </Page.Actions>
      </Page.Header>

      <Page.Content className="pb-6">
        <div className="max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary">
              <ChefHat className="size-8 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <Typography
                className="break-words"
                type="h3"
              >
                {recipe.name}
              </Typography>
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
            <section className="mt-8">
              <SectionHeading
                detail="recipe totals"
                title="Nutrition"
              />
              <div className="mt-3 rounded-card border border-border bg-surface p-5">
                {kcal != null && (
                  <div className="flex items-baseline gap-2">
                    <Typography
                      className="tabular-nums"
                      type="h1"
                    >
                      {Math.round(kcal)}
                    </Typography>
                    <Typography color="muted">kcal total</Typography>
                  </div>
                )}
                {segments.length > 0 && (
                  <>
                    <div className="mt-4 flex gap-0.5">
                      {segments.map((s) => (
                        <div
                          className="min-w-4"
                          key={s.label}
                          // ponytail: flexGrow is the one genuinely dynamic value here
                          // (ratio bar) — allowlisted per UI-CONTRACT §1.
                          style={{flexGrow: s.value}} /* ui-contract-allow */
                        >
                          <ProgressBar
                            aria-label={`${s.label} share`}
                            color={s.color}
                            value={100}
                          >
                            <ProgressBar.Track>
                              <ProgressBar.Fill />
                            </ProgressBar.Track>
                          </ProgressBar>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-10">
                      {segments.map((s) => (
                        <LegendEntry
                          dot={s.color}
                          key={s.label}
                          label={s.label}
                          value={s.value}
                        />
                      ))}
                      {fiber != null && fiber > 0 && (
                        <LegendEntry
                          dot="muted"
                          label="Fiber"
                          value={fiber}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {ingredientCount > 0 && (
            <section className="mt-8">
              <SectionHeading title="Ingredients" />
              <div className="mt-3 flex flex-col gap-2.5">
                {orderedIngredients.map((ingredient, i) => {
                  const hasAmount = ingredient.amount != null && ingredient.amount !== 0;
                  const hasWeight = ingredient.weight_g != null && ingredient.weight_g !== 0;
                  const amountPart = hasAmount && ingredient.unit ? `${ingredient.amount} ${ingredient.unit}` : null;
                  const weightPart = hasWeight ? `${ingredient.weight_g} g` : null;
                  const detail = [amountPart, weightPart].filter(Boolean).join(' · ');

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3.5"
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
            <section className="mt-8">
              <SectionHeading title="Instructions" />
              <Typography
                className="mt-3 whitespace-pre-wrap"
                color="muted"
              >
                {recipe.instructions}
              </Typography>
            </section>
          )}

          {recipe.serving_sizes.length > 0 && (
            <section className="mt-8">
              <SectionHeading title="Serving sizes" />
              <div className="mt-3 flex flex-col gap-2.5">
                {recipe.serving_sizes.map((serving, i) => (
                  <div
                    className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3.5"
                    key={i}
                  >
                    <Typography
                      type="body-sm"
                      weight="semibold"
                    >
                      {serving.amount ?? 1} {serving.unit}
                    </Typography>
                    {serving.weight_g != null && serving.weight_g > 0 && (
                      <Typography
                        color="muted"
                        type="body-sm"
                      >
                        {serving.weight_g} g
                      </Typography>
                    )}
                  </div>
                ))}
              </div>
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
        </div>

        <div className="sticky bottom-0 z-10 mt-6 flex items-center gap-2 border-t border-separator bg-surface px-4 py-3 sm:hidden">
          <Button
            className="flex-1"
            onPress={() => navigate(`/library/recipes/${recipe.id}/edit`)}
            variant="primary"
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            aria-label="Duplicate recipe"
            isPending={isDuplicating}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy className="size-4" />
          </Button>
          {renderDeleteDialog(
            <Button
              aria-label="Delete recipe"
              className="text-danger"
              variant="outline"
            >
              <Trash2 className="size-4" />
            </Button>,
            recipe.name,
          )}
        </div>
      </Page.Content>
    </Page>
  );
}
