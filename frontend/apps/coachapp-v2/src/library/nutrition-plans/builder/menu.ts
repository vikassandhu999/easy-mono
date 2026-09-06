import {type TrainingWeekday, WEEKDAYS} from '@easy/utils';
import {MEAL_SLOTS, type MealSlot} from '@easy/utils/meal-slots';
import {produce} from 'immer';
import type {NutritionMenu, NutritionPortion} from '../../../api/nutrition-plans.ts';

export type Menu = NutritionMenu;
export type MenuMeal = Menu['meals'][number];
export type MenuItem = MenuMeal['meal_items'][number];
export type MenuDay = Menu['day_patterns'][number];
export type ItemInput = Pick<MenuItem, 'kind' | 'food_id' | 'recipe_id' | 'portion'>;

export type MenuEdit =
  | {type: 'addDay'; id: string}
  | {type: 'renameDay'; dayId: string; name: string}
  | {type: 'removeDay'; dayId: string}
  | {type: 'moveDay'; from: number; to: number}
  | {type: 'schedule'; weekday: TrainingWeekday; dayId: string}
  | {type: 'addMeal'; id: string; dayId: string}
  | {type: 'renameMeal'; mealId: string; name: string}
  | {type: 'removeMeal'; mealId: string}
  | {type: 'addOption'; dayId: string; slot: MealSlot; mealId: string}
  | {type: 'removeOption'; dayId: string; slot: MealSlot; mealId: string}
  | {type: 'moveOption'; dayId: string; slot: MealSlot; from: number; to: number}
  | {type: 'changeSlot'; dayId: string; mealId: string; fromSlot: MealSlot; slot: MealSlot}
  | {type: 'addItems'; mealId: string; items: {id: string; body: ItemInput; name: string | null}[]}
  | {type: 'removeItem'; mealId: string; itemId: string}
  | {type: 'moveItem'; mealId: string; from: number; to: number}
  | {type: 'amount'; mealId: string; itemId: string; portion: NutritionPortion};

