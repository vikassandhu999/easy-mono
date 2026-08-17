/**
 * The nutrition builder's composition root (badge NB).
 *
 * A plan has 1..N named days; each day holds ordered meal options per slot and
 * a weekday map assigns Mon..Sun to exactly one day. The redesign renders one
 * day at a time:
 *
 *   day tabs · + Day / weekday chips · Rename · 🗑 (DayHeader)
 *   energy line + macro meters (DayEnergyHeader)
 *   meal cards in slot order (MealCard)
 *   Add meal
 *
 * This file owns the screen state — which day is showing (`?d=`), which meal
 * is open, which item is being edited — and hands everything else down as
 * props. Every write lives in `usePlanBuilder`; there is exactly ONE add-items
 * flow and ONE amount sheet for the whole screen.
 */
import {Typography, useOverlayState} from '@heroui/react';
import {useMemo, useRef, useState} from 'react';

import type {NutritionMeal, NutritionPlan} from '@/api/nutrition-plan-builder';

import {AddItemsFlow} from './components/add-items-flow';
import {AmountSheet} from './components/amount-sheet';
import {DayEnergyHeader} from './components/day-energy-header';
import {DayHeader} from './components/day-header';
import {DeleteDayDialog} from './components/delete-day-dialog';
import {MealCard, type MealSwap} from './components/meal-card';
import type {HydratedMealItem} from './components/meal-item-row';
import {AddMealControl} from './components/meal-palette';
import {computeDayTotals, computeMealListTotals} from './macros';
import {assignmentCounts, firstFreeSlot, getDays, getWeekdayAssignments, slotRows} from './plan-tree';
import {assignedWeekdays} from './schedule';
import {useActiveDay, usePlanBuilder} from './use-plan-builder';

