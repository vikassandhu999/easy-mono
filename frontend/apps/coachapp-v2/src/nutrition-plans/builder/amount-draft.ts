import {type NutritionItemRef, toItemInput} from '../../../../../packages/utils/src/nutrition-item-ref.ts';
import {toPortionInput} from '../../../../../packages/utils/src/nutrition-portion.ts';
import type {components} from '../../api/schema.ts';

type NutritionMealItemInput = components['schemas']['NutritionMealItemInput'];
type NutritionPortionInput = components['schemas']['NutritionPortionInput'];

type Serving = {label: string; unit: string};

export type MealItemDraft = Pick<NutritionMealItemInput, 'kind' | 'food_id' | 'recipe_id' | 'portion'>;

export function buildMealItemDraft({
  activeServing,
  itemRef,
  resolvedWeightG,
  servingCount,
}: {
  activeServing: Serving | null;
  itemRef: NutritionItemRef;
  resolvedWeightG: number | null;
  servingCount: string;
}): MealItemDraft {
  const count = Number.parseFloat(servingCount);
  const amount = Number.isNaN(count) ? 1 : count;
  const item = toItemInput(itemRef);

  if (itemRef.kind === 'recipe') {
    const portion: NutritionPortionInput =
      resolvedWeightG != null
        ? toPortionInput({grams: resolvedWeightG, kind: 'gram'})
        : toPortionInput({amount, kind: 'serving', label: null, unit: 'serving'});
    return {...item, portion};
  }

  if (activeServing) {
    return {
      ...item,
      portion: toPortionInput({
        amount,
        kind: 'serving',
        label: activeServing.label,
        unit: activeServing.unit,
      }),
    };
  }

  return {
    ...item,
    portion: resolvedWeightG != null ? toPortionInput({grams: resolvedWeightG, kind: 'gram'}) : {kind: 'gram'},
  };
}
