/**
 * PinnedScheduleBar — sticky condensed nutrition schedule summary.
 *
 * Sits at the top of the scroll container (sticky top-0 z-10).
 * Must be placed inside an overflow-y-auto content column (not inside
 * overflow-hidden) so that `sticky` positioning works correctly.
 *
 * Collapsed: one-line projection of the monday template slots,
 *   e.g. "Bfast: Oats · Lunch: Chicken · Dinner: Salmon".
 * Expanded: compact read-only list of all 6 slots with assigned meal names.
 *
 * Uses monday's slot map as the canonical "every day" template.
 */

import {MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';
import {Spinner, Typography} from '@heroui/react';
import {ChevronDown, ChevronUp} from 'lucide-react';
import {useState} from 'react';

import {useGetNutritionPlanQuery, useGetNutritionPlanScheduleQuery} from '@/api/generated';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLOT_SHORT: Record<string, string> = {
  afternoon_snack: 'PM',
  breakfast: 'Bfast',
  dinner: 'Dinner',
  evening_snack: 'Eve',
  lunch: 'Lunch',
  morning_snack: 'AM',
};

function buildProjection(
  mondaySlots: Record<string, {nutrition_meal_id: string}> | undefined,
  mealById: Map<string, {name: string}>,
): string {
  if (!mondaySlots) {
    return 'No meals assigned';
  }

  const parts: string[] = [];
  for (const slot of MEAL_SLOTS) {
    const entry = mondaySlots[slot];
    if (!entry) {
      continue;
    }
    const meal = mealById.get(entry.nutrition_meal_id);
    if (meal) {
      parts.push(`${SLOT_SHORT[slot] ?? slot}: ${meal.name}`);
    }
  }

  return parts.length > 0 ? parts.join(' · ') : 'No meals assigned';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PinnedScheduleBarProps {
  planId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PinnedScheduleBar({planId}: PinnedScheduleBarProps) {
  const [expanded, setExpanded] = useState(false);

  const {data: scheduleData, isLoading: scheduleLoading} = useGetNutritionPlanScheduleQuery({planId});
  const {data: planData, isLoading: planLoading} = useGetNutritionPlanQuery({id: planId});

  const isLoading = scheduleLoading || planLoading;
  const scheduleMap = (scheduleData?.data ?? {}) as Record<string, Record<string, {nutrition_meal_id: string}>>;
  const meals = planData?.data.meals ?? [];
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const mondaySlots = scheduleMap.monday;
  const projection = buildProjection(mondaySlots, mealById);

  return (
    <div className="sticky top-0 z-10">
      {/* Collapsed bar */}
      <button
        className="flex w-full items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2 text-left transition-colors hover:bg-surface-hover"
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Typography
            className="shrink-0 uppercase tracking-wider"
            color="muted"
            type="body-xs"
            weight="semibold"
          >
            Schedule
          </Typography>

          {isLoading ? (
            <Spinner
              color="accent"
              size="sm"
            />
          ) : (
            <span className="truncate text-xs text-muted">{projection}</span>
          )}
        </div>

        <span className="shrink-0 text-muted">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {/* Expanded slot list */}
      {expanded ? (
        <div className="border-b border-border bg-background px-4 py-3">
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Spinner
                color="accent"
                size="sm"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {MEAL_SLOTS.map((slot) => {
                const entry = mondaySlots?.[slot];
                const meal = entry ? mealById.get(entry.nutrition_meal_id) : undefined;
                return (
                  <div
                    className="flex items-center gap-2"
                    key={slot}
                  >
                    <span className="w-20 shrink-0 text-xs text-muted">{MEAL_SLOT_LABELS[slot] ?? slot}</span>
                    <span className={`text-xs ${meal ? 'font-medium text-foreground' : 'text-muted'}`}>
                      {meal ? meal.name : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
