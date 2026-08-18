/**
 * Every write the nutrition builder can perform, as plain functions — no hooks,
 * no dependency arrays, nothing whose identity can go stale (RM-142's whole
 * genus; mirrors the training builder's `commands.ts`). `createPlanCommands`
 * closes over the plan id only; every payload is built from the CACHE at press
 * time — the current truth, never the props a component last rendered.
 *
 * Meal, Day Pattern, Meal Option, and Week Schedule saves send the whole
 * authoritative Menu through one revisioned replacement.
 *
 * Nutrient snapshots are SERVER-COMPUTED, so a successful Menu write replaces
 * the cached plan with the response rather than trusting the optimistic patch.
 */
import {toast} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import {periodError} from '@/@components/plan-period';
import {createLocalNodeId, emptyNutrients, mealItemFromDraft, nextPosition, reorderNodes} from '@/api/nutrition-menu';
import type {
  NutritionDayPatternSlot,
  NutritionMeal,
  NutritionPlan,
  NutritionPortionInput,
} from '@/api/nutrition-plan-builder';
import * as api from '@/api/nutrition-plan-builder';
import {createCoalescingQueue} from '@/builder-kit/coalescing-queue';
import {coverageErrorMessage} from '@/nutrition-plans/lib/coverage-error';
import {handleStaleNutritionPlanConflict} from '@/nutrition-plans/lib/stale-nutrition-plan-conflict';

import type {MealItemDraft} from './amount-draft';

