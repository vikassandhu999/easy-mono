/**
 * PlanDays — the nutrition plan builder, day-first (badge NB).
 *
 * A plan has 1..N named days; each day holds ordered meal options per slot and
 * a weekday map assigns Mon..Sun to exactly one day. The redesign renders one
 * day at a time:
 *
 *   day tabs · + Day · ⋯          |  weekday chips
 *   energy line + macro meters (DayEnergyHeader)
 *   meal cards in slot order (MealCard)
 *   Add meal
 *
 * The slot options model maps onto the redesign directly: the position-0 option
 * of a slot is the meal card, and the remaining options are that meal's
 * `Client can swap with` alternates. Re-slotting a meal has no dedicated
 * endpoint, so it is a remove-then-add of the day option.
 *
 * The generated `days` / `weekday_assignments` fields on NutritionPlan are
 * loosely typed (`additionalProperties: true` on the backend schema — see
 * EasyWeb.OpenApi.Schemas.NutritionPlan) since they're new; NutritionPlanDay /
 * NutritionDayMeal below give them a concrete shape for this file.
 *
 * Cache: tag:false — optimistic updateQueryData('getNutritionPlan', {id: planId}, …)
 * + patch.undo() + toast on failure, and a reconciling refetch() after each
 * successful mutation (positions/defaults are server-computed).
 */
import {MEAL_SLOTS, WEEKDAY_SHORT_LABELS, WEEKDAYS} from '@easy/utils';
import {
  AlertDialog,
  Button,
  Dropdown,
  Label,
  Separator,
  Spinner,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  toast,
  useOverlayState,
} from '@heroui/react';
import {MoreHorizontal} from 'lucide-react';
import {useEffect, useState} from 'react';

