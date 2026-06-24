/**
 * NutritionSchedule — "Every day" template view for a nutrition plan's schedule.
 *
 * Renders 6 meal slots (breakfast → evening_snack) each as a HeroUI Select of
 * the plan's library meals + an "Unassigned" / clear option.
 *
 * "Every day" semantics: assigning (or clearing) a slot writes that slot for
 * ALL 7 days. For each day the handler reads the current slot map from the
 * getNutritionPlanSchedule cache, applies the set/clear, then PUTs the whole
 * merged day map via setNutritionPlanDaySchedule. All 7 optimistic patches are
 * applied before any PUT; if any PUT fails, ALL day-patches are rolled back and
 * a toast.danger is shown.
 *
 * Schedule response shape (as observed in the API):
 *   NutritionScheduleResponse.data = {
 *     [day: DayKey]: {
 *       [meal_slot: MealSlot]: NutritionScheduleEntry  // { nutrition_meal_id, … }
 *     }
 *   }
 * A day key absent from data means that day has no slots assigned yet.
 * A slot key absent from data[day] means that slot is unassigned for that day.
 *
 * "Every day" display reads monday's slot map as the canonical template; all
 * other days are assumed to match (since every assignment writes all 7 days).
 *
 * Daily total bar: sums the nutrition of the assigned meals vs the plan's
 * target_calories / target_protein_g / target_carbs_g / target_fat_g.
 *
 * Cache: tag:false — optimistic updateQueryData('getNutritionPlanSchedule', {planId}, …)
 */

import {MacroTotals, MEAL_SLOT_LABELS, MEAL_SLOTS, sumMacrosFromEntries} from '@easy/utils';
import {ListBox, Select, Spinner, Typography, toast} from '@heroui/react';
import {useDispatch} from 'react-redux';

import {api} from '@/api/base';
import {
  NutritionMeal,
  NutritionScheduleEntry,
  useGetNutritionPlanQuery,
  useGetNutritionPlanScheduleQuery,
  useSetNutritionPlanDayScheduleMutation,
} from '@/api/generated';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDERED_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** Sentinel key used for the "Unassigned" Select item. */
const UNASSIGNED_KEY = '__unassigned__';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Build the NutritionDayScheduleRequest body for a given day.
 * Takes the current slot map for that day, applies the set/clear for one slot,
 * and returns the full merged map (only present slots are included — absent
 * keys mean "unassigned" per the API contract).
 */
export function buildMergedDayMap(
  currentDaySlots: Record<string, NutritionScheduleEntry> | undefined,
  slot: string,
  mealId: string | null,
): Record<string, {meal_id: string}> {
  const result: Record<string, {meal_id: string}> = {};

  // Copy all existing slots (excluding the one being changed)
  if (currentDaySlots) {
    for (const [existingSlot, entry] of Object.entries(currentDaySlots)) {
      if (existingSlot !== slot) {
        result[existingSlot] = {meal_id: entry.nutrition_meal_id};
      }
    }
  }

  // Set the new slot (or omit it to clear)
  if (mealId !== null) {
    result[slot] = {meal_id: mealId};
  }

  return result;
}

/**
 * Compute the daily macro totals from the assigned meals for the template day
 * (monday slot map used as canonical "every day" state).
 */
export function computeDailyTotals(
  templateSlots: Record<string, NutritionScheduleEntry> | undefined,
  meals: NutritionMeal[],
): MacroTotals {
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const assignedMeals: Array<{
    calories: null | number;
    protein_g: null | number;
    carbs_g: null | number;
    fat_g: null | number;
  }> = [];

  if (templateSlots) {
    for (const entry of Object.values(templateSlots)) {
      const meal = mealById.get(entry.nutrition_meal_id);
      if (meal?.nutrition) {
        assignedMeals.push({
          calories: meal.nutrition.calories ?? null,
          protein_g: meal.nutrition.protein_g ?? null,
          carbs_g: meal.nutrition.carbs_g ?? null,
          fat_g: meal.nutrition.fat_g ?? null,
        });
      }
    }
  }

  return sumMacrosFromEntries(assignedMeals);
}

// ---------------------------------------------------------------------------
// Sub-component: DayTotalBar
// ---------------------------------------------------------------------------

interface DayTotalBarProps {
  totals: MacroTotals;
  targetCalories: number | null | undefined;
  targetProtein: number | null | undefined;
  targetCarbs: number | null | undefined;
  targetFat: number | null | undefined;
}

