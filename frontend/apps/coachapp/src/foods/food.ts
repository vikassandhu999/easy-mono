import type {Food, FoodCreate} from '../api/foods';

export function fields(food?: Food) {
  return {
    name: food?.name ?? '',
    kind: food?.kind ?? ('food' as Food['kind']),
    basis: food?.basis ?? ('100g' as Food['basis']),
    unit_label: food?.unit_label ?? '',
    nutrients: Object.fromEntries(Object.entries(food?.nutrients ?? {}).map(([code, value]) => [code, String(value)])),
    servings: food?.servings.map((serving) => ({label: serving.label, amount: String(serving.amount)})) ?? [],
  };
}

export function body(values: ReturnType<typeof fields>): FoodCreate {
  return {
    name: values.name.trim(),
    kind: values.kind,
    basis: values.basis,
    unit_label: values.basis === '1unit' ? values.unit_label.trim() : null,
    nutrients: Object.fromEntries(
      Object.entries(values.nutrients)
        .filter(([, value]) => String(value ?? '').trim())
        .map(([code, value]) => [code, Number(value)]),
    ),
    servings: values.servings.map((serving) => ({label: serving.label.trim(), amount: Number(serving.amount)})),
  };
}

export function basisUnit(basis: Food['basis'], unitLabel?: string | null) {
  return basis === '100g' ? 'g' : basis === '100ml' ? 'ml' : unitLabel || 'unit';
}
export function basisLabel(food: Pick<Food, 'basis' | 'unit_label'>) {
  return food.basis === '1unit'
    ? `1 ${basisUnit(food.basis, food.unit_label)}`
    : food.basis === '100ml'
      ? '100 ml'
      : '100 g';
}
export type FoodFields = ReturnType<typeof fields>;
