/**
 * Every write the nutrition builder can perform, as plain functions — no hooks,
 * no dependency arrays, nothing whose identity can go stale (RM-142's whole
 * genus; mirrors the training builder's `commands.ts`). `createPlanCommands`
 * closes over the plan id only; every payload is built from the CACHE at press
 * time — the current truth, never the props a component last rendered.
 *
 * Meal and Menu Item saves send the whole authoritative Menu through one
 * revisioned replacement. Day Pattern / slot placement still wait on a later
 * ticket, so those commands stay stubbed.
 *
 * Nutrient snapshots are SERVER-COMPUTED, so a successful Menu write replaces
 * the cached plan with the response rather than trusting the optimistic patch.
 */
import {toast} from '@heroui/react';

import {getErrorCode, toastMutationError} from '@/@components/mutation-toast';
import {createLocalNodeId, emptyNutrients, mealItemFromDraft, nextPosition, reorderNodes} from '@/api/nutrition-menu';
import type {
  NutritionDayMealCreateRequest,
  NutritionMeal,
  NutritionPlan,
  NutritionPlanDay,
  NutritionPortionInput,
} from '@/api/nutrition-plan-builder';
import * as api from '@/api/nutrition-plan-builder';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';
import {handleStaleNutritionPlanConflict} from '@/nutrition-plans/lib/stale-nutrition-plan-conflict';

import type {MealItemDraft} from './amount-draft';

import {findDay, findItem, findMeal, getDays, getWeekdayAssignments} from './plan-tree';
import {assignWeekday, reassignWeekdays} from './schedule';

type MealSlot = NutritionDayMealCreateRequest['meal_slot'];

/** Long enough that a typed amount isn't sent per keystroke. */
export const ITEM_EDIT_DEBOUNCE_MS = 600;

export type ItemAmountPatch = NutritionPortionInput;

/** The two waits the screen shows a spinner for. */
export type BusyKey = 'addDay' | 'removeDay';

