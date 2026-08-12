/**
 * Every write the nutrition builder can perform, as plain functions — no hooks,
 * no dependency arrays, nothing whose identity can go stale (RM-142's whole
 * genus; mirrors the training builder's `commands.ts`). `createPlanCommands`
 * closes over the plan id only; every payload is built from the CACHE at press
 * time — the current truth, never the props a component last rendered.
 *
 * Nutrition's twist on the shared protocols: positions and nutrition snapshots
 * (item, meal, energy line) are SERVER-COMPUTED, so successful writes end in a
 * reconciling refetch rather than trusting the optimistic patch.
 *
 * - **Replace-shaped, single-shot** (rename, delete, remove item/option):
 *   optimistic patch → request → refetch on success / undo + toast on failure.
 *   `commit` returns whether the write stuck, so callers can reset local state
 *   (a rename input) when it didn't.
 *
 * - **Create-shaped** (add day, add/create a slot option, add items): request →
 *   patch the reply in → refetch. The server owns ids and positions, so there
 *   is nothing truthful to show until it answers.
 *
 * - **Whole-replaced or per-resource streams** (the weekday map, an item's
 *   amount): serialized through one coalescing channel — one request in flight
 *   per resource, latest payload wins, payload captured at patch time so a
 *   reconciling refetch landing mid-chain can never make a send re-send the
 *   old value. Failure recovery is toast + refetch, never a lone undo.
 */
import {toast} from '@heroui/react';

import {getErrorCode, toastMutationError} from '@/@components/mutation-toast';
import type {
  NutritionDayMealCreateRequest,
  NutritionMeal,
  NutritionMealItemRequest,
  NutritionPlan,
  NutritionPlanDay,
} from '@/api/nutrition-plan-builder';
import * as api from '@/api/nutrition-plan-builder';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';

import {findDay, findItem, findMeal, getDays, getWeekdayAssignments} from './plan-tree';
import {assignWeekday, reassignWeekdays} from './schedule';

type MealSlot = NutritionDayMealCreateRequest['meal_slot'];

/** Long enough that a typed amount isn't sent per keystroke. */
export const ITEM_EDIT_DEBOUNCE_MS = 600;

/** What an amount edit writes. Every edit passes all three keys — an item is
 *  either weighed (`weight_g` only) or serving-based (`amount` + `unit`). */
export type ItemAmountPatch = {weight_g: number | null; amount: number | null; unit: string | null};

/** The two waits the screen shows a spinner for. */
export type BusyKey = 'addDay' | 'removeDay';

