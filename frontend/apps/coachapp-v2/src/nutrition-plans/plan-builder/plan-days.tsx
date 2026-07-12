/**
 * PlanDays — "DAYS" section of the nutrition plan builder.
 *
 * Replaces the old weekly schedule model: a plan has 1..N named days, each
 * with 6 meal slots holding up to 3 whole-meal options (position 0 = the
 * default option). A weekday -> day map assigns Mon..Sun to one of the days.
 *
 * Single day: no tabs, no weekday strip, no day name — just the six slot
 * groups. "Add day" always lives in the section header, in both modes.
 * Multiple days: day tabs, a weekday strip (M T W T F S S) under the tabs
 * assigning the active day to weekdays, and inline rename / delete for the
 * active day.
 *
 * The generated `days` / `weekday_assignments` fields on NutritionPlan are
 * loosely typed (`additionalProperties: true` on the backend schema — see
 * EasyWeb.OpenApi.Schemas.NutritionPlan) since they're new; NutritionPlanDay /
 * NutritionDayMeal below give them a concrete shape for this file.
 *
 * Cache: tag:false — mirrors meals-list.tsx / meal-card.tsx: optimistic
 * updateQueryData('getNutritionPlan', {id: planId}, …) + patch.undo() + toast
 * on failure, and a reconciling refetch() after each successful mutation
 * (positions/defaults are server-computed on add/remove/make-default).
 */
