import type {Food, FoodCreate} from '../api/foods';

export function fields(food?: Food) {
  return {
    name: food?.name ?? '',
    brand: food?.brand ?? '',
    category: food?.category ?? '',
    calories_per_100g: String(food?.calories_per_100g ?? ''),
    protein_g_per_100g: String(food?.protein_g_per_100g ?? ''),
    carbs_g_per_100g: String(food?.carbs_g_per_100g ?? ''),
    fat_g_per_100g: String(food?.fat_g_per_100g ?? ''),
    fiber_g_per_100g: String(food?.fiber_g_per_100g ?? ''),
    sugar_g_per_100g: String(food?.sugar_g_per_100g ?? ''),
    allergens: food?.allergens ?? [],
    dietary_tags: food?.dietary_tags ?? [],
    notes: food?.notes ?? '',
    media: food?.media ?? null,
    serving_sizes:
      food?.serving_sizes.map((size) => ({...size, amount: String(size.amount), weight_g: String(size.weight_g)})) ??
      [],
  };
}
export function body(values: ReturnType<typeof fields>, food?: Food): FoodCreate {
  const number = (value: string) => (value.trim() ? Number(value) : null);
  return {
    name: values.name.trim(),
    ...((values.media?.id ?? null) !== (food?.media?.id ?? null) ? {media_id: values.media?.id ?? null} : {}),
    brand: values.brand.trim() || null,
    category: values.category.trim() || null,
    calories_per_100g: number(values.calories_per_100g),
    protein_g_per_100g: number(values.protein_g_per_100g),
    carbs_g_per_100g: number(values.carbs_g_per_100g),
    fat_g_per_100g: number(values.fat_g_per_100g),
    fiber_g_per_100g: number(values.fiber_g_per_100g),
    sugar_g_per_100g: number(values.sugar_g_per_100g),
    allergens: values.allergens,
    dietary_tags: values.dietary_tags,
    notes: values.notes.trim() || null,
    serving_sizes: values.serving_sizes.map((size) => ({
      ...size,
      label: size.label.trim(),
      unit: size.unit.trim(),
      amount: Number(size.amount),
      weight_g: Number(size.weight_g),
    })),
  };
}

export type FoodFields = ReturnType<typeof fields>;
