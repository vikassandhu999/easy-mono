import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, ProgressBar, Typography, toast} from '@heroui/react';
import {Copy, HandPlatter, Pencil, Trash2} from 'lucide-react';
import type {ReactNode} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Food} from '@/api/generated';
import {coachApi, useDeleteFoodMutation, useGetFoodQuery} from '@/api/generated';
import {useAppDispatch} from '@/store';

const OUTLINE_CHIP_CLASS = 'rounded-chip border border-border bg-surface font-semibold text-foreground';

const MACRO_SEGMENTS: {color: 'accent' | 'success' | 'warning'; key: keyof Food; label: string}[] = [
  {color: 'accent', key: 'protein_g_per_100g', label: 'Protein'},
  {color: 'success', key: 'carbs_g_per_100g', label: 'Carbs'},
  {color: 'warning', key: 'fat_g_per_100g', label: 'Fats'},
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

export default function FoodDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const goBack = useGoBack(ROUTES.FOODS);
  const {data, isError, isLoading} = useGetFoodQuery({id: id!});
  const [deleteFood, {isLoading: isDeleting}] = useDeleteFoodMutation();

  const handleDelete = async () => {
    try {
      await deleteFood({id: id!}).unwrap();
      // Generated mutation is tag:false — invalidate the list so the deleted
      // item doesn't linger when we land back on it.
      dispatch(coachApi.util.invalidateTags([{type: 'Food', id: 'LIST'}]));
      navigate(ROUTES.FOODS, {replace: true});
    } catch {
      toast.danger("Couldn't delete food");
    }
  };

  const renderDeleteDialog = (trigger: ReactNode, foodName: string) => (
    <AlertDialog>
      {trigger}
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete food?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                This will permanently delete <strong>{foodName}</strong>. This action cannot be undone.
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
      <Page className="bg-background">
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Food</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page className="bg-background">
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Food</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <ErrorState message="Food couldn't load. It may not exist, or you may not have access" />
        </Page.Content>
      </Page>
    );
  }

  const food = data.data;
  const isSystemFood = food.source === 'system';
  const kcal = food.calories_per_100g;
  const segments = MACRO_SEGMENTS.map((s) => ({...s, value: (food[s.key] as number | null) ?? 0})).filter(
    (s) => s.value > 0,
  );
  const fiber = food.fiber_g_per_100g;

  return (
    <Page className="bg-background">
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton onPress={goBack} />
          <Page.Title className="sm:hidden">Food</Page.Title>
        </Page.TitleGroup>
        <Page.Actions className="hidden sm:flex">
          {!isSystemFood && (
            <Button
              className="bg-ink text-ink-foreground"
              onPress={() => navigate(`/library/foods/${food.id}/edit`)}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          <Button
            onPress={() => navigate(ROUTES.CREATE_FOOD, {state: {duplicateFrom: food}})}
            variant="outline"
          >
            <Copy className="size-4" />
            Duplicate
          </Button>
          {!isSystemFood &&
            renderDeleteDialog(
              <Button
                aria-label="Delete food"
                className="text-danger"
                variant="outline"
              >
                <Trash2 className="size-4" />
              </Button>,
              food.name,
            )}
        </Page.Actions>
      </Page.Header>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary">
              {food.image_url ? (
                <img
                  alt={food.name}
                  className="size-20 rounded-2xl object-cover"
                  src={food.image_url}
                />
              ) : (
                <HandPlatter className="size-8 text-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Typography
                className="break-words"
                type="h3"
              >
                {food.name}
              </Typography>
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
              </div>
            </div>
          </div>

          {(kcal != null || segments.length > 0) && (
            <section className="mt-8">
              <SectionHeading
                detail="per 100 g"
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
                    <Typography color="muted">kcal</Typography>
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

          {food.serving_sizes.length > 0 && (
            <section className="mt-8">
              <SectionHeading title="Serving sizes" />
              <div className="mt-3 flex flex-col gap-2.5">
                {food.serving_sizes.map((serving, i) => (
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

          {food.notes && (
            <section className="mt-8">
              <SectionHeading title="Notes" />
              <Typography
                className="mt-2 whitespace-pre-wrap"
                color="muted"
              >
                {food.notes}
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
        </div>

        <div className="sticky bottom-0 z-10 mt-6 flex items-center gap-2 border-t border-separator bg-surface px-4 py-3 sm:hidden">
          {!isSystemFood && (
            <Button
              className="flex-1"
              onPress={() => navigate(`/library/foods/${food.id}/edit`)}
              variant="primary"
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          <Button
            aria-label="Duplicate food"
            onPress={() => navigate(ROUTES.CREATE_FOOD, {state: {duplicateFrom: food}})}
            variant="outline"
          >
            <Copy className="size-4" />
          </Button>
          {!isSystemFood &&
            renderDeleteDialog(
              <Button
                aria-label="Delete food"
                className="text-danger"
                variant="outline"
              >
                <Trash2 className="size-4" />
              </Button>,
              food.name,
            )}
        </div>
      </Page.Content>
    </Page>
  );
}