import {MEAL_SLOT_LABELS, MEAL_SLOTS, WEEKDAY_SHORT_LABELS, WEEKDAYS} from '@easy/utils';
import {
  AlertDialog,
  Button,
  Dropdown,
  Label,
  ListBox,
  Select,
  Spinner,
  Tabs,
  toast,
  useOverlayState,
} from '@heroui/react';
import {MoreHorizontal, Pencil, Plus, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';

import {getErrorCode, toastMutationError} from '@/@components/mutation-toast';
import type {NutritionMeal, NutritionPlan} from '@/api/generated';
import {
  coachApi,
  useAddNutritionSlotOptionMutation,
  useAssignNutritionPlanWeekdayMutation,
  useCreateNutritionPlanDayMutation,
  useDeleteNutritionPlanDayMutation,
  useGetNutritionPlanQuery,
  useMakeNutritionSlotOptionDefaultMutation,
  useRemoveNutritionSlotOptionMutation,
  useUpdateNutritionPlanDayMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

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

/** Default option's meal calories per slot, summed; flags any slot with 2+ options. */
function computeDayTotals(day: NutritionPlanDay, meals: NutritionMeal[]): {calories: number; anyMultiOption: boolean} {
  const mealById = new Map(meals.map((m) => [m.id, m]));
  let calories = 0;
  let anyMultiOption = false;
  for (const slot of MEAL_SLOTS) {
    const options = optionsForSlot(day, slot);
    if (options.length > 1) {
      anyMultiOption = true;
    }
    const defaultOption = options.find((o) => o.position === 0) ?? options[0];
    const meal = defaultOption ? mealById.get(defaultOption.nutrition_meal_id) : undefined;
    if (meal?.nutrition?.calories != null) {
      calories += meal.nutrition.calories;
    }
  }
  return {calories, anyMultiOption};
}

function deleteDayConfirmBody(
  day: NutritionPlanDay,
  days: NutritionPlanDay[],
  weekdayAssignments: WeekdayAssignments,
): string {
  const assignedWeekdays = WEEKDAYS.filter((w) => weekdayAssignments[w] === day.id);
  if (assignedWeekdays.length === 0) {
    return "This can't be undone.";
  }
  const fallback = days.filter((d) => d.id !== day.id).sort((a, b) => a.position - b.position)[0];
  const labels = assignedWeekdays.map((w) => WEEKDAY_SHORT_LABELS[w] ?? w).join(', ');
  return `${labels} will move to "${fallback?.name ?? 'the remaining day'}".`;
}

// ---------------------------------------------------------------------------
// Sub-component: SlotGroup
// ---------------------------------------------------------------------------

interface SlotGroupProps {
  slot: string;
  day: NutritionPlanDay;
  meals: NutritionMeal[];
  isAdding: boolean;
  onOpenAdd: () => void;
  onPickMeal: (mealId: string) => void;
  onRemoveOption: (optionId: string) => void;
  onMakeDefault: (optionId: string) => void;
}

function SlotGroup({slot, day, meals, isAdding, onOpenAdd, onPickMeal, onRemoveOption, onMakeDefault}: SlotGroupProps) {
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const options = optionsForSlot(day, slot);
  const availableMeals = meals.filter((m) => !options.some((o) => o.nutrition_meal_id === m.id));

  return (
    <div>
      <h4 className="mb-2 font-grotesk text-[13.5px] font-bold tracking-[-0.01em]">{MEAL_SLOT_LABELS[slot] ?? slot}</h4>
      <div className="flex flex-col gap-2">
        {options.length === 0 ? (
          <p className="text-xs text-muted">No options yet.</p>
        ) : (
          options.map((option) => {
            const meal = mealById.get(option.nutrition_meal_id);
            return (
              <div
                className="flex min-h-11 items-center gap-2.5 rounded-[14px] border-[1.5px] border-separator bg-surface py-2 pl-3.5 pr-2 transition-shadow hover:shadow-[0_12px_26px_-18px_rgba(24,24,27,0.5)]"
                key={option.id}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-grotesk text-sm font-semibold text-foreground">
                    {meal?.name ?? 'Unknown meal'}
                  </span>
                  {meal?.nutrition?.calories != null ? (
                    <span className="shrink-0 text-xs text-muted">{Math.round(meal.nutrition.calories)} kcal</span>
                  ) : null}
                </div>
                {option.position === 0 ? (
                  <span className="shrink-0 rounded-full bg-nutrition-soft px-2.5 py-1 text-[11px] font-bold text-nutrition">
                    Default
                  </span>
                ) : null}
                <Dropdown>
                  <Button
                    aria-label="Option actions"
                    className="h-[30px] w-[30px] min-w-0 rounded-[9px]! text-muted/70"
                    isIconOnly
                    size="sm"
                    variant="ghost"
                  >
                    <MoreHorizontal size={15} />
                  </Button>
                  <Dropdown.Popover>
                    <Dropdown.Menu
                      onAction={(key) => {
                        if (key === 'make-default') {
                          onMakeDefault(option.id);
                        } else if (key === 'remove') {
                          onRemoveOption(option.id);
                        }
                      }}
                    >
                      {option.position !== 0 ? (
                        <Dropdown.Item
                          id="make-default"
                          textValue="Make default"
                        >
                          <Label>Make default</Label>
                        </Dropdown.Item>
                      ) : null}
                      <Dropdown.Item
                        id="remove"
                        textValue="Remove"
                        variant="danger"
                      >
                        <Label>Remove</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            );
          })
        )}
      </div>

      {options.length < 3 && meals.length > 0 ? (
        isAdding ? (
          <div className="mt-2">
            <Select
              aria-label={`Add option for ${MEAL_SLOT_LABELS[slot] ?? slot}`}
              onSelectionChange={(key) => {
                if (key) {
                  onPickMeal(String(key));
                }
              }}
              placeholder="Choose a meal"
              variant="secondary"
            >
              <Select.Trigger className="min-h-11 text-sm">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {availableMeals.length === 0 ? (
                    <ListBox.Item
                      id="__none__"
                      isDisabled
                      key="__none__"
                      textValue="No meals available"
                    >
                      <span className="text-muted">No meals available</span>
                    </ListBox.Item>
                  ) : (
                    availableMeals.map((meal) => (
                      <ListBox.Item
                        id={meal.id}
                        key={meal.id}
                        textValue={meal.name}
                      >
                        {meal.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        ) : (
          <button
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-dashed border-edge-strong text-[12.5px] font-semibold text-muted transition-colors hover:border-nutrition hover:bg-nutrition-soft/50 hover:text-nutrition"
            onClick={onOpenAdd}
            type="button"
          >
            <Plus
              size={14}
              strokeWidth={2.2}
            />
            Add option
          </button>
        )
      ) : null}
    </div>
  );
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

  const [activeDayId, setActiveDayId] = useState<string | undefined>(days[0]?.id);
  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];

  // Keep the active day valid after a delete or on first load.
  useEffect(() => {
    const first = days[0];
    if (first && !days.some((d) => d.id === activeDayId)) {
      setActiveDayId(first.id);
    }
  }, [days, activeDayId]);

  const [addingSlot, setAddingSlot] = useState<string | null>(null);

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
  const [makeDefault] = useMakeNutritionSlotOptionDefaultMutation();

  // ---------------------------------------------------------------------------
  // Add day
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

  // ---------------------------------------------------------------------------
  // Rename day
  // ---------------------------------------------------------------------------

  const startEditingName = () => setEditingName(true);

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

  // ---------------------------------------------------------------------------
  // Delete day
  // ---------------------------------------------------------------------------

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
  // Weekday assignment
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
  // Slot options: add / remove / make default
  // ---------------------------------------------------------------------------

  const handlePickMeal = async (dayId: string, slot: string, mealId: string) => {
    setAddingSlot(null);
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
    } catch (e) {
      if (getErrorCode(e) === 'max_options') {
        toast.danger('Only 3 options are allowed per slot.');
      } else {
        toastMutationError(e, "Couldn't add option");
      }
    }
  };

  const handleRemoveOption = async (dayId: string, optionId: string) => {
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
    } catch (e) {
      patch.undo();
      toastMutationError(e, "Couldn't remove option");
    }
  };

  const handleMakeDefault = async (dayId: string, slot: string, optionId: string) => {
    const day = days.find((d) => d.id === dayId);
    const options = day ? optionsForSlot(day, slot) : [];
    const target = options.find((o) => o.id === optionId);
    const prevDefault = options.find((o) => o.position === 0);
    if (!target || target.position === 0) {
      return;
    }
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
        const d = draft.data.days?.find((x) => x.id === dayId);
        const dayMeals = d?.day_meals as NutritionDayMeal[] | undefined;
        const t = dayMeals?.find((x) => x.id === optionId);
        const p = prevDefault ? dayMeals?.find((x) => x.id === prevDefault.id) : undefined;
        if (t && p) {
          const targetPosition = t.position;
          t.position = p.position;
          p.position = targetPosition;
        }
      }),
    );
    try {
      await makeDefault({id: optionId}).unwrap();
      refetch().catch(() => undefined);
    } catch (e) {
      patch.undo();
      toastMutationError(e, "Couldn't set default option");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!activeDay) {
    return (
      <section className="border-t border-separator py-4">
        <h3 className="font-grotesk text-[15px] font-bold tracking-[-0.01em]">Days</h3>
        <p className="mt-2 text-sm text-muted">No days yet.</p>
      </section>
    );
  }

  const totals = computeDayTotals(activeDay, meals);

  return (
    <section className="border-t border-separator py-4">
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <h3 className="font-grotesk text-[15px] font-bold tracking-[-0.01em]">Days</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {days.length} day{days.length === 1 ? '' : 's'} · assign weekdays
          </p>
        </div>
        <Button
          className="rounded-[10px]! border-[1.5px] border-separator text-[12.5px] font-semibold"
          isPending={creatingDay}
          onPress={() => {
            handleAddDay().catch(() => undefined);
          }}
          size="sm"
          variant="ghost"
        >
          <Plus
            size={14}
            strokeWidth={2.2}
          />
          Add day
        </Button>
      </div>

      {days.length > 1 ? (
        <>
          {/* Day tabs */}
          <div className="mb-3 flex items-center gap-2">
            <Tabs
              aria-label="Plan days"
              className="min-w-0 flex-1"
              onSelectionChange={(key) => setActiveDayId(String(key))}
              selectedKey={activeDay.id}
            >
              <Tabs.ListContainer className="scrollbar-hide max-w-full overflow-x-auto">
                <Tabs.List className="w-max! min-w-max">
                  {days.map((day) => (
                    <Tabs.Tab
                      className="w-auto! whitespace-nowrap"
                      id={day.id}
                      key={day.id}
                    >
                      {day.name}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>

          {/* Weekday strip */}
          <div className="mb-3 flex gap-1">
            {WEEKDAYS.map((weekday) => {
              const filled = weekdayAssignments[weekday] === activeDay.id;
              return (
                <button
                  aria-label={`Assign ${WEEKDAY_SHORT_LABELS[weekday] ?? weekday} to ${activeDay.name}`}
                  className={`min-h-11 min-w-[40px] flex-1 rounded-[10px] border-[1.5px] text-xs font-bold transition-colors ${
                    filled
                      ? 'border-nutrition/40 bg-nutrition-soft text-nutrition'
                      : 'border-separator text-muted hover:text-foreground'
                  }`}
                  key={weekday}
                  onClick={() => {
                    if (!filled) {
                      handleAssignWeekday(weekday, activeDay.id).catch(() => undefined);
                    }
                  }}
                  type="button"
                >
                  {(WEEKDAY_SHORT_LABELS[weekday] ?? weekday).charAt(0)}
                </button>
              );
            })}
          </div>

          {/* Rename / delete active day */}
          <div className="mb-3 flex items-center gap-2">
            {editingName ? (
              <input
                // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
                autoFocus
                className="min-w-0 flex-1 border-b border-accent bg-transparent font-grotesk text-[15px] font-bold tracking-[-0.01em] text-foreground outline-none"
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
              <span className="min-w-0 flex-1 truncate font-grotesk text-[15px] font-bold tracking-[-0.01em] text-foreground">
                {activeDay.name}
              </span>
            )}
            <Button
              aria-label="Rename day"
              className="h-[30px] w-[30px] min-w-0 rounded-[9px]! bg-nutrition-soft! text-nutrition!"
              isIconOnly
              onPress={startEditingName}
              size="sm"
              variant="ghost"
            >
              <Pencil size={14} />
            </Button>
            <Button
              aria-label="Delete day"
              className="h-[30px] w-[30px] min-w-0 rounded-[9px]! text-muted/70 hover:bg-danger-soft! hover:text-danger!"
              isIconOnly
              onPress={deleteAlertState.open}
              size="sm"
              variant="ghost"
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </>
      ) : null}

      {/* Slot groups */}
      <div className="flex flex-col gap-4">
        {MEAL_SLOTS.map((slot) => (
          <SlotGroup
            day={activeDay}
            isAdding={addingSlot === slot}
            key={slot}
            meals={meals}
            onMakeDefault={(optionId) => {
              handleMakeDefault(activeDay.id, slot, optionId).catch(() => undefined);
            }}
            onOpenAdd={() => setAddingSlot(slot)}
            onPickMeal={(mealId) => {
              handlePickMeal(activeDay.id, slot, mealId).catch(() => undefined);
            }}
            onRemoveOption={(optionId) => {
              handleRemoveOption(activeDay.id, optionId).catch(() => undefined);
            }}
            slot={slot}
          />
        ))}
      </div>

      {/* Day totals */}
      <div className="mt-4 rounded-[12px] bg-nutrition-soft/60 px-3.5 py-2.5">
        <div className="text-[11px] font-bold text-nutrition">Day total</div>
        <div className="font-grotesk text-sm font-bold text-foreground">{Math.round(totals.calories)} kcal</div>
        {totals.anyMultiOption ? <p className="mt-1 text-[11px] text-muted">Totals use default options.</p> : null}
      </div>

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
              <AlertDialog.Heading>
                Delete day: <strong>{activeDay.name}</strong>
              </AlertDialog.Heading>
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
                <span className={deletingDay ? 'invisible' : undefined}>Delete day</span>
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
    </section>
  );
}
