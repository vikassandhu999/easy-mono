/**
 * Assert-style checks for nutrition-schedule.tsx pure helpers.
 *
 * Run directly: npx tsx nutrition-schedule.assert.ts
 * No test framework required.
 */

// ---------------------------------------------------------------------------
// Inline copies of helpers (mirrors the logic in nutrition-schedule.tsx exactly)
// ---------------------------------------------------------------------------

type NutritionScheduleEntry = {
  day_of_week: string;
  id: string;
  inserted_at: string;
  meal_slot: string;
  nutrition_meal_id: string;
  updated_at: string;
};

function buildMergedDayMap(
  currentDaySlots: Record<string, NutritionScheduleEntry> | undefined,
  slot: string,
  mealId: string | null,
): Record<string, {meal_id: string}> {
  const result: Record<string, {meal_id: string}> = {};

  if (currentDaySlots) {
    for (const [existingSlot, entry] of Object.entries(currentDaySlots)) {
      if (existingSlot !== slot) {
        result[existingSlot] = {meal_id: entry.nutrition_meal_id};
      }
    }
  }

  if (mealId !== null) {
    result[slot] = {meal_id: mealId};
  }

  return result;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function makeEntry(slot: string, mealId: string): NutritionScheduleEntry {
  return {day_of_week: 'monday', id: 'x', inserted_at: '', meal_slot: slot, nutrition_meal_id: mealId, updated_at: ''};
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

function demo(): void {
  // 1. Set a slot when day is empty (no current slots)
  const result1 = buildMergedDayMap(undefined, 'breakfast', 'meal-1');
  assert(Object.keys(result1).length === 1, 'empty day + set: 1 slot in result');
  assert(result1.breakfast?.meal_id === 'meal-1', 'empty day + set: breakfast = meal-1');

  // 2. Clear a slot (mealId = null) — slot should be absent from result
  const slots2: Record<string, NutritionScheduleEntry> = {
    breakfast: makeEntry('breakfast', 'meal-1'),
    lunch: makeEntry('lunch', 'meal-2'),
  };
  const result2 = buildMergedDayMap(slots2, 'breakfast', null);
  assert(!('breakfast' in result2), 'clear: breakfast absent from result');
  assert(result2.lunch?.meal_id === 'meal-2', 'clear: lunch preserved');
  assert(Object.keys(result2).length === 1, 'clear: only 1 slot remains');

  // 3. Replace a slot (slot already assigned to a different meal)
  const slots3: Record<string, NutritionScheduleEntry> = {
    breakfast: makeEntry('breakfast', 'meal-old'),
    dinner: makeEntry('dinner', 'meal-3'),
  };
  const result3 = buildMergedDayMap(slots3, 'breakfast', 'meal-new');
  assert(result3.breakfast?.meal_id === 'meal-new', 'replace: breakfast updated to meal-new');
  assert(result3.dinner?.meal_id === 'meal-3', 'replace: dinner preserved');
  assert(Object.keys(result3).length === 2, 'replace: exactly 2 slots');

  // 4. Set a slot that does not yet exist (day has other slots)
  const slots4: Record<string, NutritionScheduleEntry> = {
    breakfast: makeEntry('breakfast', 'meal-1'),
  };
  const result4 = buildMergedDayMap(slots4, 'lunch', 'meal-5');
  assert(result4.breakfast?.meal_id === 'meal-1', 'add new slot: breakfast preserved');
  assert(result4.lunch?.meal_id === 'meal-5', 'add new slot: lunch added');
  assert(Object.keys(result4).length === 2, 'add new slot: 2 slots total');

  console.log('\nAll assertions passed.');
}

demo();