export function editMenu(menu: Menu, edit: MenuEdit): Menu {
  return produce(menu, (draft) => {
    const day = 'dayId' in edit ? draft.day_patterns.find((day) => day.id === edit.dayId) : undefined;
    const meal = 'mealId' in edit ? draft.meals.find((meal) => meal.id === edit.mealId) : undefined;
    switch (edit.type) {
      case 'addDay':
        draft.day_patterns.push({id: edit.id, name: 'New day', slots: []});
        break;
      case 'renameDay':
        if (day) {
          day.name = edit.name;
        }
        break;
      case 'removeDay': {
        const fallback = draft.day_patterns.find((day) => day.id !== edit.dayId);
        if (!fallback) {
          break;
        }
        draft.day_patterns = draft.day_patterns.filter((day) => day.id !== edit.dayId);
        for (const weekday of WEEKDAYS) {
          if (draft.schedule[weekday] === edit.dayId) {
            draft.schedule[weekday] = fallback.id;
          }
        }
        break;
      }
      case 'moveDay':
        move(draft.day_patterns, edit.from, edit.to);
        break;
      case 'schedule':
        if (day) {
          draft.schedule[edit.weekday] = day.id;
        }
        break;
      case 'addMeal':
        if (!day) {
          break;
        }
        draft.meals.push({id: edit.id, name: 'New meal', notes: null, meal_items: []});
        addOption(day, firstFreeSlot(day), edit.id);
        break;
      case 'renameMeal':
        if (meal) {
          meal.name = edit.name;
        }
        break;
      case 'removeMeal':
        draft.meals = draft.meals.filter((meal) => meal.id !== edit.mealId);
        for (const day of draft.day_patterns) {
          for (const slot of day.slots) {
            slot.meal_ids = slot.meal_ids.filter((id) => id !== edit.mealId);
          }
          day.slots = day.slots.filter((slot) => slot.meal_ids.length > 0);
        }
        break;
      case 'addOption':
        if (day && meal) {
          addOption(day, edit.slot, meal.id);
        }
        break;
      case 'removeOption': {
        if (!day) {
          break;
        }
        const removedSlot = day.slots.find((slot) => slot.meal_slot === edit.slot);
        if (removedSlot) {
          removedSlot.meal_ids = removedSlot.meal_ids.filter((id) => id !== edit.mealId);
        }
        day.slots = day.slots.filter((slot) => slot.meal_ids.length > 0);
        break;
      }
      case 'moveOption': {
        const slot = day?.slots.find((slot) => slot.meal_slot === edit.slot);
        if (slot) {
          move(slot.meal_ids, edit.from, edit.to);
        }
        break;
      }
      case 'changeSlot': {
        const source = day?.slots.find((slot) => slot.meal_slot === edit.fromSlot);
        if (!day || !source?.meal_ids.includes(edit.mealId) || edit.fromSlot === edit.slot) {
          break;
        }
        addOption(day, edit.slot, edit.mealId);
        source.meal_ids = source.meal_ids.filter((id) => id !== edit.mealId);
        day.slots = day.slots.filter((slot) => slot.meal_ids.length > 0);
        break;
      }
      case 'addItems':
        meal?.meal_items.push(
          ...edit.items.map(({id, body, name}) => ({
            id,
            name,
            kind: body.kind,
            food_id: body.food_id ?? null,
            recipe_id: body.recipe_id ?? null,
            portion: body.portion,
          })),
        );
        break;
      case 'removeItem':
        if (meal) {
          meal.meal_items = meal.meal_items.filter((item) => item.id !== edit.itemId);
        }
        break;
      case 'moveItem':
        if (meal) {
          move(meal.meal_items, edit.from, edit.to);
        }
        break;
      case 'amount': {
        const item = meal?.meal_items.find((item) => item.id === edit.itemId);
        if (item) {
          item.portion = edit.portion;
        }
        break;
      }
    }
  });
}

function move<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) {
    return;
  }
  const [item] = items.splice(from, 1);
  if (item !== undefined) {
    items.splice(to, 0, item);
  }
}

function addOption(day: MenuDay, name: MealSlot, mealId: string) {
  let slot = day.slots.find((slot) => slot.meal_slot === name);
  if (!slot) {
    slot = {meal_slot: name, meal_ids: []};
    day.slots.push(slot);
  }
  if (!slot.meal_ids.includes(mealId)) {
    slot.meal_ids.push(mealId);
  }
}

export function firstFreeSlot(day: MenuDay): MealSlot {
  return MEAL_SLOTS.find((name) => !day.slots.some((slot) => slot.meal_slot === name)) ?? 'breakfast';
}

export function dayRows(day: MenuDay) {
  return MEAL_SLOTS.flatMap((name) => {
    const options = day.slots.find((slot) => slot.meal_slot === name)?.meal_ids ?? [];
    const [primary, ...alternates] = options;
    return primary ? [{slot: name, primary, alternates}] : [];
  });
}

export function dayTotals(day: MenuDay, meals: MenuMeal[]) {
  const totals = {calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0};
  for (const {primary} of dayRows(day)) {
    const nutrients = meals.find((meal) => meal.id === primary)?.nutrients;
    totals.calories += nutrients?.calories ?? 0;
    totals.protein_g += nutrients?.protein ?? 0;
    totals.carbs_g += nutrients?.carbohydrates ?? 0;
    totals.fat_g += nutrients?.fat ?? 0;
  }
  return totals;
}

export function fmt(n: number | null | undefined): string {
  return n == null ? '—' : String(Math.round(n * 10) / 10);
}

export function kcalLabel(nutrients: MenuMeal['nutrients']): string | null {
  return nutrients?.calories == null ? null : `${Math.round(nutrients.calories)} kcal`;
}
