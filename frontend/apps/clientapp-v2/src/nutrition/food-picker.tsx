/**
 * Food / recipe picker (spec 02-logging, option 3). Full-screen search with a
 * Foods/Recipes toggle and (for off-plan adds) a meal-slot chooser. Returns the
 * picked item + its backend default portion; the caller logs it (unplanned or replacement).
 */
import {MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {
  type DiaryMealSlot,
  type Food,
  type Recipe,
  useListClientFoodsQuery,
  useListClientRecipesQuery,
} from '@/api/nutrition';

function recipeCaloriesLabel(recipe: Recipe): string {
  const kcal = recipe.nutrients.calories;
  return kcal == null ? '—' : `${Math.round(kcal)} kcal total`;
}

export type Picked = {
  portion: Food['default_portion'];
  id: string;
  kind: 'food' | 'recipe';
  name: string;
  slot: DiaryMealSlot;
};

export default function FoodPicker({
  title,
  busy = false,
  showSlotPicker,
  defaultSlot,
  onClose,
  onPick,
}: {
  busy?: boolean;
  defaultSlot?: DiaryMealSlot;
  onClose: () => void;
  onPick: (picked: Picked) => void;
  showSlotPicker?: boolean;
  title: string;
}) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'foods' | 'recipes'>('foods');
  const [slot, setSlot] = useState<DiaryMealSlot>(defaultSlot ?? 'lunch');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  // Only the visible tab fetches; switching tabs re-uses whatever is cached for it.
  const query = {limit: 20, ...(search ? {search} : {})};
  const foods = useListClientFoodsQuery(query, {enabled: tab === 'foods'});
  const recipes = useListClientRecipesQuery(query, {enabled: tab === 'recipes'});

  const loading = tab === 'foods' ? foods.isFetching : recipes.isFetching;
  const foodItems = foods.data?.data ?? [];
  const recipeItems = recipes.data?.data ?? [];

  const pickFood = (f: Food) =>
    onPick({
      portion: f.default_portion,
      id: f.id,
      kind: 'food',
      name: f.name,
      slot,
    });
  const pickRecipe = (r: Recipe) =>
    onPick({
      portion: r.default_portion,
      id: r.id,
      kind: 'recipe',
      name: r.name,
      slot,
    });

  const Toggle = ({value, label}: {label: string; value: 'foods' | 'recipes'}) => (
    <button
      aria-pressed={tab === value}
      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
        tab === value ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'
      }`}
      onClick={() => setTab(value)}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div
      inert={busy}
      aria-busy={busy}
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          aria-label="Close"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted active:bg-surface-secondary"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
        <input
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          onChange={(e) => setQ(e.target.value)}
          placeholder={title}
          ref={inputRef}
          value={q}
        />
      </div>

      <div className="flex gap-2 px-3 py-2.5">
        <Toggle
          label="Foods"
          value="foods"
        />
        <Toggle
          label="Recipes"
          value="recipes"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {loading && (tab === 'foods' ? foodItems : recipeItems).length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : tab === 'foods' ? (
          foodItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No foods found.</p>
          ) : (
            foodItems.map((f) => (
              <button
                className="flex w-full items-center justify-between gap-2 border-b border-border py-2.5 text-left active:bg-surface-secondary"
                key={f.id}
                onClick={() => pickFood(f)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{f.name}</span>
                  <span className="text-[10px] text-muted">per 100g · {Math.round(f.calories_per_100g ?? 0)} kcal</span>
                </span>
                <span className="shrink-0 text-muted">›</span>
              </button>
            ))
          )
        ) : recipeItems.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No recipes found.</p>
        ) : (
          recipeItems.map((r) => (
            <button
              className="flex w-full items-center justify-between gap-2 border-b border-border py-2.5 text-left active:bg-surface-secondary"
              key={r.id}
              onClick={() => pickRecipe(r)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.name}</span>
                <span className="text-[10px] text-muted">{recipeCaloriesLabel(r)}</span>
              </span>
              <span className="shrink-0 text-muted">›</span>
            </button>
          ))
        )}
      </div>

      {showSlotPicker ? (
        <div className="border-t border-border px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2.5">
          <p className="mb-1.5 text-[11px] text-muted">Add to which meal?</p>
          <div className="flex flex-wrap gap-1.5">
            {MEAL_SLOTS.map((s) => (
              <button
                aria-pressed={slot === s}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  slot === s ? 'border-accent text-accent' : 'border-border text-muted'
                }`}
                key={s}
                onClick={() => setSlot(s)}
                type="button"
              >
                {MEAL_SLOT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
