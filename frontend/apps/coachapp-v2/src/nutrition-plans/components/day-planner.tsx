import type {Key} from '@heroui/react';

import {AlertDialog, Button, ListBox, Select, Spinner} from '@heroui/react';
import {Copy, Plus, X} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {Meal} from '@/api/meals';
import type {PlanItem} from '@/api/nutritionPlans';

import {useCreateMealMutation} from '@/api/meals';
import {
  useCopyNutritionPlanDayMutation,
  useCreatePlanItemMutation,
  useDeletePlanItemMutation,
} from '@/api/nutritionPlans';
import MealPicker from '@/nutrition-plans/components/meal-picker';

const DAYS = [
  {label: 'Mon', value: 'monday'},
  {label: 'Tue', value: 'tuesday'},
  {label: 'Wed', value: 'wednesday'},
  {label: 'Thu', value: 'thursday'},
  {label: 'Fri', value: 'friday'},
  {label: 'Sat', value: 'saturday'},
  {label: 'Sun', value: 'sunday'},
] as const;

const MEAL_TYPES = [
  {label: 'Breakfast', value: 'breakfast'},
  {label: 'Lunch', value: 'lunch'},
  {label: 'Dinner', value: 'dinner'},
  {label: 'Snack', value: 'snack'},
] as const;

type DayPlannerProps = {
  planId: string;
  planItems: PlanItem[];
  meals: Meal[];
};

/**
 * Day planner grid for assigning meals to day + meal_type slots.
 *
 * Layout: day tabs across the top, meal_type rows within each day.
 * Each slot shows the assigned meal or a picker to assign one.
 *
 * Container decisions:
 * - Assigning a meal = tap-only select from existing meals → INLINE (native select)
 * - Removing assignment = button press (just unlinking, no delete confirmation)
 * - Copy day = button that copies all assignments from current day to a target day
 */
