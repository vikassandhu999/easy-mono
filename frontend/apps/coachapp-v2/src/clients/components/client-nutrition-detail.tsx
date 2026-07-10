import {formatDateDisplay} from '@easy/utils';
import {Button, Skeleton} from '@heroui/react';
import {ArrowLeft, Check, Minus, Plus, RefreshCw} from 'lucide-react';
import {useMemo} from 'react';

import {useListCoachMealLogsQuery} from '@/api/generated';
import type {CoachMealLog} from '@/domain/client-nutrition';
import {
  buildMealLogComparison,
  type ComparisonType,
  getMealSlotLabel,
  getNutritionDayTotals,
  getSkippedMealSlots,
  sortMealLogsBySlot,
} from '@/domain/client-nutrition';

function StatusIcon({type}: {type: ComparisonType}) {
  switch (type) {
    case 'followed':
      return (
        <Check
          className="text-success"
          size={14}
        />
      );
    case 'partial':
      return (
        <Minus
          className="text-muted"
          size={14}
        />
      );
    case 'replaced':
      return (
        <RefreshCw
          className="text-warning"
          size={14}
        />
      );
    case 'skipped':
      return (
        <Minus
          className="text-muted"
          size={14}
        />
      );
  }
}

function MealComparisonSection({mealLog}: {mealLog: CoachMealLog}) {
  const {comparison, unplanned} = useMemo(() => buildMealLogComparison(mealLog), [mealLog]);
  const slotLabel = getMealSlotLabel(mealLog.meal_slot);
  const loggedCal = Math.round(mealLog.logged_calories ?? 0);
  const plannedCal = Math.round(mealLog.planned_snapshot?.total_calories ?? 0);
  const hasSnapshot = mealLog.planned_snapshot != null;
  const isFullySkipped = mealLog.food_log_entries.length === 0;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">{slotLabel}</h4>
          <p className="text-xs text-muted">
            Logged: {loggedCal} cal
            {hasSnapshot ? ` \u00B7 Plan: ${plannedCal} cal` : ''}
          </p>
        </div>
        {hasSnapshot && !isFullySkipped ? (
          <span className="text-xs text-muted">
            {comparison.filter((c) => c.type === 'followed').length}/{comparison.length}
          </span>
        ) : null}
      </div>

      {hasSnapshot && comparison.length > 0 ? (
        <div className="flex flex-col gap-2">
          {comparison.map((item) => (
            <div
              className={`flex min-h-11 items-center gap-3 rounded-2xl border-[1.5px] border-separator px-3 py-2 ${
                item.type === 'skipped' ? 'border-dashed opacity-60' : ''
              }`}
              key={`${mealLog.id}-${item.planned.food_name}-${item.planned.amount}-${item.planned.unit}`}
            >
              <div className="min-w-0 flex-1">
                {item.type === 'replaced' && item.entry ? (
                  <>
                    <p className="truncate text-sm text-muted line-through">{item.planned.food_name}</p>
                    <p className="truncate text-sm font-semibold">{item.entry.food_name}</p>
                  </>
                ) : (
                  <p className={`truncate text-sm font-semibold ${item.type === 'skipped' ? 'text-muted' : ''}`}>
                    {item.planned.food_name}
                  </p>
                )}
                <p className="text-xs text-muted">
                  Plan {item.planned.amount}
                  {item.planned.unit} · Done {item.entry ? `${item.entry.amount}${item.entry.unit}` : '—'}
                </p>
              </div>
              <StatusIcon type={item.type} />
            </div>
          ))}
        </div>
      ) : !hasSnapshot ? (
        <div className="flex flex-col gap-2">
          {mealLog.food_log_entries.map((entry) => (
            <div
              className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border-[1.5px] border-separator px-3 py-2"
              key={entry.id}
            >
              <p className="min-w-0 truncate text-sm font-semibold">{entry.food_name}</p>
              <p className="shrink-0 text-xs text-muted">
                {entry.amount != null ? `${entry.amount}${entry.unit ?? 'g'}` : ''}
                {` · ${Math.round(entry.calories ?? 0)} cal`}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {unplanned.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2">
          {unplanned.map((entry) => (
            <div
              className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-3 py-2"
              key={entry.id}
            >
              <div className="min-w-0 flex items-center gap-1.5">
                <Plus
                  className="shrink-0 text-muted"
                  size={12}
                />
                <span className="truncate text-sm text-muted">{entry.food_name}</span>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {entry.amount != null ? `${entry.amount}${entry.unit ?? 'g'} · ` : ''}
                {Math.round(entry.calories ?? 0)} cal
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SkippedMealSlot({slotLabel}: {slotLabel: string}) {
  return (
    <section>
      <div className="mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">{slotLabel}</h4>
        <p className="text-xs text-muted">Not logged</p>
      </div>
    </section>
  );
}

export default function ClientNutritionDetail({
  clientId,
  date,
  onBack,
}: {
  clientId: string;
  date: string;
  onBack: () => void;
}) {
  const {data, isLoading} = useListCoachMealLogsQuery({clientId, date});
  const mealLogs = useMemo(() => data?.data ?? [], [data]);
  const sortedLogs = useMemo(() => sortMealLogsBySlot(mealLogs), [mealLogs]);
  const {adherencePercent, totalEntries, totalLoggedCal, totalPlannedCal} = useMemo(
    () => getNutritionDayTotals(mealLogs),
    [mealLogs],
  );
  const skippedMealSlots = useMemo(() => getSkippedMealSlots(sortedLogs), [sortedLogs]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button
          onPress={onBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <h3 className="mb-1 text-sm font-semibold">{formatDateDisplay(date)}</h3>
      <p className="mb-4 text-xs text-muted">
        Logged: {Math.round(totalLoggedCal)} cal
        {totalPlannedCal > 0 ? ` \u00B7 Plan: ${Math.round(totalPlannedCal)} cal` : ''}
        {adherencePercent != null ? ` (${adherencePercent}%)` : ''}
        {totalEntries > 0 ? ` \u00B7 ${totalEntries} entries` : ''}
      </p>

      {sortedLogs.length === 0 ? (
        <p className="text-sm text-muted">No food logged for this day.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedLogs.map((mealLog) => (
            <MealComparisonSection
              key={mealLog.id}
              mealLog={mealLog}
            />
          ))}

          {skippedMealSlots.map((slot) => (
            <SkippedMealSlot
              key={slot}
              slotLabel={getMealSlotLabel(slot)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