function DayTotalBar({totals, targetCalories, targetProtein, targetCarbs, targetFat}: DayTotalBarProps) {
  const pct = (value: number, target: number | null | undefined): number => {
    if (!target || target <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((value / target) * 100));
  };

  const calPct = pct(totals.calories, targetCalories);
  const protPct = pct(totals.protein, targetProtein);
  const carbsPct = pct(totals.carbs, targetCarbs);
  const fatPct = pct(totals.fat, targetFat);

  const hasTargets = Boolean(targetCalories || targetProtein || targetCarbs || targetFat);

  return (
    <div className="rounded-lg border border-divider bg-content1 px-4 py-3">
      <Typography
        className="mb-2 uppercase tracking-wider"
        color="muted"
        type="body-xs"
        weight="semibold"
      >
        Daily Total
      </Typography>

      <div className="flex flex-col gap-2">
        {/* Calories */}
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-foreground-500">Calories</span>
          <div className="flex-1">
            {hasTargets && targetCalories ? (
              <div className="relative h-2 overflow-hidden rounded-full bg-content3">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{width: `${calPct}%`}}
                />
              </div>
            ) : null}
          </div>
          <span className="shrink-0 text-xs font-medium text-foreground">
            {Math.round(totals.calories)} kcal
            {targetCalories ? (
              <span className="ml-1 text-foreground-400">
                / {targetCalories} ({calPct}%)
              </span>
            ) : null}
          </span>
        </div>

        {/* Protein */}
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-foreground-500">Protein</span>
          <div className="flex-1">
            {hasTargets && targetProtein ? (
              <div className="relative h-2 overflow-hidden rounded-full bg-content3">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{width: `${protPct}%`}}
                />
              </div>
            ) : null}
          </div>
          <span className="shrink-0 text-xs font-medium text-foreground">
            {Math.round(totals.protein)}g
            {targetProtein ? (
              <span className="ml-1 text-foreground-400">
                / {targetProtein}g ({protPct}%)
              </span>
            ) : null}
          </span>
        </div>

        {/* Carbs */}
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-foreground-500">Carbs</span>
          <div className="flex-1">
            {hasTargets && targetCarbs ? (
              <div className="relative h-2 overflow-hidden rounded-full bg-content3">
                <div
                  className="h-full rounded-full bg-warning transition-all"
                  style={{width: `${carbsPct}%`}}
                />
              </div>
            ) : null}
          </div>
          <span className="shrink-0 text-xs font-medium text-foreground">
            {Math.round(totals.carbs)}g
            {targetCarbs ? (
              <span className="ml-1 text-foreground-400">
                / {targetCarbs}g ({carbsPct}%)
              </span>
            ) : null}
          </span>
        </div>

        {/* Fat */}
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-foreground-500">Fat</span>
          <div className="flex-1">
            {hasTargets && targetFat ? (
              <div className="relative h-2 overflow-hidden rounded-full bg-content3">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{width: `${fatPct}%`}}
                />
              </div>
            ) : null}
          </div>
          <span className="shrink-0 text-xs font-medium text-foreground">
            {Math.round(totals.fat)}g
            {targetFat ? (
              <span className="ml-1 text-foreground-400">
                / {targetFat}g ({fatPct}%)
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NutritionScheduleProps {
  planId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NutritionSchedule({planId}: NutritionScheduleProps) {
  const dispatch = useDispatch();

  const {
    data: scheduleData,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule,
  } = useGetNutritionPlanScheduleQuery({planId});

  const {data: planData, isLoading: planLoading} = useGetNutritionPlanQuery({id: planId});

  const [setNutritionPlanDaySchedule] = useSetNutritionPlanDayScheduleMutation();

  const scheduleMap = (scheduleData?.data ?? {}) as Record<string, Record<string, NutritionScheduleEntry>>;
  const meals = planData?.data.meals ?? [];
  const plan = planData?.data;

  // Use monday's slot map as the canonical "every day" template display
  const templateSlots = scheduleMap.monday;

  const handleSlotChange = async (slot: string, selectedKey: string) => {
    const mealId = selectedKey === UNASSIGNED_KEY ? null : selectedKey;

    // Apply optimistic cache patches for ALL 7 days before any PUTs.
    const patches = ORDERED_DAYS.map((day) => {
      return dispatch(
        api.util.updateQueryData('getNutritionPlanSchedule', {planId}, (draft) => {
          if (!draft.data) {
            draft.data = {};
          }
          const currentDaySlots = (draft.data[day] ?? {}) as Record<string, NutritionScheduleEntry>;

          if (mealId === null) {
            // Clear this slot for the day
            const updated: Record<string, NutritionScheduleEntry> = {};
            for (const [s, entry] of Object.entries(currentDaySlots)) {
              if (s !== slot) {
                updated[s] = entry;
              }
            }
            draft.data[day] = updated;
          } else {
            // Set this slot for the day
            draft.data[day] = {
              ...currentDaySlots,
              [slot]: {
                day_of_week: day,
                id: `optimistic-${day}-${slot}`,
                inserted_at: new Date().toISOString(),
                meal_slot: slot,
                nutrition_meal_id: mealId,
                updated_at: new Date().toISOString(),
              },
            };
          }
        }),
      );
    });

    // Build the PUT body for each day from the PRE-patch schedule state,
    // then issue all 7 PUTs concurrently.
    const putRequests = ORDERED_DAYS.map((day) => {
      // Read the current (pre-patch) slots for this day from scheduleMap.
      const currentDaySlots = scheduleMap[day];
      const mergedMap = buildMergedDayMap(currentDaySlots, slot, mealId);

      return setNutritionPlanDaySchedule({
        planId,
        day,
        nutritionDayScheduleRequest: mergedMap,
      }).unwrap();
    });

    try {
      await Promise.all(putRequests);
    } catch {
      // Roll back ALL day patches on any failure
      for (const patch of patches) {
        patch.undo();
      }
      // A partial failure may have persisted some of the 7 PUTs server-side,
      // so the rolled-back cache can diverge from the server — refetch to reconcile.
      refetchSchedule().catch(() => undefined);
      toast.danger("Couldn't update schedule");
    }
  };

  if (scheduleLoading || planLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner
          color="accent"
          size="sm"
        />
      </div>
    );
  }

  if (scheduleError) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
        Failed to load schedule.
      </div>
    );
  }

  const totals = computeDailyTotals(templateSlots, meals);

  return (
    <section className="border-t border-divider py-4">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <Typography
          className="uppercase tracking-wider"
          color="muted"
          type="body-xs"
          weight="semibold"
        >
          Schedule
        </Typography>
        <Typography
          color="muted"
          type="body-xs"
        >
          Every day
        </Typography>
      </div>

      {/* 6 meal slot rows */}
      <div className="flex flex-col gap-1 mb-4">
        {MEAL_SLOTS.map((slot) => {
          const entry = templateSlots?.[slot];
          const assignedMealId = entry?.nutrition_meal_id ?? null;

          return (
            <div
              className="rounded-lg border border-divider bg-content1 overflow-hidden"
              key={slot}
            >
              <div className="flex items-center gap-3 px-3 py-2">
                {/* Slot label */}
                <span className="w-32 shrink-0 text-sm font-medium text-foreground">
                  {MEAL_SLOT_LABELS[slot] ?? slot}
                </span>

                {/* Meal select */}
                <div className="flex-1 min-w-0">
                  <Select
                    aria-label={`Meal for ${MEAL_SLOT_LABELS[slot] ?? slot}`}
                    onSelectionChange={(key) => {
                      if (key) {
                        handleSlotChange(slot, key as string).catch(() => undefined);
                      }
                    }}
                    selectedKey={assignedMealId ?? UNASSIGNED_KEY}
                    size="sm"
                    variant="secondary"
                  >
                    <Select.Trigger className="h-8 min-h-8 text-sm">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item
                          id={UNASSIGNED_KEY}
                          key={UNASSIGNED_KEY}
                          textValue="Unassigned"
                        >
                          <span className="text-foreground-500">Unassigned</span>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {meals.map((meal) => (
                          <ListBox.Item
                            id={meal.id}
                            key={meal.id}
                            textValue={meal.name}
                          >
                            {meal.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily total bar */}
      <DayTotalBar
        targetCalories={plan?.target_calories}
        targetCarbs={plan?.target_carbs_g}
        targetFat={plan?.target_fat_g}
        targetProtein={plan?.target_protein_g}
        totals={totals}
      />
    </section>
  );
}
