import type {NutritionDay} from '../api/nutrition.ts';
import {dateLabel, sheetTargetFromRow, slotsFromDay} from './nutrition-utils.ts';

const assert: (ok: unknown, message: string) => asserts ok = (ok, message) => {
  if (!ok) {
    throw new Error(message);
  }
};

const nutrients = {calories: 100, carbohydrates: 10, complete: true, fat: 2, fiber: 1, protein: 5};
const day = {
  applied_timezone: 'Asia/Kolkata',
  date: '2026-08-25',
  plan_id: 'plan-1',
  slots: [
    {
      applied_timezone: 'Asia/Kolkata',
      logged_calories: null,
      meal_id: 'meal-1',
      meal_slot: 'breakfast',
      options: [
        {
          items: [
            {
              food_id: 'food-1',
              kind: 'food',
              name: 'Oats',
              nutrients,
              planned_item_ref: 'opaque-ref-1',
              portion: {amount: null, grams: 50, kind: 'gram', label: null, unit: null},
              position: 0,
            },
          ],
          meal_id: 'meal-1',
          meal_name: 'Breakfast',
          position: 0,
        },
      ],
      planned_calories: 100,
      revision: 1,
      rows: [],
      write_eligible: true,
    },
  ],
  summary: {
    adherence: 'none',
    counts: {added: 0, as_planned: 0, pending: 0, recorded: 0, skipped: 0, swapped: 0},
    has_intake: false,
    logged: {...nutrients, calories: null},
    planned: nutrients,
  },
  targets: {calories: 2000},
  write_eligible: true,
} satisfies NutritionDay;

const [slot] = slotsFromDay(day);
assert(slot, 'the breakfast slot is mapped');
const [row] = slot.rows;
assert(row, 'the planned item becomes a checklist row');
assert(row.plannedItemRef === 'opaque-ref-1', 'the opaque wire reference keeps its domain name');

const target = sheetTargetFromRow(day.date, slot, row);
assert(target.plannedItemRef === 'opaque-ref-1', 'sheet targets preserve the planned-item reference');

assert(dateLabel('2026-04-03', '2026-04-03').startsWith('Today'), 'today names itself');
assert(dateLabel('2026-04-03', '2026-04-03').includes('Fri'), 'today still shows its weekday');
assert(!dateLabel('2026-04-02', '2026-04-03').startsWith('Today'), 'another day does not');
assert(dateLabel('2026-04-02', '2026-04-03').startsWith('Thu'), 'another day leads with its weekday');
assert(dateLabel('2026-04-02', '2026-04-03').includes('Apr 2'), 'another day carries day and month');

console.log('nutrition-utils checks passed');