import {getErrorCode, toastMutationError} from '@/@components/mutation-toast';
import type {NutritionMeal, NutritionPlan} from '@/api/generated';
import {
  coachApi,
  useAddNutritionSlotOptionMutation,
  useAssignNutritionPlanWeekdayMutation,
  useCreateMealMutation,
  useCreateNutritionPlanDayMutation,
  useDeleteNutritionPlanDayMutation,
  useGetNutritionPlanQuery,
  useRemoveNutritionSlotOptionMutation,
  useUpdateNutritionPlanDayMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {DayEnergyHeader} from './day-energy-header';
import {MealCard, type MealSwap} from './meal-card';
import {AddMealControl, type MealPaletteOption} from './meal-palette';
import {slotLabel} from './meal-slot-control';

// ---------------------------------------------------------------------------
// Types (the generated fields are `{[key: string]: any}` — see file header)
// ---------------------------------------------------------------------------

export type NutritionDayMeal = {
  id: string;
  meal_slot: string;
  position: number;
  nutrition_meal_id: string;
};

export type NutritionPlanDay = {
  id: string;
  name: string;
  position: number;
  day_meals: NutritionDayMeal[];
};

type WeekdayAssignments = Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function getDays(plan: NutritionPlan): NutritionPlanDay[] {
  return ((plan.days ?? []) as unknown as NutritionPlanDay[]).slice().sort((a, b) => a.position - b.position);
}

function getWeekdayAssignments(plan: NutritionPlan): WeekdayAssignments {
  return (plan.weekday_assignments ?? {}) as WeekdayAssignments;
}

function optionsForSlot(day: NutritionPlanDay, slot: string): NutritionDayMeal[] {
  return (day.day_meals ?? []).filter((dm) => dm.meal_slot === slot).sort((a, b) => a.position - b.position);
}

/** Day rows in slot order: the position-0 option plus its alternates. */
function slotRows(day: NutritionPlanDay): {slot: string; primary: NutritionDayMeal; alternates: NutritionDayMeal[]}[] {
  const rows: {slot: string; primary: NutritionDayMeal; alternates: NutritionDayMeal[]}[] = [];
  for (const slot of MEAL_SLOTS) {
    const options = optionsForSlot(day, slot);
    const primary = options[0];
    if (primary) {
      rows.push({slot, primary, alternates: options.slice(1)});
    }
  }
  return rows;
}

/** Macro totals of the day's default options — the numbers behind the energy line. */
function computeDayTotals(day: NutritionPlanDay, mealById: Map<string, NutritionMeal>) {
  const totals = {calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0};
  for (const row of slotRows(day)) {
    const nutrition = mealById.get(row.primary.nutrition_meal_id)?.nutrition;
    totals.calories += nutrition?.calories ?? 0;
    totals.protein_g += nutrition?.protein_g ?? 0;
    totals.carbs_g += nutrition?.carbs_g ?? 0;
    totals.fat_g += nutrition?.fat_g ?? 0;
  }
  return totals;
}

/** First slot with nothing on it — where a newly added meal lands. */
function firstFreeSlot(day: NutritionPlanDay): string {
  return MEAL_SLOTS.find((slot) => optionsForSlot(day, slot).length === 0) ?? MEAL_SLOTS[0];
}

/** "On Mon, Tue · Lunch" — where a plan meal already sits, for the reuse list. */
function mealPlacementSummary(mealId: string, days: NutritionPlanDay[], weekdays: WeekdayAssignments): string {
  const parts: string[] = [];
  const dayNames = days.filter((d) => (d.day_meals ?? []).some((dm) => dm.nutrition_meal_id === mealId));
  if (dayNames.length > 0) {
    const labels = WEEKDAYS.filter((w) => dayNames.some((d) => weekdays[w] === d.id)).map(
      (w) => WEEKDAY_SHORT_LABELS[w] ?? w,
    );
    parts.push(`On ${labels.length > 0 ? labels.join(', ') : dayNames.map((d) => d.name).join(', ')}`);
  }
  const slot = dayNames.flatMap((d) => d.day_meals ?? []).find((dm) => dm.nutrition_meal_id === mealId)?.meal_slot;
  if (slot) {
    parts.push(slotLabel(slot));
  }
  return parts.join(' · ');
}

function deleteDayConfirmBody(
  day: NutritionPlanDay,
  days: NutritionPlanDay[],
  weekdayAssignments: WeekdayAssignments,
): string {
  const assignedWeekdays = WEEKDAYS.filter((w) => weekdayAssignments[w] === day.id);
  if (assignedWeekdays.length === 0) {
    return 'Its meals stay in the plan.';
  }
  const fallback = days.filter((d) => d.id !== day.id).sort((a, b) => a.position - b.position)[0];
  const labels = assignedWeekdays.map((w) => WEEKDAY_SHORT_LABELS[w] ?? w).join(', ');
  return `Its meals stay in the plan. ${labels} will move to "${fallback?.name ?? 'the remaining day'}".`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanDaysProps {
  plan: NutritionPlan;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanDays({plan}: PlanDaysProps) {
  const dispatch = useAppDispatch();
  const {refetch} = useGetNutritionPlanQuery({id: plan.id});

  const days = getDays(plan);
  const weekdayAssignments = getWeekdayAssignments(plan);
  const meals = plan.meals ?? [];
  const mealById = new Map(meals.map((m) => [m.id, m]));

  const [activeDayId, setActiveDayId] = useState<string | undefined>(days[0]?.id);
  // The `?? days[0]` fallback IS the after-delete correction — every consumer
  // reads activeDay.id, so a stale activeDayId is never observable and needs no
  // sync effect to write it back.
  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];

  const [openMealId, setOpenMealId] = useState<string | null>(null);
  const [autoRenameMealId, setAutoRenameMealId] = useState<string | null>(null);
  const [showMacros, setShowMacros] = useState(false);

  // Inline rename state for the active day.
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(activeDay?.name ?? '');
  useEffect(() => {
    if (!editingName) {
      setNameValue(activeDay?.name ?? '');
    }
  }, [activeDay?.name, editingName]);

  const deleteAlertState = useOverlayState();

  const [createDay, {isLoading: creatingDay}] = useCreateNutritionPlanDayMutation();
  const [updateDay] = useUpdateNutritionPlanDayMutation();
  const [deleteDay, {isLoading: deletingDay}] = useDeleteNutritionPlanDayMutation();
  const [assignWeekday] = useAssignNutritionPlanWeekdayMutation();
  const [addOption] = useAddNutritionSlotOptionMutation();
  const [removeOption] = useRemoveNutritionSlotOptionMutation();
  const [createMeal] = useCreateMealMutation();

  // ---------------------------------------------------------------------------
  // Days: add / rename / delete
  // ---------------------------------------------------------------------------

  const handleAddDay = async () => {
    try {
      const result = await createDay({planId: plan.id, nutritionPlanDayCreateRequest: {}}).unwrap();
      const newDay = result.data as unknown as NutritionPlanDay;
      dispatch(
        coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
          if (!draft.data.days) {
            draft.data.days = [];
          }
          draft.data.days.push(newDay);
        }),
      );
      setActiveDayId(newDay.id);
      refetch().catch(() => undefined);
    } catch (e) {
      toastMutationError(e, "Couldn't add day");
    }
  };

  const commitRename = async () => {
    const trimmed = nameValue.trim();
    if (!activeDay || !trimmed || trimmed === activeDay.name) {
      setEditingName(false);
      setNameValue(activeDay?.name ?? '');
      return;
    }
    setEditingName(false);
    const dayId = activeDay.id;
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
        const d = draft.data.days?.find((x) => x.id === dayId);
        if (d) {
          d.name = trimmed;
        }
      }),
    );
    try {
      await updateDay({id: dayId, nutritionPlanDayUpdateRequest: {name: trimmed}}).unwrap();
      refetch().catch(() => undefined);
    } catch (e) {
      patch.undo();
      setNameValue(activeDay.name);
      toastMutationError(e, "Couldn't rename day");
    }
  };

  const confirmDeleteDay = async () => {
    if (!activeDay) {
      return;
    }
    const deletingId = activeDay.id;
    const fallback = days.filter((d) => d.id !== deletingId).sort((a, b) => a.position - b.position)[0];
    try {
      await deleteDay({id: deletingId}).unwrap();
      dispatch(
        coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
          const idx = draft.data.days?.findIndex((d) => d.id === deletingId) ?? -1;
          if (idx !== -1) {
            draft.data.days?.splice(idx, 1);
          }
          if (draft.data.weekday_assignments && fallback) {
            for (const [wd, id] of Object.entries(draft.data.weekday_assignments)) {
              if (id === deletingId) {
                draft.data.weekday_assignments[wd] = fallback.id;
              }
            }
          }
        }),
      );
      if (fallback) {
        setActiveDayId(fallback.id);
      }
      deleteAlertState.close();
      refetch().catch(() => undefined);
    } catch (e) {
      deleteAlertState.close();
      if (getErrorCode(e) === 'last_day') {
        toast.danger("Can't delete the only day.");
      } else {
        toastMutationError(e, "Couldn't delete day");
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Weekday assignment — a weekday belongs to exactly one day, so assigning it
  // here implicitly takes it off whichever day held it (INTERACTIONS.md § NB).
  // ---------------------------------------------------------------------------

  const handleAssignWeekday = async (weekday: string, dayId: string) => {
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
        if (!draft.data.weekday_assignments) {
          draft.data.weekday_assignments = {};
        }
        draft.data.weekday_assignments[weekday] = dayId;
      }),
    );
    try {
      await assignWeekday({
        planId: plan.id,
        nutritionWeekdayAssignRequest: {
          day_of_week: weekday as (typeof WEEKDAYS)[number],
          nutrition_plan_day_id: dayId,
        },
      }).unwrap();
      refetch().catch(() => undefined);
    } catch (e) {
      patch.undo();
      toastMutationError(e, "Couldn't assign day");
    }
  };

  // ---------------------------------------------------------------------------
  // Day options: add / remove / re-slot
  // ---------------------------------------------------------------------------

  const addOptionToDay = async (dayId: string, slot: string, mealId: string) => {
    try {
      const result = await addOption({
        dayId,
        nutritionSlotOptionCreateRequest: {meal_slot: slot as (typeof MEAL_SLOTS)[number], nutrition_meal_id: mealId},
      }).unwrap();
      const newOption = result.data as unknown as NutritionDayMeal;
      dispatch(
        coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
          const d = draft.data.days?.find((x) => x.id === dayId);
          if (d) {
            if (!d.day_meals) {
              d.day_meals = [];
            }
            d.day_meals.push(newOption);
          }
        }),
      );
      refetch().catch(() => undefined);
      return newOption;
    } catch (e) {
      if (getErrorCode(e) === 'max_options') {
        toast.danger('Only 3 options are allowed per slot.');
      } else {
        toastMutationError(e, "Couldn't add meal to this day");
      }
      return null;
    }
  };

  const removeOptionFromDay = async (dayId: string, optionId: string) => {
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
        const d = draft.data.days?.find((x) => x.id === dayId);
        const dayMeals = d?.day_meals as NutritionDayMeal[] | undefined;
        if (dayMeals) {
          const idx = dayMeals.findIndex((dm) => dm.id === optionId);
          if (idx !== -1) {
            dayMeals.splice(idx, 1);
          }
        }
      }),
    );
    try {
      await removeOption({id: optionId}).unwrap();
      refetch().catch(() => undefined);
      return true;
    } catch (e) {
      patch.undo();
      toastMutationError(e, "Couldn't remove meal from this day");
      return false;
    }
  };

  /** No re-slot endpoint exists — move the option by removing and re-adding it. */
  const handleChangeSlot = async (dayId: string, optionId: string, mealId: string, nextSlot: string) => {
    const removed = await removeOptionFromDay(dayId, optionId);
    if (removed) {
      await addOptionToDay(dayId, nextSlot, mealId);
    }
  };

  const handleCreateMeal = async (dayId: string, slot: string) => {
    try {
      const result = await createMeal({planId: plan.id, nutritionMealRequest: {name: 'New meal'}}).unwrap();
      const newMeal = result.data;
      dispatch(
        coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
          if (!draft.data.meals) {
            draft.data.meals = [];
          }
          draft.data.meals.push(newMeal);
        }),
      );
      await addOptionToDay(dayId, slot, newMeal.id);
      setOpenMealId(newMeal.id);
      setAutoRenameMealId(newMeal.id);
    } catch (e) {
      toastMutationError(e, "Couldn't add meal");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!activeDay) {
    return (
      <Typography
        color="muted"
        type="body-sm"
      >
        No days yet.
      </Typography>
    );
  }

  const rows = slotRows(activeDay);
  const totals = computeDayTotals(activeDay, mealById);
  const dayMealIds = new Set((activeDay.day_meals ?? []).map((dm) => dm.nutrition_meal_id));
  const assignedWeekdays = WEEKDAYS.filter((w) => weekdayAssignments[w] === activeDay.id);

  const reusableMeals: MealPaletteOption[] = meals
    .filter((m) => !dayMealIds.has(m.id))
    .map((m) => ({id: m.id, name: m.name, sub: mealPlacementSummary(m.id, days, weekdayAssignments)}));

  /** Every day-slot option across the plan that points at a meal — drives "Used in n places". */
  const assignmentCounts = new Map<string, number>();
  for (const day of days) {
    for (const dm of day.day_meals ?? []) {
      assignmentCounts.set(dm.nutrition_meal_id, (assignmentCounts.get(dm.nutrition_meal_id) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Day switcher + weekday chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {editingName ? (
            <input
              // biome-ignore lint/a11y/noAutofocus: the day name opens in editing mode on user intent
              autoFocus
              aria-label="Day name"
              className="min-w-0 border-b border-accent bg-transparent text-sm font-semibold text-foreground outline-none"
              onBlur={() => {
                commitRename().catch(() => undefined);
              }}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitRename().catch(() => undefined);
                } else if (e.key === 'Escape') {
                  setEditingName(false);
                  setNameValue(activeDay.name);
                }
              }}
              value={nameValue}
            />
          ) : (
            <ToggleButtonGroup
              aria-label="Plan days"
              className="flex flex-wrap gap-1.5"
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next) {
                  setActiveDayId(String(next));
                  setOpenMealId(null);
                }
              }}
              selectedKeys={[activeDay.id]}
              selectionMode="single"
            >
              {days.map((day) => (
                <ToggleButton
                  className="min-h-11 rounded-control border border-border bg-transparent px-3.5 text-pill font-medium text-muted data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:font-semibold data-[selected=true]:text-ink-foreground"
                  id={day.id}
                  key={day.id}
                >
                  {day.name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          <Button
            className="shrink-0 text-xs font-semibold text-accent"
            isPending={creatingDay}
            onPress={() => {
              handleAddDay().catch(() => undefined);
            }}
            size="sm"
            variant="ghost"
          >
            + Day
          </Button>

          <Dropdown>
            <Button
              aria-label="Day options"
              className="size-11 min-w-11 shrink-0 rounded-control border border-border bg-surface text-muted"
              isIconOnly
              size="sm"
              variant="outline"
            >
              <MoreHorizontal className="size-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'rename-day') {
                    setEditingName(true);
                  } else if (key === 'delete-day') {
                    deleteAlertState.open();
                  }
                }}
              >
                <Dropdown.Section>
                  <Dropdown.Item
                    id="rename-day"
                    textValue="Rename day"
                  >
                    <Label>Rename day</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Dropdown.Item
                    id="delete-day"
                    textValue="Delete day"
                    variant="danger"
                  >
                    <Label>Delete day</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* Weekday chips — exclusivity lives here, not in the component (GAPS #8). */}
        <ToggleButtonGroup
          aria-label={`Weekdays on ${activeDay.name}`}
          className="flex gap-1.5"
          onSelectionChange={(keys) => {
            const next = new Set([...keys].map(String));
            for (const weekday of next) {
              if (weekdayAssignments[weekday] !== activeDay.id) {
                handleAssignWeekday(weekday, activeDay.id).catch(() => undefined);
              }
            }
          }}
          selectedKeys={assignedWeekdays}
          selectionMode="multiple"
        >
          {WEEKDAYS.map((weekday) => (
            <ToggleButton
              aria-label={`${WEEKDAY_SHORT_LABELS[weekday] ?? weekday} on ${activeDay.name}`}
              className="size-11 min-w-11 rounded-control border border-border bg-transparent p-0 text-pill font-semibold text-muted data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
              id={weekday}
              key={weekday}
            >
              {(WEEKDAY_SHORT_LABELS[weekday] ?? weekday).charAt(0)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

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

      {/* Meal cards */}
      {rows.length === 0 ? (
        <Typography
          className="py-2"
          color="muted"
          type="body-sm"
        >
          No meals on this day yet — add the first one below.
        </Typography>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({slot, primary, alternates}) => {
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
                assignmentCount={assignmentCounts.get(meal.id) ?? 0}
                autoRename={autoRenameMealId === meal.id}
                key={primary.id}
                meal={meal}
                onAddSwap={(mealId) => {
                  addOptionToDay(activeDay.id, slot, mealId).catch(() => undefined);
                }}
                onChangeSlot={(nextSlot) => {
                  if (nextSlot !== slot) {
                    handleChangeSlot(activeDay.id, primary.id, meal.id, nextSlot).catch(() => undefined);
                  }
                }}
                onRemoveFromDay={() => {
                  removeOptionFromDay(activeDay.id, primary.id).catch(() => undefined);
                }}
                onRemoveSwap={(optionId) => {
                  removeOptionFromDay(activeDay.id, optionId).catch(() => undefined);
                }}
                onToggle={() => {
                  setOpenMealId((current) => (current === meal.id ? null : meal.id));
                  setAutoRenameMealId(null);
                }}
                open={openMealId === meal.id}
                planId={plan.id}
                slot={slot}
                swapCandidates={meals
                  .filter((m) => !slotMealIds.has(m.id))
                  .map((m) => ({
                    id: m.id,
                    name: m.name,
                    sub: m.nutrition?.calories != null ? `${Math.round(m.nutrition.calories)} kcal` : undefined,
                  }))}
                swaps={swaps}
              />
            );
          })}
        </div>
      )}

      {/* Add meal */}
      <AddMealControl
        onCreate={() => {
          handleCreateMeal(activeDay.id, firstFreeSlot(activeDay)).catch(() => undefined);
        }}
        onReuse={(mealId) => {
          addOptionToDay(activeDay.id, firstFreeSlot(activeDay), mealId).catch(() => undefined);
        }}
        reusable={reusableMeals}
      />

      {/* Delete day confirm */}
      <AlertDialog.Backdrop
        isDismissable={!deletingDay}
        isOpen={deleteAlertState.isOpen}
        onOpenChange={deleteAlertState.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete "{activeDay.name}"?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{deleteDayConfirmBody(activeDay, days, weekdayAssignments)}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={deletingDay}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                className="relative"
                isPending={deletingDay}
                onPress={() => {
                  confirmDeleteDay().catch(() => undefined);
                }}
                variant="danger"
              >
                <span className={deletingDay ? 'invisible' : undefined}>Delete</span>
                {deletingDay ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Spinner
                      color="current"
                      size="sm"
                    />
                    <span className="sr-only">Deleting</span>
                  </span>
                ) : null}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}
