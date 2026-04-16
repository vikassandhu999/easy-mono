import {computeMacrosFromSnapshot, formatDateISO, MEAL_SLOTS, normalizeMacros, sumMacrosFromEntries} from '@easy/utils';
import {Button, toast} from '@heroui/react';
import {Plus, UtensilsCrossed} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import type {FoodLogEntry, MealLog, PlannedSnapshotItem} from '@/api/mealLogs';
import type {TodayPlanMeal} from '@/api/nutritionPlans';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useListMyMealLogsQuery, useLogDayMutation} from '@/api/mealLogs';
import {useGetTodayPlanQuery, useListMyNutritionPlansQuery} from '@/api/nutritionPlans';
import DailyMacroProgress from '@/nutrition/components/daily-macro-progress';
import DateNavigator from '@/nutrition/components/date-navigator';
import EditLogInline from '@/nutrition/components/edit-log-inline';
import LogItemInline from '@/nutrition/components/log-item-inline';
import MealSlotSection from '@/nutrition/components/meal-slot-section';
import WeeklySummaryStrip from '@/nutrition/components/weekly-summary-strip';

// ── Helpers ──────────────────────────────────────────────────

type MealSlotData = {
  /** FoodLogEntries for this slot (from the MealLog, or empty if no MealLog yet) */
  entries: FoodLogEntry[];
  /** The MealLog for this slot, if one exists */
  mealLog: MealLog | null;
  /** Meal ID from the plan (for log_meal bulk action) */
  mealId: null | string;
  /** The meal slot key */
  mealSlot: string;
  /** Planned items: from MealLog.planned_snapshot if available, else from today's plan */
  plannedItems: PlannedSnapshotItem[];
};

/**
 * Merge today's plan data with MealLog data to build a unified list of meal slots.
 * - Slots with a MealLog use the snapshot for planned items.
 * - Slots without a MealLog fall back to the plan's meal items.
 * - Slots with only unplanned logs (no plan) still appear.
 */
function buildMealSlots(mealLogs: MealLog[], todayPlanMeals: null | TodayPlanMeal[]): MealSlotData[] {
  const slotMap = new Map<string, MealSlotData>();

  // Seed from plan first (to include unlogged meal slots)
  if (todayPlanMeals) {
    for (const meal of todayPlanMeals) {
      slotMap.set(meal.meal_slot, {
        entries: [],
        mealLog: null,
        mealId: meal.meal_id,
        mealSlot: meal.meal_slot,
        plannedItems: meal.items.map((item) => {
          const computed = computeMacrosFromSnapshot(item.macros, item.weight_g);
          return {
            amount: item.amount ?? 0,
            calories: computed.calories,
            carbs_g: computed.carbs,
            fat_g: computed.fat,
            food_name: item.food_name ?? 'Unknown',
            protein_g: computed.protein,
            unit: item.unit ?? 'g',
            weight_g: item.weight_g ?? 0,
          };
        }),
      });
    }
  }

  // Overlay MealLog data (overrides plan data for slots that have logs)
  for (const ml of mealLogs) {
    const existing = slotMap.get(ml.meal_slot);
    slotMap.set(ml.meal_slot, {
      entries: ml.food_log_entries,
      mealLog: ml,
      mealId: existing?.mealId ?? null,
      mealSlot: ml.meal_slot,
      plannedItems: ml.planned_snapshot?.items ?? existing?.plannedItems ?? [],
    });
  }

  // Sort by canonical meal slot order
  return [...slotMap.values()].sort(
    (a, b) =>
      MEAL_SLOTS.indexOf(a.mealSlot as (typeof MEAL_SLOTS)[number]) -
      MEAL_SLOTS.indexOf(b.mealSlot as (typeof MEAL_SLOTS)[number]),
  );
}

// ── Skeleton (loading state) ─────────────────────────────────

