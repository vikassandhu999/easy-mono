export function slotLabel(slot: string, labels: Readonly<Record<string, string>>): string {
  return Object.entries(labels).find(([value]) => value === slot)?.[1] ?? slot;
}

export function liveOptionItems<Item>(slot: {
  meal_id?: string | null;
  options: {items: Item[]; meal_id: string | null}[];
}): Item[] {
  const active = slot.options.find((option) => option.meal_id === slot.meal_id) ?? slot.options[0];
  return active?.items ?? [];
}