export function createPlanCommands(planId: string, notifyBusy: (key: BusyKey, busy: boolean) => void) {
  const patch = (recipe: (plan: NutritionPlan) => void) => api.patchPlan(planId, recipe);
  const read = () => api.readPlan(planId);
  const refetch = () => api.refetchPlan(planId);

  /** Show the change at once; reconcile on success, put it back on failure. */
  const commit = async (
    recipe: (plan: NutritionPlan) => void,
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
  };

  // The coalescing channels. `pending` maps a channel key to the send that
  // carries the latest payload; marking a busy channel overwrites the entry,
  // and the queue's loop drains it after the in-flight request settles.
  const pending = new Map<string, () => Promise<void>>();
  const queue = createCoalescingQueue(async (key) => {
    const send = pending.get(key);
    pending.delete(key);
    await send?.();
  });
  const enqueue = (key: string, send: () => Promise<void>, delayMs = 0) => {
    pending.set(key, send);
    queue.mark(key, delayMs);
  };

  // -------------------------------------------------------------------------
  // Days
  // -------------------------------------------------------------------------

  /** Resolves to the created day so the caller can select it. */
  const addDay = async (): Promise<NutritionPlanDay | undefined> => {
    notifyBusy('addDay', true);
    try {
      const day = await api.createDay(planId);
      patch((plan) => {
        plan.days ??= [];
        plan.days.push(day);
      });
      refetch();
      return day;
    } catch (error) {
      toastMutationError(error, "Couldn't add day");
      return undefined;
    } finally {
      notifyBusy('addDay', false);
    }
  };

  const renameDay = (dayId: string, name: string) =>
    commit(
      (plan) => {
        const day = findDay(plan, dayId);
        if (day) {
          day.name = name;
        }
      },
      () => api.updateDay(dayId, {name}),
      "Couldn't rename day",
    );

  /**
   * Request-first, not optimistic: the server enforces the last-day rule, and
   * showing a deleted day snapping back would be worse than a short wait.
   * Resolves to the fallback day (the one inheriting the deleted day's
   * weekdays, mirroring the server) so the caller can select it; undefined
   * when the delete didn't stick.
   */
  const removeDay = async (dayId: string): Promise<NutritionPlanDay | undefined> => {
    const plan = read();
    if (!plan) {
      return undefined;
    }
    const fallback = getDays(plan).filter((day) => day.id !== dayId)[0];
    notifyBusy('removeDay', true);
    try {
      await api.deleteDay(dayId);
    } catch (error) {
      if (getErrorCode(error) === 'last_day') {
        toast.danger("Can't delete the only day.");
      } else {
        toastMutationError(error, "Couldn't delete day");
      }
      return undefined;
    } finally {
      notifyBusy('removeDay', false);
    }
    patch((draft) => {
      draft.days = (draft.days ?? []).filter((day) => day.id !== dayId);
      if (draft.weekday_assignments && fallback) {
        draft.weekday_assignments = reassignWeekdays(draft.weekday_assignments, dayId, fallback.id);
      }
    });
    refetch();
    return fallback;
  };

  // -------------------------------------------------------------------------
  // Weekday assignment — a weekday belongs to exactly one day, so assigning it
  // here implicitly takes it off whichever day held it (INTERACTIONS.md § NB).
  // The endpoint takes the FULL Mon..Sun map, so one toggle sends all seven —
  // and whole-map writes go through the channel so two quick chip presses
  // can't overwrite each other.
  // -------------------------------------------------------------------------

  const scheduleWeekday = (weekday: string, dayId: string) => {
    const plan = read();
    if (!plan) {
      return;
    }
    const body = assignWeekday(getWeekdayAssignments(plan), getDays(plan), weekday, dayId);
    patch((draft) => {
      draft.weekday_assignments ??= {};
      draft.weekday_assignments[weekday] = dayId;
    });
    enqueue('schedule', async () => {
      try {
        await api.replaceSchedule(planId, body);
        // Reconcile only when this is the newest write — a newer pending map's
        // own refetch will follow it.
        if (!pending.has('schedule')) {
          refetch();
        }
      } catch (error) {
        toastMutationError(error, "Couldn't assign day");
        refetch();
      }
    });
  };

  // -------------------------------------------------------------------------
  // Slot options: add / remove / re-slot
  // -------------------------------------------------------------------------

  // One endpoint for both "place an existing plan meal" and "create a meal and
  // place it" — the response embeds the meal, so the cache gets both rows.
  const addDayMeal = async (
    dayId: string,
    body: NutritionDayMealCreateRequest,
    failMessage: string,
  ): Promise<NutritionMeal | null> => {
    try {
      const {meal, ...option} = await api.addDayMeal(dayId, body);
      patch((draft) => {
        draft.meals ??= [];
        if (!draft.meals.some((m) => m.id === meal.id)) {
          draft.meals.push(meal);
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
  };

  /** Places an existing plan meal on a day — the "reuse" and "add a swap" write. */
  const addOption = (dayId: string, slot: string, mealId: string) =>
    addDayMeal(dayId, {meal_slot: slot as MealSlot, nutrition_meal_id: mealId}, "Couldn't add meal to this day");

  /** Resolves to the created meal so the caller can open it in rename mode. */
  const createMeal = (dayId: string, slot: string) =>
    addDayMeal(dayId, {meal_slot: slot as MealSlot, name: 'New meal'}, "Couldn't add meal");

  const removeOption = (dayId: string, optionId: string) =>
    commit(
      (plan) => {
        const day = findDay(plan, dayId);
        if (day) {
          day.day_meals = day.day_meals.filter((dm) => dm.id !== optionId);
        }
      },
      () => api.removeSlotOption(optionId),
      "Couldn't remove meal from this day",
    );

  // Patch-after-reply: the server assigns the position in the target slot.
  const changeSlot = async (dayId: string, optionId: string, nextSlot: string) => {
    try {
      const moved = await api.moveSlotOption(optionId, {meal_slot: nextSlot as MealSlot});
      patch((draft) => {
        const dm = findDay(draft, dayId)?.day_meals.find((x) => x.id === optionId);
        if (dm) {
          dm.meal_slot = moved.meal_slot;
          dm.position = moved.position;
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
  };

  // -------------------------------------------------------------------------
  // Meals
  // -------------------------------------------------------------------------

  const renameMeal = (mealId: string, name: string) =>
    commit(
      (plan) => {
        const meal = findMeal(plan, mealId);
        if (meal) {
          meal.name = name;
        }
      },
      () => api.updateMeal(mealId, {name}),
      "Couldn't save changes",
    );

  const removeMeal = (mealId: string) =>
    commit(
      (plan) => {
        plan.meals = (plan.meals ?? []).filter((meal) => meal.id !== mealId);
        // The backend cascades day_meals with the meal (FK on_delete:
        // :delete_all) — mirror that, or a slot keeps pointing at an option
        // whose meal no longer exists.
        for (const day of plan.days ?? []) {
          day.day_meals = day.day_meals.filter((dm) => dm.nutrition_meal_id !== mealId);
        }
      },
      () => api.deleteMeal(mealId),
      "Couldn't delete meal",
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
  const addItems = (mealId: string, items: {body: NutritionMealItemRequest; name: string | null}[]) => {
    const patched = patch((plan) => {
      const meal = findMeal(plan, mealId);
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
    api
      .createMealItems(mealId, {items: items.map(({body}) => body)})
      .catch(() => {
        patched.undo();
        toast.danger("Couldn't add items");
      })
      .finally(() => {
        refetch();
      });
  };

  const removeItem = (mealId: string, itemId: string) =>
    commit(
      (plan) => {
        const meal = findMeal(plan, mealId);
        if (meal) {
          meal.meal_items = meal.meal_items.filter((item) => item.id !== itemId);
        }
      },
      () => api.deleteMealItem(itemId),
      "Couldn't remove item",
    );

  /**
   * Amount edits stream per keystroke, so they write through a per-item
   * channel: the latest patch is what goes out, one request per item in
   * flight, and a reconciling refetch follows the LAST send — nutrition
   * snapshots change with every amount, but refetching mid-chain would just
   * be churn the next send supersedes.
   */
  const writeItem = (itemId: string, values: ItemAmountPatch) => {
    patch((plan) => {
      const found = findItem(plan, itemId);
      if (found) {
        Object.assign(found.item, values);
      }
    });
    const key = `item:${itemId}`;
    enqueue(
      key,
      async () => {
        const current = read();
        if (!current || !findItem(current, itemId)) {
          // The item was removed while this edit waited; nothing to save.
          return;
        }
        try {
          await api.updateMealItem(itemId, values);
          if (!pending.has(key)) {
            refetch();
          }
        } catch (error) {
          toastMutationError(error, "Couldn't save amount");
          refetch();
        }
      },
      ITEM_EDIT_DEBOUNCE_MS,
    );
  };

  return {
    addDay,
    addItems,
    addOption,
    changeSlot,
    createMeal,
    /** Send every debounced edit now. For unmount. */
    flush: queue.flushPending,
    removeDay,
    removeItem,
    removeMeal,
    removeOption,
    renameDay,
    renameMeal,
    scheduleWeekday,
    writeItem,
  };
}