function NutritionDailySkeleton() {
  return (
    <PageLayout title="Nutrition">
      <div className="max-w-lg">
        {/* Date navigator skeleton */}
        <div className="mb-4 flex items-center justify-between">
          <div className="size-8 animate-pulse rounded-lg bg-content2" />
          <div className="h-5 w-32 animate-pulse rounded bg-content2" />
          <div className="size-8 animate-pulse rounded-lg bg-content2" />
        </div>

        {/* Weekly strip skeleton — 7 day cells */}
        <div className="mb-4 flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              className="h-12 flex-1 animate-pulse rounded-lg bg-content2"
              key={i}
            />
          ))}
        </div>

        {/* Macro progress skeleton — 4 bars (calories, protein, carbs, fat) */}
        <div className="mb-4 rounded-xl border border-divider bg-content1 p-4">
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="h-3 w-16 animate-pulse rounded bg-content2" />
                  <div className="h-3 w-20 animate-pulse rounded bg-content2" />
                </div>
                <div className="h-2 w-full animate-pulse rounded-full bg-content2" />
              </div>
            ))}
          </div>
        </div>

        {/* Meal slot skeletons — 3 typical meals */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              className="rounded-xl border border-divider bg-content1 p-4"
              key={i}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-content2" />
                <div className="h-3 w-16 animate-pulse rounded bg-content2" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-4 w-full animate-pulse rounded bg-content2" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-content2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

// ── Main component ───────────────────────────────────────────

export default function NutritionDaily() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateISO = formatDateISO(selectedDate);

  // Fetch meal logs + today's plan + plan list (for macros_goal) in parallel
  const {data: mealLogsData, isLoading: isLogsLoading} = useListMyMealLogsQuery({date: dateISO});
  const {data: todayPlanData, isLoading: isPlanLoading} = useGetTodayPlanQuery({date: dateISO});
  const {data: plansData} = useListMyNutritionPlansQuery({status: 'active'});

  const [logDay, {isLoading: isLoggingDay}] = useLogDayMutation();

  // Inline states
  const [activeLogItem, setActiveLogItem] = useState<null | {
    item: PlannedSnapshotItem;
    mealSlot: string;
    plannedItemIndex: number;
  }>(null);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

  const todayPlan = todayPlanData?.data;
  const mealLogs: MealLog[] = useMemo(() => mealLogsData?.data ?? [], [mealLogsData]);
  const isLoading = isPlanLoading || isLogsLoading;

  // Build merged meal slot data
  const mealSlots = useMemo(() => buildMealSlots(mealLogs, todayPlan?.meals ?? null), [mealLogs, todayPlan]);

  // Compute macro totals from MealLogs
  const allEntries = useMemo(() => mealLogs.flatMap((ml) => ml.food_log_entries), [mealLogs]);
  const consumedMacros = useMemo(() => sumMacrosFromEntries(allEntries), [allEntries]);

  // Resolve daily macro target: 1) plan's macros_goal, 2) sum of planned meal macros, 3) null
  // macros_goal stores daily targets. Keys may be short-form (calories, protein, carbs, fat)
  // or long-form (calories_per_100g, protein_g, carbs_g, fats_g). normalizeMacros maps to canonical long-form.
  const activePlanGoal = useMemo(() => {
    const plan = plansData?.data?.[0];
    const goal = plan?.macros_goal;
    if (!goal) return null;
    const n = normalizeMacros(goal);
    const calories = Number(n.calories_per_100g ?? 0);
    if (calories <= 0) return null;
    return {
      calories,
      carbs: Number(n.carbs_g ?? 0),
      fat: Number(n.fats_g ?? 0),
      protein: Number(n.protein_g ?? 0),
    };
  }, [plansData]);

  const plannedMacros = useMemo(() => {
    // Priority 1: explicit macros_goal from the plan
    if (activePlanGoal) return activePlanGoal;

    // Priority 2: sum macros from all planned meal slots
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const slot of mealSlots) {
      const ml = slot.mealLog;
      if (ml?.planned_snapshot) {
        calories += ml.planned_snapshot.total_calories ?? 0;
        protein += ml.planned_snapshot.total_protein_g ?? 0;
        carbs += ml.planned_snapshot.total_carbs_g ?? 0;
        fat += ml.planned_snapshot.total_fat_g ?? 0;
      } else {
        for (const item of slot.plannedItems) {
          calories += item.calories ?? 0;
          protein += item.protein_g ?? 0;
          carbs += item.carbs_g ?? 0;
          fat += item.fat_g ?? 0;
        }
      }
    }
    return {calories, carbs, fat, protein};
  }, [activePlanGoal, mealSlots]);

  // Check if all planned items are logged
  const allPlannedLogged = useMemo(() => {
    if (mealSlots.length === 0) return true;
    for (const slot of mealSlots) {
      if (slot.plannedItems.length === 0) continue;
      for (let i = 0; i < slot.plannedItems.length; i++) {
        const hasEntry = slot.entries.some((e) => e.planned_item_index === i);
        if (!hasEntry) return false;
      }
    }
    return true;
  }, [mealSlots]);

  const handleTapItem = useCallback((item: PlannedSnapshotItem, mealSlot: string, plannedItemIndex: number) => {
    setEditingEntry(null);
    setActiveLogItem({item, mealSlot, plannedItemIndex});
  }, []);

  const handleEditEntry = useCallback((entry: FoodLogEntry) => {
    setActiveLogItem(null);
    setEditingEntry(entry);
  }, []);

  const handleLogAllDay = async () => {
    if (!todayPlan) return;
    try {
      await logDay({date: dateISO, plan_id: todayPlan.plan_id}).unwrap();
      toast.success('All meals logged for the day');
    } catch {
      toast.danger('Failed to log all meals.');
    }
  };

  if (isLoading) {
    return <NutritionDailySkeleton />;
  }

  const hasPlan = todayPlan && todayPlan.meals.length > 0;
  const hasAnyData = mealSlots.length > 0;
  const isFuture = dateISO > formatDateISO(new Date());

  return (
    <PageLayout title="Nutrition">
      <div className="max-w-lg">
        {/* Date navigator */}
        <div className="mb-4">
          <DateNavigator
            date={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Weekly summary strip */}
        <div className="mb-4">
          <WeeklySummaryStrip
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        {/* Daily macro progress — show for plan OR freestyle (consumed-only) */}
        {hasAnyData || allEntries.length > 0 ? (
          <div className="mb-4">
            <DailyMacroProgress
              consumed={consumedMacros}
              planned={plannedMacros}
            />
          </div>
        ) : null}

        {/* First-run empty state — no plan, no logs */}
        {!hasPlan && allEntries.length === 0 && !isFuture ? (
          <div className="mb-4 rounded-xl border border-divider bg-content1 p-6 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent/10">
              <UtensilsCrossed
                className="text-accent"
                size={24}
              />
            </div>
            <h3 className="text-base font-medium">No meal plan yet</h3>
            <p className="mt-2 text-sm text-foreground-500">
              Your coach will assign a meal plan soon. You can still log what you eat.
            </p>
            <Button
              className="mt-4"
              onPress={() => navigate(ROUTES.NUTRITION_ADD_FOOD, {state: {date: dateISO}})}
              variant="primary"
            >
              <Plus size={16} />
              Log a meal
            </Button>
          </div>
        ) : null}

        {/* Inline log new item (hidden for future dates) */}
        {activeLogItem && !isFuture ? (
          <div className="mb-4">
            <LogItemInline
              date={dateISO}
              item={activeLogItem.item}
              mealSlot={activeLogItem.mealSlot}
              onClose={() => setActiveLogItem(null)}
              onReplace={() => {
                setActiveLogItem(null);
                navigate(ROUTES.NUTRITION_ADD_FOOD, {
                  state: {
                    date: dateISO,
                    mealSlot: activeLogItem.mealSlot,
                    plannedItemIndex: activeLogItem.plannedItemIndex,
                    replace: true,
                  },
                });
              }}
              plannedItemIndex={activeLogItem.plannedItemIndex}
            />
          </div>
        ) : null}

        {/* Inline edit existing entry (hidden for future dates) */}
        {editingEntry && !isFuture ? (
          <div className="mb-4">
            <EditLogInline
              entry={editingEntry}
              onClose={() => setEditingEntry(null)}
            />
          </div>
        ) : null}

        {/* Meal slots (with plan data) */}
        {mealSlots.length > 0 ? (
          <div className="flex flex-col gap-3">
            {mealSlots.map((slot) => (
              <MealSlotSection
                date={dateISO}
                entries={slot.entries}
                isFuture={isFuture}
                key={slot.mealSlot}
                mealId={slot.mealId}
                mealSlot={slot.mealSlot}
                onEditEntry={handleEditEntry}
                onTapItem={(item, index) => handleTapItem(item, slot.mealSlot, index)}
                plannedItems={slot.plannedItems}
              />
            ))}
          </div>
        ) : null}

        {/* Freestyle logs (no plan, no meal slots from above, but has logs) */}
        {!hasPlan && mealSlots.length === 0 && allEntries.length > 0 ? (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Logged today</p>
            <div className="flex flex-col gap-1 rounded-xl bg-default p-3">
              {allEntries.map((entry) => (
                <button
                  className="flex min-h-11 w-full items-center gap-3 py-1 text-left"
                  key={entry.id}
                  onClick={() => handleEditEntry(entry)}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{entry.food_name}</p>
                    <p className="text-xs text-foreground-400">
                      {entry.amount ?? ''}
                      {entry.unit ?? ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Bottom actions (hidden for future dates and first-run empty state — both already have their own CTA) */}
        {!isFuture && !(allEntries.length === 0 && !hasPlan) ? (
          <div className="mt-4 flex flex-col gap-2">
            <Button
              className="w-full"
              onPress={() => navigate(ROUTES.NUTRITION_ADD_FOOD, {state: {date: dateISO}})}
              variant="secondary"
            >
              <Plus size={16} />
              Add food
            </Button>

            {hasPlan && !allPlannedLogged ? (
              <Button
                className="w-full"
                isDisabled={isLoggingDay}
                isPending={isLoggingDay}
                onPress={handleLogAllDay}
                variant="ghost"
              >
                Log all meals
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