export function PlanBuilder({plan}: {plan: NutritionPlan}) {
  const commands = usePlanBuilder(plan.id);

  const days = useMemo(() => getDays(plan), [plan]);
  const weekdayAssignments = useMemo(() => getWeekdayAssignments(plan), [plan]);
  const meals = plan.meals;
  const mealById = useMemo(() => new Map(meals.map((meal) => [meal.id, meal])), [meals]);

  const [activeDay, selectDay] = useActiveDay(days);

  const [openMealId, setOpenMealId] = useState<string | null>(null);
  const [autoRenameMealId, setAutoRenameMealId] = useState<string | null>(null);
  const [showMacros, setShowMacros] = useState(false);

  // The root-mounted editors: which meal the add-items flow is filling, and
  // which item the amount sheet is editing. The anchor is the row the coach
  // pressed, captured from the press event — so the desktop popover has an
  // anchor without any ref registry.
  const [addingItemsTo, setAddingItemsTo] = useState<NutritionMeal | null>(null);
  const [editingItem, setEditingItem] = useState<HydratedMealItem | null>(null);
  const editorAnchor = useRef<HTMLElement | null>(null);

  const deleteAlertState = useOverlayState();

  const showDay = (dayId: string) => {
    selectDay(dayId);
    setOpenMealId(null);
  };

  // Only a TAB press closes the open meal card (showDay); add-day and
  // delete-day keep it, so switching back finds the card as it was.
  const addDay = async () => {
    const day = await commands.addDay();
    if (day) {
      selectDay(day.id);
    }
  };

  const confirmDeleteDay = async () => {
    if (!activeDay) {
      return;
    }
    const fallback = await commands.removeDay(activeDay.id);
    deleteAlertState.close();
    if (fallback) {
      selectDay(fallback.id);
    }
  };

  const derived = useMemo(() => {
    if (!activeDay) {
      return null;
    }
    return {
      counts: assignmentCounts(days),
      rows: slotRows(activeDay),
      totals: slotRows(activeDay).length === 0 ? computeMealListTotals(meals) : computeDayTotals(activeDay, mealById),
    };
  }, [activeDay, days, mealById, meals]);

  if (!activeDay || !derived) {
    return (
      <Typography
        color="muted"
        type="body-sm"
      >
        No days yet.
      </Typography>
    );
  }

  const {counts, rows, totals} = derived;

  // Style-diff anchors (design-handoff/manifests/NB.json): one card per visual
  // variant carries the id the manifest pairs against. First match wins, so a
  // card that is both shared and swapped only anchors the higher-priority id —
  // the script reports the other as MISSING rather than comparing the wrong node.
  const sharedRow = rows.findIndex((r) => (counts.get(r.primary.nutrition_meal_id) ?? 0) >= 2);
  const plainRow = rows.findIndex((r) => (counts.get(r.primary.nutrition_meal_id) ?? 0) < 2);
  const swapRow = rows.findIndex((r) => r.alternates.length > 0);
  const emptyRow = rows.findIndex((r) => (mealById.get(r.primary.nutrition_meal_id)?.meal_items.length ?? 0) === 0);
  const triggerTestId = (index: number) =>
    index === swapRow
      ? 'nb-card-open-trigger'
      : index === sharedRow
        ? 'nb-card-shared-trigger'
        : index === emptyRow
          ? 'nb-card-empty-trigger'
          : undefined;

  return (
    // No width here: `Page.Frame size="builder"` owns the builder column, the
    // same as the training builder. This screen used to re-centre itself at
    // `max-w-195` inside a 235-wide frame, so its header sat 80px wider than
    // its own content on every desktop (AGENTS.md: width and centring are
    // Page's job — a screen never hand-rolls `mx-auto max-w-*`).
    // gap-4, no pb: the same stack rhythm as the training builder (its
    // plan-builder is also `flex flex-col gap-4`; Page.Content owns the pb-10).
    <div className="flex flex-col gap-4">
      {/* Day switcher, weekday chips, rename/delete — the shared header shape */}
      <DayHeader
        assignedDays={assignedWeekdays(weekdayAssignments, activeDay.id)}
        name={activeDay.name}
        onRename={(name) => {
          commands.renameDay(activeDay.id, name).catch(() => undefined);
        }}
        onRequestDelete={deleteAlertState.open}
        onScheduleWeekday={(weekday) => {
          commands.scheduleWeekday(weekday, activeDay.id);
        }}
        tabs={{
          days,
          activeDayId: activeDay.id,
          onSelect: showDay,
          onAdd: () => {
            addDay().catch(() => undefined);
          },
          isAdding: commands.isAddingDay,
          isFirst: days[0]?.id === activeDay.id,
          isLast: days[days.length - 1]?.id === activeDay.id,
          onMove:
            days.length > 1
              ? (direction) => {
                  const from = days.findIndex((day) => day.id === activeDay.id);
                  commands.moveDay(from, from + direction).catch(() => undefined);
                }
              : undefined,
        }}
      />

      {/* Energy line + macro meters */}
      <DayEnergyHeader
        onToggleMacros={() => setShowMacros((v) => !v)}
        showMacros={showMacros}
        targets={{
          calories: plan.target_calories,
          protein_g: plan.target_protein_g,
          carbs_g: plan.target_carbs_g,
          fat_g: plan.target_fat_g,
        }}
        totals={totals}
      />

      {/* Meal cards — scheduled slot rows when present; otherwise the plan Menu. */}
      {rows.length === 0 ? (
        meals.length === 0 ? (
          <div
            className="rounded-panel border border-dashed border-border p-5 text-center type-eyebrow text-muted"
            data-testid="nb-day-empty"
          >
            No meals on this day yet.
          </div>
        ) : (
          <div
            className="flex flex-col gap-2"
            data-testid="nb-meals"
          >
            {meals
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((meal, rowIndex, ordered) => (
                <MealCard
                  assignmentCount={counts.get(meal.id) ?? 0}
                  autoRename={autoRenameMealId === meal.id}
                  cardTestId={rowIndex === 0 ? 'nb-card' : undefined}
                  commands={commands}
                  dayId={activeDay.id}
                  isFirst={rowIndex === 0}
                  isLast={rowIndex === ordered.length - 1}
                  key={meal.id}
                  meal={meal}
                  onAddItems={() => setAddingItemsTo(meal)}
                  onEditItem={(item, anchor) => {
                    editorAnchor.current = anchor;
                    setEditingItem(item);
                  }}
                  onMove={(direction) => {
                    commands.moveMeal(rowIndex, rowIndex + direction).catch(() => undefined);
                  }}
                  onToggle={() => {
                    setOpenMealId((current) => (current === meal.id ? null : meal.id));
                    setAutoRenameMealId(null);
                  }}
                  open={openMealId === meal.id}
                  optionId={meal.id}
                  slot={firstFreeSlot(activeDay)}
                  triggerTestId={rowIndex === 0 ? 'nb-card-open-trigger' : undefined}
                  swapCandidates={[]}
                  swaps={[]}
                />
              ))}
          </div>
        )
      ) : (
        <div
          className="flex flex-col gap-2"
          data-testid="nb-meals"
        >
          {rows.map(({slot, primary, alternates}, rowIndex) => {
            const meal = mealById.get(primary.nutrition_meal_id);
            if (!meal) {
              return null;
            }
            const slotMealIds = new Set([primary, ...alternates].map((o) => o.nutrition_meal_id));
            const swaps: MealSwap[] = alternates
              .map((option) => {
                const alternate = mealById.get(option.nutrition_meal_id);
                return alternate ? {optionId: option.id, meal: alternate} : null;
              })
              .filter((s): s is MealSwap => s !== null);

            return (
              <MealCard
                assignmentCount={counts.get(meal.id) ?? 0}
                autoRename={autoRenameMealId === meal.id}
                cardTestId={rowIndex === plainRow ? 'nb-card' : rowIndex === sharedRow ? 'nb-card-shared' : undefined}
                commands={commands}
                dayId={activeDay.id}
                key={primary.id}
                meal={meal}
                onAddItems={() => setAddingItemsTo(meal)}
                onEditItem={(item, anchor) => {
                  editorAnchor.current = anchor;
                  setEditingItem(item);
                }}
                onToggle={() => {
                  setOpenMealId((current) => (current === meal.id ? null : meal.id));
                  setAutoRenameMealId(null);
                }}
                open={openMealId === meal.id}
                optionId={primary.id}
                slot={slot}
                triggerTestId={triggerTestId(rowIndex)}
                swapCandidates={meals
                  .filter((m) => !slotMealIds.has(m.id))
                  .map((m) => ({
                    id: m.id,
                    name: m.name,
                    sub: m.nutrients.calories != null ? `${Math.round(m.nutrients.calories)} kcal` : undefined,
                  }))}
                swaps={swaps}
              />
            );
          })}
        </div>
      )}

      <AddMealControl
        onCreate={() => {
          commands
            .createMeal()
            .then((meal) => {
              if (meal) {
                setOpenMealId(meal.id);
                setAutoRenameMealId(meal.id);
              }
            })
            .catch(() => undefined);
        }}
        onReuse={(mealId) => {
          commands.addOption(activeDay.id, firstFreeSlot(activeDay), mealId).catch(() => undefined);
        }}
        planMealCount={meals.length}
        reusable={
          rows.length === 0
            ? []
            : meals
                .filter((meal) => !(counts.get(meal.id) ?? 0))
                .map((meal) => ({
                  id: meal.id,
                  name: meal.name,
                  sub: meal.nutrients.calories != null ? `${Math.round(meal.nutrients.calories)} kcal` : undefined,
                }))
        }
      />

      {/* Delete day confirm */}
      <DeleteDayDialog
        assignments={weekdayAssignments}
        day={activeDay}
        days={days}
        deleting={commands.isRemovingDay}
        isOpen={deleteAlertState.isOpen}
        onConfirm={() => {
          confirmDeleteDay().catch(() => undefined);
        }}
        onOpenChange={deleteAlertState.setOpen}
      />

      {/* Add foods/recipes — pick the list, then amounts, one commit. */}
      <AddItemsFlow
        mealName={addingItemsTo?.name ?? ''}
        onAdd={(items) => {
          if (addingItemsTo) {
            commands.addItems(addingItemsTo.id, items);
          }
        }}
        onClose={() => setAddingItemsTo(null)}
        open={addingItemsTo !== null}
      />

      {/* Amount sheet — edit mode */}
      <AmountSheet
        anchorEl={editorAnchor.current}
        existingItem={editingItem ?? undefined}
        onClose={() => setEditingItem(null)}
        onEditAmount={(patch) => {
          if (editingItem) {
            commands.writeItem(editingItem.id, patch);
          }
        }}
        open={editingItem !== null}
      />
    </div>
  );
}
