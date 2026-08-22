import {formatIsoDateOnly} from '@easy/utils';
import {Button, Chip, Typography, toast} from '@heroui/react';
import {Copy, HandPlatter, Pencil, Trash2, Video} from 'lucide-react';
import {generatePath, useNavigate} from 'react-router-dom';
import type {NutrientTotals} from '@/api/nutrition-foods';
import {
  useCopyNutritionFoodMutation,
  useDeleteFoodMutation,
  useGetFoodImpactQuery,
  useGetFoodQuery,
} from '@/api/nutrition-foods';
import {DETAIL_SECTION_CLASS, DetailSectionHeading} from '@/library/detail-section-heading';
import {isFoodEditable} from '@/library/foods/food-form-data';
import {LibraryDeleteDialog} from '@/library/library-delete-dialog';
import {hasLibraryUsage, libraryInUseMessage, normalizeLibraryImpact} from '@/library/library-impact';
import {LibraryUsageSection} from '@/library/library-usage';
import {MacroBreakdownCard} from '@/library/macro-breakdown-card';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {OUTLINE_CHIP_CLASS} from '@/ui/browse-list-box';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

const MACRO_SEGMENTS: {
  color: 'accent' | 'success' | 'warning';
  key: keyof Pick<NutrientTotals, 'carbohydrates' | 'fat' | 'protein'>;
  label: string;
}[] = [
  {color: 'accent', key: 'protein', label: 'Protein'},
  {color: 'success', key: 'carbohydrates', label: 'Carbs'},
  {color: 'warning', key: 'fat', label: 'Fats'},
];

export default function FoodDetail() {
  const id = useRouteParam('id');
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.FOODS);
  const {data, isError, isLoading, refetch} = useGetFoodQuery(id);
  const {data: impactData} = useGetFoodImpactQuery(id);
  const deleteFoodMutation = useDeleteFoodMutation();
  const copyFood = useCopyNutritionFoodMutation();
  const impact = normalizeLibraryImpact(impactData?.data);
  const inUse = hasLibraryUsage(impact);

  const handleDelete = async ({expectedRevision, id}: {expectedRevision: number; id: string}) => {
    try {
      await deleteFoodMutation.mutateAsync({id, expectedRevision});
      navigate(ROUTES.FOODS, {replace: true});
    } catch (error) {
      toast.danger(libraryInUseMessage(error, "Couldn't delete food"));
    }
  };

  if (isLoading) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <Page.Title>Food</Page.Title>
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
            <Page.Title>Food</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load food. It may not exist, or you may not have access."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const food = data.data;
  const editable = isFoodEditable(food.source);
  const kcal = food.nutrients.calories;
  const segments = MACRO_SEGMENTS.map((s) => ({...s, value: food.nutrients[s.key]})).filter(
    (s): s is typeof s & {value: number} => s.value != null && s.value > 0,
  );
  const fiber = food.nutrients.fiber;

  const handleDuplicate = async () => {
    try {
      const result = await copyFood.mutateAsync(food.id);
      toast.success('Food duplicated');
      navigate(generatePath(ROUTES.FOOD_DETAIL, {id: result.data.id}));
    } catch {
      toast.danger("Food wasn't duplicated");
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton onPress={goBack} />
        </Page.TitleGroup>
        <Page.Actions className="hidden sm:flex">
          {editable && (
            <Button
              className="bg-ink text-ink-foreground"
              onPress={() => navigate(generatePath(ROUTES.EDIT_FOOD, {id: food.id}))}
            >
              <Pencil />
              Edit
            </Button>
          )}
          <Button
            isPending={copyFood.isPending}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy />
            Duplicate
          </Button>
          {editable && (
            <LibraryDeleteDialog
              inUse={inUse}
              isPending={deleteFoodMutation.isPending}
              itemName={food.name}
              label="Food"
              onDelete={() => handleDelete({id: food.id, expectedRevision: food.revision})}
              trigger={
                <Button
                  aria-label="Delete food"
                  className="text-danger"
                  variant="outline"
                >
                  <Trash2 />
                </Button>
              }
            />
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
              {(food.media?.kind === 'image' ? food.media.url : food.media ? null : food.image_url) ? (
                <img
                  alt={food.name}
                  className="size-20 rounded-card object-cover"
                  src={(food.media?.kind === 'image' ? food.media.url : food.image_url) ?? undefined}
                />
              ) : food.media?.kind === 'video' ? (
                <Video className="size-8 text-foreground" />
              ) : (
                <HandPlatter className="size-8 text-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Page.Title className="break-words whitespace-normal">{food.name}</Page.Title>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {food.category && (
                  <Chip
                    className={`${OUTLINE_CHIP_CLASS} capitalize`}
                    variant="secondary"
                  >
                    {food.category}
                  </Chip>
                )}
                <Chip
                  className={`${OUTLINE_CHIP_CLASS} capitalize`}
                  variant="secondary"
                >
                  {food.source ?? 'custom'}
                </Chip>
                {!food.nutrients.complete && (
                  <Chip
                    className={OUTLINE_CHIP_CLASS}
                    variant="secondary"
                  >
                    Incomplete
                  </Chip>
                )}
              </div>
            </div>
          </div>

          {(kcal != null || segments.length > 0) && (
            <section className={DETAIL_SECTION_CLASS}>
              <DetailSectionHeading
                detail="per 100 g"
                title="Nutrition"
              />
              <MacroBreakdownCard
                fiber={fiber}
                kcal={kcal}
                segments={segments}
              />
            </section>
          )}

          {food.serving_sizes.length > 0 && (
            <section className={DETAIL_SECTION_CLASS}>
              <DetailSectionHeading title="Serving sizes" />
              <div className="mt-3 flex flex-col gap-2">
                {food.serving_sizes.map((serving, i) => (
                  <div
                    className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3"
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

          {food.notes && (
            <section className={DETAIL_SECTION_CLASS}>
              <DetailSectionHeading title="Notes" />
              <Typography className="mt-2 whitespace-pre-wrap">{food.notes}</Typography>
            </section>
          )}

          <LibraryUsageSection impact={impact} />

          <section className="mt-8 border-t border-separator pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Created
                </Typography>
                <Typography type="body-sm">{formatIsoDateOnly(food.inserted_at)}</Typography>
              </div>
              <div>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Updated
                </Typography>
                <Typography type="body-sm">{formatIsoDateOnly(food.updated_at)}</Typography>
              </div>
            </div>
          </section>
        </Page.Frame>

        <div className="sticky bottom-0 z-10 mt-6 flex items-center gap-2 border-t border-separator bg-surface px-4 py-3 sm:hidden">
          {editable && (
            <Button
              className="flex-1"
              onPress={() => navigate(generatePath(ROUTES.EDIT_FOOD, {id: food.id}))}
              variant="primary"
            >
              <Pencil />
              Edit
            </Button>
          )}
          <Button
            isIconOnly
            aria-label="Duplicate food"
            isPending={copyFood.isPending}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy />
          </Button>
          {editable && (
            <LibraryDeleteDialog
              inUse={inUse}
              isPending={deleteFoodMutation.isPending}
              itemName={food.name}
              label="Food"
              onDelete={() => handleDelete({id: food.id, expectedRevision: food.revision})}
              trigger={
                <Button
                  isIconOnly
                  aria-label="Delete food"
                  className="text-danger"
                  variant="outline"
                >
                  <Trash2 />
                </Button>
              }
            />
          )}
        </div>
      </Page.Content>
    </Page>
  );
}
