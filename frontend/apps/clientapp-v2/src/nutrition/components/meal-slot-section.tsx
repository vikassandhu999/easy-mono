import {Button, Spinner, toast} from '@heroui/react';
import {Check, Circle, Pencil, Plus} from 'lucide-react';
import {useMemo} from 'react';

import type {FoodLog} from '@/api/foodLogs';
import type {TodayPlanMeal, TodayPlanMealItem} from '@/api/nutritionPlans';

import {
  computeMacrosFromSnapshot,
  formatMacroValue,
  MEAL_SLOT_LABELS,
  normalizeMacros,
} from '@/@utils/nutrition-helpers';
import {useLogMealMutation} from '@/api/foodLogs';

// ── Helpers ──────────────────────────────────────────────────

function getItemCalories(item: TodayPlanMealItem): number {
  if (!item.macros || !item.weight_g) return 0;
  const normalized = normalizeMacros(item.macros);
  return ((normalized.calories_per_100g ?? 0) * item.weight_g) / 100;
}

function isItemLogged(item: TodayPlanMealItem, logs: FoodLog[]): boolean {
  return logs.some((log) => log.meal_item_id === item.meal_item_id);
}

function getLogForItem(item: TodayPlanMealItem, logs: FoodLog[]): FoodLog | undefined {
  return logs.find((log) => log.meal_item_id === item.meal_item_id);
}

function isReplacement(item: TodayPlanMealItem, log: FoodLog): boolean {
  if (item.food_id && log.food_id && item.food_id !== log.food_id) return true;
  if (item.recipe_id && log.recipe_id && item.recipe_id !== log.recipe_id) return true;
  return false;
}

// ── Planned item row ─────────────────────────────────────────

function PlannedItemRow({
  isLogged,
  item,
  log,
  onEditLog,
  onTapItem,
}: {
  isLogged: boolean;
  item: TodayPlanMealItem;
  log: FoodLog | undefined;
  onEditLog: (log: FoodLog) => void;
  onTapItem: (item: TodayPlanMealItem) => void;
}) {
  const calories = getItemCalories(item);
  const displayAmount = item.amount != null ? `${item.amount}${item.unit ?? 'g'}` : '';
  const replaced = log ? isReplacement(item, log) : false;
  const loggedName = log?.food_name_snapshot ?? log?.food?.name ?? log?.recipe?.name;

  const handlePress = () => {
    if (isLogged && log) {
      onEditLog(log);
    } else {
      onTapItem(item);
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
        {replaced ? (
          <>
            <p className="truncate text-sm text-foreground-400 line-through">{item.food_name ?? 'Unknown item'}</p>
            <p className="truncate text-sm font-medium">{loggedName}</p>
          </>
        ) : (
          <p className={`truncate text-sm ${isLogged ? 'text-foreground-400' : 'font-medium'}`}>
            {item.food_name ?? 'Unknown item'}
          </p>
        )}
      </div>
      {replaced ? <span className="shrink-0 text-xs text-warning">replaced</span> : null}
      {displayAmount ? <span className="shrink-0 text-xs text-foreground-400">{displayAmount}</span> : null}
      {calories > 0 ? (
        <span className="shrink-0 text-xs text-foreground-400">{formatMacroValue(calories, '')} cal</span>
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

// ── Unplanned log row ────────────────────────────────────────

function UnplannedLogRow({log, onEditLog}: {log: FoodLog; onEditLog: (log: FoodLog) => void}) {
  const macros = computeMacrosFromSnapshot(log.macros_snapshot, log.weight_g);
  const displayName = log.food_name_snapshot ?? log.food?.name ?? log.recipe?.name ?? 'Unknown';
  const displayAmount = log.amount != null ? `${log.amount}${log.unit ?? 'g'}` : '';

  return (
    <button
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-default active:bg-default"
      onClick={() => onEditLog(log)}
      type="button"
    >
      <div className="flex size-5 shrink-0 items-center justify-center">
        <Plus
          className="text-foreground-300"
          size={14}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground-400">{displayName}</p>
      </div>
      {displayAmount ? <span className="shrink-0 text-xs text-foreground-400">{displayAmount}</span> : null}
      {macros.calories > 0 ? (
        <span className="shrink-0 text-xs text-foreground-400">{formatMacroValue(macros.calories, '')} cal</span>
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
  logs,
  meal,
  onEditLog,
  onTapItem,
}: {
  date: string;
  logs: FoodLog[];
  meal: TodayPlanMeal;
  onEditLog: (log: FoodLog) => void;
  onTapItem: (item: TodayPlanMealItem) => void;
}) {
  const [logMeal, {isLoading: isLogging}] = useLogMealMutation();

  // Split logs: planned (has meal_item_id) vs unplanned (no meal_item_id)
  const slotLogs = useMemo(() => logs.filter((log) => log.meal_slot === meal.meal_slot), [logs, meal.meal_slot]);
  const unplannedLogs = useMemo(() => slotLogs.filter((log) => !log.meal_item_id), [slotLogs]);

  // Compute total calories for this slot
  const totalCal = useMemo(() => {
    let cal = 0;
    for (const item of meal.items) {
      cal += getItemCalories(item);
    }
    return cal;
  }, [meal.items]);

  const allLogged = useMemo(
    () => meal.items.length > 0 && meal.items.every((item) => isItemLogged(item, slotLogs)),
    [meal.items, slotLogs],
  );

  const handleLogAll = async () => {
    try {
      await logMeal({
        date,
        meal_id: meal.meal_id,
        meal_slot: meal.meal_slot,
      }).unwrap();
      toast.success(`${MEAL_SLOT_LABELS[meal.meal_slot] ?? meal.meal_slot} logged`);
    } catch {
      toast.danger('Failed to log meal.');
    }
  };

  const slotLabel = MEAL_SLOT_LABELS[meal.meal_slot] ?? meal.meal_slot;

  return (
    <section className="rounded-xl bg-default p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide">{slotLabel}</h3>
          {totalCal > 0 ? <p className="text-xs text-foreground-400">{formatMacroValue(totalCal, '')} cal</p> : null}
        </div>
        {!allLogged && meal.items.length > 0 ? (
          <Button
            isDisabled={isLogging}
            isPending={isLogging}
            onPress={handleLogAll}
            size="sm"
            variant="ghost"
          >
            {isLogging ? <Spinner size="sm" /> : <Check size={14} />}
            Log all
          </Button>
        ) : null}
      </div>

      {/* Planned items */}
      {meal.items.length > 0 ? (
        <div className="flex flex-col">
          {meal.items.map((item) => {
            const logged = isItemLogged(item, slotLogs);
            const log = logged ? getLogForItem(item, slotLogs) : undefined;

            return (
              <PlannedItemRow
                isLogged={logged}
                item={item}
                key={item.meal_item_id}
                log={log}
                onEditLog={onEditLog}
                onTapItem={onTapItem}
              />
            );
          })}
        </div>
      ) : (
        <p className="py-2 text-sm text-foreground-400">No items planned.</p>
      )}

      {/* Unplanned items */}
      {unplannedLogs.length > 0 ? (
        <div className="mt-1 border-t border-divider pt-1">
          {unplannedLogs.map((log) => (
            <UnplannedLogRow
              key={log.id}
              log={log}
              onEditLog={onEditLog}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
