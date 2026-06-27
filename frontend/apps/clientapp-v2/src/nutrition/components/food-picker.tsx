/**
 * Food / recipe picker (spec 02-logging, option 3). Full-screen search with a
 * Foods/Recipes toggle and (for off-plan adds) a meal-slot chooser. Returns the
 * picked item + a default portion weight; the caller logs it (unplanned or replacement).
 */
import {MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {type Food, type Recipe, useLazyListClientFoodsQuery, useLazyListClientRecipesQuery} from '@/api/nutrition';

export type Picked = {
  defaultWeightG: number;
  id: string;
  kind: 'food' | 'recipe';
  name: string;
  perUnit: string;
  slot: string;
};

function defaultServingWeight(sizes: {is_default: boolean; weight_g: number}[] | undefined): null | number {
  if (!sizes?.length) {
    return null;
  }
  return (sizes.find((s) => s.is_default) ?? sizes[0])?.weight_g ?? null;
}

export default function FoodPicker({
  title,
  showSlotPicker,
  defaultSlot,
  onClose,
  onPick,
}: {
  defaultSlot?: string;
  onClose: () => void;
  onPick: (picked: Picked) => void;
  showSlotPicker?: boolean;
  title: string;
}) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'foods' | 'recipes'>('foods');
  const [slot, setSlot] = useState(defaultSlot ?? 'lunch');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const [fetchFoods, foods] = useLazyListClientFoodsQuery();
  const [fetchRecipes, recipes] = useLazyListClientRecipesQuery();
  useEffect(() => {
    if (tab === 'foods') {
      fetchFoods({limit: 30, search: search || undefined});
    } else {
      fetchRecipes({limit: 30, search: search || undefined});
    }
  }, [tab, search, fetchFoods, fetchRecipes]);

  const loading = tab === 'foods' ? foods.isFetching : recipes.isFetching;
  const foodItems = (foods.data?.data ?? []) as Food[];
  const recipeItems = (recipes.data?.data ?? []) as Recipe[];

  const pickFood = (f: Food) =>
    onPick({
      defaultWeightG: defaultServingWeight(f.serving_sizes) ?? 100,
      id: f.id,
      kind: 'food',
      name: f.name,
      perUnit: `per 100g · ${Math.round(f.calories_per_100g ?? 0)} kcal`,
      slot,
    });
  const pickRecipe = (r: Recipe) =>
    onPick({
      defaultWeightG: defaultServingWeight(r.serving_sizes) ?? r.cooked_weight_g ?? 100,
      id: r.id,
      kind: 'recipe',
      name: r.name,
      perUnit: `${Math.round(r.nutrition?.calories ?? 0)} kcal total`,
      slot,
    });

  const Toggle = ({value, label}: {label: string; value: 'foods' | 'recipes'}) => (
    <button
      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
        tab === value ? 'border-accent bg-[#1d2030] text-[#9fb0ff]' : 'border-border text-muted'
      }`}
      onClick={() => setTab(value)}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-[#1f1f25] px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
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
        {loading && foodItems.length === 0 && recipeItems.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : tab === 'foods' ? (
          foodItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No foods found.</p>
          ) : (
            foodItems.map((f) => (
              <button
                className="flex w-full items-center justify-between gap-2 border-b border-[#1f1f25] py-2.5 text-left active:bg-surface-secondary"
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
              className="flex w-full items-center justify-between gap-2 border-b border-[#1f1f25] py-2.5 text-left active:bg-surface-secondary"
              key={r.id}
              onClick={() => pickRecipe(r)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.name}</span>
                <span className="text-[10px] text-muted">{Math.round(r.nutrition?.calories ?? 0)} kcal total</span>
              </span>
              <span className="shrink-0 text-muted">›</span>
            </button>
          ))
        )}
      </div>

      {showSlotPicker ? (
        <div className="border-t border-[#1f1f25] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2.5">
          <p className="mb-1.5 text-[11px] text-muted">Add to which meal?</p>
          <div className="flex flex-wrap gap-1.5">
            {MEAL_SLOTS.map((s) => (
              <button
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  slot === s ? 'border-accent text-[#9fb0ff]' : 'border-border text-muted'
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
