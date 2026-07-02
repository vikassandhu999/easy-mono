import {formatDateDisplay} from '@easy/utils';
import {Button, Spinner, Table} from '@heroui/react';
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
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Planned vs eaten foods">
              <Table.Header>
                <Table.Column isRowHeader>Food</Table.Column>
                <Table.Column className="text-right">Plan</Table.Column>
                <Table.Column className="text-right">Done</Table.Column>
                <Table.Column>{''}</Table.Column>
              </Table.Header>
              <Table.Body>
                {comparison.map((item, index) => (
                  <Table.Row
                    className={item.type === 'skipped' ? 'border-dashed opacity-50' : ''}
                    id={index}
                    key={index}
                  >
                    <Table.Cell className="truncate">
                      {item.type === 'replaced' && item.entry ? (
                        <div>
                          <p className="truncate text-muted line-through">{item.planned.food_name}</p>
                          <p className="truncate">{item.entry.food_name}</p>
                        </div>
                      ) : (
                        <span className={item.type === 'skipped' ? 'text-muted' : ''}>{item.planned.food_name}</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right text-muted">
                      {item.planned.amount}
                      {item.planned.unit}
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      {item.entry ? (
                        <span>
                          {item.entry.amount}
                          {item.entry.unit}
                        </span>
                      ) : (
                        <span className="text-muted">&mdash;</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <StatusIcon type={item.type} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : !hasSnapshot ? (
        // No plan — show flat entry list
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-xs text-muted">
                <th className="w-auto px-3 py-1.5 text-left font-medium">Food</th>
                <th className="w-16 px-3 py-1.5 text-right font-medium">Amount</th>
                <th className="w-14 px-3 py-1.5 text-right font-medium">Cal</th>
              </tr>
            </thead>
            <tbody>
              {mealLog.food_log_entries.map((entry) => (
                <tr
                  className="border-b border-border last:border-b-0"
                  key={entry.id}
                >
                  <td className="truncate px-3 py-2">{entry.food_name}</td>
                  <td className="px-3 py-2 text-right text-muted">
                    {entry.amount != null ? `${entry.amount}${entry.unit ?? 'g'}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right">{Math.round(entry.calories ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {unplanned.length > 0 ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-dashed border-border">
          <table className="w-full table-fixed text-sm">
            <tbody>
              {unplanned.map((entry) => (
                <tr
                  className="border-b border-border last:border-b-0"
                  key={entry.id}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Plus
                        className="shrink-0 text-muted"
                        size={12}
                      />
                      <span className="truncate text-muted">{entry.food_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-muted">
                    {entry.amount != null ? `${entry.amount}${entry.unit ?? 'g'}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right">{Math.round(entry.calories ?? 0)} cal</td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
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
