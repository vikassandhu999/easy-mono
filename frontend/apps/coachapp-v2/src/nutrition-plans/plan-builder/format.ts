/**
 * Round to one decimal place and strip trailing ".0"; `—` for missing.
 * The builder's macro strings all use this step ("12.4P", "80 kcal");
 * meal-item-row's whole-number contribution column is a deliberate variant.
 */
export function fmt(n: number | null | undefined): string {
  if (n == null) {
    return '—';
  }
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
