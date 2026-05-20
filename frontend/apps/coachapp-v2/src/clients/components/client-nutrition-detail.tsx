import {MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';
import {Button, Spinner, Table} from '@heroui/react';
import {ArrowLeft, Check, Minus, Plus, RefreshCw} from 'lucide-react';
import {useMemo} from 'react';

import type {CoachMealLog, FoodLogEntry, PlannedSnapshotItem} from '@/api/mealLogs';

import {useListCoachMealLogsQuery} from '@/api/mealLogs';

type ComparisonType = 'followed' | 'partial' | 'replaced' | 'skipped';

type ComparisonItem = {
  entry: FoodLogEntry | null;
  planned: PlannedSnapshotItem;
  type: ComparisonType;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString(undefined, {weekday: 'long'});
  const month = d.toLocaleDateString(undefined, {month: 'short'});
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}

function buildComparison(mealLog: CoachMealLog): {comparison: ComparisonItem[]; unplanned: FoodLogEntry[]} {
  const entries = mealLog.food_log_entries;
  const planned = mealLog.planned_snapshot?.items ?? [];

  const comparison: ComparisonItem[] = planned.map((item, index) => {
    const entry = entries.find((e) => e.planned_item_index === index);

    if (!entry) {
      return {type: 'skipped', planned: item, entry: null};
    }
    if (entry.source === 'replacement') {
      return {type: 'replaced', planned: item, entry};
    }
    if (entry.amount !== item.amount) {
      return {type: 'partial', planned: item, entry};
    }
    return {type: 'followed', planned: item, entry};
  });

  const unplanned = entries.filter((e) => e.source === 'unplanned' || e.planned_item_index == null);

  return {comparison, unplanned};
}

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
          className="text-foreground-400"
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
          className="text-foreground-300"
          size={14}
        />
      );
  }
}

function MealComparisonSection({mealLog}: {mealLog: CoachMealLog}) {
  const {comparison, unplanned} = useMemo(() => buildComparison(mealLog), [mealLog]);
  const slotLabel = MEAL_SLOT_LABELS[mealLog.meal_slot] ?? mealLog.meal_slot;
  const loggedCal = Math.round(mealLog.logged_calories ?? 0);
  const plannedCal = Math.round(mealLog.planned_snapshot?.total_calories ?? 0);
  const hasSnapshot = mealLog.planned_snapshot != null;
  const isFullySkipped = mealLog.food_log_entries.length === 0;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-400">{slotLabel}</h4>
          <p className="text-xs text-foreground-400">
            Logged: {loggedCal} cal
            {hasSnapshot ? ` \u00B7 Plan: ${plannedCal} cal` : ''}
          </p>
        </div>
        {hasSnapshot && !isFullySkipped ? (
          <span className="text-xs text-foreground-400">
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
                          <p className="truncate text-foreground-400 line-through">{item.planned.food_name}</p>
                          <p className="truncate">{item.entry.food_name}</p>
                        </div>
                      ) : (
                        <span className={item.type === 'skipped' ? 'text-foreground-300' : ''}>
                          {item.planned.food_name}
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right text-foreground-400">
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
                        <span className="text-foreground-300">&mdash;</span>
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
        <div className="overflow-hidden rounded-lg border border-divider">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-divider bg-content2 text-xs text-foreground-400">
                <th className="w-auto px-3 py-1.5 text-left font-medium">Food</th>
                <th className="w-16 px-3 py-1.5 text-right font-medium">Amount</th>
                <th className="w-14 px-3 py-1.5 text-right font-medium">Cal</th>
              </tr>
            </thead>
            <tbody>
              {mealLog.food_log_entries.map((entry) => (
                <tr
                  className="border-b border-divider last:border-b-0"
                  key={entry.id}
                >
                  <td className="truncate px-3 py-2">{entry.food_name}</td>
                  <td className="px-3 py-2 text-right text-foreground-400">
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
        <div className="mt-2 overflow-hidden rounded-lg border border-dashed border-divider">
          <table className="w-full table-fixed text-sm">
            <tbody>
              {unplanned.map((entry) => (
                <tr
                  className="border-b border-divider last:border-b-0"
                  key={entry.id}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Plus
                        className="shrink-0 text-foreground-300"
                        size={12}
                      />
                      <span className="truncate text-foreground-400">{entry.food_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-foreground-400">
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
        <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-400">{slotLabel}</h4>
        <p className="text-xs text-foreground-300">Not logged</p>
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
  const {data, isLoading} = useListCoachMealLogsQuery({client_id: clientId, date});
  const mealLogs = useMemo(() => data?.data ?? [], [data]);

  // Sort meal logs by canonical meal slot order
  const sortedLogs = useMemo(
    () =>
      [...mealLogs].sort(
        (a, b) =>
          MEAL_SLOTS.indexOf(a.meal_slot as (typeof MEAL_SLOTS)[number]) -
          MEAL_SLOTS.indexOf(b.meal_slot as (typeof MEAL_SLOTS)[number]),
      ),
    [mealLogs],
  );

  // Total day calories
  const totalLoggedCal = useMemo(() => mealLogs.reduce((sum, ml) => sum + (ml.logged_calories ?? 0), 0), [mealLogs]);
  const totalPlannedCal = useMemo(
    () => mealLogs.reduce((sum, ml) => sum + (ml.planned_snapshot?.total_calories ?? 0), 0),
    [mealLogs],
  );
  const totalEntries = useMemo(() => mealLogs.reduce((sum, ml) => sum + ml.food_log_entries.length, 0), [mealLogs]);

  // Detect meal slots that were logged vs those that exist only in snapshots
  const loggedSlots = useMemo(() => new Set(mealLogs.map((ml) => ml.meal_slot)), [mealLogs]);

  const adherencePercent = totalPlannedCal > 0 ? Math.round((totalLoggedCal / totalPlannedCal) * 100) : null;

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

      <h3 className="mb-1 text-sm font-semibold">{formatDate(date)}</h3>
      <p className="mb-4 text-xs text-foreground-400">
        Logged: {Math.round(totalLoggedCal)} cal
        {totalPlannedCal > 0 ? ` \u00B7 Plan: ${Math.round(totalPlannedCal)} cal` : ''}
        {adherencePercent != null ? ` (${adherencePercent}%)` : ''}
        {totalEntries > 0 ? ` \u00B7 ${totalEntries} entries` : ''}
      </p>

      {sortedLogs.length === 0 ? (
        <p className="text-sm text-foreground-400">No food logged for this day.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedLogs.map((mealLog) => (
            <MealComparisonSection
              key={mealLog.id}
              mealLog={mealLog}
            />
          ))}

          {sortedLogs.some((ml) => ml.planned_snapshot != null)
            ? MEAL_SLOTS.filter((slot) => !loggedSlots.has(slot)).map((slot) => (
                <SkippedMealSlot
                  key={slot}
                  slotLabel={MEAL_SLOT_LABELS[slot] ?? slot}
                />
              ))
            : null}
        </div>
      )}
    </div>
  );
}
