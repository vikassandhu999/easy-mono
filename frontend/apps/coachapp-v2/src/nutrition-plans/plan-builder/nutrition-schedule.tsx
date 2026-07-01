/**
 * NutritionSchedule — schedule editor for a nutrition plan.
 *
 * Two modes, toggled via a segmented control:
 *
 * "Every day" (default): editing a slot writes that slot for ALL 7 days.
 *   All 7 optimistic patches are applied before any PUTs; if any fails,
 *   ALL patches roll back and a toast.danger is shown.
 *   Monday's slot map is used as the canonical template display.
 *
 * "Customize days": reveals day tabs (Mon–Sun). Editing a slot writes ONLY
 *   the selected day — single optimistic patch + single PUT. Patch rolls back
 *   on failure with toast.danger + refetch to reconcile.
 *
 * Overridden day: a day whose slot map (meal IDs per slot) differs from
 *   monday's. See isDayOverridden(). Shown with amber accent in day tabs
 *   and in the week overview grid.
 *
 * Week overview grid: read-only 6×7 (slots × days) compact projection.
 *   Each cell shows the meal name truncated to 4 chars (or "–"). Tapping
 *   a cell switches to Customize mode and selects that day for editing.
 *
 * Schedule response shape:
 *   NutritionScheduleResponse.data = {
 *     [day: DayKey]: {
 *       [meal_slot: MealSlot]: NutritionScheduleEntry  // { nutrition_meal_id, … }
 *     }
 *   }
 *
 * Cache: tag:false — optimistic updateQueryData('getNutritionPlanSchedule', {planId}, …)
 */