export default function DayPlanner({planId, planItems, meals}: DayPlannerProps) {
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [createMeal] = useCreateMealMutation();
  const [createPlanItem] = useCreatePlanItemMutation();
  const [deletePlanItem] = useDeletePlanItemMutation();
  const [copyDay, {isLoading: isCopying}] = useCopyNutritionPlanDayMutation();

  // State for which slot is currently being assigned
  const [assigningSlot, setAssigningSlot] = useState<null | string>(null);
  const [savingSlot, setSavingSlot] = useState<null | string>(null);

  // Copy day state
  const [copyTargetDay, setCopyTargetDay] = useState('');

  // Build a lookup: { day: { meal_type: PlanItem } }
  const planItemMap = useMemo(() => {
    const map = new Map<string, PlanItem>();
    for (const item of planItems) {
      map.set(`${item.day}:${item.meal_type}`, item);
    }
    return map;
  }, [planItems]);

  // Build meal name lookup
  const mealMap = useMemo(() => {
    const map = new Map<string, Meal>();
    for (const meal of meals) {
      map.set(meal.id, meal);
    }
    return map;
  }, [meals]);

  const handleAssign = async (day: string, mealType: string, meal: Meal) => {
    const slotKey = `${day}:${mealType}`;
    setSavingSlot(slotKey);
    try {
      await createPlanItem({
        planId,
        body: {day, meal_type: mealType, meal_id: meal.id},
      }).unwrap();
      setAssigningSlot(null);
    } catch {
      // Error handled by RTK Query
    } finally {
      setSavingSlot(null);
    }
  };

  const handleCreateAndAssign = async (day: string, mealType: string, name: string) => {
    const slotKey = `${day}:${mealType}`;
    const mealTypeLabel = MEAL_TYPES.find((mt) => mt.value === mealType)?.label ?? mealType;
    const mealName = name || mealTypeLabel;
    setSavingSlot(slotKey);
    try {
      const result = await createMeal({
        planId,
        body: {name: mealName},
      }).unwrap();
      await createPlanItem({
        planId,
        body: {day, meal_type: mealType, meal_id: result.data.id},
      }).unwrap();
      setAssigningSlot(null);
    } catch {
      // Error handled by RTK Query
    } finally {
      setSavingSlot(null);
    }
  };

  const handleRemove = async (planItem: PlanItem) => {
    const slotKey = `${planItem.day}:${planItem.meal_type}`;
    setSavingSlot(slotKey);
    try {
      await deletePlanItem({id: planItem.id, planId}).unwrap();
    } catch {
      // Error handled by RTK Query
    } finally {
      setSavingSlot(null);
    }
  };

  const dayItems = MEAL_TYPES.map((mt) => {
    const slotKey = `${selectedDay}:${mt.value}`;
    const planItem = planItemMap.get(slotKey);
    const assignedMeal = planItem ? mealMap.get(planItem.meal_id) : null;
    return {mealType: mt, slotKey, planItem, assignedMeal};
  });

  const currentDayHasItems = planItems.some((pi) => pi.day === selectedDay);

  return (
    <div className="min-w-0">
      {/* Day tabs — horizontally scrollable on mobile */}
      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {DAYS.map((day) => {
          const isActive = selectedDay === day.value;
          const hasItems = planItems.some((pi) => pi.day === day.value);
          return (
            <button
              className={`min-h-11 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-foreground text-background'
                  : hasItems
                    ? 'bg-content2 text-foreground hover:bg-content3'
                    : 'bg-content1 text-foreground-400 hover:bg-content2'
              }`}
              key={day.value}
              onClick={() => {
                setSelectedDay(day.value);
                setAssigningSlot(null);
              }}
              type="button"
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Copy day — dialog trigger (tap-only selection = DIALOG per container rules) */}
      {currentDayHasItems && (
        <div className="mb-3">
          <AlertDialog>
            <Button
              size="sm"
              variant="secondary"
            >
              <Copy size={14} />
              Copy meals
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  {(renderProps) => (
                    <>
                      <AlertDialog.CloseTrigger />
                      <AlertDialog.Header>
                        <AlertDialog.Heading>
                          Copy {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Meals to
                        </AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        <p className="mb-3 text-sm text-foreground-500">
                          Select a day to copy all meal assignments to.
                        </p>
                        <Select
                          className="w-full"
                          onChange={(value: Key | Key[] | null) => setCopyTargetDay(value ? String(value) : '')}
                          placeholder="Select target day..."
                          value={copyTargetDay || null}
                          variant="secondary"
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {DAYS.filter((d) => d.value !== selectedDay).map((day) => (
                                <ListBox.Item
                                  id={day.value}
                                  key={day.value}
                                  textValue={day.label}
                                >
                                  {day.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button
                          onPress={() => {
                            setCopyTargetDay('');
                            renderProps.close();
                          }}
                          variant="tertiary"
                        >
                          Cancel
                        </Button>
                        <Button
                          isDisabled={!copyTargetDay}
                          isPending={isCopying}
                          onPress={async () => {
                            if (!copyTargetDay || copyTargetDay === selectedDay) return;
                            try {
                              await copyDay({
                                id: planId,
                                body: {source_day: selectedDay, target_day: copyTargetDay},
                              }).unwrap();
                              setCopyTargetDay('');
                              renderProps.close();
                            } catch {
                              // Error handled by RTK Query
                            }
                          }}
                        >
                          {isCopying ? 'Copying...' : 'Copy'}
                        </Button>
                      </AlertDialog.Footer>
                    </>
                  )}
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      )}

      {/* Meal type slots for selected day */}
      <div className="flex flex-col gap-2">
        {dayItems.map(({mealType, slotKey, planItem, assignedMeal}) => {
          const isSaving = savingSlot === slotKey;
          const isAssigning = assigningSlot === slotKey;

          return (
            <div
              className="flex min-h-11 items-center gap-3 overflow-hidden rounded-lg border border-divider bg-content1 px-3 py-2"
              key={slotKey}
            >
              {/* Meal type label */}
              <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-foreground-400">
                {mealType.label}
              </span>

              {/* Slot content */}
              <div className="min-w-0 flex-1">
                {isSaving ? (
                  <div className="flex items-center gap-4">
                    <Spinner />
                  </div>
                ) : assignedMeal && planItem ? (
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">{assignedMeal.name}</span>
                    <Button
                      aria-label={`Remove ${assignedMeal.name} from ${mealType.label}`}
                      isIconOnly
                      onPress={() => handleRemove(planItem)}
                      size="sm"
                      variant="ghost"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : isAssigning ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <MealPicker
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        meals={meals}
                        onCreate={(name) => handleCreateAndAssign(selectedDay, mealType.value, name)}
                        onSelect={(meal) => handleAssign(selectedDay, mealType.value, meal)}
                        placeholder={`Pick meal for ${mealType.label}...`}
                      />
                    </div>
                    <Button
                      isIconOnly
                      onPress={() => setAssigningSlot(null)}
                      size="sm"
                      variant="ghost"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onPress={() => setAssigningSlot(slotKey)}
                    size="sm"
                    variant="ghost"
                  >
                    <Plus size={14} />
                    Assign meal
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint if no meals exist yet */}
      {meals.length === 0 && (
        <p className="mt-3 text-xs text-foreground-400">Create meals above first, then assign them to days here.</p>
      )}
    </div>
  );
}
