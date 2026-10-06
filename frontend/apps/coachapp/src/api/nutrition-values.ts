import type {Food, NutritionPortion, NutritionTargets, Recipe} from './schema';

export const nutrientFields = [
  ['energy_kcal', 'Calories', 'kcal'],
  ['protein_g', 'Protein', 'g'],
  ['carbs_g', 'Carbs', 'g'],
  ['fat_g', 'Fat', 'g'],
  ['fiber_g', 'Fiber', 'g'],
  ['sugar_g', 'Sugar', 'g'],
] as const;

export function defaultPortion(item: Food | Recipe): NutritionPortion {
  if ('servings' in item) {
    const serving = item.servings.find((value) => value.id === item.default_serving_id);
    return serving ? {type: 'serving', serving_id: serving.id, amount: 1} : {type: 'grams', grams: 100};
  }
  return {type: 'serving', serving_id: 'serving', amount: 1};
}
export function portionOptions(item: Food | Recipe) {
  return [
    {label: 'Grams', portion: {type: 'grams', grams: 100} as NutritionPortion},
    ...('servings' in item
      ? item.servings.map((serving) => ({
          label: serving.label,
          portion: {type: 'serving', serving_id: serving.id, amount: 1} as NutritionPortion,
        }))
      : [{label: 'Serving', portion: {type: 'serving', serving_id: 'serving', amount: 1} as NutritionPortion}]),
  ];
}
export function portionLabel(portion: NutritionPortion) {
  return portion.type === 'grams'
    ? `${portion.grams} g`
    : `${portion.amount} serving${portion.amount === 1 ? '' : 's'}`;
}
export function targetLabel(target: NutritionTargets[string] | undefined, unit: string) {
  if (!target || (target.min == null && target.max == null)) {
    return 'Not set';
  }
  if (target.min != null && target.max != null) {
    return `${target.min === target.max ? target.min : `${target.min}–${target.max}`} ${unit}`;
  }
  return target.min != null ? `At least ${target.min} ${unit}` : `At most ${target.max} ${unit}`;
}
