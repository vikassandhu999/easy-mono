/**
 * FoodRecipePickerSheet — composes SearchPickerSheet to let a coach search the
 * nutrition food and recipe libraries, toggle between the two, multi-select
 * items, and create a custom food when no match exists.
 *
 * Selection model: MULTI-SELECT (matches the mockup caption "multi-select" in
 * 02-meal-editor.html). The caller receives the full array of picked Food |
 * Recipe objects via `onPick` and is responsible for opening the amount sheet
 * for each item sequentially. Passing full objects means the amount sheet can
 * render a live macro preview without a refetch.
 *
 * Props:
 *   mealName — name of the meal being added to (drives the header title)
 *   open     — controls visibility
 *   onClose  — close handler
 *   onPick   — called with the array of selected Food | Recipe objects
 */

import {Chip, toast} from '@heroui/react';
import {useCallback, useMemo, useState} from 'react';

import type {Food, Recipe} from '@/api/generated';
import {
  useCoachFoodsInfiniteQuery,
  useCoachRecipesInfiniteQuery,
  useCreateCoachFoodMutation,
} from '@/api/nutrition-foods';
import type {FilterChip} from '@/builder-kit/search-picker-sheet';
import {SearchPickerSheet} from '@/builder-kit/search-picker-sheet';
import {useDebounce} from '@/hooks/use-debounce';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A picker item is either a Food or a Recipe. */
export type FoodOrRecipe = Food | Recipe;

/** Active tab for the Foods | Recipes toggle. */
type ActiveTab = 'foods' | 'recipes';

