/**
 * AddItemsFlow — adding foods/recipes to a meal as ONE operation, in ONE
 * stable surface (centered modal on desktop, keyboard sheet on mobile).
 *
 * Phase 1 — the list: search the food and recipe libraries, multi-select,
 *           create a custom food when nothing matches. `SearchPickerBody`
 *           provides the list mechanics; this file owns the data.
 * Phase 2 — amounts: once the list is finalised, one `AmountSheetContent`
 *           per picked item ("2 of 4"), collected locally. Nothing is posted
 *           until the last item's confirm, which commits everything together:
 *           one optimistic patch, one batch create, one reconciling refetch.
 *           The surface never moves between phases.
 */
import {Button, CloseButton, Modal, toast} from '@heroui/react';
import {useCallback, useMemo, useRef, useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {nutritionPlanKeys} from '@/api/keys';
import {
  useCoachFoodsInfiniteQuery,
  useCoachRecipesInfiniteQuery,
  useCreateCoachFoodMutation,
} from '@/api/nutrition-foods';
import {useCreateMealItemsMutation, useGetNutritionPlanQuery} from '@/api/nutrition-plans-list';
import {patchQueryData} from '@/api/query-client';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import {type FilterChip, SearchPickerBody} from '@/builder-kit/search-picker-sheet';
import {useDebounce} from '@/hooks/use-debounce';

import {AmountSheetContent, type MealItemDraft} from './amount-sheet';
import {type FoodOrRecipe, isRecipe, PickerItemRow} from './picker-item-row';
import type {NutritionPlanCache} from './use-plan-commit';

interface AddItemsFlowProps {
  planId: string;
  mealId: string;
  mealName: string;
  open: boolean;
  onClose: () => void;
}

/** The amounts phase renders as a form with this id; the dock submits it. */
const AMOUNT_FORM_ID = 'add-items-amount-form';

export function AddItemsFlow({planId, mealId, mealName, open, onClose}: AddItemsFlowProps) {
  const isDesktop = useIsDesktop();
  const {refetch} = useGetNutritionPlanQuery(planId);
  const createMealItemsMutation = useCreateMealItemsMutation();

  // --- Phase: null = picking; an array = setting amounts for these items ---
  const [picked, setPicked] = useState<FoodOrRecipe[] | null>(null);
  const [index, setIndex] = useState(0);
  const [canConfirmAmount, setCanConfirmAmount] = useState(false);
  const drafts = useRef<MealItemDraft[]>([]);

  // --- Phase 1 state ---
  const [activeTab, setActiveTab] = useState<'foods' | 'recipes'>('foods');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  // One map, not a parallel Set and Map: the keys ARE the selection.
  const [selected, setSelected] = useState<Map<string, FoodOrRecipe>>(new Map());
  const selectedKeys = useMemo(() => new Set(selected.keys()), [selected]);

  const foodsQuery = useCoachFoodsInfiniteQuery(debouncedSearch ? {search: debouncedSearch} : undefined);
  const recipesQuery = useCoachRecipesInfiniteQuery(debouncedSearch ? {search: debouncedSearch} : undefined);
  const createFoodMutation = useCreateCoachFoodMutation();

  const foods = useMemo(() => foodsQuery.data?.pages.flatMap((page) => page.data) ?? [], [foodsQuery.data]);
  const recipes = useMemo(() => recipesQuery.data?.pages.flatMap((page) => page.data) ?? [], [recipesQuery.data]);

  const activeQuery = activeTab === 'foods' ? foodsQuery : recipesQuery;
  const items: FoodOrRecipe[] = activeTab === 'foods' ? foods : recipes;
  // Include the debounce window so typed-but-not-yet-queried search shows the
  // loading state instead of a flash of stale "no results".
  const loading = activeQuery.isFetching || search !== debouncedSearch;

  const filters: FilterChip[] = [
    {id: 'foods', label: 'Foods', active: activeTab === 'foods', onToggle: () => setActiveTab('foods')},
    {id: 'recipes', label: 'Recipes', active: activeTab === 'recipes', onToggle: () => setActiveTab('recipes')},
  ];

  const toggleItem = useCallback((item: FoodOrRecipe) => {
    setSelected((previous) => {
      const next = new Map(previous);
      if (!next.delete(item.id)) {
        next.set(item.id, item);
      }
      return next;
    });
  }, []);

  // In-flight guard — a double-tap on the create row must not POST twice.
  const creatingRef = useRef(false);
  const createFromSearch = useCallback(
    async (query: string) => {
      if (creatingRef.current) {
        return;
      }
      creatingRef.current = true;
      try {
        const {data: newFood} = await createFoodMutation.mutateAsync({name: query});
        setSelected((previous) => new Map(previous).set(newFood.id, newFood));
        setSearch('');
        setActiveTab('foods');
      } catch (error) {
        // Leave the search text so the coach can retry.
        toastMutationError(error, "Couldn't create food");
      } finally {
        creatingRef.current = false;
      }
    },
    [createFoodMutation],
  );

  const reset = useCallback(() => {
    setPicked(null);
    setIndex(0);
    drafts.current = [];
    setSelected(new Map());
    setSearch('');
    setActiveTab('foods');
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // --- The single commit ---------------------------------------------------
  // One request: the backend inserts the whole batch in one transaction, in the
  // order given, appending after the meal's existing items. All-or-nothing, so
  // a failure undoes the whole optimistic patch and toasts once. The refetch
  // reconciles server-computed positions and nutrition either way.
  const finish = useCallback(
    (finalDrafts: MealItemDraft[], finalItems: FoodOrRecipe[]) => {
      const patch = patchQueryData<NutritionPlanCache>(nutritionPlanKeys.detail(planId), (cache) => {
        const meal = cache.data.meals?.find((m) => m.id === mealId);
        if (meal) {
          finalDrafts.forEach((draft, position) => {
            meal.meal_items.push({
              id: `provisional-${Date.now()}-${position}`,
              name: finalItems[position]?.name ?? null,
              food_id: draft.food_id ?? null,
              recipe_id: draft.recipe_id ?? null,
              weight_g: draft.weight_g ?? null,
              amount: draft.amount ?? null,
              unit: draft.unit ?? null,
              position: 9999 + position,
              inserted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
        }
      });
      createMealItemsMutation
        .mutateAsync({mealId, body: {items: finalDrafts}})
        .catch(() => {
          patch.undo();
          toast.danger("Couldn't add items");
        })
        .finally(() => {
          refetch().catch(() => undefined);
        });
    },
    [createMealItemsMutation, mealId, planId, refetch],
  );

  // --- Phase content -------------------------------------------------------

  const current = picked?.[index];
  const total = picked?.length ?? 0;

  const title = current ? `${current.name} — ${index + 1} of ${total}` : `Add to ${mealName}`;

  const body = current ? (
    <AmountSheetContent
      key={current.id}
      food={isRecipe(current) ? null : current}
      formId={AMOUNT_FORM_ID}
      onCanConfirmChange={setCanConfirmAmount}
      onCollect={(draft) => {
        drafts.current[index] = draft;
        if (index + 1 < total) {
          setIndex(index + 1);
        } else if (picked) {
          finish([...drafts.current], picked);
          close();
        }
      }}
      planId={planId}
      recipe={isRecipe(current) ? current : null}
    />
  ) : (
    <SearchPickerBody<FoodOrRecipe>
      createLabel={(query) => `Create food "${query}"`}
      filters={filters}
      filtersLayout="segmented"
      hasMore={activeQuery.hasNextPage ?? false}
      itemKey={(item) => item.id}
      items={items}
      loading={loading}
      onCreateNoMatch={
        activeTab === 'foods'
          ? (query) => {
              createFromSearch(query).catch(() => undefined);
            }
          : undefined
      }
      onLoadMore={activeQuery.fetchNextPage}
      onSearchChange={setSearch}
      onToggleItem={toggleItem}
      renderItem={(item, isSelected) => (
        <PickerItemRow
          isSelected={isSelected}
          item={item}
        />
      )}
      search={search}
      selectedKeys={selectedKeys}
      title={title}
    />
  );

  // One dock, both phases — the same primary button recipe as every picker dock.
  const dock = current ? (
    <Button
      className="w-full font-semibold"
      isDisabled={!canConfirmAmount}
      onPress={() => {
        (document.getElementById(AMOUNT_FORM_ID) as HTMLFormElement | null)?.requestSubmit();
      }}
      variant="primary"
    >
      {index + 1 < total ? 'Next' : `Add ${total} item${total === 1 ? '' : 's'}`}
    </Button>
  ) : (
    <Button
      className="w-full font-semibold"
      isDisabled={selected.size === 0}
      onPress={() => {
        setPicked([...selected.values()]);
        setIndex(0);
        drafts.current = [];
      }}
      variant="primary"
    >
      {selected.size === 0 ? 'Select items' : `Set amounts — ${selected.size} item${selected.size === 1 ? '' : 's'}`}
    </Button>
  );

  if (isDesktop) {
    // The dialog's own p-6 is released so the modal shares the three-band
    // anatomy of every picker surface (title row · px-4 scroll body · dock) —
    // SearchPickerBody's sticky search assumes the px-4 gutter.
    return (
      <Modal.Backdrop
        isOpen={open}
        onOpenChange={(next) => {
          if (!next) {
            close();
          }
        }}
      >
        <Modal.Container
          placement="center"
          size="sm"
        >
          <Modal.Dialog
            aria-label={title}
            className="overflow-hidden p-0"
          >
            {open ? (
              <>
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <span className="type-body font-semibold text-foreground">{title}</span>
                  <CloseButton
                    aria-label="Close"
                    className="-mr-2 text-muted"
                    onPress={close}
                  />
                </div>
                <div className={current ? 'px-4 pb-3' : 'h-[60vh] overflow-y-auto px-4 pb-2'}>{body}</div>
                <div className="border-t border-separator bg-background px-4 py-3">{dock}</div>
              </>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    );
  }

  return (
    <KeyboardSheet
      footer={open ? dock : undefined}
      onClose={close}
      open={open}
      title={title}
    >
      {open ? body : null}
    </KeyboardSheet>
  );
}
