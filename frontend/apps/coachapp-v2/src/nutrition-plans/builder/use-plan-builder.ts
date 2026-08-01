/**
 * Every write the nutrition builder can perform, in one place. Components call
 * these and render what they are given; none of them touch the cache directly.
 *
 * The optimistic protocol lives in `commit`: patch the cached detail, run the
 * request, reconciling refetch on success (positions and nutrition snapshots
 * are server-computed), undo + toast on failure. Create-shaped writes (add
 * day, add option) patch after the server replies instead, since they need the
 * created row. Amount edits go through `useItemWriter` because they debounce
 * per keystroke and need serialising.
 *
 * `commit` returns whether the write stuck, so callers can reset local state
 * (a rename input) when it didn't.
 */
import {toast} from '@heroui/react';
import {useCallback} from 'react';
import {useSearchParams} from 'react-router-dom';

import {getErrorCode, toastMutationError} from '@/@components/mutation-toast';
import type {
  NutritionDayMealCreateRequest,
  NutritionMeal,
  NutritionMealItemRequest,
  NutritionPlan,
  NutritionPlanDay,
} from '@/api/nutrition-plan-builder';
import {
  useAddDayMealMutation,
  useCreateMealItemsMutation,
  useCreateNutritionPlanDayMutation,
  useDeleteMealItemMutation,
  useDeleteMealMutation,
  useDeleteNutritionPlanDayMutation,
  useMoveNutritionSlotOptionMutation,
  usePlanPatcher,
  usePlanRefetch,
  useRemoveNutritionSlotOptionMutation,
  useUpdateMealMutation,
  useUpdateNutritionPlanDayMutation,
  useUpdateNutritionPlanScheduleMutation,
} from '@/api/nutrition-plan-builder';

import {findDay, findMeal, getDays, getWeekdayAssignments} from './plan-tree';
import {assignWeekday, reassignWeekdays} from './schedule';

type MealSlot = NutritionDayMealCreateRequest['meal_slot'];

