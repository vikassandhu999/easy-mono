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
import type {MealLogDiaryRow} from '@/api/nutrition-plans-list';
import {useListCoachNutritionDaysQuery} from '@/api/nutrition-plans-list';
import {SectionCard} from '@/clients/components/section-card';
import {formatKcal, formatRowDate} from '@/clients/lib/client-detail-data';

/**
 * The design's 64px right column for a row's kcal, so the numbers line up — as a
 * MINIMUM, not a fixed width: the design's examples are all three digits and a
 * four-digit total ("1,098 kcal") wraps onto two lines in exactly 64px.
 */
const KCAL_COL = 'min-w-16 shrink-0 whitespace-nowrap text-right';

const STATUS_CHIP: Partial<Record<NonNullable<MealLogDiaryRow['status']>, string>> = {
  added: 'Added',
  skipped: 'Skipped',
  swapped: 'Swapped',
};

/** CD-ND — one day's meal log: day totals against target, then a card per meal. */
export default function NutritionDay() {
  const {date = '', id = ''} = useParams<{date: string; id: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id)}?tab=nutrition`);
  const {data, isError, isLoading, refetch} = useListCoachNutritionDaysQuery(id, {date});

  const header = (subtitle?: string) => (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center">
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

  const day = data.data[0];
  const targets = day?.targets;
  // Meal-time order. Slots without diary rows are omitted for coach history.
  const slots = [...(day?.slots ?? [])]
    .filter((s) => (s.rows ?? []).length > 0)
    .sort((a, b) => mealSlotRank(a.meal_slot) - mealSlotRank(b.meal_slot));
  const totals = slots.reduce(
    (acc, slot) => {
      acc.kcal += slot.logged_calories ?? 0;
      acc.target += slot.planned_calories ?? 0;
      for (const row of slot.rows ?? []) {
        acc.protein += row.entry?.protein_g ?? 0;
        acc.carbs += row.entry?.carbs_g ?? 0;
        acc.fat += row.entry?.fat_g ?? 0;
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
                target={totals.target || targets?.calories || null}
                unit="kcal"
                value={totals.kcal}
              />
              <Total
                label="Protein"
                target={targets?.protein_g ?? null}
                unit="g"
                value={totals.protein}
              />
              <Total
                label="Carbs"
                target={targets?.carbs_g ?? null}
                unit="g"
                value={totals.carbs}
              />
              <Total
                label="Fat"
                target={targets?.fat_g ?? null}
                unit="g"
                value={totals.fat}
              />
            </div>
          </SectionCard>

          {slots.map((slot) => {
            const rows = slot.rows ?? [];
            return (
              <SectionCard
                divided
                key={slot.meal_slot}
                action={
                  slot.logged_calories ? (
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {formatKcal(slot.logged_calories)} kcal
                    </Typography>
                  ) : null
                }
                title={titleCase(slot.meal_slot)}
                titleAs="heading"
              >
                {rows.map((row, index) => (
                  <DiaryRow
                    key={row.entry?.id ?? row.planned?.id ?? `row-${index}`}
                    row={row}
                  />
                ))}
              </SectionCard>
            );
          })}

          {slots.length === 0 && (
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

function DiaryRow({row}: {row: MealLogDiaryRow}) {
  const skipped = row.status === 'skipped';
  const name = skipped ? (row.planned?.food_name ?? 'Planned item') : (row.entry?.food_name ?? 'Food');
  const protein = skipped ? null : row.entry?.protein_g;
  const carbs = skipped ? null : row.entry?.carbs_g;
  const fat = skipped ? null : row.entry?.fat_g;
  const weightG = skipped ? null : row.entry?.weight_g;
  const amount = skipped ? null : row.entry?.amount;
  const unit = skipped ? null : row.entry?.unit;
  const calories = skipped ? row.planned?.calories : row.entry?.calories;
  const chip = row.status ? STATUS_CHIP[row.status] : undefined;

  return (
    <div className={`flex items-center gap-3 px-4 py-3${skipped ? ' opacity-55' : ''}`}>
      <div className="min-w-0 flex-1">
        <Typography
          className={skipped ? 'line-through' : undefined}
          truncate
          type="body-sm"
          weight="semibold"
        >
          {name}
        </Typography>
        {!skipped && (protein != null || carbs != null || fat != null) && (
          <Typography
            color="muted"
            type="body-xs"
          >
            {[
              protein != null ? `P ${Math.round(protein)} g` : null,
              carbs != null ? `C ${Math.round(carbs)} g` : null,
              fat != null ? `F ${Math.round(fat)} g` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        )}
      </div>
      {chip && (
        <Chip
          className="chip--outline shrink-0"
          size="sm"
        >
          {chip}
        </Chip>
      )}
      {!skipped && (weightG != null || amount != null) && (
        <Typography
          className="shrink-0"
          color="muted"
          type="body-xs"
        >
          {weightG != null ? `${Math.round(weightG)} g` : `${amount} ${unit ?? 'serving'}`}
        </Typography>
      )}
      {calories != null && (
        <Typography
          className={`${KCAL_COL}${skipped ? ' text-muted' : ''}`}
          type="body-sm"
          weight="semibold"
        >
          {formatKcal(calories)} kcal
        </Typography>
      )}
    </div>
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