import {
  dropEmptySlots,
  findItem,
  findMeal,
  findPattern,
  getDays,
  getWeekdayAssignments,
  type NutritionPlanDay,
  reindexSlotOptions,
  removeMealFromPatterns,
} from './plan-tree';
import {assignWeekday, reassignWeekdays} from './schedule';
import type {BuilderMealSlot} from './slots';

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
      const result = await saveMenu(
        (plan) => {
          const position = nextPosition(plan.day_patterns);
          const timestamp = new Date().toISOString();
          plan.day_patterns.push({
            id: createLocalNodeId('pattern'),
            name: 'New day',
            position,
            weekdays: [],
            slots: [],
            nutrition_plan_id: plan.id,
            inserted_at: timestamp,
            updated_at: timestamp,
          });
          return position;
        },
        (saved, position) => {
          const pattern = saved.day_patterns.find((candidate) => candidate.position === position);
          return pattern ? {...pattern, day_meals: []} : undefined;
        },
        "Couldn't add day",
      );
      return result;
    } finally {
      notifyBusy('addDay', false);
    }
  };

  const renameDay = (dayId: string, name: string) =>
    saveMenu(
      (plan) => {
        const pattern = findPattern(plan, dayId);
        if (pattern) {
          pattern.name = name;
        }
        return dayId;
      },
      () => undefined,
      "Couldn't rename day",
    );

  const moveDay = (from: number, to: number) =>
    saveMenu(
      (plan) => {
        plan.day_patterns = reorderNodes(
          [...plan.day_patterns].sort((a, b) => a.position - b.position),
          from,
          to,
        );
        return to;
      },
      () => undefined,
      "Couldn't reorder days",
    );

  /**
   * Request-first for the last-day rule: the server also rejects it, but a
   * deleted day snapping back is worse than checking first. Resolves to the
   * fallback day (the one inheriting the deleted day's weekdays) so the
   * caller can select it.
   */
  const removeDay = async (dayId: string): Promise<NutritionPlanDay | undefined> => {
    const plan = read();
    if (!plan) {
      return undefined;
    }
    const fallback = plan.day_patterns.filter((day) => day.id !== dayId)[0];
    if (!fallback) {
      toast.danger("Can't delete the only day.");
      return undefined;
    }
    notifyBusy('removeDay', true);
    try {
      const result = await saveMenu(
        (draft) => {
          const nextFallback = draft.day_patterns.find((day) => day.id !== dayId);
          if (!nextFallback || !draft.schedule) {
            return undefined;
          }
          draft.schedule = reassignWeekdays(draft.schedule, dayId, nextFallback.id);
          draft.day_patterns = draft.day_patterns.filter((day) => day.id !== dayId);
          return nextFallback.id;
        },
        (saved, fallbackId) => {
          const pattern = saved.day_patterns.find((candidate) => candidate.id === fallbackId) ?? saved.day_patterns[0];
          return pattern ? {...pattern, day_meals: []} : undefined;
        },
        "Couldn't delete day",
      );
      return result;
    } finally {
      notifyBusy('removeDay', false);
    }
  };

  // -------------------------------------------------------------------------
  // Weekday assignment — a weekday belongs to exactly one day, so assigning it
  // here implicitly takes it off whichever day held it. The Menu write takes
  // the full Mon..Sun map.
  // -------------------------------------------------------------------------

  const scheduleWeekday = (weekday: string, dayId: string) => {
    saveMenu(
      (plan) => {
        if (!plan.schedule) {
          return weekday;
        }
        plan.schedule = assignWeekday(getWeekdayAssignments(plan), getDays(plan), weekday, dayId);
        return weekday;
      },
      () => undefined,
      "Couldn't assign day",
    ).catch(() => undefined);
  };

  // -------------------------------------------------------------------------
  // Slot options: add / remove / re-slot
  // -------------------------------------------------------------------------

  const addOption = (dayId: string, slot: string, mealId: string) =>
    saveMenu(
      (plan) => {
        const pattern = findPattern(plan, dayId);
        if (!pattern) {
          return mealId;
        }
        const mealSlot = slot as NutritionDayPatternSlot['meal_slot'];
        const existing = pattern.slots.find((candidate) => candidate.meal_slot === mealSlot) ?? {
          meal_slot: mealSlot,
          options: [],
        };
        if (!pattern.slots.includes(existing)) {
          pattern.slots.push(existing);
        }
        if (existing.options.some((option) => option.nutrition_meal_id === mealId)) {
          return mealId;
        }
        const timestamp = new Date().toISOString();
        existing.options.push({
          id: createLocalNodeId('option'),
          position: existing.options.length,
          nutrition_meal_id: mealId,
          inserted_at: timestamp,
          updated_at: timestamp,
        });
        return mealId;
      },
      () => undefined,
      "Couldn't add meal to this day",
    );

  const removeOption = (dayId: string, optionId: string) =>
    saveMenu(
      (plan) => {
        const pattern = findPattern(plan, dayId);
        if (!pattern) {
          return optionId;
        }
        for (const slot of pattern.slots) {
          slot.options = slot.options.filter((option) => option.id !== optionId);
          reindexSlotOptions(pattern, slot.meal_slot);
        }
        dropEmptySlots(pattern);
        return optionId;
      },
      () => undefined,
      "Couldn't remove meal from this day",
    );

  const moveOption = (dayId: string, slot: string, from: number, to: number) =>
    saveMenu(
      (plan) => {
        const pattern = findPattern(plan, dayId);
        if (!pattern) {
          return slot;
        }
        const mealSlot = slot as NutritionDayPatternSlot['meal_slot'];
        const existing = pattern.slots.find((candidate) => candidate.meal_slot === mealSlot);
        if (existing) {
          existing.options = reorderNodes(
            [...existing.options].sort((a, b) => a.position - b.position),
            from,
            to,
          );
        }
        return slot;
      },
      () => undefined,
      "Couldn't reorder meal options",
    );

  const changeSlot = async (dayId: string, optionId: string, nextSlot: string) => {
    await saveMenu(
      (plan) => {
        const pattern = findPattern(plan, dayId);
        if (!pattern) {
          return optionId;
        }
        const mealSlot = nextSlot as BuilderMealSlot;
        let moved: (typeof pattern.slots)[number]['options'][number] | undefined;
        let fromSlot: string | undefined;
        for (const slot of pattern.slots) {
          const option = slot.options.find((candidate) => candidate.id === optionId);
          if (option) {
            moved = option;
            fromSlot = slot.meal_slot;
            slot.options = slot.options.filter((candidate) => candidate.id !== optionId);
            reindexSlotOptions(pattern, slot.meal_slot);
          }
        }
        if (!moved || fromSlot === mealSlot) {
          return optionId;
        }
        const target = pattern.slots.find((candidate) => candidate.meal_slot === mealSlot) ?? {
          meal_slot: mealSlot,
          options: [],
        };
        if (!pattern.slots.includes(target)) {
          pattern.slots.push(target);
        }
        target.options.push({...moved, position: target.options.length});
        dropEmptySlots(pattern);
        return optionId;
      },
      () => undefined,
      "Couldn't move this meal",
    );
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
        removeMealFromPatterns(plan, mealId);
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

  const setPlanPeriod = (startDate: string | null, endDate: string | null): Promise<void> => {
    const requestedEpoch = writeEpoch;

    return serialize(async () => {
      if (requestedEpoch !== writeEpoch) {
        return;
      }

      const error = periodError(startDate, endDate);
      if (error) {
        toast.danger(error);
        return;
      }

      const patched = patch((plan) => {
        plan.start_date = startDate;
        plan.end_date = endDate;
      });

      try {
        const saved = await api.updatePlanPeriod(planId, {start_date: startDate, end_date: endDate});
        patch((draft) => {
          Object.assign(draft, saved);
        });
      } catch (error) {
        patched.undo();
        if (await handleStaleConflict(error)) {
          return;
        }
        toast.danger(coverageErrorMessage(error, "Couldn't save dates"));
      }
    });
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
    moveDay,
    moveItem,
    moveMeal,
    moveOption,
    removeDay,
    removeItem,
    removeMeal,
    removeOption,
    renameDay,
    renameMeal,
    scheduleWeekday,
    writeItem,
    setPlanPeriod,
  };
}