export function usePlanBuilder(plan: NutritionPlan) {
  const planId = plan.id;
  const patch = usePlanPatcher(planId);
  const refetch = usePlanRefetch(planId);

  const createDayMutation = useCreateNutritionPlanDayMutation();
  const updateDayMutation = useUpdateNutritionPlanDayMutation();
  const deleteDayMutation = useDeleteNutritionPlanDayMutation();
  const updateScheduleMutation = useUpdateNutritionPlanScheduleMutation();
  const addDayMealMutation = useAddDayMealMutation();
  const moveOptionMutation = useMoveNutritionSlotOptionMutation();
  const removeOptionMutation = useRemoveNutritionSlotOptionMutation();
  const updateMealMutation = useUpdateMealMutation();
  const deleteMealMutation = useDeleteMealMutation();
  const createMealItemsMutation = useCreateMealItemsMutation();
  const deleteMealItemMutation = useDeleteMealItemMutation();
  const isAddingDay = createDayMutation.isPending;
  const isRemovingDay = deleteDayMutation.isPending;

  /** Show the change at once; put it back and say so if the server refuses. */
  const commit = useCallback(
    async (
      recipe: (draft: NutritionPlan) => void,
      run: () => Promise<unknown>,
      failMessage: string,
    ): Promise<boolean> => {
      const patched = patch(recipe);
      try {
        await run();
        refetch();
        return true;
      } catch (error) {
        patched.undo();
        toastMutationError(error, failMessage);
        return false;
      }
    },
    [patch, refetch],
  );

  // -------------------------------------------------------------------------
  // Days
  // -------------------------------------------------------------------------

  /** Resolves to the created day so the caller can select it. */
  const addDay = useCallback(async (): Promise<NutritionPlanDay | undefined> => {
    try {
      const {data: day} = await createDayMutation.mutateAsync({planId, body: {}});
      patch((draft) => {
        (draft.days ??= []).push(day);
      });
      refetch();
      return day;
    } catch (error) {
      toastMutationError(error, "Couldn't add day");
      return undefined;
    }
  }, [createDayMutation, patch, planId, refetch]);

  const renameDay = useCallback(
    (dayId: string, name: string) =>
      commit(
        (draft) => {
          const day = findDay(draft, dayId);
          if (day) {
            day.name = name;
          }
        },
        () => updateDayMutation.mutateAsync({id: dayId, body: {name}}),
        "Couldn't rename day",
      ),
    [commit, updateDayMutation],
  );

  /**
   * Resolves to the fallback day (the one inheriting the deleted day's
   * weekdays, mirroring the server) so the caller can select it; undefined
   * when the delete didn't stick.
   */
  const removeDay = useCallback(
    async (dayId: string): Promise<NutritionPlanDay | undefined> => {
      const fallback = getDays(plan).filter((day) => day.id !== dayId)[0];
      try {
        await deleteDayMutation.mutateAsync(dayId);
      } catch (error) {
        if (getErrorCode(error) === 'last_day') {
          toast.danger("Can't delete the only day.");
        } else {
          toastMutationError(error, "Couldn't delete day");
        }
        return undefined;
      }
      patch((draft) => {
        draft.days = (draft.days ?? []).filter((day) => day.id !== dayId);
        if (draft.weekday_assignments && fallback) {
          draft.weekday_assignments = reassignWeekdays(draft.weekday_assignments, dayId, fallback.id);
        }
      });
      refetch();
      return fallback;
    },
    [deleteDayMutation, patch, plan, refetch],
  );

  // -------------------------------------------------------------------------
  // Weekday assignment — a weekday belongs to exactly one day, so assigning it
  // here implicitly takes it off whichever day held it (INTERACTIONS.md § NB).
  // The endpoint takes the FULL Mon..Sun map, so one toggle sends all seven.
  // -------------------------------------------------------------------------

  const scheduleWeekday = useCallback(
    (weekday: string, dayId: string) => {
      const body = assignWeekday(getWeekdayAssignments(plan), getDays(plan), weekday, dayId);
      return commit(
        (draft) => {
          (draft.weekday_assignments ??= {})[weekday] = dayId;
        },
        () => updateScheduleMutation.mutateAsync({planId, body}),
        "Couldn't assign day",
      );
    },
    [commit, plan, planId, updateScheduleMutation],
  );

  // -------------------------------------------------------------------------
  // Slot options: add / remove / re-slot
  // -------------------------------------------------------------------------

  // One endpoint for both "place an existing plan meal" and "create a meal and
  // place it" — the response embeds the meal, so the cache gets both rows.
  const addDayMeal = useCallback(
    async (dayId: string, body: NutritionDayMealCreateRequest, failMessage: string): Promise<NutritionMeal | null> => {
      try {
        const {meal, ...option} = (await addDayMealMutation.mutateAsync({dayId, body})).data;
        patch((draft) => {
          const meals = (draft.meals ??= []);
          if (!meals.some((m) => m.id === meal.id)) {
            meals.push(meal);
          }
          findDay(draft, dayId)?.day_meals.push(option);
        });
        refetch();
        return meal;
      } catch (error) {
        if (getErrorCode(error) === 'max_options') {
          toast.danger('Only 3 options are allowed per slot.');
        } else {
          toastMutationError(error, failMessage);
        }
        return null;
      }
    },
    [addDayMealMutation, patch, refetch],
  );

  /** Places an existing plan meal on a day — the "reuse" and "add a swap" write. */
  const addOption = useCallback(
    (dayId: string, slot: string, mealId: string) =>
      addDayMeal(dayId, {meal_slot: slot as MealSlot, nutrition_meal_id: mealId}, "Couldn't add meal to this day"),
    [addDayMeal],
  );

  /** Resolves to the created meal so the caller can open it in rename mode. */
  const createMeal = useCallback(
    (dayId: string, slot: string) =>
      addDayMeal(dayId, {meal_slot: slot as MealSlot, name: 'New meal'}, "Couldn't add meal"),
    [addDayMeal],
  );

  const removeOption = useCallback(
    (dayId: string, optionId: string) =>
      commit(
        (draft) => {
          const day = findDay(draft, dayId);
          if (day) {
            day.day_meals = day.day_meals.filter((dm) => dm.id !== optionId);
          }
        },
        () => removeOptionMutation.mutateAsync(optionId),
        "Couldn't remove meal from this day",
      ),
    [commit, removeOptionMutation],
  );

  // Patch-after-reply: the server assigns the position in the target slot.
  const changeSlot = useCallback(
    async (dayId: string, optionId: string, nextSlot: string) => {
      try {
        const result = await moveOptionMutation.mutateAsync({id: optionId, body: {meal_slot: nextSlot as MealSlot}});
        patch((draft) => {
          const dm = findDay(draft, dayId)?.day_meals.find((x) => x.id === optionId);
          if (dm) {
            dm.meal_slot = result.data.meal_slot;
            dm.position = result.data.position;
          }
        });
        refetch();
      } catch (error) {
        if (getErrorCode(error) === 'max_options') {
          toast.danger('Only 3 options are allowed per slot.');
        } else {
          toastMutationError(error, "Couldn't move this meal");
        }
      }
    },
    [moveOptionMutation, patch, refetch],
  );

  // -------------------------------------------------------------------------
  // Meals
  // -------------------------------------------------------------------------

  const renameMeal = useCallback(
    (mealId: string, name: string) =>
      commit(
        (draft) => {
          const meal = findMeal(draft, mealId);
          if (meal) {
            meal.name = name;
          }
        },
        () => updateMealMutation.mutateAsync({id: mealId, body: {name}}),
        "Couldn't save changes",
      ),
    [commit, updateMealMutation],
  );

  const removeMeal = useCallback(
    (mealId: string) =>
      commit(
        (draft) => {
          draft.meals = (draft.meals ?? []).filter((meal) => meal.id !== mealId);
          // The backend cascades day_meals with the meal (FK on_delete:
          // :delete_all) — mirror that, or a slot keeps pointing at an option
          // whose meal no longer exists.
          for (const day of draft.days ?? []) {
            day.day_meals = day.day_meals.filter((dm) => dm.nutrition_meal_id !== mealId);
          }
        },
        () => deleteMealMutation.mutateAsync(mealId),
        "Couldn't delete meal",
      ),
    [commit, deleteMealMutation],
  );

  // -------------------------------------------------------------------------
  // Meal items
  // -------------------------------------------------------------------------

  /**
   * One request for the whole pick. The backend inserts the batch in one
   * transaction, in the order given, appending after the meal's existing
   * items. All-or-nothing, so a failure undoes the whole optimistic patch and
   * toasts once; the refetch reconciles server-computed positions and
   * nutrition either way.
   */
  const addItems = useCallback(
    (mealId: string, items: {body: NutritionMealItemRequest; name: string | null}[]) => {
      const patched = patch((draft) => {
        const meal = findMeal(draft, mealId);
        if (meal) {
          items.forEach(({body, name}, position) => {
            meal.meal_items.push({
              id: `provisional-${Date.now()}-${position}`,
              name,
              food_id: body.food_id ?? null,
              recipe_id: body.recipe_id ?? null,
              weight_g: body.weight_g ?? null,
              amount: body.amount ?? null,
              unit: body.unit ?? null,
              position: 9999 + position,
              inserted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
        }
      });
      createMealItemsMutation
        .mutateAsync({mealId, body: {items: items.map(({body}) => body)}})
        .catch((error) => {
          patched.undo();
          toastMutationError(error, "Couldn't add items");
        })
        .finally(() => {
          refetch();
        });
    },
    [createMealItemsMutation, patch, refetch],
  );

  const removeItem = useCallback(
    (mealId: string, itemId: string) =>
      commit(
        (draft) => {
          const meal = findMeal(draft, mealId);
          if (meal) {
            meal.meal_items = meal.meal_items.filter((item) => item.id !== itemId);
          }
        },
        () => deleteMealItemMutation.mutateAsync(itemId),
        "Couldn't remove item",
      ),
    [commit, deleteMealItemMutation],
  );

  return {
    addDay,
    addItems,
    addOption,
    changeSlot,
    createMeal,
    isAddingDay,
    isRemovingDay,
    removeDay,
    removeItem,
    removeMeal,
    removeOption,
    renameDay,
    renameMeal,
    scheduleWeekday,
  };
}

export type PlanBuilderCommands = ReturnType<typeof usePlanBuilder>;

/**
 * Which day the builder is showing. It lives in the URL so a refresh, a deep
 * link and browser Back all land on the same day; `replace` keeps tab
 * switching out of the history stack. A stale `?d=` — after deleting the day
 * it named — falls through to the first day; that fallback is the only
 * correction needed, and it self-heals on the next tab press.
 */
export function useActiveDay(days: NutritionPlanDay[]) {
  const [params, setParams] = useSearchParams();
  const active = days.find((day) => day.id === params.get('d')) ?? days[0];

  const select = useCallback(
    (dayId: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('d', dayId);
          return next;
        },
        {replace: true},
      );
    },
    [setParams],
  );

  return [active, select] as const;
}
