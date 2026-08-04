/**
 * AddItemsFlow — adding foods/recipes to a meal as ONE operation, in ONE
 * stable surface (centered modal on desktop, keyboard sheet on mobile).
 *
 * Phase 1 — the list: search the food and recipe libraries, multi-select,
 *           create a custom food when nothing matches. `SearchPickerBody`
 *           provides the list mechanics; this file owns the data.
 * Phase 2 — amounts: once the list is finalised, one `AmountSheetContent`
 *           per picked item ("2 of 4"), collected locally. Nothing leaves
 *           until the last item's confirm, which hands the whole batch up
 *           through `onAdd` — the builder commits it as one operation.
 *           The surface never moves between phases.
 */
import {Button} from '@heroui/react';
import {useCallback, useMemo, useRef, useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {useDebounce} from '@/@hooks/use-debounce';
import {
  useCoachFoodsInfiniteQuery,
  useCoachRecipesInfiniteQuery,
  useCreateCoachFoodMutation,
} from '@/api/nutrition-foods';
import {PickerModal} from '@/builder-kit/picker-modal';
import {type FilterChip, SearchPickerBody} from '@/builder-kit/search-picker-sheet';

import {AmountSheetContent, type MealItemDraft} from './amount-sheet';
import {type FoodOrRecipe, isRecipe, PickerItemRow} from './picker-item-row';

interface AddItemsFlowProps {
  mealName: string;
  open: boolean;
  onClose: () => void;
  /** The finished batch, in pick order — the builder posts it as one commit. */
  onAdd: (items: {body: MealItemDraft; name: string | null}[]) => void;
}

/** The amounts phase renders as a form with this id; the dock submits it. */
const AMOUNT_FORM_ID = 'add-items-amount-form';

export function AddItemsFlow({mealName, open, onClose, onAdd}: AddItemsFlowProps) {
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
          onAdd(drafts.current.map((body, position) => ({body, name: picked[position]?.name ?? null})));
          close();
        }
      }}
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

  return (
    <PickerModal
      // The amount step is content-sized; the pick step is the standard
      // fixed-height scroll body (PickerModal's default).
      bodyClassName={current ? 'px-4 pb-3' : undefined}
      footer={dock}
      onClose={close}
      open={open}
      title={title}
    >
      {body}
    </PickerModal>
  );
}