interface FoodRecipePickerSheetProps {
  /** Name of the meal being added to; rendered in the header title. */
  mealName: string;
  open: boolean;
  onClose: () => void;
  /** Called with the full array of picked Food | Recipe objects. */
  onPick: (items: FoodOrRecipe[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to one decimal place and strip trailing ".0". */
function fmt(n: number | null | undefined): string {
  if (n == null) {
    return '—';
  }
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Macro badge label for a Food item (protein-only).
 * Example: "80P"
 */
function foodMacroBadge(food: Food): string {
  return `${fmt(food.protein_g_per_100g)}P`;
}

/**
 * Macro badge label for a Recipe item (protein-only, per-serving).
 * Example: "35P"
 */
function recipeMacroBadge(recipe: Recipe): string {
  return `${fmt(recipe.nutrition?.protein_g)}P`;
}

/** Type guard: is the item a Recipe (has `recipe_ingredients`)? Exported so the
 * amount sheet (Task 4) can branch food (grams) vs recipe (servings) per pick. */
export function isRecipe(item: FoodOrRecipe): item is Recipe {
  return 'recipe_ingredients' in item;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FoodRecipePickerSheet({mealName, open, onClose, onPick}: FoodRecipePickerSheetProps) {
  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('foods');

  // --- Search ---
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // --- Selection ---
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Map<string, FoodOrRecipe>>(new Map());

  // --- Data: foods infinite query ---
  const {
    data: foodPages,
    isFetching: foodsFetching,
    hasNextPage: foodsHasNext,
    fetchNextPage: foodsFetchNext,
  } = useCoachFoodsInfiniteQuery(debouncedSearch ? {search: debouncedSearch} : undefined);

  // --- Data: recipes infinite query ---
  const {
    data: recipePages,
    isFetching: recipesFetching,
    hasNextPage: recipesHasNext,
    fetchNextPage: recipesFetchNext,
  } = useCoachRecipesInfiniteQuery(debouncedSearch ? {search: debouncedSearch} : undefined);

  // --- Data: create food mutation ---
  const [createFood] = useCreateCoachFoodMutation();

  // --- Derived: flat item lists ---
  const foods = useMemo(() => foodPages?.pages.flatMap((page) => page.data) ?? [], [foodPages]);
  const recipes = useMemo(() => recipePages?.pages.flatMap((page) => page.data) ?? [], [recipePages]);

  const items: FoodOrRecipe[] = activeTab === 'foods' ? foods : recipes;
  const loading = activeTab === 'foods' ? foodsFetching : recipesFetching;
  const hasMore = activeTab === 'foods' ? (foodsHasNext ?? false) : (recipesHasNext ?? false);
  const fetchNextPage = activeTab === 'foods' ? foodsFetchNext : recipesFetchNext;

  // --- Filter chips: Foods | Recipes toggle ---
  const filters: FilterChip[] = useMemo(
    () => [
      {
        id: 'foods',
        label: 'Foods',
        active: activeTab === 'foods',
        onToggle: () => {
          setActiveTab('foods');
          setSearch('');
        },
      },
      {
        id: 'recipes',
        label: 'Recipes',
        active: activeTab === 'recipes',
        onToggle: () => {
          setActiveTab('recipes');
          setSearch('');
        },
      },
    ],
    [activeTab],
  );

  // --- Handlers ---
  const handleToggleItem = useCallback((item: FoodOrRecipe) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const chosen = Array.from(selectedItems.values());
    onPick(chosen);
    // Reset state
    setSelectedKeys(new Set());
    setSelectedItems(new Map());
    setSearch('');
    setActiveTab('foods');
    onClose();
  }, [selectedItems, onPick, onClose]);

  const handleCreateNoMatch = useCallback(
    async (query: string) => {
      try {
        const result = await createFood({
          foodRequest: {name: query},
        }).unwrap();
        const newFood = result.data;
        // Auto-select the newly created food
        setSelectedKeys((prev) => new Set([...prev, newFood.id]));
        setSelectedItems((prev) => new Map([...prev, [newFood.id, newFood]]));
        setSearch('');
        setActiveTab('foods');
      } catch {
        // Creation failed — leave search text so the user can retry
        toast.danger("Couldn't create food. Try again.");
      }
    },
    [createFood],
  );

  const handleClose = useCallback(() => {
    // Reset on close so the sheet is clean next time it opens
    setSelectedKeys(new Set());
    setSelectedItems(new Map());
    setSearch('');
    setActiveTab('foods');
    onClose();
  }, [onClose]);

  // --- renderItem ---
  const renderItem = useCallback((item: FoodOrRecipe, selected: boolean) => {
    const macroBadge = isRecipe(item) ? recipeMacroBadge(item) : foodMacroBadge(item);

    return (
      <div className="flex items-center gap-2.5 px-1 py-2.5">
        {/* Checkbox visual */}
        <div
          aria-hidden="true"
          className={[
            'h-5 w-5 shrink-0 rounded-md border-[1.5px] flex items-center justify-center',
            selected ? 'border-accent bg-accent text-accent-foreground' : 'border-default',
          ].join(' ')}
        >
          {selected ? <span className="text-[11px] font-bold leading-none">✓</span> : null}
        </div>

        {/* Name + per-serving subtitle */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
          <div className="truncate text-xs text-muted">
            {isRecipe(item)
              ? `per srv · ${fmt(item.nutrition?.calories)} kcal`
              : `per 100g · ${fmt(item.calories_per_100g)} kcal`}
          </div>
        </div>

        {/* Macro badge */}
        <Chip
          className="shrink-0"
          color="accent"
          size="sm"
          variant="secondary"
        >
          {macroBadge}
        </Chip>
      </div>
    );
  }, []);

  return (
    <SearchPickerSheet<FoodOrRecipe>
      confirmLabel={(n) => (n === 0 ? 'Add items' : `Add ${n} item${n === 1 ? '' : 's'}`)}
      filters={filters}
      filtersLayout="segmented"
      hasMore={hasMore}
      itemKey={(item) => item.id}
      items={items}
      loading={loading}
      onClose={handleClose}
      onConfirm={handleConfirm}
      onCreateNoMatch={activeTab === 'foods' ? handleCreateNoMatch : undefined}
      createLabel={(query) => `+ Create food "${query}"`}
      onLoadMore={fetchNextPage}
      onSearchChange={setSearch}
      onToggleItem={handleToggleItem}
      open={open}
      renderItem={renderItem}
      search={search}
      selectedKeys={selectedKeys}
      title={`Add to ${mealName}`}
    />
  );
}
