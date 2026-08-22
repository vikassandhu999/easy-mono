import {Chip, ProgressBar, Typography} from '@heroui/react';
import {Utensils} from 'lucide-react';
import type {NutrientTotals} from '@/api/nutrition-foods';
import type {NutritionPortion} from '@/api/nutrition-plan-builder';
import type {NutritionDayOptionItem, NutritionDayRow} from '@/api/nutrition-plans-list';
import {useListCoachNutritionDaysQuery} from '@/api/nutrition-plans-list';
import {formatKcal, formatRowDate} from '@/clients/client-detail-data';
import {liveOptionItems, slotLabel} from '@/clients/client-meal-slots';
import {SectionCard} from '@/clients/client-section-card';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {EmptyState} from '@/ui/empty-state';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

/**
 * The design's 64px right column for a row's kcal, so the numbers line up — as a
 * MINIMUM, not a fixed width: the design's examples are all three digits and a
 * four-digit total ("1,098 kcal") wraps onto two lines in exactly 64px.
 */
const KCAL_COL = 'min-w-16 shrink-0 whitespace-nowrap text-right';

const STATUS_CHIP: Record<NutritionDayRow['status'], string> = {
  added: 'Added',
  as_planned: '',
  pending: 'Pending',
  recorded: 'Recorded',
  skipped: 'Skipped',
  swapped: 'Swapped',
};

/** CD-ND — one day's meal log: day totals against target, then a card per meal. */
export default function NutritionDay() {
  const date = useRouteParam('date');
  const id = useRouteParam('id');
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
  const slots = day?.slots ?? [];
  const logged = day?.summary.logged;
  const totals = {
    carbs: logged?.carbohydrates ?? null,
    fat: logged?.fat ?? null,
    kcal: logged?.calories ?? null,
    protein: logged?.protein ?? null,
    target: targets?.calories ?? null,
  };

  return (
    <Page>
      {header(
        totals.target != null && totals.kcal != null
          ? `${formatKcal(totals.kcal)} / ${formatKcal(totals.target)} kcal`
          : totals.kcal != null
            ? `${formatKcal(totals.kcal)} kcal`
            : undefined,
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
                target={targets?.calories ?? null}
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
            const liveItems = rows.length === 0 ? liveOptionItems(slot) : [];
            return (
              <SectionCard
                divided
                key={slot.meal_slot}
                action={
                  slot.logged_calories != null ? (
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {formatKcal(slot.logged_calories)} kcal
                    </Typography>
                  ) : null
                }
                title={slotLabel(slot.meal_slot)}
                titleAs="heading"
              >
                {rows.map((row, index) => (
                  <DiaryRow
                    key={row.entry?.id ?? row.planned?.meal_item_id ?? `row-${index}`}
                    row={row}
                  />
                ))}
                {liveItems.map((item) => (
                  <LiveItem
                    item={item}
                    key={item.meal_item_id}
                  />
                ))}
              </SectionCard>
            );
          })}

          {slots.length === 0 && (
            <SectionCard>
              <EmptyState
                body="No live guidance or logged meals on this day."
                icon={Utensils}
                title="Nothing to show"
              />
            </SectionCard>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

type ItemRowProps = {
  calories: null | number | undefined;
  chip?: string | undefined;
  name: string;
  nutrients?: Pick<NutrientTotals, 'carbohydrates' | 'fat' | 'protein'> | undefined;
  portion?: Pick<NutritionPortion, 'amount' | 'grams' | 'unit'> | undefined;
  skipped?: boolean;
};

/** One diary or live-guidance row: name + macro line, optional status chip, portion, kcal column. */
function ItemRow({calories, chip, name, nutrients, portion, skipped}: ItemRowProps) {
  const macros = [
    nutrients?.protein != null ? `P ${Math.round(nutrients.protein)} g` : null,
    nutrients?.carbohydrates != null ? `C ${Math.round(nutrients.carbohydrates)} g` : null,
    nutrients?.fat != null ? `F ${Math.round(nutrients.fat)} g` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={`flex items-center gap-3 px-4 py-3${skipped ? ' opacity-55' : ''}`}>
      <div className="min-w-0 flex-1">
        <Typography
          {...(skipped ? {className: 'line-through'} : {})}
          truncate
          type="body-sm"
          weight="semibold"
        >
          {name}
        </Typography>
        {macros && (
          <Typography
            color="muted"
            type="body-xs"
          >
            {macros}
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
      {(portion?.grams != null || portion?.amount != null) && (
        <Typography
          className="shrink-0"
          color="muted"
          type="body-xs"
        >
          {portion.grams != null ? `${Math.round(portion.grams)} g` : `${portion.amount} ${portion.unit ?? 'serving'}`}
        </Typography>
      )}
      <Typography
        className={`${KCAL_COL}${skipped ? ' text-muted' : ''}`}
        type="body-sm"
        weight="semibold"
      >
        {calories != null ? `${formatKcal(calories)} kcal` : '—'}
      </Typography>
    </div>
  );
}

function DiaryRow({row}: {row: NutritionDayRow}) {
  const skipped = row.status === 'skipped';
  const entry = skipped ? null : row.entry;
  return (
    <ItemRow
      calories={skipped ? row.planned?.nutrients.calories : row.entry?.nutrients.calories}
      chip={STATUS_CHIP[row.status] || undefined}
      name={skipped ? (row.planned?.name ?? 'Planned item') : (row.entry?.name ?? 'Food')}
      nutrients={entry?.nutrients}
      portion={entry?.portion}
      skipped={skipped}
    />
  );
}

/**
 * `Calories  1,720 / 1,900 kcal` over a full-width bar — the design reads each
 * total against its target, which four big numbers side by side cannot do. The
 * bar is `ProgressBar` (GAPS #5) and needs its compound children to render.
 */
function Total({
  label,
  target,
  unit,
  value,
}: {
  label: string;
  target: null | number;
  unit: string;
  value: null | number;
}) {
  const rounded = value == null ? null : Math.round(Number(value));
  const pct = value != null && target ? Math.round((Number(value) / Number(target)) * 100) : null;
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
          <span className="font-semibold text-foreground">
            {rounded == null ? '—' : unit === 'kcal' ? formatKcal(rounded) : rounded}
          </span>
          {target ? ` / ${unit === 'kcal' ? formatKcal(target) : target} ${unit}` : ` ${unit}`}
        </Typography>
      </div>
      <ProgressBar
        aria-label={`${label}: ${rounded ?? 'unknown'}${target ? ` of ${target}` : ''} ${unit}`}
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

function LiveItem({item}: {item: NutritionDayOptionItem}) {
  return (
    <ItemRow
      calories={item.nutrients.calories}
      name={item.name ?? 'Food'}
      nutrients={item.nutrients}
      portion={item.portion}
    />
  );
}
