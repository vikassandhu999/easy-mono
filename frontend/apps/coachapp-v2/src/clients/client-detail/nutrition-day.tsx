/**
 * ND — nutrition day detail (spec §5.3; design data-ref CD-ND-*). Day totals
 * meters plus one card per logged meal slot, with source chips and the planned
 * items the client skipped. Style fidelity: manifests/CD-ND.json.
 */
import {MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';
import {Chip} from '@heroui/react';
import {useMemo} from 'react';
import {useParams} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import type {FoodLogEntry, MealLog} from '@/api/generated';
import {useListCoachMealLogsQuery} from '@/api/generated';
import {useListCoachClientNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {formatShortDate} from '@/clients/client-detail/cd-data';
import {CD_CARD, CD_CHIP, CD_EYEBROW, CdSubHeader} from '@/clients/client-detail/cd-ui';

const OUT_CHIP = `${CD_CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`;
const ENTRY_ROW = 'flex items-center gap-2.25 py-1.5 sm:gap-2.5 sm:py-1.75';

type PlannedItem = {calories?: number; food_name?: string};

function round(value: null | number | undefined): number {
  return Math.round(value ?? 0);
}

function sum(logs: MealLog[], pick: (entry: FoodLogEntry) => null | number | undefined): number {
  let total = 0;
  for (const log of logs) {
    for (const entry of log.food_log_entries) {
      total += pick(entry) ?? 0;
    }
  }
  return total;
}

/** Planned snapshot items with no matching logged entry — rendered struck-through. */
function skippedItems(log: MealLog): PlannedItem[] {
  const planned = Array.isArray(log.planned_snapshot?.items) ? (log.planned_snapshot.items as PlannedItem[]) : [];
  const loggedNames = new Set(log.food_log_entries.map((entry) => entry.food_name ?? ''));
  return planned.filter((item) => item.food_name && !loggedNames.has(item.food_name));
}

function Meter({
  isFirst,
  label,
  logged,
  target,
  unit,
}: {
  isFirst: boolean;
  label: string;
  logged: number;
  target: null | number;
  unit: string;
}) {
  const percent = target ? Math.min(Math.round((logged / target) * 100), 100) : 0;
  const ratio = target ? (logged / target) * 100 : 0;
  const tone = ratio > 110 ? 'bg-danger' : ratio < 85 ? 'bg-warning' : 'bg-success';
  const testId = (name: string) => (isFirst ? `nd-${name}` : undefined);

  return (
    <div>
      <div className="mb-1.25 flex justify-between text-sub sm:mb-1.5 sm:text-pill">
        <span
          className="font-semibold"
          data-testid={testId('meter-label')}
        >
          {label}
        </span>
        <span
          className="text-muted"
          data-testid={testId('meter-value')}
        >
          <b className="text-foreground">{logged.toLocaleString()}</b> / {target?.toLocaleString() ?? '—'} {unit}
        </span>
      </div>
      <div
        className="h-1.75 overflow-hidden rounded-pill bg-surface-tertiary sm:h-2"
        data-testid={testId('meter-track')}
      >
        <div
          className={`h-full ${tone}`}
          data-testid={testId('meter-fill')}
          // ponytail: the one dynamic value the contract allows — a live width %
          style={{width: `${percent}%`}} /* ui-contract-allow */
        />
      </div>
    </div>
  );
}

function EntryRow({entry, isFirst}: {entry: FoodLogEntry; isFirst: boolean}) {
  const testId = (name: string) => (isFirst ? `nd-${name}` : undefined);
  const macros = [`P ${round(entry.protein_g)} g`, `C ${round(entry.carbs_g)} g`, `F ${round(entry.fat_g)} g`].join(
    ' · ',
  );
  const sourceChip = entry.source === 'replacement' ? 'Swapped' : entry.source === 'unplanned' ? 'Added' : null;

  return (
    <div
      className={ENTRY_ROW}
      data-testid={isFirst ? 'nd-entry' : undefined}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-note font-semibold"
          data-testid={testId('entry-name')}
        >
          {entry.food_name ?? 'Food'}
        </div>
        <div
          className="mt-0.25 text-eyebrow text-muted sm:mt-0.5"
          data-testid={testId('entry-macros')}
        >
          {macros}
        </div>
      </div>
      {sourceChip ? <Chip className={OUT_CHIP}>{sourceChip}</Chip> : null}
      {entry.amount != null ? (
        <span
          className="text-chip font-semibold text-muted sm:font-normal"
          data-testid={testId('entry-amount')}
        >
          {round(entry.amount)} {entry.unit ?? 'g'}
        </span>
      ) : null}
      <span
        className="w-16 text-right text-pill font-semibold"
        data-testid={testId('entry-kcal')}
      >
        {round(entry.calories).toLocaleString()} kcal
      </span>
    </div>
  );
}

export default function NutritionDay() {
  const {date, id} = useParams<{date: string; id: string}>();
  const isDesktop = useIsDesktop();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id!)}?tab=nutrition`);
  const {data, isError, isLoading, refetch} = useListCoachMealLogsQuery({clientId: id!, date});
  const {data: plans} = useListCoachClientNutritionPlansQuery({clientId: id!});

  const logs = useMemo(
    () =>
      [...(data?.data ?? [])].sort(
        (a, b) => MEAL_SLOTS.indexOf(a.meal_slot as never) - MEAL_SLOTS.indexOf(b.meal_slot as never),
      ),
    [data],
  );

  if (isLoading) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load this day."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const plan = (plans?.data ?? []).find((p) => p.status === 'active');
  const loggedCalories = logs.reduce((total, log) => total + (log.logged_calories ?? 0), 0);
  const plannedCalories = logs.reduce((total, log) => total + (log.planned_calories ?? 0), 0);
  const targetCalories = plannedCalories > 0 ? plannedCalories : (plan?.target_calories ?? null);

  // spec §5.3 lists a fifth Fiber meter, but FoodLogEntry carries no fiber
  // field — a meter that always reads 0 is worse than none. Omitted until the
  // backend exposes it.
  const meters = [
    {
      label: 'Calories',
      logged: round(loggedCalories),
      target: targetCalories ? round(targetCalories) : null,
      unit: isDesktop ? 'kcal' : '',
    },
    {
      label: 'Protein',
      logged: round(sum(logs, (e) => e.protein_g)),
      target: plan?.target_protein_g ? round(plan.target_protein_g) : null,
      unit: 'g',
    },
    {
      label: 'Carbs',
      logged: round(sum(logs, (e) => e.carbs_g)),
      target: plan?.target_carbs_g ? round(plan.target_carbs_g) : null,
      unit: 'g',
    },
    {
      label: 'Fat',
      logged: round(sum(logs, (e) => e.fat_g)),
      target: plan?.target_fat_g ? round(plan.target_fat_g) : null,
      unit: 'g',
    },
  ];

  return (
    <Page className="bg-background text-foreground [line-height:normal]">
      <Page.Content
        bare
        className="flex flex-col p-0"
      >
        <CdSubHeader
          onBack={goBack}
          subtitle={`${round(loggedCalories).toLocaleString()} / ${targetCalories ? round(targetCalories).toLocaleString() : '—'} kcal`}
          title={date ? formatShortDate(date) : 'Day'}
        />

        <div className="p-3.5 sm:px-7.5 sm:pt-6 sm:pb-7.5">
          <div
            className="flex flex-col gap-3 sm:max-w-195 sm:gap-4"
            data-testid="nd-root"
          >
            <div
              className={`${CD_CARD} p-3.75 sm:px-5 sm:py-4.5`}
              data-testid="nd-totals"
            >
              <div
                className={`${CD_EYEBROW} mb-3.25 sm:mb-4`}
                data-testid="nd-totals-eyebrow"
              >
                Day totals
              </div>
              <div className="flex flex-col gap-3 sm:gap-3.75">
                {meters.map((meter, index) => (
                  <Meter
                    isFirst={index === 0}
                    key={meter.label}
                    label={meter.label}
                    logged={meter.logged}
                    target={meter.target}
                    unit={meter.unit}
                  />
                ))}
              </div>
            </div>

            {logs.length === 0 ? (
              <div className={`${CD_CARD} px-3.5 py-6 text-center sm:px-4.5`}>
                <span className="text-sub [color:var(--color-muted)] sm:text-pill">Nothing logged on this day.</span>
              </div>
            ) : (
              logs.map((log, logIndex) => {
                const skipped = skippedItems(log);
                return (
                  <div
                    className={`${CD_CARD} px-3.75 py-3.5 sm:px-4.5 sm:py-4`}
                    data-testid={logIndex === 0 ? 'nd-meal' : undefined}
                    key={log.id}
                  >
                    <div className="mb-2.5 flex items-center justify-between sm:mb-3">
                      <div
                        className="text-tab font-bold"
                        data-testid={logIndex === 0 ? 'nd-meal-title' : undefined}
                      >
                        {MEAL_SLOT_LABELS[log.meal_slot] ?? log.meal_slot}
                      </div>
                      <div
                        className="text-pill text-muted"
                        data-testid={logIndex === 0 ? 'nd-meal-kcal' : undefined}
                      >
                        {round(log.logged_calories).toLocaleString()} kcal
                      </div>
                    </div>
                    {log.food_log_entries.map((entry, entryIndex) => (
                      <div key={entry.id}>
                        {entryIndex > 0 ? (
                          <div
                            className="h-px bg-border"
                            data-testid={logIndex === 0 && entryIndex === 1 ? 'nd-entry-sep' : undefined}
                          />
                        ) : null}
                        <EntryRow
                          entry={entry}
                          isFirst={logIndex === 0 && entryIndex === 0}
                        />
                      </div>
                    ))}
                    {skipped.map((item) => (
                      <div key={item.food_name}>
                        <div className="h-px bg-border" />
                        <div className={`${ENTRY_ROW} opacity-55`}>
                          <div className="min-w-0 flex-1">
                            <div className="text-note font-semibold line-through">{item.food_name}</div>
                          </div>
                          <Chip className={OUT_CHIP}>Skipped</Chip>
                          <span className="w-16 text-right text-pill font-semibold text-muted">
                            {round(item.calories).toLocaleString()} kcal
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}
