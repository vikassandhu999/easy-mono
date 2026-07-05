/**
 * NutritionSchedule — schedule editor for a nutrition plan.
 *
 * Two modes, toggled via a segmented control:
 *
 * "Every day" (default): each slot shows the value shared by ALL 7 days, or
 *   "Varies by day" when days disagree (no hidden template day — see below).
 *   Editing a slot writes it for all 7 days atomically via the bulk
 *   PUT /schedule endpoint; single optimistic patch, undo + refetch on failure.
 *
 * "Customize days": reveals day tabs (Mon–Sun). Editing a slot writes ONLY
 *   the selected day — single optimistic patch + single PUT. Patch rolls back
 *   on failure with toast.danger + refetch to reconcile.
 *
 * Custom day (amber): a day whose slot map differs from the CONSENSUS map —
 *   the per-slot majority across the week (see buildConsensusMap). There is
 *   deliberately no "template day": an earlier design used monday, which meant
 *   customizing monday silently shifted what "every day" displayed.
 *
 * Week overview grid: read-only 6×7 (slots × days) projection; names truncate.
 *   Tapping a cell switches to Customize mode and selects that day.
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
import {ListBox, Select, Skeleton, Typography} from '@heroui/react';
import {useState} from 'react';
import {ErrorState} from '@/@components/error-state';
import {toastMutationError} from '@/@components/mutation-toast';
import SectionHeading from '@/@components/section-heading';
import {
  coachApi,
  NutritionMeal,
  NutritionScheduleEntry,
  useGetNutritionPlanQuery,
  useGetNutritionPlanScheduleQuery,
  useSetNutritionPlanDayScheduleMutation,
  useSetNutritionPlanScheduleMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sentinel key used for the "Unassigned" Select item. */
const UNASSIGNED_KEY = '__unassigned__';

/** Sentinel key shown (disabled) when a slot's meal differs across days. */
const VARIES_KEY = '__varies__';

// Short slot labels for the narrow week-grid label column ("Dinne" from a
// blind slice read as a typo; these stay readable at 56px).
const SLOT_SHORT_LABELS: Record<string, string> = {
  afternoon_snack: 'PM snack',
  breakfast: 'Bfast',
  dinner: 'Dinner',
  evening_snack: 'Eve snack',
  lunch: 'Lunch',
  morning_snack: 'AM snack',
};

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

type ScheduleMap = Record<string, Record<string, NutritionScheduleEntry>>;

/**
 * The meal shared by ALL 7 days for a slot: the meal id, null when the slot is
 * unassigned everywhere, or 'varies' when days disagree.
 */
export function unanimousSlotValue(scheduleMap: ScheduleMap, slot: string): string | null | 'varies' {
  let first: string | null | undefined;
  for (const day of WEEKDAYS) {
    const id = scheduleMap[day]?.[slot]?.nutrition_meal_id ?? null;
    if (first === undefined) {
      first = id;
    } else if (id !== first) {
      return 'varies';
    }
  }
  return first ?? null;
}

/**
 * Per-slot majority meal across the week (ties break toward the earlier
 * weekday). Baseline for marking days as "custom" — replaces the old
 * monday-as-template model, where editing monday silently shifted the template.
 */
