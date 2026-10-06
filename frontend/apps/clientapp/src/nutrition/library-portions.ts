import type {Food, NutrientMap, NutritionPortion, Recipe} from '../api/nutrition';

export function libraryPortions(item: Food | Recipe): {label: string; grams: number; portion: NutritionPortion}[] {
  if ('servings' in item) {
    const servings = [...item.servings].sort(
      (left, right) => Number(right.id === item.default_serving_id) - Number(left.id === item.default_serving_id),
    );
    return [
      ...servings.map((serving) => ({
        label: `${serving.label} (${serving.grams} g)`,
        grams: serving.grams,
        portion: {type: 'serving' as const, serving_id: serving.id, amount: 1},
      })),
      {label: '100 g', grams: 100, portion: {type: 'grams', grams: 100}},
    ];
  }
  const grams = item.grams / item.servings_count;
  return [
    {label: `1 serving (${Math.round(grams)} g)`, grams, portion: {type: 'serving', serving_id: 'serving', amount: 1}},
    {label: '100 g', grams: 100, portion: {type: 'grams', grams: 100}},
  ];
}
export function portionNutrients(nutrients: NutrientMap, grams: number): NutrientMap {
  return Object.fromEntries(Object.entries(nutrients).map(([code, value]) => [code, (value * grams) / 100]));
}
