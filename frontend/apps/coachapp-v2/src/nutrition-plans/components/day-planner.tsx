import {AlertDialog, Button, Label, Radio, RadioGroup, Spinner, toast} from '@heroui/react';
import {Copy, Plus, X} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {Meal} from '@/api/meals';
import {useCreateMealMutation} from '@/api/meals';
import type {PlanItem} from '@/api/nutritionPlans';
import {
  useCopyNutritionPlanDayMutation,
  useCreatePlanItemMutation,
  useDeletePlanItemMutation,
} from '@/api/nutritionPlans';
import MealPicker from '@/nutrition-plans/components/meal-picker';

const DAYS = [
  {label: 'Mon', name: 'Monday', value: 'monday'},
  {label: 'Tue', name: 'Tuesday', value: 'tuesday'},
  {label: 'Wed', name: 'Wednesday', value: 'wednesday'},
  {label: 'Thu', name: 'Thursday', value: 'thursday'},
  {label: 'Fri', name: 'Friday', value: 'friday'},
  {label: 'Sat', name: 'Saturday', value: 'saturday'},
  {label: 'Sun', name: 'Sunday', value: 'sunday'},
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

export default function DayPlanner({planId, planItems, meals}: DayPlannerProps) {
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [createMeal] = useCreateMealMutation();
  const [createPlanItem] = useCreatePlanItemMutation();
  const [deletePlanItem] = useDeletePlanItemMutation();
  const [copyDay, {isLoading: isCopying}] = useCopyNutritionPlanDayMutation();

  const [assigningSlot, setAssigningSlot] = useState<null | string>(null);
  const [savingSlot, setSavingSlot] = useState<null | string>(null);
  const [copyTargetDay, setCopyTargetDay] = useState<null | string>(null);
  const [clearExisting, setClearExisting] = useState(true);

  const planItemMap = useMemo(
    () => new Map(planItems.map((item) => [`${item.day}:${item.meal_type}`, item] as const)),
    [planItems],
  );

  const mealMap = useMemo(() => new Map(meals.map((meal) => [meal.id, meal] as const)), [meals]);

  const handleAssign = async (mealType: (typeof MEAL_TYPES)[number], meal: Meal) => {
    const slotKey = `${selectedDay}:${mealType.value}`;
    setSavingSlot(slotKey);
    try {
      await createPlanItem({
        planId,
        body: {day: selectedDay, meal_type: mealType.value, meal_id: meal.id},
      }).unwrap();
      setAssigningSlot(null);
    } catch {
      toast.danger('Failed to assign meal.');
    } finally {
      setSavingSlot(null);
    }
  };

  const handleCreateAndAssign = async (mealType: (typeof MEAL_TYPES)[number], name: string) => {
    const slotKey = `${selectedDay}:${mealType.value}`;
    setSavingSlot(slotKey);
    try {
      const result = await createMeal({
        planId,
        body: {name: name || mealType.label},
      }).unwrap();
      await createPlanItem({
        planId,
        body: {day: selectedDay, meal_type: mealType.value, meal_id: result.data.id},
      }).unwrap();
      setAssigningSlot(null);
    } catch {
      toast.danger('Failed to create meal.');
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
      toast.danger('Failed to remove meal.');
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
  const selectedDayName = DAYS.find((day) => day.value === selectedDay)?.name ?? selectedDay;

  return (
    <div className="min-w-0">
      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {DAYS.map((day) => {
          const isActive = selectedDay === day.value;
          const hasItems = planItems.some((pi) => pi.day === day.value);
          return (
            <Button
              className={`min-h-11 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-foreground text-background'
                  : hasItems
                    ? 'bg-content2 text-foreground hover:bg-content3'
                    : 'bg-content1 text-foreground-400 hover:bg-content2'
              }`}
              key={day.value}
              onPress={() => {
                setSelectedDay(day.value);
                setAssigningSlot(null);
              }}
              variant="ghost"
            >
              {day.label}
            </Button>
          );
        })}
      </div>

      {/* tap-only selection = DIALOG per container rules */}
      {currentDayHasItems && (
        <div className="mb-3">
          <AlertDialog>
            <Button
              onPress={() => {
                setCopyTargetDay(null);
                setClearExisting(true);
              }}
              size="sm"
              variant="secondary"
            >
              <Copy size={14} />
              Copy meals
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  {(renderProps) => {
                    const targetHasMeals = copyTargetDay ? planItems.some((item) => item.day === copyTargetDay) : false;

                    return (
                      <>
                        <AlertDialog.CloseTrigger />
                        <AlertDialog.Header>
                          <AlertDialog.Heading>Copy {selectedDayName}&apos;s meals to&hellip;</AlertDialog.Heading>
                        </AlertDialog.Header>
                        <AlertDialog.Body>
                          <p className="mb-2 text-sm font-medium text-foreground-500">Target day</p>
                          <div className="mb-4 flex flex-wrap gap-2">
                            {DAYS.filter((d) => d.value !== selectedDay).map((day) => (
                              <Button
                                key={day.value}
                                onPress={() => {
                                  setCopyTargetDay(day.value);
                                  setClearExisting(true);
                                }}
                                size="sm"
                                variant={copyTargetDay === day.value ? 'primary' : 'outline'}
                              >
                                {day.label}
                              </Button>
                            ))}
                          </div>

                          {copyTargetDay && targetHasMeals && (
                            <RadioGroup
                              aria-label="How to handle existing meals"
                              onChange={(value) => setClearExisting(value === 'replace')}
                              value={clearExisting ? 'replace' : 'keep'}
                            >
                              <Radio value="replace">
                                <Radio.Control>
                                  <Radio.Indicator />
                                </Radio.Control>
                                <Radio.Content>
                                  <Label>Replace existing meals</Label>
                                </Radio.Content>
                              </Radio>
                              <Radio value="keep">
                                <Radio.Control>
                                  <Radio.Indicator />
                                </Radio.Control>
                                <Radio.Content>
                                  <Label>Keep existing and add copied meals</Label>
                                </Radio.Content>
                              </Radio>
                            </RadioGroup>
                          )}
                        </AlertDialog.Body>
                        <AlertDialog.Footer>
                          <Button
                            onPress={() => {
                              setCopyTargetDay(null);
                              setClearExisting(true);
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
                              if (!copyTargetDay) {
                                return;
                              }
                              const targetDayName =
                                DAYS.find((day) => day.value === copyTargetDay)?.name ?? copyTargetDay;
                              try {
                                await copyDay({
                                  id: planId,
                                  body: {
                                    source_day: selectedDay,
                                    target_day: copyTargetDay,
                                    clear_existing: clearExisting,
                                  },
                                }).unwrap();
                                toast.success(`Copied to ${targetDayName}`);
                                setSelectedDay(copyTargetDay);
                                setCopyTargetDay(null);
                                setClearExisting(true);
                                renderProps.close();
                              } catch {
                                toast.danger('Failed to copy meals.');
                              }
                            }}
                          >
                            {isCopying ? 'Copying...' : 'Copy'}
                          </Button>
                        </AlertDialog.Footer>
                      </>
                    );
                  }}
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {dayItems.map(({mealType, slotKey, planItem, assignedMeal}) => {
          const isSaving = savingSlot === slotKey;
          const isAssigning = assigningSlot === slotKey;

          return (
            <div
              className="flex min-h-11 items-center gap-3 overflow-hidden rounded-lg border border-divider bg-content1 px-3 py-2"
              key={slotKey}
            >
              <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-foreground-400">
                {mealType.label}
              </span>

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
                        autoFocus
                        meals={meals}
                        onCreate={(name) => handleCreateAndAssign(mealType, name)}
                        onSelect={(meal) => handleAssign(mealType, meal)}
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

      {meals.length === 0 && (
        <p className="mt-3 text-xs text-foreground-400">Create meals above first, then assign them to days here.</p>
      )}
    </div>
  );
}
