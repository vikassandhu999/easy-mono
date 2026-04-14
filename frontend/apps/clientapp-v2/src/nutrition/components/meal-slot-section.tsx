import {formatMacroValue, MEAL_SLOT_LABELS} from '@easy/utils';
import {Button, Spinner, toast} from '@heroui/react';
import {Check, Circle, Pencil, Plus} from 'lucide-react';
import {useMemo} from 'react';

import type {FoodLogEntry, PlannedSnapshotItem} from '@/api/mealLogs';

import {useLogMealMutation} from '@/api/mealLogs';

// ── Helpers ──────────────────────────────────────────────────

function isItemLogged(index: number, entries: FoodLogEntry[]): boolean {
  return entries.some((e) => e.planned_item_index === index);
}

function getEntryForIndex(index: number, entries: FoodLogEntry[]): FoodLogEntry | undefined {
  return entries.find((e) => e.planned_item_index === index);
}

// ── Planned item row ─────────────────────────────────────────

function PlannedItemRow({
  entry,
  index,
  isFuture = false,
  isLogged,
  item,
  onEditEntry,
  onTapItem,
}: {
  entry: FoodLogEntry | undefined;
  index: number;
  isFuture?: boolean;
  isLogged: boolean;
  item: PlannedSnapshotItem;
  onEditEntry: (entry: FoodLogEntry) => void;
  onTapItem: (item: PlannedSnapshotItem, index: number) => void;
}) {
  const displayAmount = item.amount ? `${item.amount}${item.unit ?? 'g'}` : '';
  const isReplacement = entry?.source === 'replacement';

  const handlePress = () => {
    if (isFuture) return;
    if (isLogged && entry) {
      onEditEntry(entry);
    } else {
      onTapItem(item, index);
    }
  };

  return (
    <button
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-default active:bg-default"
      onClick={handlePress}
      type="button"
    >
      {isLogged ? (
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/20">
          <Check
            className="text-success"
            size={12}
          />
        </div>
      ) : (
        <Circle
          className="shrink-0 text-foreground-300"
          size={18}
        />
      )}
      <div className="min-w-0 flex-1">
        {isReplacement && entry ? (
          <>
            <p className="truncate text-sm text-foreground-400 line-through">{item.food_name}</p>
            <p className="truncate text-sm font-medium">{entry.food_name}</p>
          </>
        ) : (
          <p className={`truncate text-sm ${isLogged ? 'text-foreground-400' : 'font-medium'}`}>{item.food_name}</p>
        )}
      </div>
      {isReplacement ? <span className="shrink-0 text-xs text-warning">replaced</span> : null}
      {displayAmount ? <span className="shrink-0 text-xs text-foreground-400">{displayAmount}</span> : null}
      {item.calories > 0 ? (
        <span className="shrink-0 text-xs text-foreground-400">{formatMacroValue(item.calories, '')} cal</span>
      ) : null}
      {isLogged ? (
        <Pencil
          className="shrink-0 text-foreground-300"
          size={12}
        />
      ) : null}
    </button>
  );
}

// ── Unplanned entry row ──────────────────────────────────────

function UnplannedEntryRow({entry, onEditEntry}: {entry: FoodLogEntry; onEditEntry: (entry: FoodLogEntry) => void}) {
  const displayAmount = entry.amount != null ? `${entry.amount}${entry.unit ?? 'g'}` : '';

  return (
    <button
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-default active:bg-default"
      onClick={() => onEditEntry(entry)}
      type="button"
    >
      <div className="flex size-5 shrink-0 items-center justify-center">
        <Plus
          className="text-foreground-300"
          size={14}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground-400">{entry.food_name}</p>
      </div>
      {displayAmount ? <span className="shrink-0 text-xs text-foreground-400">{displayAmount}</span> : null}
      {(entry.calories ?? 0) > 0 ? (
        <span className="shrink-0 text-xs text-foreground-400">{formatMacroValue(entry.calories ?? 0, '')} cal</span>
      ) : null}
      <Pencil
        className="shrink-0 text-foreground-300"
        size={12}
      />
    </button>
  );
}

// ── Main component ───────────────────────────────────────────

export default function MealSlotSection({
  date,
  entries,
  isFuture = false,
  mealId,
  mealSlot,
  onEditEntry,
  onTapItem,
  plannedItems,
}: {
  date: string;
  entries: FoodLogEntry[];
  isFuture?: boolean;
  mealId: null | string;
  mealSlot: string;
  onEditEntry: (entry: FoodLogEntry) => void;
  onTapItem: (item: PlannedSnapshotItem, index: number) => void;
  plannedItems: PlannedSnapshotItem[];
}) {
  const [logMeal, {isLoading: isLogging}] = useLogMealMutation();

  // Split entries: unplanned (no planned_item_index)
  const unplannedEntries = useMemo(
    () => entries.filter((e) => e.source === 'unplanned' || e.planned_item_index == null),
    [entries],
  );

  // Compute total planned calories for this slot
  const totalCal = useMemo(() => {
    let cal = 0;
    for (const item of plannedItems) {
      cal += item.calories ?? 0;
    }
    return cal;
  }, [plannedItems]);

  const allLogged = useMemo(
    () => plannedItems.length > 0 && plannedItems.every((_, index) => isItemLogged(index, entries)),
    [plannedItems, entries],
  );

  const someLogged = useMemo(
    () => plannedItems.some((_, index) => isItemLogged(index, entries)),
    [plannedItems, entries],
  );

  const handleLogAll = async () => {
    if (!mealId) return;
    try {
      await logMeal({
        date,
        meal_id: mealId,
        meal_slot: mealSlot,
      }).unwrap();
      toast.success(`${MEAL_SLOT_LABELS[mealSlot] ?? mealSlot} logged`);
    } catch {
      toast.danger('Failed to log meal.');
    }
  };

  const slotLabel = MEAL_SLOT_LABELS[mealSlot] ?? mealSlot;

  return (
    <section className="rounded-xl bg-default p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide">{slotLabel}</h3>
          {totalCal > 0 ? <p className="text-xs text-foreground-400">{formatMacroValue(totalCal, '')} cal</p> : null}
        </div>
        {allLogged && plannedItems.length > 0 ? (
          <span className="text-xs text-success">All logged</span>
        ) : !allLogged && !isFuture && mealId && plannedItems.length > 0 ? (
          <Button
            isDisabled={isLogging}
            isPending={isLogging}
            onPress={handleLogAll}
            size="sm"
            variant="ghost"
          >
            {isLogging ? <Spinner size="sm" /> : <Check size={14} />}
            {someLogged ? 'Log remaining' : 'Log all'}
          </Button>
        ) : null}
      </div>

      {/* Planned items */}
      {plannedItems.length > 0 ? (
        <div className="flex flex-col">
          {plannedItems.map((item, index) => {
            const logged = isItemLogged(index, entries);
            const entry = logged ? getEntryForIndex(index, entries) : undefined;

            return (
              <PlannedItemRow
                entry={entry}
                index={index}
                isFuture={isFuture}
                isLogged={logged}
                item={item}
                key={index}
                onEditEntry={onEditEntry}
                onTapItem={onTapItem}
              />
            );
          })}
        </div>
      ) : (
        <p className="py-2 text-sm text-foreground-400">No items planned.</p>
      )}

      {/* Unplanned items */}
      {unplannedEntries.length > 0 ? (
        <div className="mt-1 border-t border-divider pt-1">
          {unplannedEntries.map((entry) => (
            <UnplannedEntryRow
              entry={entry}
              key={entry.id}
              onEditEntry={onEditEntry}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