export function createPlanCommands(planId: string, notifyBusy: (key: BusyKey, busy: boolean) => void) {
  const patch = (recipe: (plan: NutritionPlan) => void) => api.patchPlan(planId, recipe);
  const read = () => api.readPlan(planId);
  const refetch = () => api.refetchPlan(planId);
  let writes: Promise<unknown> = Promise.resolve();
  let writeEpoch = 0;

  const serialize = <T>(write: () => Promise<T>): Promise<T> => {
    const result = writes.then(write, write);
    writes = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const handleStaleConflict = async (error: unknown) => {
    const handled = await handleStaleNutritionPlanConflict<NutritionPlan>(error, {
      refetchLatest: () => api.refetchNutritionPlan(planId),
      replaceWithLatest: (latest) => {
        patch((draft) => {
          Object.assign(draft, latest);
        });
      },
      notify: (message) => {
        toast.info(message, {timeout: 4000});
      },
    });

    if (handled) {
      writeEpoch += 1;
    }

    return handled;
  };

  const saveMenu = <Marker, Result>(
    recipe: (plan: NutritionPlan) => Marker,
    resolve: (saved: NutritionPlan, marker: Marker) => Result,
    failMessage: string,
  ): Promise<Result | undefined> => {
    const requestedEpoch = writeEpoch;

    return serialize(async () => {
      if (requestedEpoch !== writeEpoch) {
        return undefined;
      }

      let marker: Marker | undefined;
      const patched = patch((plan) => {
        marker = recipe(plan);
      });
      const plan = read();
      if (!plan || marker === undefined) {
        patched.undo();
        return undefined;
      }

      try {
        const saved = await api.replaceMenu(planId, plan);
        patch((draft) => {
          Object.assign(draft, saved);
        });
        return resolve(saved, marker);
      } catch (error) {
        patched.undo();
        if (await handleStaleConflict(error)) {
          return undefined;
        }
        toastMutationError(error, failMessage);
        return undefined;
      }
    });
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
        const {day_meals: _dayMeals, ...pattern} = day;
        plan.day_patterns = [...plan.day_patterns, pattern];
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
    commitStub(
      (plan) => {
        const pattern = plan.day_patterns.find((candidate) => candidate.id === dayId);
        if (pattern) {
          pattern.name = name;
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
      draft.day_patterns = draft.day_patterns.filter((day) => day.id !== dayId);
      if (draft.schedule && fallback) {
        draft.schedule = reassignWeekdays(draft.schedule, dayId, fallback.id);
      }
    });
    refetch();
    return fallback;
  };

  const commitStub = async (
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

  // -------------------------------------------------------------------------
  // Weekday assignment — a weekday belongs to exactly one day, so assigning it
  // here implicitly takes it off whichever day held it (INTERACTIONS.md § NB).
  // The endpoint takes the FULL Mon..Sun map, so one toggle sends all seven —
  // and whole-map writes go through the channel so two quick chip presses
  // can't overwrite each other.
  // -------------------------------------------------------------------------

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

  const scheduleWeekday = (weekday: string, dayId: string) => {
    const plan = read();
    if (!plan) {
      return;
    }
    const body = assignWeekday(getWeekdayAssignments(plan), getDays(plan), weekday, dayId);
    patch((draft) => {
      if (draft.schedule) {
        draft.schedule[weekday as keyof typeof draft.schedule] = dayId;
      }
    });
    enqueue('schedule', async () => {
      try {
        await api.replaceSchedule(planId, body);
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

  const addDayMeal = async (
    dayId: string,
    body: NutritionDayMealCreateRequest,
    failMessage: string,
  ): Promise<NutritionMeal | null> => {
    try {
      const option = await api.addDayMeal(dayId, body);
      patch((draft) => {
        findDay(draft, dayId)?.day_meals.push(option);
      });
      refetch();
      return null;
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

  const removeOption = (dayId: string, optionId: string) =>
    commitStub(
      (plan) => {
        const day = findDay(plan, dayId);
        if (day) {
          day.day_meals = day.day_meals.filter((dm) => dm.id !== optionId);
        }
      },
      () => api.removeSlotOption(optionId),
      "Couldn't remove meal from this day",
    );

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

  const createMeal = async (): Promise<NutritionMeal | undefined> => {
    const result = await saveMenu(
      (plan) => {
        const position = nextPosition(plan.meals);
        const timestamp = new Date().toISOString();
        plan.meals.push({
          id: createLocalNodeId('meal'),
          inserted_at: timestamp,
          updated_at: timestamp,
          name: 'New meal',
          notes: null,
          position,
          nutrition_plan_id: plan.id,
          nutrients: emptyNutrients,
          meal_items: [],
        });
        return position;
      },
      (saved, position) => saved.meals.find((meal) => meal.position === position),
      "Couldn't add meal",
    );
    return result;
  };

  const renameMeal = (mealId: string, name: string) =>
    saveMenu(
      (plan) => {
        const meal = findMeal(plan, mealId);
        if (meal) {
          meal.name = name;
        }
        return mealId;
      },
      () => undefined,
      "Couldn't save changes",
    );

  const removeMeal = (mealId: string) =>
    saveMenu(
      (plan) => {
        plan.meals = plan.meals.filter((meal) => meal.id !== mealId);
        return mealId;
      },
      () => undefined,
      "Couldn't delete meal",
    );

  const moveMeal = (from: number, to: number) =>
    saveMenu(
      (plan) => {
        plan.meals = reorderNodes(
          [...plan.meals].sort((a, b) => a.position - b.position),
          from,
          to,
        );
        return to;
      },
      () => undefined,
      "Couldn't reorder meals",
    );

  // -------------------------------------------------------------------------
  // Meal items
  // -------------------------------------------------------------------------

  const addItems = (mealId: string, items: {body: MealItemDraft; name: string | null}[]) => {
    saveMenu(
      (plan) => {
        const meal = findMeal(plan, mealId);
        if (meal) {
          const start = nextPosition(meal.meal_items);
          items.forEach(({body, name}, offset) => {
            meal.meal_items.push(mealItemFromDraft(meal.id, body, name, start + offset));
          });
        }
        return mealId;
      },
      () => undefined,
      "Couldn't add items",
    ).catch(() => undefined);
  };

  const removeItem = (mealId: string, itemId: string) =>
    saveMenu(
      (plan) => {
        const meal = findMeal(plan, mealId);
        if (meal) {
          meal.meal_items = meal.meal_items.filter((item) => item.id !== itemId);
        }
        return itemId;
      },
      () => undefined,
      "Couldn't remove item",
    );

  const moveItem = (mealId: string, from: number, to: number) =>
    saveMenu(
      (plan) => {
        const meal = findMeal(plan, mealId);
        if (meal) {
          meal.meal_items = reorderNodes(
            [...meal.meal_items].sort((a, b) => a.position - b.position),
            from,
            to,
          );
        }
        return mealId;
      },
      () => undefined,
      "Couldn't reorder items",
    );

  const writeItem = (itemId: string, values: ItemAmountPatch) => {
    patch((plan) => {
      const found = findItem(plan, itemId);
      if (found) {
        found.item.portion = {
          kind: values.kind,
          grams: values.grams ?? null,
          amount: values.amount ?? null,
          unit: values.unit ?? null,
          label: values.label ?? null,
        };
      }
    });
    const key = `item:${itemId}`;
    enqueue(
      key,
      () =>
        serialize(async () => {
          const current = read();
          const found = current ? findItem(current, itemId) : undefined;
          if (!current || !found) {
            return;
          }
          found.item.portion = {
            kind: values.kind,
            grams: values.grams ?? null,
            amount: values.amount ?? null,
            unit: values.unit ?? null,
            label: values.label ?? null,
          };
          try {
            const saved = await api.replaceMenu(planId, current);
            if (!pending.has(key)) {
              patch((draft) => {
                Object.assign(draft, saved);
              });
            }
          } catch (error) {
            if (await handleStaleConflict(error)) {
              return;
            }
            toastMutationError(error, "Couldn't save amount");
            refetch();
          }
        }),
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
    flush: async () => {
      await queue.flushPending();
      await writes;
    },
    moveItem,
    moveMeal,
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
