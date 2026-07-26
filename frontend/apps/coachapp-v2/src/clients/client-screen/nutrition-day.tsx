import {Chip, ProgressBar, Typography} from '@heroui/react';
import {Utensils} from 'lucide-react';
import {useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {EmptyState} from '@/@components/empty-state';
import {ErrorState} from '@/@components/error-state';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListCoachClientNutritionPlansQuery, useListCoachMealLogsQuery} from '@/api/generated';
import {SectionCard} from '@/clients/components/section-card';
import {
  entryStatus,
  formatKcal,
  formatRowDate,
  plannedMealItems,
  skippedPlannedItems,
} from '@/clients/lib/client-detail-data';

/**
 * The design's 64px right column for a row's kcal, so the numbers line up — as a
 * MINIMUM, not a fixed width: the design's examples are all three digits and a
 * four-digit total ("1,098 kcal") wraps onto two lines in exactly 64px.
 */
const KCAL_COL = 'min-w-16 shrink-0 whitespace-nowrap text-right';

/** CD-ND — one day's meal log: day totals against target, then a card per meal. */
export default function NutritionDay() {
  const {date = '', id = ''} = useParams<{date: string; id: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id)}?tab=nutrition`);
  const {data, isError, isLoading, refetch} = useListCoachMealLogsQuery({clientId: id, date});
  // The design shows a target beside every macro, not just calories, and the
  // targets live on the plan rather than on the day's logs.
  const plans = useListCoachClientNutritionPlansQuery({clientId: id, status: 'active'});

  const header = (subtitle?: string) => (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <div className="min-w-0">
          <Page.Title>{date ? formatRowDate(date) : 'Day'}</Page.Title>
          {subtitle && <Page.Description>{subtitle}</Page.Description>}
        </div>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header()}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
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
        {header()}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load this day."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const plan = plans.data?.data?.[0];
  // Meal-time order, not the order the endpoint happens to return — it came back
  // Afternoon snack / Breakfast / Dinner / Lunch. `meal_slot` is a free-form
  // string, so an unrecognised slot sorts last rather than being dropped.
  const logs = [...data.data].sort((a, b) => mealSlotRank(a.meal_slot) - mealSlotRank(b.meal_slot));
  const totals = logs.reduce(
    (acc, log) => {
      acc.kcal += log.logged_calories ?? 0;
      acc.target += log.planned_calories ?? 0;
      for (const entry of log.food_log_entries) {
        acc.protein += entry.protein_g ?? 0;
        acc.carbs += entry.carbs_g ?? 0;
        acc.fat += entry.fat_g ?? 0;
      }
      return acc;
    },
    {carbs: 0, fat: 0, kcal: 0, protein: 0, target: 0},
  );

  return (
    <Page>
      {header(
        totals.target > 0
          ? `${formatKcal(totals.kcal)} / ${formatKcal(totals.target)} kcal`
          : `${formatKcal(totals.kcal)} kcal`,
      )}
      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-4 pt-4 pb-6"
          size="content"
        >
          <SectionCard title="Day totals">
            <div className="flex flex-col gap-4 px-4 pb-4">
              <Total
                label="Calories"
                target={totals.target || null}
                unit="kcal"
                value={totals.kcal}
              />
              <Total
                label="Protein"
                target={plan?.target_protein_g ?? null}
                unit="g"
                value={totals.protein}
              />
              <Total
                label="Carbs"
                target={plan?.target_carbs_g ?? null}
                unit="g"
                value={totals.carbs}
              />
              <Total
                label="Fat"
                target={plan?.target_fat_g ?? null}
                unit="g"
                value={totals.fat}
              />
            </div>
          </SectionCard>

          {logs.map((log) => {
            const planned = plannedMealItems(log.planned_snapshot);
            const skipped = skippedPlannedItems(log.planned_snapshot, log.food_log_entries);
            return (
              <SectionCard
                divided
                key={log.id}
                action={
                  log.logged_calories ? (
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {formatKcal(log.logged_calories)} kcal
                    </Typography>
                  ) : null
                }
                title={titleCase(log.meal_slot)}
                titleAs="heading"
              >
                {log.food_log_entries.map((entry) => (
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    key={entry.id}
                  >
                    <div className="min-w-0 flex-1">
                      <Typography
                        truncate
                        type="body-sm"
                        weight="semibold"
                      >
                        {entry.food_name ?? 'Food'}
                      </Typography>
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        {[
                          entry.protein_g != null ? `P ${Math.round(entry.protein_g)} g` : null,
                          entry.carbs_g != null ? `C ${Math.round(entry.carbs_g)} g` : null,
                          entry.fat_g != null ? `F ${Math.round(entry.fat_g)} g` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    </div>
                    {/* Reconciled positionally against `planned_snapshot.items`: no
                      index means Added, a different food in a planned slot means
                      Swapped, and a match gets no chip at all. */}
                    {entryStatus(entry, planned) && (
                      <Chip
                        className="chip--outline"
                        size="sm"
                      >
                        {entryStatus(entry, planned) === 'added' ? 'Added' : 'Swapped'}
                      </Chip>
                    )}
                    {entry.amount != null && (
                      <Typography
                        className="shrink-0"
                        color="muted"
                        type="body-xs"
                      >
                        {Math.round(entry.amount)} g
                      </Typography>
                    )}
                    {entry.calories != null && (
                      <Typography
                        className={KCAL_COL}
                        type="body-sm"
                        weight="semibold"
                      >
                        {formatKcal(entry.calories)} kcal
                      </Typography>
                    )}
                  </div>
                ))}
                {/* A planned item nobody logged is a row in its own right — the design
                  shows it muted with a Skipped chip and its PLANNED calories, so the
                  coach can see what was missed rather than just what was eaten. */}
                {skipped.map(({index, item}) => (
                  <div
                    // The design dims the whole row and strikes the name through —
                    // it reads as "this was on the plan and did not happen".
                    className="flex items-center gap-3 px-4 py-3 opacity-55"
                    key={`skipped-${index}`}
                  >
                    <div className="min-w-0 flex-1">
                      <Typography
                        className="line-through"
                        truncate
                        type="body-sm"
                        weight="semibold"
                      >
                        {item.food_name ?? 'Planned item'}
                      </Typography>
                    </div>
                    <Chip
                      className="chip--outline shrink-0"
                      size="sm"
                    >
                      Skipped
                    </Chip>
                    {item.calories != null && (
                      <Typography
                        className={`${KCAL_COL} text-muted`}
                        type="body-sm"
                        weight="semibold"
                      >
                        {formatKcal(item.calories)} kcal
                      </Typography>
                    )}
                  </div>
                ))}
                {log.food_log_entries.length === 0 && skipped.length === 0 && (
                  <div className="px-4 py-3">
                    <Typography
                      color="muted"
                      type="body-sm"
                    >
                      Nothing logged for this meal.
                    </Typography>
                  </div>
                )}
              </SectionCard>
            );
          })}

          {logs.length === 0 && (
            <SectionCard>
              <EmptyState
                body="No meals were logged on this day."
                icon={Utensils}
                title="Nothing logged"
              />
            </SectionCard>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/**
 * `Calories  1,720 / 1,900 kcal` over a full-width bar — the design reads each
 * total against its target, which four big numbers side by side cannot do. The
 * bar is `ProgressBar` (GAPS #5) and needs its compound children to render.
 */
function Total({label, target, unit, value}: {label: string; target: null | number; unit: string; value: number}) {
  const rounded = Math.round(value);
  const pct = target ? Math.round((value / target) * 100) : null;
  const band = pct == null ? 'accent' : pct > 110 ? 'danger' : pct < 90 ? 'warning' : 'success';

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Typography
          type="body-xs"
          weight="semibold"
        >
          {label}
        </Typography>
        <Typography
          color="muted"
          type="body-xs"
        >
          <span className="font-semibold text-foreground">{unit === 'kcal' ? formatKcal(rounded) : rounded}</span>
          {target ? ` / ${unit === 'kcal' ? formatKcal(target) : target} ${unit}` : ` ${unit}`}
        </Typography>
      </div>
      <ProgressBar
        aria-label={`${label}: ${rounded}${target ? ` of ${target}` : ''} ${unit}`}
        color={band}
        value={pct == null ? 0 : Math.min(pct, 100)}
      >
        <ProgressBar.Track className="h-2 rounded-pill bg-surface-tertiary">
          <ProgressBar.Fill className="rounded-pill" />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}

/**
 * Meal-time order. `meal_slot` is free-form, so this ranks the slots the app
 * actually creates and sends anything unknown to the end — a slot we have never
 * seen should appear, just not jump the queue.
 */
const MEAL_ORDER = [
  'breakfast',
  'morning_snack',
  'brunch',
  'lunch',
  'afternoon_snack',
  'pre_workout',
  'post_workout',
  'dinner',
  'evening_snack',
  'supper',
];

function mealSlotRank(slot: string): number {
  const i = MEAL_ORDER.indexOf(slot.toLowerCase().replace(/\s+/g, '_'));
  return i === -1 ? MEAL_ORDER.length : i;
}

/** `meal_slot` is a free-form string from the API ("breakfast", "post_workout"). */
function titleCase(slot: string): string {
  return slot
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