import {
  MacroTotals,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  sumMacrosFromEntries,
  WEEKDAY_SHORT_LABELS,
  WEEKDAYS,
} from '@easy/utils';
import {ListBox, Select, Spinner, toast} from '@heroui/react';
import {useState} from 'react';
import {ErrorState} from '@/@components/error-state';
import SectionHeading from '@/@components/section-heading';
import {
  coachApi,
  NutritionMeal,
  NutritionScheduleEntry,
  useGetNutritionPlanQuery,
  useGetNutritionPlanScheduleQuery,
  useSetNutritionPlanDayScheduleMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sentinel key used for the "Unassigned" Select item. */
const UNASSIGNED_KEY = '__unassigned__';

// Day abbreviations for the week grid header (single char)
const DAY_SINGLE: Record<string, string> = {
  friday: 'F',
  monday: 'M',
  saturday: 'S',
  sunday: 'S',
  thursday: 'T',
  tuesday: 'T',
  wednesday: 'W',
};

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
 * Compute the daily macro totals from the assigned meals for a given day's slots.
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

/**
 * A day is considered overridden if its assigned meal IDs differ from monday's
 * (monday is the canonical template day for every-day mode).
 */
export function isDayOverridden(
  daySlots: Record<string, NutritionScheduleEntry> | undefined,
  mondaySlots: Record<string, NutritionScheduleEntry> | undefined,
): boolean {
  const dayKeys = Object.keys(daySlots ?? {}).sort();
  const monKeys = Object.keys(mondaySlots ?? {}).sort();
  if (dayKeys.join(',') !== monKeys.join(',')) {
    return true;
  }
  for (const key of dayKeys) {
    if (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (daySlots as Record<string, NutritionScheduleEntry>)[key]!.nutrition_meal_id !==
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mondaySlots as Record<string, NutritionScheduleEntry>)[key]!.nutrition_meal_id
    ) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Sub-component: DayTotalBar
// ---------------------------------------------------------------------------

interface DayTotalBarProps {
  totals: MacroTotals;
  targetCalories: number | null | undefined;
  label: string;
  isOverridden?: boolean;
}

function DayTotalBar({totals, targetCalories, label, isOverridden}: DayTotalBarProps) {
  const pct = (value: number, target: number | null | undefined): number => {
    if (!target || target <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((value / target) * 100));
  };

  const calPct = pct(totals.calories, targetCalories);

  const containerClass = isOverridden
    ? 'rounded-xl border border-warning/40 bg-warning/5 px-3 py-2.5'
    : 'rounded-xl border border-success/40 bg-success/5 px-3 py-2.5';

  return (
    <div className={`${containerClass} flex items-center justify-between`}>
      {/* Day-vs-target column */}
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] uppercase tracking-wider ${isOverridden ? 'text-warning' : 'text-success'}`}>
          {label}
        </div>
        <div className="text-sm font-bold text-foreground">
          {Math.round(totals.calories)} / {targetCalories ?? '—'} kcal
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className={`h-full rounded-full transition-all ${isOverridden ? 'bg-warning' : 'bg-success'}`}
            style={{width: `${calPct}%`}}
          />
        </div>
      </div>

      {/* Percentage — spec shows the real day-vs-target %; the amber tint already
          signals an overridden day, so no need to hide the number. */}
      <div className={`ml-3 shrink-0 text-lg font-bold ${isOverridden ? 'text-warning' : 'text-accent'}`}>
        {calPct}%
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: SlotRows (shared between both modes)
// ---------------------------------------------------------------------------

interface SlotRowsProps {
  slots: Record<string, NutritionScheduleEntry> | undefined;
  meals: NutritionMeal[];
  onSlotChange: (slot: string, selectedKey: string) => void;
}

function SlotRows({slots, meals, onSlotChange}: SlotRowsProps) {
  return (
    <div className="flex flex-col gap-1 mb-4">
      {MEAL_SLOTS.map((slot) => {
        const entry = slots?.[slot];
        const assignedMealId = entry?.nutrition_meal_id ?? null;

        return (
          <div
            className="rounded-lg border border-border bg-surface overflow-hidden"
            key={slot}
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="w-[70px] shrink-0 text-[9px] uppercase tracking-wide leading-tight text-muted">
                {MEAL_SLOT_LABELS[slot] ?? slot}
              </span>

              <div className="flex-1 min-w-0">
                <Select
                  aria-label={`Meal for ${MEAL_SLOT_LABELS[slot] ?? slot}`}
                  onSelectionChange={(key) => {
                    if (key) {
                      onSlotChange(slot, key as string);
                    }
                  }}
                  selectedKey={assignedMealId ?? UNASSIGNED_KEY}
                  variant="secondary"
                >
                  <Select.Trigger className="min-h-9 text-sm">
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
                        <span className="text-muted">Unassigned</span>
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
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<'everyday' | 'customize'>('everyday');
  const [selectedDay, setSelectedDay] = useState<string>('monday');

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

  // Monday is the canonical "every day" template
  const templateSlots = scheduleMap.monday;

  // ---------------------------------------------------------------------------
  // Every-day handler: fan-out to all 7 days
  // ---------------------------------------------------------------------------
  const handleEveryDaySlotChange = async (slot: string, selectedKey: string) => {
    const mealId = selectedKey === UNASSIGNED_KEY ? null : selectedKey;

    // Apply optimistic cache patches for ALL 7 days before any PUTs.
    const patches = WEEKDAYS.map((day) => {
      return dispatch(
        coachApi.util.updateQueryData('getNutritionPlanSchedule', {planId}, (draft) => {
          if (!draft.data) {
            draft.data = {};
          }
          const currentDaySlots = (draft.data[day] ?? {}) as Record<string, NutritionScheduleEntry>;

          if (mealId === null) {
            const updated: Record<string, NutritionScheduleEntry> = {};
            for (const [s, entry] of Object.entries(currentDaySlots)) {
              if (s !== slot) {
                updated[s] = entry;
              }
            }
            draft.data[day] = updated;
          } else {
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

    const putRequests = WEEKDAYS.map((day) => {
      const currentDaySlots = scheduleMap[day];
      const mergedMap = buildMergedDayMap(currentDaySlots, slot, mealId);
      return setNutritionPlanDaySchedule({planId, day, nutritionDayScheduleRequest: mergedMap}).unwrap();
    });

    try {
      await Promise.all(putRequests);
    } catch {
      for (const patch of patches) {
        patch.undo();
      }
      refetchSchedule().catch(() => undefined);
      toast.danger("Couldn't update schedule");
    }
  };

  // ---------------------------------------------------------------------------
  // Customize handler: single-day PUT
  // ---------------------------------------------------------------------------
  const handleCustomizeDaySlotChange = async (day: string, slot: string, selectedKey: string) => {
    const mealId = selectedKey === UNASSIGNED_KEY ? null : selectedKey;
    const currentDaySlots = scheduleMap[day];

    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlanSchedule', {planId}, (draft) => {
        if (!draft.data) {
          draft.data = {};
        }
        const existing = (draft.data[day] ?? {}) as Record<string, NutritionScheduleEntry>;

        if (mealId === null) {
          const updated: Record<string, NutritionScheduleEntry> = {};
          for (const [s, entry] of Object.entries(existing)) {
            if (s !== slot) {
              updated[s] = entry;
            }
          }
          draft.data[day] = updated;
        } else {
          draft.data[day] = {
            ...existing,
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

    const mergedMap = buildMergedDayMap(currentDaySlots, slot, mealId);
    try {
      await setNutritionPlanDaySchedule({planId, day, nutritionDayScheduleRequest: mergedMap}).unwrap();
    } catch {
      patch.undo();
      refetchSchedule().catch(() => undefined);
      toast.danger("Couldn't update schedule");
    }
  };

  // ---------------------------------------------------------------------------
  // Jump to day (from week grid tap)
  // ---------------------------------------------------------------------------
  const jumpToDay = (day: string) => {
    setMode('customize');
    setSelectedDay(day);
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
    return <ErrorState message="Couldn't load schedule." />;
  }

  const activeSlots = mode === 'customize' ? scheduleMap[selectedDay] : templateSlots;
  const selectedDayOverridden = mode === 'customize' && isDayOverridden(scheduleMap[selectedDay], templateSlots);
  const totals = computeDailyTotals(activeSlots, meals);

  // Meal lookup for week grid cells
  const mealById = new Map(meals.map((m) => [m.id, m]));

  return (
    <section className="border-t border-border py-4">
      {/* Section header */}
      <SectionHeading title="Schedule" />

      {/* Mode toggle */}
      <div className="mb-3 flex gap-1 rounded-lg border border-border bg-surface p-1">
        <button
          className={`flex-1 rounded-md px-3 py-2 min-h-10 text-xs font-medium transition-colors ${mode === 'everyday' ? 'border border-accent bg-accent/10 text-accent font-semibold' : 'border border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setMode('everyday')}
          type="button"
        >
          Every day
        </button>
        <button
          className={`flex-1 rounded-md px-3 py-2 min-h-10 text-xs font-medium transition-colors ${mode === 'customize' ? 'border border-accent bg-accent/10 text-accent font-semibold' : 'border border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setMode('customize')}
          type="button"
        >
          Customize days
        </button>
      </div>

      {/* Day tabs (customize mode only) */}
      {mode === 'customize' ? (
        <div className="mb-3 flex gap-1 overflow-x-auto">
          {WEEKDAYS.map((day) => {
            const overridden = isDayOverridden(scheduleMap[day], templateSlots);
            const isSelected = selectedDay === day;
            const baseClass =
              'flex-1 min-w-[40px] rounded-lg border px-1 py-2 min-h-10 text-center text-xs font-medium transition-colors';
            const stateClass = isSelected
              ? overridden
                ? 'border-warning/60 bg-warning/10 text-warning font-bold'
                : 'border-accent/60 bg-accent/10 text-accent font-bold'
              : overridden
                ? 'border-warning/30 text-warning/70 hover:border-warning/50'
                : 'border-border text-muted hover:text-foreground hover:border-border';

            return (
              <button
                className={`${baseClass} ${stateClass}`}
                key={day}
                onClick={() => setSelectedDay(day)}
                type="button"
              >
                {WEEKDAY_SHORT_LABELS[day]?.slice(0, 3) ?? day.slice(0, 3)}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Day label + overridden badge (customize mode) */}
      {mode === 'customize' ? (
        <div className="mb-2 flex items-center gap-2">
          <SectionHeading title={selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} />
          {selectedDayOverridden ? (
            <span className="rounded border border-warning/50 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              Overridden
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Slot rows */}
      <SlotRows
        meals={meals}
        onSlotChange={(slot, key) => {
          if (mode === 'customize') {
            handleCustomizeDaySlotChange(selectedDay, slot, key).catch(() => undefined);
          } else {
            handleEveryDaySlotChange(slot, key).catch(() => undefined);
          }
        }}
        slots={activeSlots}
      />

      {/* Daily total bar */}
      <DayTotalBar
        isOverridden={selectedDayOverridden}
        label={
          mode === 'customize'
            ? `${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} vs target`
            : 'Daily total vs target'
        }
        targetCalories={plan?.target_calories}
        totals={totals}
      />

      {/* Week overview grid */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <SectionHeading title="Week overview" />
          <span className="text-[10px] text-muted">read-only · tap to edit a day</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          {/* Grid: 8 cols — 1 label + 7 days. min-w keeps day cells tappable on
              narrow phones; the wrapper scrolls horizontally instead of shrinking
              cells into unreadable slivers. */}
          <div className="grid min-w-[420px] grid-cols-[48px_repeat(7,1fr)] text-[9px]">
            {/* Header row */}
            <div className="border-b border-r border-border bg-surface-secondary px-1 py-1.5" />
            {WEEKDAYS.map((day) => {
              const overridden = isDayOverridden(scheduleMap[day], templateSlots);
              return (
                <button
                  className={`border-b border-r border-border px-0.5 py-1.5 text-center font-semibold transition-colors last:border-r-0 hover:bg-surface-tertiary ${overridden ? 'bg-warning/10 text-warning' : 'bg-surface-secondary text-muted'}`}
                  key={day}
                  onClick={() => jumpToDay(day)}
                  type="button"
                >
                  {DAY_SINGLE[day] ?? day.charAt(0).toUpperCase()}
                </button>
              );
            })}

            {/* Slot rows */}
            {MEAL_SLOTS.map((slot, slotIdx) => {
              const isLastRow = slotIdx === MEAL_SLOTS.length - 1;
              const rowBorder = isLastRow ? '' : 'border-b border-border';
              return [
                /* Slot label cell */
                <div
                  className={`${rowBorder} border-r border-border bg-surface-secondary px-1 py-1.5 text-left text-[9px] text-muted`}
                  key={`label-${slot}`}
                >
                  {(MEAL_SLOT_LABELS[slot] ?? slot).slice(0, 5)}
                </div>,
                /* Day cells */
                ...WEEKDAYS.map((day) => {
                  const overridden = isDayOverridden(scheduleMap[day], templateSlots);
                  const entry = scheduleMap[day]?.[slot];
                  const meal = entry ? mealById.get(entry.nutrition_meal_id) : undefined;
                  const cellText = meal ? meal.name.slice(0, 4) : '–';
                  return (
                    <button
                      className={`${rowBorder} border-r border-border px-0.5 py-1.5 text-center last:border-r-0 transition-colors hover:bg-surface-tertiary ${overridden ? 'bg-warning/5 text-warning' : meal ? 'text-muted' : 'text-foreground/50'}`}
                      key={`${slot}-${day}`}
                      onClick={() => jumpToDay(day)}
                      title={meal?.name}
                      type="button"
                    >
                      {cellText}
                    </button>
                  );
                }),
              ];
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