export function buildConsensusMap(scheduleMap: ScheduleMap): Record<string, string | null> {
  const consensus: Record<string, string | null> = {};
  for (const slot of MEAL_SLOTS) {
    const counts = new Map<string | null, number>();
    for (const day of WEEKDAYS) {
      const id = scheduleMap[day]?.[slot]?.nutrition_meal_id ?? null;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = -1;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    consensus[slot] = best;
  }
  return consensus;
}

/** A day is "custom" if any slot differs from the consensus map. */
export function dayDiffersFromConsensus(
  daySlots: Record<string, NutritionScheduleEntry> | undefined,
  consensus: Record<string, string | null>,
): boolean {
  return MEAL_SLOTS.some((slot) => (daySlots?.[slot]?.nutrition_meal_id ?? null) !== (consensus[slot] ?? null));
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
  // Real percentage (can exceed 100 — overshoot must stay visible); only the
  // bar width is clamped.
  const calPct = targetCalories && targetCalories > 0 ? Math.round((totals.calories / targetCalories) * 100) : 0;
  const barPct = Math.min(100, calPct);

  const containerClass = isOverridden
    ? 'rounded-xl border border-warning/40 bg-warning/5 px-3 py-2.5'
    : 'rounded-xl border border-success/40 bg-success/5 px-3 py-2.5';

  return (
    <div className={`${containerClass} flex items-center justify-between`}>
      {/* Day-vs-target column */}
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] uppercase tracking-wider ${isOverridden ? 'text-warning' : 'text-success'}`}>
          {label}
        </div>
        <div className="text-sm font-bold text-foreground">
          {Math.round(totals.calories)} / {targetCalories ?? '—'} kcal
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className={`h-full rounded-full transition-all ${isOverridden ? 'bg-warning' : 'bg-success'}`}
            style={{width: `${barPct}%`}}
          />
        </div>
      </div>

      {/* Percentage — real day-vs-target % (overshoot stays visible); hidden
          when no target is set, since "0%" of nothing is noise. */}
      {targetCalories ? (
        <div className={`ml-3 shrink-0 text-lg font-bold ${isOverridden ? 'text-warning' : 'text-accent'}`}>
          {calPct > 999 ? '999%+' : `${calPct}%`}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: SlotRows (shared between both modes)
// ---------------------------------------------------------------------------

interface SlotRowsProps {
  meals: NutritionMeal[];
  onSlotChange: (slot: string, selectedKey: string) => void;
  /** Current value per slot: meal id, null (unassigned), or 'varies' (every-day mode with disagreeing days). */
  valueForSlot: (slot: string) => string | null | 'varies';
}

function SlotRows({meals, onSlotChange, valueForSlot}: SlotRowsProps) {
  return (
    <div className="flex flex-col gap-1 mb-4">
      {MEAL_SLOTS.map((slot) => {
        const value = valueForSlot(slot);
        const selectedKey = value === 'varies' ? VARIES_KEY : (value ?? UNASSIGNED_KEY);

        return (
          <div
            className="rounded-lg border border-border bg-surface overflow-hidden"
            key={slot}
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="w-[70px] shrink-0 text-[10px] uppercase tracking-wide leading-tight text-muted">
                {MEAL_SLOT_LABELS[slot] ?? slot}
              </span>

              <div className="flex-1 min-w-0">
                <Select
                  aria-label={`Meal for ${MEAL_SLOT_LABELS[slot] ?? slot}`}
                  onSelectionChange={(key) => {
                    if (key && key !== VARIES_KEY) {
                      onSlotChange(slot, key as string);
                    }
                  }}
                  selectedKey={selectedKey}
                  variant="secondary"
                >
                  <Select.Trigger className="min-h-9 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {value === 'varies' ? (
                        <ListBox.Item
                          id={VARIES_KEY}
                          isDisabled
                          key={VARIES_KEY}
                          textValue="Varies by day"
                        >
                          <span className="text-warning">Varies by day</span>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ) : null}
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
  const [setNutritionPlanSchedule] = useSetNutritionPlanScheduleMutation();

  const scheduleMap = (scheduleData?.data ?? {}) as ScheduleMap;
  const meals = planData?.data.meals ?? [];
  const plan = planData?.data;

  // ---------------------------------------------------------------------------
  // Every-day handler: one atomic bulk PUT of the full week
  // ---------------------------------------------------------------------------
  const handleEveryDaySlotChange = async (slot: string, selectedKey: string) => {
    const mealId = selectedKey === UNASSIGNED_KEY ? null : selectedKey;

    // Single optimistic patch across all 7 days.
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlanSchedule', {planId}, (draft) => {
        if (!draft.data) {
          draft.data = {};
        }
        for (const day of WEEKDAYS) {
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
        }
      }),
    );

    // Full-week desired state: this slot set on every day, other slots kept.
    const body = Object.fromEntries(WEEKDAYS.map((day) => [day, buildMergedDayMap(scheduleMap[day], slot, mealId)]));

    try {
      await setNutritionPlanSchedule({planId, nutritionScheduleRequest: body}).unwrap();
    } catch (e) {
      patch.undo();
      refetchSchedule().catch(() => undefined);
      toastMutationError(e, "Couldn't update schedule");
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
    } catch (e) {
      patch.undo();
      refetchSchedule().catch(() => undefined);
      toastMutationError(e, "Couldn't update schedule");
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
    // Layout-matched skeleton (RM-125): mode toggle + one row per slot.
    return (
      <section className="border-t border-border py-4">
        <SectionHeading title="Schedule" />
        <div
          aria-hidden
          className="flex flex-col gap-1"
        >
          <Skeleton className="mb-2 h-12 w-full rounded-lg" />
          {MEAL_SLOTS.map((slot) => (
            <Skeleton
              className="h-[53px] w-full rounded-lg"
              key={slot}
            />
          ))}
        </div>
      </section>
    );
  }

  if (scheduleError) {
    return <ErrorState message="Couldn't load schedule." />;
  }

  // No meals yet — the slot selects would have nothing to assign, so show a
  // pointer to the meals section instead of six dead-end dropdowns.
  if (meals.length === 0) {
    return (
      <section className="border-t border-border py-4">
        <SectionHeading title="Schedule" />
        <Typography
          color="muted"
          type="body-sm"
        >
          Add meals above, then assign them to days here.
        </Typography>
      </section>
    );
  }

  const consensus = buildConsensusMap(scheduleMap);
  const selectedDayCustom = mode === 'customize' && dayDiffersFromConsensus(scheduleMap[selectedDay], consensus);
  const anyVaries = MEAL_SLOTS.some((slot) => unanimousSlotValue(scheduleMap, slot) === 'varies');

  // Totals: exact day in customize mode; the consensus (majority) day in
  // every-day mode — exact when the week is uniform, "typical" otherwise.
  const totalsSlots =
    mode === 'customize'
      ? scheduleMap[selectedDay]
      : (Object.fromEntries(
          Object.entries(consensus)
            .filter(([, id]) => id !== null)
            .map(([slot, id]) => [slot, {nutrition_meal_id: id}]),
        ) as Record<string, NutritionScheduleEntry>);
  const totals = computeDailyTotals(totalsSlots, meals);

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

      {/* Overwrite warning: every-day edits clobber that slot on customized days */}
      {mode === 'everyday' && anyVaries ? (
        <p className="mb-3 text-xs text-warning">Some slots vary by day — picking a meal here sets it for every day.</p>
      ) : null}

      {/* Day tabs (customize mode only) */}
      {mode === 'customize' ? (
        <div className="mb-3 flex gap-1 overflow-x-auto">
          {WEEKDAYS.map((day) => {
            const overridden = dayDiffersFromConsensus(scheduleMap[day], consensus);
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
          <SectionHeading
            className="mb-0"
            title={selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
          />
          {selectedDayCustom ? (
            <span className="rounded border border-warning/50 px-1.5 py-0.5 text-[11px] font-medium text-warning">
              Custom
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
        valueForSlot={(slot) =>
          mode === 'customize'
            ? (scheduleMap[selectedDay]?.[slot]?.nutrition_meal_id ?? null)
            : unanimousSlotValue(scheduleMap, slot)
        }
      />

      {/* Daily total bar — day scope is already shown by the tabs/heading above */}
      <DayTotalBar
        isOverridden={selectedDayCustom}
        label="Planned vs target"
        targetCalories={plan?.target_calories}
        totals={totals}
      />

      {/* Week overview grid */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <SectionHeading
            className="mb-0"
            title="Week overview"
          />
          <span className="text-[11px] text-muted">read-only · tap to edit a day</span>
        </div>

        <div className="rounded-lg border border-border">
          {/* Grid: 8 cols — 1 label + 7 days. Fits the viewport (no horizontal
              scroll — it clipped weekend days on phones); meal names truncate. */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] text-[10px]">
            {/* Header row */}
            <div className="border-b border-r border-border bg-surface-secondary px-1 py-1.5" />
            {WEEKDAYS.map((day) => {
              const overridden = dayDiffersFromConsensus(scheduleMap[day], consensus);
              return (
                <button
                  aria-label={`Edit ${day}`}
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
                  className={`${rowBorder} border-r border-border bg-surface-secondary px-1 py-1.5 text-left text-[10px] text-muted`}
                  key={`label-${slot}`}
                  title={MEAL_SLOT_LABELS[slot] ?? slot}
                >
                  {SLOT_SHORT_LABELS[slot] ?? MEAL_SLOT_LABELS[slot] ?? slot}
                </div>,
                /* Day cells */
                ...WEEKDAYS.map((day) => {
                  const overridden = dayDiffersFromConsensus(scheduleMap[day], consensus);
                  const entry = scheduleMap[day]?.[slot];
                  const meal = entry ? mealById.get(entry.nutrition_meal_id) : undefined;
                  const slotLabel = MEAL_SLOT_LABELS[slot] ?? slot;
                  return (
                    <button
                      aria-label={`${day} ${slotLabel}: ${meal?.name ?? 'unassigned'} — edit ${day}`}
                      className={`${rowBorder} min-w-0 overflow-hidden border-r border-border px-0.5 py-1.5 text-center last:border-r-0 transition-colors hover:bg-surface-tertiary ${overridden ? 'bg-warning/5 text-warning' : meal ? 'text-muted' : 'text-foreground/50'}`}
                      key={`${slot}-${day}`}
                      onClick={() => jumpToDay(day)}
                      title={meal?.name}
                      type="button"
                    >
                      <span className="block truncate">{meal ? meal.name : '–'}</span>
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
